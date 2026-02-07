/**
 * Telegram Bot Webhook - Komut handler
 *
 * Komutlar:
 * /bugun - Bugunku tahminler
 * /canli - Canli maclar ve skorlar
 * /sicak - Sicak alarmlar (1 gol kala)
 * /istatistik - Basari oranlari
 * /yarin - Yarinki tahminler
 * /help - Komut listesi
 */

import { NextResponse } from 'next/server';
import { supabaseSelect } from '@/lib/supabase';
import { getTodayDate, getYesterdayDate, getTargetDate } from '@/lib/dates';
import { calculateAlertState } from '@/lib/alert-logic';
import { toBooleanResult } from '@/lib/predictions';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

async function reply(chatId: string | number, text: string) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  }).catch(() => {});
}

// /bugun komutu
async function handleBugun(chatId: string | number) {
  const today = getTodayDate();
  const preds = await supabaseSelect('predictions', `match_date=eq.${today}&order=match_time.asc&select=*`);

  if (!preds || preds.length === 0) {
    return reply(chatId, '📋 Bugun icin tahmin yok.');
  }

  const live = preds.filter((p: any) => p.is_live);
  const upcoming = preds.filter((p: any) => !p.is_live && !p.is_finished);
  const finished = preds.filter((p: any) => p.is_finished);
  const won = finished.filter((p: any) => toBooleanResult(p.prediction_result) === true).length;
  const lost = finished.filter((p: any) => toBooleanResult(p.prediction_result) === false).length;

  let msg = `📋 <b>BUGUNUN TAHMINLERI</b> (${today})\n`;
  msg += `📊 Toplam: ${preds.length} | Canli: ${live.length} | Bekleyen: ${upcoming.length} | Biten: ${finished.length}\n`;
  if (finished.length > 0) {
    msg += `✅ ${won} tuttu | ❌ ${lost} yatti\n`;
  }
  msg += `\n`;

  // Canli maclar
  if (live.length > 0) {
    msg += `⚽ <b>CANLI:</b>\n`;
    for (const p of live.slice(0, 8)) {
      const score = `${p.home_score ?? '?'}-${p.away_score ?? '?'}`;
      msg += `  ${p.home_team} ${score} ${p.away_team} (${p.elapsed}')\n`;
      msg += `  🎯 ${p.prediction} %${p.confidence}\n`;
    }
    msg += `\n`;
  }

  // Bekleyen maclar
  if (upcoming.length > 0) {
    msg += `⏰ <b>BEKLEYEN:</b>\n`;
    for (const p of upcoming.slice(0, 8)) {
      msg += `  ${p.match_time} | ${p.home_team} - ${p.away_team}\n`;
      msg += `  🎯 ${p.prediction} %${p.confidence}\n`;
    }
    msg += `\n`;
  }

  // Biten maclar (son 5)
  if (finished.length > 0) {
    msg += `🏁 <b>BITEN:</b>\n`;
    for (const p of finished.slice(-5)) {
      const result = toBooleanResult(p.prediction_result);
      const emoji = result === true ? '✅' : result === false ? '❌' : '⏳';
      const score = `${p.home_score ?? '?'}-${p.away_score ?? '?'}`;
      msg += `  ${emoji} ${p.home_team} ${score} ${p.away_team}\n`;
      msg += `     ${p.prediction} %${p.confidence}\n`;
    }
  }

  return reply(chatId, msg);
}

