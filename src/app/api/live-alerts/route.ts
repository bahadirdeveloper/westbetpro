/**
 * API Route: Live Alerts
 * Returns currently live matches + upcoming matches with their alert states
 * Sends Telegram notifications for hot alerts automatically
 */

import { NextResponse } from 'next/server';
import { supabaseSelect } from '@/lib/supabase';
import { getTodayDate } from '@/lib/dates';
import { calculateAlertState, type AlertState } from '@/lib/alert-logic';

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

async function sendTelegramAlert(alert: LiveAlert) {
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!telegramToken || !chatId) return;

  // Create unique key to avoid duplicate sends
  const alertKey = `${alert.id}_${alert.prediction}_${alert.currentScore}`;
  if (sentTelegramAlerts.has(alertKey)) return;
  sentTelegramAlerts.add(alertKey);

  // Clean old entries (keep last 500)
  if (sentTelegramAlerts.size > 500) {
    const entries = Array.from(sentTelegramAlerts);
    entries.slice(0, 250).forEach(k => sentTelegramAlerts.delete(k));
  }

  const message = `🔥 <b>SICAK ALARM!</b>\n\n` +
    `⚽ <b>${alert.homeTeam} - ${alert.awayTeam}</b>\n` +
    `📊 Skor: <b>${alert.currentScore}</b> (${alert.elapsed}')\n` +
    `🎯 Tahmin: <b>${alert.prediction}</b> (%${alert.confidence})\n` +
    `⚡ ${alert.alertState?.message || '1 GOL KALA!'}\n` +
    `🏆 ${alert.league}`;

  try {
    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_notification: false,
      }),
    });
  } catch (e) {
    console.error('Telegram send error:', e);
  }
}

async function sendUpcomingMatchAlert(alert: LiveAlert) {
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!telegramToken || !chatId) return;

  const alertKey = `upcoming_${alert.id}`;
  if (sentTelegramAlerts.has(alertKey)) return;
  sentTelegramAlerts.add(alertKey);

  const message = `📋 <b>FIRSAT MAC!</b>\n\n` +
    `⚽ <b>${alert.homeTeam} - ${alert.awayTeam}</b>\n` +
    `⏰ Saat: <b>${alert.matchTime}</b>\n` +
    `🎯 Tahmin: <b>${alert.prediction}</b> (%${alert.confidence})\n` +
    `🏆 ${alert.league}\n` +
    (alert.alternativeAlerts.length > 0
      ? `\n📊 Alternatifler:\n` + alert.alternativeAlerts.map(a => `  • ${a.prediction} (%${a.confidence})`).join('\n')
      : '');

  try {
    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_notification: false,
      }),
    });
  } catch (e) {
    console.error('Telegram upcoming send error:', e);
  }
}

async function sendResultAlert(alert: LiveAlert) {
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!telegramToken || !chatId) return;

  const alertKey = `result_${alert.id}`;
  if (sentTelegramAlerts.has(alertKey)) return;
  sentTelegramAlerts.add(alertKey);

  const won = alert.predictionResult === true;
  const emoji = won ? '✅' : '❌';
  const status = won ? 'TUTTU' : 'YATTI';

  const message = `${emoji} <b>SONUC: ${status}</b>\n\n` +
    `⚽ <b>${alert.homeTeam} - ${alert.awayTeam}</b>\n` +
    `📊 Skor: <b>${alert.currentScore}</b>\n` +
    `🎯 Tahmin: <b>${alert.prediction}</b> (%${alert.confidence})\n` +
    `🏆 ${alert.league}`;

  try {
    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_notification: won ? false : true,
      }),
    });
  } catch (e) {
    console.error('Telegram result send error:', e);
  }
}

// Throttle: trigger cron at most once per 2 minutes
let lastCronTrigger = 0;

async function triggerCronInBackground() {
  const now = Date.now();
  if (now - lastCronTrigger < 120_000) return; // 2 min cooldown
  lastCronTrigger = now;

  const cronSecret = process.env.CRON_SECRET || '';
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  try {
    fetch(`${baseUrl}/api/cron/live-scores`, {
      headers: { Authorization: `Bearer ${cronSecret}` },
      cache: 'no-store',
    }).catch(() => {});
  } catch {}
}

export async function GET() {
  try {
    // Trigger live score cron in background (throttled to 1x/2min)
    triggerCronInBackground();

    const today = getTodayDate();

    // Fetch today's predictions
    const predictions = await supabaseSelect(
      'predictions',
      `match_date=eq.${today}&order=match_time.asc&select=*`
    );

    if (!predictions || predictions.length === 0) {
      return NextResponse.json({
        success: true,
        alerts: [],
        stats: { hot: 0, warm: 0, live: 0, upcoming: 0, finished: 0, total: 0 },
        message: 'Bugun icin tahmin yok'
      });
    }

    const alerts: LiveAlert[] = [];

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

      // Send Telegram for hot alerts (live matches, 1 goal away)
      if (isLive && mainAlert && mainAlert.alertLevel === 'hot' && !mainAlert.isAlreadyHit) {
        await sendTelegramAlert(alertItem);
      }
      // Also check alternative predictions
      for (const alt of altAlerts) {
        if (isLive && alt.alertState && alt.alertState.alertLevel === 'hot' && !alt.alertState.isAlreadyHit) {
          await sendTelegramAlert({
            ...alertItem,
            prediction: alt.prediction,
            confidence: alt.confidence,
            alertState: alt.alertState,
          });
        }
      }

      // Send Telegram for upcoming matches (confidence >= 75%)
      if (isUpcoming && alertItem.confidence >= 75) {
        await sendUpcomingMatchAlert(alertItem);
      }

      // Send Telegram for finished match results
      if (isFinished && predResult !== null) {
        await sendResultAlert(alertItem);
      }
    }

    // Sort: hot first, then warm, then live cold, then upcoming (by time), then finished
    alerts.sort((a, b) => {
      // Finished always last
      if (a.isFinished && !b.isFinished) return 1;
      if (!a.isFinished && b.isFinished) return -1;

      // Upcoming after live
      if (a.isUpcoming && b.isLive) return 1;
      if (a.isLive && b.isUpcoming) return -1;

      // Among upcoming, sort by match time
      if (a.isUpcoming && b.isUpcoming) {
        return (a.matchTime || '').localeCompare(b.matchTime || '');
      }

      // Among live, sort by alert level
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

    return NextResponse.json({
      success: true,
      alerts,
      stats,
      count: alerts.length,
    });
  } catch (error: any) {
    console.error('Live alerts error:', error);
    return NextResponse.json({ success: false, alerts: [], stats: {}, message: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
