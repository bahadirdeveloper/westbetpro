/**
 * API Route: Live Alerts
 * Returns currently live matches + upcoming matches with their alert states
 * Sends Telegram notifications for hot alerts automatically
 *
 * OPTIMIZED: Directly fetches live scores from API-Football and updates
 * Supabase inline, eliminating dependency on slow cron job.
 * Throttled to max 1 API-Football call per 60 seconds.
 *
 * TELEGRAM DEDUPLICATION (v2):
 * Uses Supabase `telegram_notified_at` column to persist sent notification types.
 * Previous in-memory Set approach was unreliable on Vercel (cold starts reset it).
 * Each prediction row now tracks: "upcoming,result_won,hot_0-1" etc.
 *
 * FIXES:
 * - No more duplicate "FIRSAT MAC" notifications on every poll
 * - No more duplicate "TUTTU/YATTI" on every cold start
 * - Alternative hot alerts grouped into single message (not 5 separate ones)
 * - Upcoming threshold raised from 75% to 85% to reduce noise
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

// --- DB-backed notification deduplication ---

function wasNotificationSent(pred: any, notifType: string): boolean {
  const sent = pred.telegram_notified_at;
  if (!sent || typeof sent !== 'string') return false;
  return sent.split(',').includes(notifType);
}

function addNotificationType(currentValue: string | null, notifType: string): string {
  if (!currentValue) return notifType;
  const parts = currentValue.split(',');
  if (parts.includes(notifType)) return currentValue;
  parts.push(notifType);
  return parts.join(',');
}

// --- Inline Live Score Fetcher ---
let lastApiFetch = 0;
let cachedFixtures: any[] = [];

async function fetchLiveFixturesThrottled(): Promise<any[]> {
  const now = Date.now();
  if (now - lastApiFetch < 60_000) {
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
      continue;
    }

    let predictionResult: boolean | null = toBooleanResult(pred.prediction_result);
    if (status.is_finished && homeScore !== null && awayScore !== null && predictionResult === null) {
      predictionResult = checkPredictionResult(pred.prediction || '', homeScore, awayScore, halftimeHome, halftimeAway);
    }

    // Update local pred object for downstream use
    pred.is_live = status.is_live;
    pred.is_finished = status.is_finished;
    pred.live_status = status.live_status;
    pred.elapsed = status.elapsed;
    pred.home_score = homeScore;
    pred.away_score = awayScore;
    pred.halftime_home = halftimeHome;
    pred.halftime_away = halftimeAway;
    pred.prediction_result = predictionResult;

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

    // Step 1: Fetch predictions from Supabase (including telegram_notified_at)
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

    // Step 2: Fetch live scores from API-Football (throttled, 1x/60s)
    const hasUnfinished = predictions.some((p: any) => !p.is_finished);
    let liveUpdatedCount = 0;

    if (hasUnfinished) {
      const liveFixtures = await fetchLiveFixturesThrottled();
      if (liveFixtures.length > 0) {
        liveUpdatedCount = await updatePredictionsFromLiveData(predictions, liveFixtures);
      }
    }

    // Step 3: Build alerts and queue Telegram notifications
    const alerts: LiveAlert[] = [];
    const telegramPromises: Promise<void>[] = [];
    const notifUpdates: Array<{ id: string; newValue: string }> = [];

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

      // --- TELEGRAM NOTIFICATIONS (DB-backed deduplication) ---

      let currentNotifValue = pred.telegram_notified_at || '';

      // 1. Hot alert: main prediction is 1 goal away (once per score state)
      if (isLive && mainAlert && mainAlert.alertLevel === 'hot' && !mainAlert.isAlreadyHit) {
        const notifType = `hot_${homeScore}-${awayScore}`;
        if (!wasNotificationSent(pred, notifType)) {
          // Include hot alternatives in same message
          const hotAlts = altAlerts
            .filter(a => a.alertState?.alertLevel === 'hot' && !a.alertState?.isAlreadyHit)
            .slice(0, 3);

          let msg = `🔥 <b>SICAK ALARM!</b>\n\n` +
            `⚽ <b>${alertItem.homeTeam} - ${alertItem.awayTeam}</b>\n` +
            `📊 Skor: <b>${alertItem.currentScore}</b> (${alertItem.elapsed}')\n` +
            `🎯 Tahmin: <b>${alertItem.prediction}</b> (%${alertItem.confidence})\n` +
            `⚡ ${mainAlert.message || '1 GOL KALA!'}\n` +
            `🏆 ${alertItem.league}`;

          if (hotAlts.length > 0) {
            msg += `\n\n🔥 Diğer sıcak:\n` + hotAlts.map(a => `  • ${a.prediction} (%${a.confidence})`).join('\n');
          }

          telegramPromises.push(sendTelegramMessage(msg));
          currentNotifValue = addNotificationType(currentNotifValue, notifType);
          currentNotifValue = addNotificationType(currentNotifValue, `alt_hot_${homeScore}-${awayScore}`);
        }
      }
      // 2. Alternative hot alerts (only if main is NOT hot, to avoid duplicates)
      else if (isLive && (!mainAlert || mainAlert.alertLevel !== 'hot')) {
        const hotAlts = altAlerts.filter(a => a.alertState?.alertLevel === 'hot' && !a.alertState?.isAlreadyHit);
        if (hotAlts.length > 0) {
          const notifType = `alt_hot_${homeScore}-${awayScore}`;
          if (!wasNotificationSent(pred, notifType)) {
            const altLines = hotAlts
              .slice(0, 4)
              .map(a => `  • ${a.prediction} (%${a.confidence}) - ${a.alertState?.message || '1 GOL KALA!'}`);

            const msg = `🔥 <b>SICAK ALARM!</b>\n\n` +
              `⚽ <b>${alertItem.homeTeam} - ${alertItem.awayTeam}</b>\n` +
              `📊 Skor: <b>${alertItem.currentScore}</b> (${alertItem.elapsed}')\n` +
              `🏆 ${alertItem.league}\n\n` +
              `🎯 Sıcak tahminler:\n${altLines.join('\n')}`;

            telegramPromises.push(sendTelegramMessage(msg));
            currentNotifValue = addNotificationType(currentNotifValue, notifType);
          }
        }
      }

      // 3. Upcoming: only high confidence (>= 85%), sent ONCE, silent
      if (isUpcoming && alertItem.confidence >= 85) {
        if (!wasNotificationSent(pred, 'upcoming')) {
          const msg = `📋 <b>YÜKSEK GÜVEN TAHMİN!</b>\n\n` +
            `⚽ <b>${alertItem.homeTeam} - ${alertItem.awayTeam}</b>\n` +
            `⏰ Saat: <b>${alertItem.matchTime}</b>\n` +
            `🎯 Tahmin: <b>${alertItem.prediction}</b> (%${alertItem.confidence})\n` +
            `🏆 ${alertItem.league}`;
          telegramPromises.push(sendTelegramMessage(msg, true));
          currentNotifValue = addNotificationType(currentNotifValue, 'upcoming');
        }
      }

      // 4. Finished result: sent ONCE
      if (isFinished && predResult !== null) {
        const notifType = predResult ? 'result_won' : 'result_lost';
        if (!wasNotificationSent(pred, notifType)) {
          const emoji = predResult ? '✅' : '❌';
          const status = predResult ? 'TUTTU' : 'YATTI';
          const msg = `${emoji} <b>SONUÇ: ${status}</b>\n\n` +
            `⚽ <b>${alertItem.homeTeam} - ${alertItem.awayTeam}</b>\n` +
            `📊 Skor: <b>${alertItem.currentScore}</b>\n` +
            `🎯 Tahmin: <b>${alertItem.prediction}</b> (%${alertItem.confidence})\n` +
            `🏆 ${alertItem.league}`;
          telegramPromises.push(sendTelegramMessage(msg, !predResult));
          currentNotifValue = addNotificationType(currentNotifValue, notifType);
        }
      }

      // Queue DB update if notification types changed
      if (currentNotifValue !== (pred.telegram_notified_at || '')) {
        notifUpdates.push({ id: pred.id, newValue: currentNotifValue });
      }
    }

    // Sort alerts
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

    // Send Telegram + update notification tracking in DB (parallel, max 5s)
    const allPromises: Promise<any>[] = [...telegramPromises];
    for (const update of notifUpdates) {
      allPromises.push(
        supabaseUpdate('predictions', update.id, {
          telegram_notified_at: update.newValue,
        }).catch(() => {})
      );
    }

    if (allPromises.length > 0) {
      await Promise.race([
        Promise.allSettled(allPromises),
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