// /canli komutu
async function handleCanli(chatId: string | number) {
  const today = getTodayDate();
  const preds = await supabaseSelect('predictions', `match_date=eq.${today}&is_live=eq.true&order=elapsed.desc&select=*`);

  if (!preds || preds.length === 0) {
    return reply(chatId, '⚽ Su anda canli mac yok.');
  }

  let msg = `⚽ <b>CANLI MACLAR</b> (${preds.length} mac)\n\n`;

  for (const p of preds.slice(0, 10)) {
    const score = `${p.home_score ?? 0}-${p.away_score ?? 0}`;
    msg += `<b>${p.home_team} ${score} ${p.away_team}</b> (${p.elapsed}')\n`;
    msg += `🏆 ${p.league}\n`;
    msg += `🎯 ${p.prediction} %${p.confidence}\n`;

    // Alert durumu
    if (p.home_score !== null && p.away_score !== null) {
      const alert = calculateAlertState(p.prediction, p.home_score, p.away_score, p.elapsed, p.halftime_home, p.halftime_away);
      if (alert) {
        if (alert.isAlreadyHit) msg += `✅ Tahmin tuttu!\n`;
        else if (alert.alertLevel === 'hot') msg += `🔥 ${alert.message}\n`;
        else if (alert.alertLevel === 'warm') msg += `🟡 ${alert.message}\n`;
      }
    }
    msg += `\n`;
  }

  return reply(chatId, msg);
}

// /sicak komutu
async function handleSicak(chatId: string | number) {
  const today = getTodayDate();
  const preds = await supabaseSelect('predictions', `match_date=eq.${today}&is_live=eq.true&select=*`);

  if (!preds || preds.length === 0) {
    return reply(chatId, '🔥 Su anda canli mac yok, sicak alarm da yok.');
  }

  const hotAlerts: string[] = [];

  for (const p of preds) {
    if (p.home_score === null || p.away_score === null) continue;
    const alert = calculateAlertState(p.prediction, p.home_score, p.away_score, p.elapsed, p.halftime_home, p.halftime_away);
    if (alert && alert.alertLevel === 'hot' && !alert.isAlreadyHit) {
      const score = `${p.home_score}-${p.away_score}`;
      hotAlerts.push(
        `🔥 <b>${p.home_team} ${score} ${p.away_team}</b> (${p.elapsed}')\n` +
        `   🎯 ${p.prediction} %${p.confidence}\n` +
        `   ⚡ ${alert.message}\n` +
        `   🏆 ${p.league}`
      );
    }
  }

  if (hotAlerts.length === 0) {
    return reply(chatId, '🔥 Su anda sicak alarm yok. Maclar devam ediyor...');
  }

  let msg = `🔥 <b>SICAK ALARMLAR</b> (${hotAlerts.length})\n\n`;
  msg += hotAlerts.join('\n\n');
  return reply(chatId, msg);
}

// /istatistik komutu
async function handleIstatistik(chatId: string | number) {
  const today = getTodayDate();
  const yesterday = getYesterdayDate();

  const [todayPreds, yesterdayPreds] = await Promise.all([
    supabaseSelect('predictions', `match_date=eq.${today}&select=*`),
    supabaseSelect('predictions', `match_date=eq.${yesterday}&select=*`),
  ]);

  let msg = `📊 <b>ISTATISTIKLER</b>\n\n`;

  // Bugun
  if (todayPreds && todayPreds.length > 0) {
    const tFinished = todayPreds.filter((p: any) => p.is_finished);
    const tWon = tFinished.filter((p: any) => toBooleanResult(p.prediction_result) === true).length;
    const tLost = tFinished.filter((p: any) => toBooleanResult(p.prediction_result) === false).length;
    const tLive = todayPreds.filter((p: any) => p.is_live).length;
    const tUpcoming = todayPreds.filter((p: any) => !p.is_live && !p.is_finished).length;
    const tRate = tFinished.length > 0 ? Math.round((tWon / tFinished.length) * 100) : 0;

    msg += `📅 <b>Bugun (${today}):</b>\n`;
    msg += `   Toplam: ${todayPreds.length} tahmin\n`;
    msg += `   Canli: ${tLive} | Bekleyen: ${tUpcoming} | Biten: ${tFinished.length}\n`;
    if (tFinished.length > 0) {
      msg += `   ✅ ${tWon} tuttu | ❌ ${tLost} yatti | %${tRate} basari\n`;
    }
    msg += `\n`;
  }

  // Dun
  if (yesterdayPreds && yesterdayPreds.length > 0) {
    const yFinished = yesterdayPreds.filter((p: any) => p.is_finished);
    const yWon = yFinished.filter((p: any) => toBooleanResult(p.prediction_result) === true).length;
    const yLost = yFinished.filter((p: any) => toBooleanResult(p.prediction_result) === false).length;
    const yRate = yFinished.length > 0 ? Math.round((yWon / yFinished.length) * 100) : 0;

    msg += `📅 <b>Dun (${yesterday}):</b>\n`;
    msg += `   Toplam: ${yesterdayPreds.length} tahmin\n`;
    msg += `   ✅ ${yWon} tuttu | ❌ ${yLost} yatti | %${yRate} basari\n`;
    msg += `\n`;
  }

  // Genel (son 7 gun)
  const allPreds = [...(todayPreds || []), ...(yesterdayPreds || [])];
  const allFinished = allPreds.filter((p: any) => p.is_finished);
  const allWon = allFinished.filter((p: any) => toBooleanResult(p.prediction_result) === true).length;
  const allRate = allFinished.length > 0 ? Math.round((allWon / allFinished.length) * 100) : 0;

  if (allFinished.length > 0) {
    msg += `📈 <b>Son 2 Gun Toplam:</b>\n`;
    msg += `   ${allFinished.length} biten mac | ✅ ${allWon} tuttu | %${allRate} basari\n`;
  }

  return reply(chatId, msg);
}

