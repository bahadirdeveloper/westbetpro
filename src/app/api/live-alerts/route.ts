/**
 * API Route: Live Alerts
 * Returns currently live matches + upcoming matches with their alert states
 * Sends Telegram notifications for hot alerts automatically
 *
 * OPTIMIZED: Directly fetches live scores from API-Football and updates
 * Supabase inline, eliminating dependency on slow cron job.
 * Throttled to max 1 API-Football call per 60 seconds.
 */

import { NextResponse } from 'next/server';
import { supabaseSelect, supabaseUpdate } from '@/lib/supabase';
import { getTodayDate, getYesterdayDate } from '@/lib/dates';
import { calculateAlertState, type AlertState } from '@/lib/alert-logic';
import { teamsMatch } from '@/lib/teams';
import { checkPredictionResult, toBooleanResult } from '@/lib/predictions';

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY || '';
const API_FOOTBALL_URL = 'https://v3.football.api-sports.io';

interface LiveAlert {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  matchTime: string;
  currentScore: string;
  elapsed: number;
  prediction: string;
  confidence: number;
  alertState: AlertState | null;
  alternativeAlerts: Array<{
    prediction: string;
    confidence: number;
    alertState: AlertState | null;
  }>;
  isFinished: boolean;
  isLive: boolean;
  isUpcoming: boolean;
  predictionResult: boolean | null;
  note?: string;
  matchedRules?: number[];
}

// In-memory cache for sent Telegram alerts (resets on cold start)
const sentTelegramAlerts = new Set<string>();

function shouldSendTelegram(alertKey: string): boolean {
  if (sentTelegramAlerts.has(alertKey)) return false;
  sentTelegramAlerts.add(alertKey);

  // Clean old entries (keep last 500)
  if (sentTelegramAlerts.size > 500) {
    const entries = Array.from(sentTelegramAlerts);
    entries.slice(0, 250).forEach(k => sentTelegramAlerts.delete(k));
  }
  return true;
}

function sendTelegramMessage(text: string, silent: boolean = false): Promise<void> {
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!telegramToken || !chatId) return Promise.resolve();

  return fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_notification: silent,
    }),
  }).then(() => {}).catch((e) => {
    console.error('Telegram send error:', e);
  });
}

// --- Inline Live Score Fetcher ---
// Throttle: fetch from API-Football at most once per 60 seconds
let lastApiFetch = 0;
let cachedFixtures: any[] = [];

