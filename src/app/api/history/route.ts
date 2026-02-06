/**
 * API Route: Historical Predictions
 *
 * Endpoints:
 * - GET /api/history          → Returns all available dates with prediction counts & stats
 * - GET /api/history?date=YYYY-MM-DD → Returns predictions for a specific date
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function formatDateTurkish(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
}

function getTodayIstanbul(): string {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const istanbulTime = new Date(utcTime + 3 * 3600000);
  return istanbulTime.toISOString().split('T')[0];
}

export async function GET(request: Request) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Veritabanı bağlantısı yok' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    // If a specific date is requested, return predictions for that date
    if (date) {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('match_date', date)
        .order('match_time', { ascending: true })
        .order('confidence', { ascending: false });

      if (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
      }

      const predictions = (data || []).map((pred: any) => ({
        id: pred.id,
        home_team: pred.home_team || '',
        away_team: pred.away_team || '',
        league: pred.league || '',
        match_date: pred.match_date || '',
        match_date_formatted: formatDateTurkish(pred.match_date || date),
        match_time: pred.match_time || '',
        prediction: pred.prediction || '',
        confidence: pred.confidence || 0,
        alternative_predictions: (pred.alternative_predictions || []).map((alt: any) => ({
          tahmin: alt.bet || alt.tahmin || '',
          guven: alt.confidence || alt.güven || 0,
          not: alt.note || alt.not || ''
        })),
        matched_rules: (pred.matched_rules || []).map((r: any) => ({
          kural_id: r.rule_id || r.kural_id || '',
          kural_adi: r.rule_name || r.kural_adı || ''
        })),
        note: pred.note || '',
        home_score: pred.home_score ?? null,
        away_score: pred.away_score ?? null,
        halftime_home: pred.halftime_home ?? null,
        halftime_away: pred.halftime_away ?? null,
        is_live: pred.is_live || false,
        is_finished: pred.is_finished || false,
        live_status: pred.live_status || 'not_started',
        elapsed: pred.elapsed ?? null,
        prediction_result: pred.prediction_result ?? null,
      }));

      // Calculate stats for this date
      const total = predictions.length;
      const finished = predictions.filter((p: any) => p.is_finished).length;
      const won = predictions.filter((p: any) => p.prediction_result === 'won').length;
      const lost = predictions.filter((p: any) => p.prediction_result === 'lost').length;
      const live = predictions.filter((p: any) => p.is_live).length;
      const pending = total - finished - live;

      return NextResponse.json({
        success: true,
        date,
        date_formatted: formatDateTurkish(date),
        stats: { total, finished, won, lost, live, pending },
        predictions,
      });
    }

    // No date specified: return summary of all available dates
    const { data, error } = await supabase
      .from('predictions')
      .select('match_date, is_finished, is_live, prediction_result')
      .order('match_date', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    // Group by date
    const dateMap: Record<string, { total: number; finished: number; won: number; lost: number; live: number }> = {};
    for (const pred of (data || [])) {
      const d = pred.match_date;
      if (!dateMap[d]) {
        dateMap[d] = { total: 0, finished: 0, won: 0, lost: 0, live: 0 };
      }
      dateMap[d].total++;
      if (pred.is_finished) dateMap[d].finished++;
      if (pred.prediction_result === 'won') dateMap[d].won++;
      if (pred.prediction_result === 'lost') dateMap[d].lost++;
      if (pred.is_live) dateMap[d].live++;
    }

    const today = getTodayIstanbul();
    const dates = Object.entries(dateMap)
      .map(([date, stats]) => ({
        date,
        date_formatted: formatDateTurkish(date),
        is_today: date === today,
        is_future: date > today,
        ...stats,
        success_rate: stats.finished > 0 ? Math.round((stats.won / stats.finished) * 100) : null,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return NextResponse.json({
      success: true,
      dates,
      total_dates: dates.length,
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
