/**
 * Autonomous Analysis Engine
 *
 * Fetches pre-match odds from API-Football, matches against golden rules,
 * generates predictions, and writes them to Supabase.
 *
 * Flow:
 * 1. Fetch today's (and optionally tomorrow's) fixtures
 * 2. For each fixture, fetch pre-match odds
 * 3. Extract odds in golden rules format using odds-mapping
 * 4. Match against golden rules from Supabase
 * 5. Generate predictions and write to Supabase (upsert by match+date)
 *
 * GET /api/engine/analyze?date=today|tomorrow
 * Requires CRON_SECRET for auth
 */

import { NextResponse } from 'next/server';
import { supabaseSelect, supabaseInsert, verifyAdminAuth } from '@/lib/supabase';
import { getTodayDate, getIstanbulTime } from '@/lib/dates';
import { extractOddsFromApiResponse, matchGoldenRules, type MatchedRule } from '@/lib/odds-mapping';

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY || '';
const API_FOOTBALL_URL = 'https://v3.football.api-sports.io';

// --- API-Football helpers ---

async function apiFetch(endpoint: string): Promise<any> {
  if (!API_FOOTBALL_KEY) throw new Error('API_FOOTBALL_KEY not set');

  const res = await fetch(`${API_FOOTBALL_URL}${endpoint}`, {
    headers: {
      'x-rapidapi-key': API_FOOTBALL_KEY,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API-Football ${endpoint} failed: ${res.status} ${text}`);
  }

  return res.json();
}

// Fetch fixtures for a date
async function fetchFixtures(date: string): Promise<any[]> {
  const data = await apiFetch(`/fixtures?date=${date}&status=NS`);
  return data.response || [];
}

// Fetch pre-match odds for a fixture (bet types: 5, 8, 38)
async function fetchOddsForFixture(fixtureId: number): Promise<any[]> {
  // Fetch all three bet types we need in a single call
  const data = await apiFetch(`/odds?fixture=${fixtureId}`);
  const response = data.response || [];
  if (response.length === 0) return [];
  return response[0]?.bookmakers || [];
}

// --- Main Engine ---

interface EngineResult {
  fixture_id: number;
  home_team: string;
  away_team: string;
  league: string;
  league_id: number;
  match_date: string;
  match_time: string;
  matched_rules: MatchedRule[];
  best_prediction: string;
  best_confidence: number;
  alternatives: Array<{ bet: string; confidence: number }>;
  extracted_odds: Record<string, number | null>;
  source: 'api-engine';
}

async function analyzeFixture(
  fixture: any,
  goldenRules: any[],
  date: string
): Promise<EngineResult | null> {
  const fixtureId = fixture.fixture?.id;
  const homeTeam = fixture.teams?.home?.name || '';
  const awayTeam = fixture.teams?.away?.name || '';
  const league = fixture.league?.name || '';
  const leagueId = fixture.league?.id || 0;

  // Get match time in Istanbul timezone
  const utcDate = new Date(fixture.fixture?.date || '');
  const istanbulOffset = 3 * 60 * 60 * 1000;
  const istanbulDate = new Date(utcDate.getTime() + istanbulOffset);
  const matchTime = `${String(istanbulDate.getUTCHours()).padStart(2, '0')}:${String(istanbulDate.getUTCMinutes()).padStart(2, '0')}`;

  if (!fixtureId || !homeTeam || !awayTeam) return null;

  try {
    const bookmakers = await fetchOddsForFixture(fixtureId);
    if (!bookmakers || bookmakers.length === 0) return null;

    const extracted = extractOddsFromApiResponse(bookmakers);

    // Primary odds must exist
    if (extracted['4-5'] === null) return null;

    const matched = matchGoldenRules(extracted, goldenRules);
    if (matched.length === 0) return null;

    // Build predictions from matched rules
    // Collect all predictions with their max confidence
    const predMap = new Map<string, number>();
    const ruleIds: number[] = [];

    for (const rule of matched) {
      ruleIds.push(rule.rule_id);
      const boost = rule.importance === 'önemli' ? 2 : rule.importance === 'özel' ? 3 : 0;
      const qualityBoost = Math.round((rule.matchQuality - 50) / 25);

      for (const pred of rule.predictions) {
        const conf = Math.min(99, rule.confidence_base + boost + qualityBoost);
        const existing = predMap.get(pred) || 0;
        if (conf > existing) predMap.set(pred, conf);
      }
    }

    if (predMap.size === 0) return null;

    // Sort predictions by confidence
    const sortedPreds = Array.from(predMap.entries())
      .sort((a, b) => b[1] - a[1]);

    const [bestPred, bestConf] = sortedPreds[0];
    const alternatives = sortedPreds.slice(1).map(([bet, confidence]) => ({ bet, confidence }));

    return {
      fixture_id: fixtureId,
      home_team: homeTeam,
      away_team: awayTeam,
      league,
      league_id: leagueId,
      match_date: date,
      match_time: matchTime,
      matched_rules: matched,
      best_prediction: bestPred,
      best_confidence: bestConf,
      alternatives,
      extracted_odds: extracted as any,
      source: 'api-engine',
    };
  } catch (e: any) {
    console.error(`Odds fetch failed for ${homeTeam} vs ${awayTeam}:`, e.message);
    return null;
  }
}

// Write engine results to Supabase predictions table
async function writeToSupabase(results: EngineResult[]): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;

  for (const r of results) {
    // Check if prediction already exists for this match+date
    const existing = await supabaseSelect(
      'predictions',
      `home_team=eq.${encodeURIComponent(r.home_team)}&away_team=eq.${encodeURIComponent(r.away_team)}&match_date=eq.${r.match_date}&select=id,source`
    );

    // Skip if already has a prediction (from any source)
    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }

    const row = {
      home_team: r.home_team,
      away_team: r.away_team,
      league: r.league,
      match_date: r.match_date,
      match_time: r.match_time,
      prediction: r.best_prediction,
      confidence: r.best_confidence,
      alternative_predictions: r.alternatives.map(a => ({
        bet: a.bet,
        tahmin: a.bet,
        confidence: a.confidence,
        güven: a.confidence,
      })),
      matched_rules: r.matched_rules.map(m => ({
        rule_id: m.rule_id,
        kural_id: m.rule_id,
        rule_name: m.name,
        kural_adı: m.name,
      })),
      note: `API Engine | ${r.matched_rules.length} kural eşleşti | Odds: 4-5=${r.extracted_odds['4-5']}`,
      source: 'api-engine',
      is_live: false,
      is_finished: false,
      home_score: null,
      away_score: null,
      prediction_result: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = await supabaseInsert('predictions', row);
    if (result.ok) {
      inserted++;
    } else {
      console.error(`Failed to insert prediction for ${r.home_team} vs ${r.away_team}: status ${result.status}`);
    }
  }

  return { inserted, skipped };
}

// Send Telegram summary
async function sendTelegramSummary(results: EngineResult[], date: string) {
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!telegramToken || !chatId || results.length === 0) return;

  const dateLabel = date === getTodayDate() ? 'Bugün' : 'Yarın';
  const topResults = results
    .sort((a, b) => b.best_confidence - a.best_confidence)
    .slice(0, 10);

  let msg = `🤖 <b>OTOMATİK ANALİZ - ${dateLabel}</b>\n`;
  msg += `📊 ${results.length} maç analiz edildi\n\n`;

  for (const r of topResults) {
    const ruleCount = r.matched_rules.length;
    const importance = r.matched_rules.some(m => m.importance === 'önemli' || m.importance === 'özel') ? '⭐' : '';
    msg += `⚽ <b>${r.home_team} - ${r.away_team}</b>\n`;
    msg += `⏰ ${r.match_time} | 🏆 ${r.league}\n`;
    msg += `🎯 ${r.best_prediction} (%${r.best_confidence}) ${importance}\n`;
    if (r.alternatives.length > 0) {
      const topAlts = r.alternatives.slice(0, 3);
      msg += `📋 ${topAlts.map(a => `${a.bet}(%${a.confidence})`).join(', ')}\n`;
    }
    msg += `🔑 ${ruleCount} kural | 4-5: ${r.extracted_odds['4-5']}\n\n`;
  }

  if (results.length > 10) {
    msg += `\n... ve ${results.length - 10} maç daha`;
  }

  try {
    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: msg,
        parse_mode: 'HTML',
      }),
    });
  } catch (e) {
    console.error('Telegram summary error:', e);
  }
}

export async function GET(request: Request) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!API_FOOTBALL_KEY) {
    return NextResponse.json({ error: 'API_FOOTBALL_KEY not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date') || 'today';

  try {
    // Determine target date
    const istanbul = getIstanbulTime();
    let targetDate: string;
    if (dateParam === 'tomorrow') {
      istanbul.setDate(istanbul.getDate() + 1);
      targetDate = istanbul.toISOString().split('T')[0];
    } else {
      targetDate = getTodayDate();
    }

    // Step 1: Fetch golden rules from Supabase
    const goldenRules = await supabaseSelect(
      'golden_rules',
      'is_active=eq.true&select=*'
    );

    if (!goldenRules || goldenRules.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active golden rules found in database',
      }, { status: 500 });
    }

    // Step 2: Fetch fixtures for target date
    const fixtures = await fetchFixtures(targetDate);

    if (fixtures.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No fixtures found for ${targetDate}`,
        date: targetDate,
        analyzed: 0,
        matched: 0,
        api_calls: 1,
      });
    }

    // Step 3: Analyze each fixture (with rate limiting)
    const results: EngineResult[] = [];
    let apiCalls = 1; // 1 for fixtures fetch
    let oddsNotAvailable = 0;
    let noMatch = 0;

    // Process fixtures in batches of 5 to avoid rate limits
    const BATCH_SIZE = 5;
    const BATCH_DELAY = 1500; // 1.5s between batches

    for (let i = 0; i < fixtures.length; i += BATCH_SIZE) {
      const batch = fixtures.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(fixture =>
        analyzeFixture(fixture, goldenRules, targetDate)
      );

      const batchResults = await Promise.allSettled(batchPromises);
      apiCalls += batch.length; // 1 odds call per fixture

      for (const br of batchResults) {
        if (br.status === 'fulfilled' && br.value) {
          results.push(br.value);
        } else if (br.status === 'fulfilled' && !br.value) {
          // Could be no odds or no match
          noMatch++;
        } else {
          oddsNotAvailable++;
        }
      }

      // Rate limit delay between batches (skip for last batch)
      if (i + BATCH_SIZE < fixtures.length) {
        await new Promise(r => setTimeout(r, BATCH_DELAY));
      }
    }

    // Step 4: Write results to Supabase
    let writeResult = { inserted: 0, skipped: 0 };
    if (results.length > 0) {
      writeResult = await writeToSupabase(results);
    }

    // Step 5: Send Telegram summary
    if (writeResult.inserted > 0) {
      const newResults = results.slice(0, writeResult.inserted);
      await sendTelegramSummary(newResults.length > 0 ? newResults : results, targetDate);
    }

    return NextResponse.json({
      success: true,
      date: targetDate,
      total_fixtures: fixtures.length,
      odds_analyzed: fixtures.length - oddsNotAvailable,
      rules_matched: results.length,
      predictions_inserted: writeResult.inserted,
      predictions_skipped: writeResult.skipped,
      no_match: noMatch,
      api_calls: apiCalls,
      golden_rules_count: goldenRules.length,
      sample_results: results.slice(0, 5).map(r => ({
        match: `${r.home_team} vs ${r.away_team}`,
        league: r.league,
        time: r.match_time,
        prediction: r.best_prediction,
        confidence: r.best_confidence,
        rules_matched: r.matched_rules.length,
        odds_45: r.extracted_odds['4-5'],
      })),
    });

  } catch (error: any) {
    console.error('Engine analyze error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