async function fetchLiveFixturesThrottled(): Promise<any[]> {
  const now = Date.now();
  // Return cached if less than 60 seconds since last fetch
  if (now - lastApiFetch < 60_000 && cachedFixtures.length >= 0) {
    return cachedFixtures;
  }

  if (!API_FOOTBALL_KEY) return cachedFixtures;

  try {
    const res = await fetch(`${API_FOOTBALL_URL}/fixtures?live=all`, {
      headers: {
        'x-rapidapi-key': API_FOOTBALL_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      cachedFixtures = data.response || [];
      lastApiFetch = now;
    }
  } catch (e) {
    console.error('API-Football fetch error:', e);
  }

  return cachedFixtures;
}

function determineMatchStatus(fixture: any) {
  const statusShort = fixture.fixture?.status?.short || '';
  const elapsed = fixture.fixture?.status?.elapsed || null;

  const liveStatuses = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'INT'];
  const finishedStatuses = ['FT', 'AET', 'PEN', 'AWD', 'WO'];

  if (liveStatuses.includes(statusShort)) {
    return { is_live: true, is_finished: false, live_status: statusShort, elapsed };
  }
  if (finishedStatuses.includes(statusShort)) {
    return { is_live: false, is_finished: true, live_status: 'finished', elapsed: 90 };
  }
  return { is_live: false, is_finished: false, live_status: 'not_started', elapsed: null };
}

// Update Supabase predictions with live data inline
async function updatePredictionsFromLiveData(predictions: any[], fixtures: any[]): Promise<number> {
  if (fixtures.length === 0) return 0;

  let updatedCount = 0;
  const updatePromises: Promise<void>[] = [];

  for (const pred of predictions) {
    if (pred.is_finished) continue;

    const matchedFixture = fixtures.find((f: any) =>
      teamsMatch(pred.home_team, pred.away_team, f.teams?.home?.name || '', f.teams?.away?.name || '')
    );

    if (!matchedFixture) continue;

    const status = determineMatchStatus(matchedFixture);
    const homeScore = matchedFixture.goals?.home ?? null;
    const awayScore = matchedFixture.goals?.away ?? null;
    const halftimeHome = matchedFixture.score?.halftime?.home ?? null;
    const halftimeAway = matchedFixture.score?.halftime?.away ?? null;

    // Check if data actually changed
    if (
      pred.home_score === homeScore &&
      pred.away_score === awayScore &&
      pred.is_live === status.is_live &&
      pred.is_finished === status.is_finished &&
      pred.elapsed === status.elapsed
    ) {
      continue; // No change, skip update
    }

    let predictionResult: boolean | null = toBooleanResult(pred.prediction_result);
    if (status.is_finished && homeScore !== null && awayScore !== null && predictionResult === null) {
      predictionResult = checkPredictionResult(pred.prediction || '', homeScore, awayScore, halftimeHome, halftimeAway);
    }

    const updatePromise = supabaseUpdate('predictions', pred.id, {
      is_live: status.is_live,
      is_finished: status.is_finished,
      live_status: status.live_status,
      elapsed: status.elapsed,
      home_score: homeScore,
      away_score: awayScore,
      halftime_home: halftimeHome,
      halftime_away: halftimeAway,
      prediction_result: predictionResult,
      updated_at: new Date().toISOString()
    }).then(result => {
      if (result.ok) updatedCount++;
    });

    updatePromises.push(updatePromise);
  }

  // Run all updates in parallel (max 5 seconds)
  if (updatePromises.length > 0) {
    await Promise.race([
      Promise.allSettled(updatePromises),
      new Promise(resolve => setTimeout(resolve, 5000)),
    ]);
  }

  return updatedCount;
}

export async function GET() {
  try {
    const today = getTodayDate();
    const yesterday = getYesterdayDate();

    // Step 1: Fetch predictions from Supabase
    const [todayPredictions, yesterdayUnfinished] = await Promise.all([
      supabaseSelect('predictions', `match_date=eq.${today}&order=match_time.asc&select=*`),
      supabaseSelect('predictions', `match_date=eq.${yesterday}&is_finished=eq.false&order=match_time.asc&select=*`),
    ]);

    const predictions = [...(yesterdayUnfinished || []), ...(todayPredictions || [])];

    if (!predictions || predictions.length === 0) {
      return NextResponse.json({
        success: true,
        alerts: [],
        stats: { hot: 0, warm: 0, live: 0, upcoming: 0, finished: 0, total: 0 },
        message: 'Bugun icin tahmin yok'
      });
    }

    // Step 2: Fetch live scores directly from API-Football (throttled, 1x/60s)
    const hasUnfinished = predictions.some((p: any) => !p.is_finished);
    let liveUpdatedCount = 0;

    if (hasUnfinished) {
      const liveFixtures = await fetchLiveFixturesThrottled();

      if (liveFixtures.length > 0) {
        liveUpdatedCount = await updatePredictionsFromLiveData(predictions, liveFixtures);

        // If we updated data, re-read from Supabase for fresh values
        if (liveUpdatedCount > 0) {
          const [freshToday, freshYesterday] = await Promise.all([
            supabaseSelect('predictions', `match_date=eq.${today}&order=match_time.asc&select=*`),
            supabaseSelect('predictions', `match_date=eq.${yesterday}&is_finished=eq.false&order=match_time.asc&select=*`),
          ]);
          predictions.length = 0;
          predictions.push(...(freshYesterday || []), ...(freshToday || []));
        }
      }
    }

    // Step 3: Build alerts from (now-fresh) predictions
    const alerts: LiveAlert[] = [];
    const telegramPromises: Promise<void>[] = [];

    for (const pred of predictions) {
      const homeScore = pred.home_score ?? null;
      const awayScore = pred.away_score ?? null;
      const elapsed = pred.elapsed ?? 0;
      const isLive = pred.is_live || false;
      const isFinished = pred.is_finished || false;
      const isUpcoming = !isLive && !isFinished;

      // Calculate alert for main prediction
      let mainAlert: AlertState | null = null;
      if (isLive && homeScore !== null && awayScore !== null) {
        mainAlert = calculateAlertState(
          pred.prediction || '',
          homeScore,
          awayScore,
          elapsed,
          pred.halftime_home,
          pred.halftime_away
        );
      }

      // Calculate alerts for alternatives
      const altAlerts: Array<{ prediction: string; confidence: number; alertState: AlertState | null }> = [];
      const seenBets = new Set<string>();
      seenBets.add((pred.prediction || '').trim());

      for (const alt of (pred.alternative_predictions || [])) {
        const altName = (alt.bet || alt.tahmin || '').trim();
        if (!altName || seenBets.has(altName)) continue;
        seenBets.add(altName);

        let altAlertState: AlertState | null = null;
        if (isLive && homeScore !== null && awayScore !== null) {
          altAlertState = calculateAlertState(altName, homeScore, awayScore, elapsed, pred.halftime_home, pred.halftime_away);
        }

        altAlerts.push({
          prediction: altName,
          confidence: alt.confidence || alt.güven || 0,
          alertState: altAlertState,
        });
      }

      // Determine prediction result
      let predResult: boolean | null = null;
      if (pred.prediction_result === true || pred.prediction_result === 'true' || pred.prediction_result === 'won') predResult = true;
      else if (pred.prediction_result === false || pred.prediction_result === 'false' || pred.prediction_result === 'lost') predResult = false;

      const alertItem: LiveAlert = {
        id: pred.id,
        homeTeam: pred.home_team || '',
        awayTeam: pred.away_team || '',
        league: pred.league || '',
        matchTime: pred.match_time || '',
        currentScore: homeScore !== null && awayScore !== null ? `${homeScore}-${awayScore}` : '-',
        elapsed,
        prediction: pred.prediction || '',
        confidence: pred.confidence || 0,
        alertState: mainAlert,
        alternativeAlerts: altAlerts,
        isFinished,
        isLive,
        isUpcoming,
        predictionResult: predResult,
        note: pred.note || undefined,
        matchedRules: pred.matched_rules || [],
      };

      alerts.push(alertItem);

      // Queue Telegram for hot alerts (live matches, 1 goal away)
      if (isLive && mainAlert && mainAlert.alertLevel === 'hot' && !mainAlert.isAlreadyHit) {
        const key = `${alertItem.id}_${alertItem.prediction}_${alertItem.currentScore}`;
        if (shouldSendTelegram(key)) {
          const msg = `🔥 <b>SICAK ALARM!</b>\n\n` +
            `⚽ <b>${alertItem.homeTeam} - ${alertItem.awayTeam}</b>\n` +
            `📊 Skor: <b>${alertItem.currentScore}</b> (${alertItem.elapsed}')\n` +
            `🎯 Tahmin: <b>${alertItem.prediction}</b> (%${alertItem.confidence})\n` +
            `⚡ ${mainAlert.message || '1 GOL KALA!'}\n` +
            `🏆 ${alertItem.league}`;
          telegramPromises.push(sendTelegramMessage(msg));
        }
      }

      // Also check alternative predictions for hot alerts
      for (const alt of altAlerts) {
        if (isLive && alt.alertState && alt.alertState.alertLevel === 'hot' && !alt.alertState.isAlreadyHit) {
          const key = `${alertItem.id}_${alt.prediction}_${alertItem.currentScore}`;
          if (shouldSendTelegram(key)) {
            const msg = `🔥 <b>SICAK ALARM!</b>\n\n` +
              `⚽ <b>${alertItem.homeTeam} - ${alertItem.awayTeam}</b>\n` +
              `📊 Skor: <b>${alertItem.currentScore}</b> (${alertItem.elapsed}')\n` +
              `🎯 Tahmin: <b>${alt.prediction}</b> (%${alt.confidence})\n` +
              `⚡ ${alt.alertState.message || '1 GOL KALA!'}\n` +
              `🏆 ${alertItem.league}`;
            telegramPromises.push(sendTelegramMessage(msg));
          }
        }
      }

      // Queue Telegram for upcoming matches (confidence >= 75%)
      if (isUpcoming && alertItem.confidence >= 75) {
        const key = `upcoming_${alertItem.id}`;
        if (shouldSendTelegram(key)) {
          const msg = `📋 <b>FIRSAT MAC!</b>\n\n` +
            `⚽ <b>${alertItem.homeTeam} - ${alertItem.awayTeam}</b>\n` +
            `⏰ Saat: <b>${alertItem.matchTime}</b>\n` +
            `🎯 Tahmin: <b>${alertItem.prediction}</b> (%${alertItem.confidence})\n` +
            `🏆 ${alertItem.league}` +
            (altAlerts.length > 0
              ? `\n\n📊 Alternatifler:\n` + altAlerts.map(a => `  • ${a.prediction} (%${a.confidence})`).join('\n')
              : '');
          telegramPromises.push(sendTelegramMessage(msg));
        }
      }

      // Queue Telegram for finished match results
      if (isFinished && predResult !== null) {
        const key = `result_${alertItem.id}`;
        if (shouldSendTelegram(key)) {
          const won = predResult === true;
          const emoji = won ? '✅' : '❌';
          const status = won ? 'TUTTU' : 'YATTI';
          const msg = `${emoji} <b>SONUC: ${status}</b>\n\n` +
            `⚽ <b>${alertItem.homeTeam} - ${alertItem.awayTeam}</b>\n` +
            `📊 Skor: <b>${alertItem.currentScore}</b>\n` +
            `🎯 Tahmin: <b>${alertItem.prediction}</b> (%${alertItem.confidence})\n` +
            `🏆 ${alertItem.league}`;
          telegramPromises.push(sendTelegramMessage(msg, !won));
        }
      }
    }

    // Sort: hot first, then warm, then live cold, then upcoming (by time), then finished
    alerts.sort((a, b) => {
      if (a.isFinished && !b.isFinished) return 1;
      if (!a.isFinished && b.isFinished) return -1;
      if (a.isUpcoming && b.isLive) return 1;
      if (a.isLive && b.isUpcoming) return -1;
      if (a.isUpcoming && b.isUpcoming) {
        return (a.matchTime || '').localeCompare(b.matchTime || '');
      }
      const levelOrder: Record<string, number> = { hot: 0, warm: 1, cold: 2 };
      const aLevel = a.alertState?.alertLevel || 'cold';
      const bLevel = b.alertState?.alertLevel || 'cold';
      return (levelOrder[aLevel] ?? 3) - (levelOrder[bLevel] ?? 3);
    });

    // Stats
    const stats = {
      hot: alerts.filter(a => a.isLive && a.alertState?.alertLevel === 'hot').length,
      warm: alerts.filter(a => a.isLive && a.alertState?.alertLevel === 'warm').length,
      live: alerts.filter(a => a.isLive).length,
      upcoming: alerts.filter(a => a.isUpcoming).length,
      finished: alerts.filter(a => a.isFinished).length,
      total: alerts.length,
      won: alerts.filter(a => a.isFinished && a.predictionResult === true).length,
      lost: alerts.filter(a => a.isFinished && a.predictionResult === false).length,
    };

    // Send all Telegram messages in parallel (non-blocking, max 5 seconds)
    if (telegramPromises.length > 0) {
      await Promise.race([
        Promise.allSettled(telegramPromises),
        new Promise(resolve => setTimeout(resolve, 5000)),
      ]);
    }

    return NextResponse.json({
      success: true,
      alerts,
      stats,
      count: alerts.length,
      liveUpdated: liveUpdatedCount,
    });
  } catch (error: any) {
    console.error('Live alerts error:', error);
    return NextResponse.json({ success: false, alerts: [], stats: {}, message: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
