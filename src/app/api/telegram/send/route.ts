/**
 * API Route: Telegram Notification Sender
 * Sends alert messages via Telegram Bot API
 */

import { NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

async function sendTelegramMessage(text: string): Promise<{ ok: boolean; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return { ok: false, error: 'Missing env vars' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'HTML',
      }),
    });
    const body = await res.json();
    if (!body.ok) {
      console.error('Telegram API error:', body);
      return { ok: false, error: body.description || 'Unknown Telegram error' };
    }
    return { ok: true };
  } catch (e: any) {
    console.error('Telegram fetch error:', e);
    return { ok: false, error: e.message || 'Fetch failed' };
  }
}

function formatAlertMessage(data: any): string {
  const { type, homeTeam, awayTeam, prediction, goalsNeeded, score, elapsed, confidence, league } = data;

  if (type === 'hot_alert') {
    return [
      `🔥 <b>SICAK ALARM!</b>`,
      ``,
      `⚽ <b>${homeTeam} vs ${awayTeam}</b>`,
      `🏆 ${league || ''}`,
      `📊 Skor: <b>${score}</b> (${elapsed}')`,
      ``,
      `🎯 Tahmin: <b>${prediction}</b> (%${confidence})`,
      `⚡ ${goalsNeeded === 1 ? '1 GOL KALA!' : `${goalsNeeded} gol kala`}`,
      ``,
      `#WestAnalyze #CanlıAlarm`
    ].join('\n');
  }

  if (type === 'prediction_hit') {
    return [
      `✅ <b>TAHMIN TUTTU!</b>`,
      ``,
      `⚽ <b>${homeTeam} vs ${awayTeam}</b>`,
      `📊 Skor: <b>${score}</b>`,
      `🎯 ${prediction} (%${confidence})`,
      ``,
      `#WestAnalyze #Tuttu`
    ].join('\n');
  }

  if (type === 'daily_summary') {
    const { won, total, rate } = data;
    return [
      `📊 <b>GUNLUK OZET</b>`,
      ``,
      `✅ Tuttu: ${won}/${total}`,
      `📈 Basari: %${rate}`,
      ``,
      `#WestAnalyze #GunlukOzet`
    ].join('\n');
  }

  return `📢 ${JSON.stringify(data)}`;
}

export async function POST(request: Request) {
  // Auth check
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Direct send mode (bypass formatter)
    if (body.message && typeof body.message === 'string') {
      const result = await sendTelegramMessage(body.message);
      return NextResponse.json({
        success: result.ok,
        hasToken: !!TELEGRAM_BOT_TOKEN,
        hasChatId: !!TELEGRAM_CHAT_ID,
        tokenPrefix: TELEGRAM_BOT_TOKEN.substring(0, 5) + '...',
        chatId: TELEGRAM_CHAT_ID,
        error: result.error,
      });
    }

    const message = formatAlertMessage(body);
    const result = await sendTelegramMessage(message);

    return NextResponse.json({
      success: result.ok,
      hasToken: !!TELEGRAM_BOT_TOKEN,
      hasChatId: !!TELEGRAM_CHAT_ID,
      error: result.error,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