// /yarin komutu
async function handleYarin(chatId: string | number) {
  const tomorrow = getTargetDate('tomorrow');
  const preds = await supabaseSelect('predictions', `match_date=eq.${tomorrow}&order=match_time.asc&select=*`);

  if (!preds || preds.length === 0) {
    return reply(chatId, `📋 Yarin (${tomorrow}) icin henuz tahmin yok.`);
  }

  let msg = `📋 <b>YARINKI TAHMINLER</b> (${tomorrow})\n`;
  msg += `📊 Toplam: ${preds.length} tahmin\n\n`;

  for (const p of preds.slice(0, 12)) {
    msg += `⏰ <b>${p.match_time}</b> | ${p.home_team} - ${p.away_team}\n`;
    msg += `   🎯 ${p.prediction} %${p.confidence}\n`;
    msg += `   🏆 ${p.league}\n`;
  }

  if (preds.length > 12) {
    msg += `\n... ve ${preds.length - 12} tahmin daha`;
  }

  return reply(chatId, msg);
}

// /help komutu
async function handleHelp(chatId: string | number) {
  const msg = `🤖 <b>West Analyze Bot Komutlari</b>\n\n` +
    `/bugun - Bugunku tum tahminler\n` +
    `/canli - Canli maclar ve skorlar\n` +
    `/sicak - Sicak alarmlar (1 gol kala)\n` +
    `/istatistik - Basari oranlari\n` +
    `/yarin - Yarinki tahminler\n` +
    `/help - Bu mesaj\n\n` +
    `🌐 <a href="https://westbetpro.vercel.app/dashboard">Web Sitesi</a>`;
  return reply(chatId, msg);
}

export async function POST(request: Request) {
  try {
    const update = await request.json();

    // Extract message
    const message = update.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim().toLowerCase();

    // Route commands
    if (text === '/bugun' || text === '/bugun@westanalyzebot') {
      await handleBugun(chatId);
    } else if (text === '/canli' || text === '/canli@westanalyzebot') {
      await handleCanli(chatId);
    } else if (text === '/sicak' || text === '/sicak@westanalyzebot') {
      await handleSicak(chatId);
    } else if (text === '/istatistik' || text === '/istatistik@westanalyzebot' || text === '/stat') {
      await handleIstatistik(chatId);
    } else if (text === '/yarin' || text === '/yarin@westanalyzebot') {
      await handleYarin(chatId);
    } else if (text === '/help' || text === '/start' || text === '/help@westanalyzebot' || text === '/start@westanalyzebot') {
      await handleHelp(chatId);
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: true }); // Always 200 for Telegram
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 15;
