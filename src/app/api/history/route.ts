/**
 * API Route: Historical Predictions
 *
 * Endpoints:
 * - GET /api/history                    → Returns all available dates with prediction counts & stats
 * - GET /api/history?date=YYYY-MM-DD   → Returns predictions for a specific date
 * - GET /api/history?stats=all          → Returns comprehensive statistics (league, type, confidence, trends, rules)
 */

import { NextResponse } from 'next/server';
import { supabaseSelect } from '@/lib/supabase';
import { formatDateTurkish, getTodayDate } from '@/lib/dates';
import { toBooleanResult } from '@/lib/predictions';

function isWon(p: any): boolean { return toBooleanResult(p.prediction_result) === true; }
function isLost(p: any): boolean { return toBooleanResult(p.prediction_result) === false; }
function isFinished(p: any): boolean { return !!p.is_finished; }

function getPredictionType(prediction: string): string {
  const pred = prediction.toUpperCase().trim();
  if (pred.startsWith('IY ')) {
    if (pred.includes('UST') || pred.includes('ALT')) return 'IY Üst/Alt';
    if (pred.includes('KG')) return 'IY KG';
    if (pred.includes('MS') || pred.includes('EV') || pred.includes('DEP')) return 'IY Sonuç';
    return 'IY Diğer';
  }
  if (pred.includes('KG')) return 'KG Var/Yok';
  if (pred.startsWith('MS ') && (pred.includes('1') || pred.includes('2') || pred.includes('X'))) {
    if (pred.includes('EV') || pred.includes('DEP')) return 'Takım Gol';
    return 'Maç Sonucu';
  }
  if (pred.includes('UST') || pred.includes('ALT')) return 'MS Üst/Alt';
  return 'Diğer';
}

function getConfidenceRange(confidence: number): string {
  if (confidence >= 95) return '95-100';
  if (confidence >= 90) return '90-94';
  if (confidence >= 85) return '85-89';
  if (confidence >= 80) return '80-84';
  return '75-79';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const stats = searchParams.get('stats');

    // Comprehensive statistics
    if (stats === 'all') {
      const allData = await supabaseSelect(
        'predictions',
        'select=match_date,league,prediction,confidence,prediction_result,is_finished,is_live,matched_rules&order=match_date.desc'
      );

      if (!allData || allData.length === 0) {
        return NextResponse.json({ success: true, stats: null });
      }

      const finished = allData.filter(isFinished);
      const won = finished.filter(isWon);
      const lost = finished.filter(isLost);

      // 1. League stats
      const leagueMap: Record<string, { total: number; won: number; lost: number }> = {};
      for (const p of finished) {
        const league = p.league || 'Bilinmeyen';
        if (!leagueMap[league]) leagueMap[league] = { total: 0, won: 0, lost: 0 };
        leagueMap[league].total++;
        if (isWon(p)) leagueMap[league].won++;
        if (isLost(p)) leagueMap[league].lost++;
      }
      const leagueStats = Object.entries(leagueMap)
        .map(([league, s]) => ({
          league,
          total: s.total,
          won: s.won,
          lost: s.lost,
          rate: s.total > 0 ? Math.round((s.won / s.total) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total);

      // 2. Prediction type stats
      const typeMap: Record<string, { total: number; won: number; lost: number }> = {};
      for (const p of finished) {
        const type = getPredictionType(p.prediction || '');
        if (!typeMap[type]) typeMap[type] = { total: 0, won: 0, lost: 0 };
        typeMap[type].total++;
        if (isWon(p)) typeMap[type].won++;
        if (isLost(p)) typeMap[type].lost++;
      }
      const typeStats = Object.entries(typeMap)
        .map(([type, s]) => ({
          type,
          total: s.total,
          won: s.won,
          lost: s.lost,
          rate: s.total > 0 ? Math.round((s.won / s.total) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total);

      // 3. Confidence range stats
      const confMap: Record<string, { total: number; won: number; lost: number }> = {};
      for (const p of finished) {
        const range = getConfidenceRange(p.confidence || 0);
        if (!confMap[range]) confMap[range] = { total: 0, won: 0, lost: 0 };
        confMap[range].total++;
        if (isWon(p)) confMap[range].won++;
        if (isLost(p)) confMap[range].lost++;
      }
      const confidenceStats = Object.entries(confMap)
        .map(([range, s]) => ({
          range: `%${range}`,
          total: s.total,
          won: s.won,
          lost: s.lost,
          rate: s.total > 0 ? Math.round((s.won / s.total) * 100) : 0,
        }))
        .sort((a, b) => b.range.localeCompare(a.range));

      // 4. Daily trend (last 14 days)
      const dateMap: Record<string, { total: number; won: number; lost: number }> = {};
      for (const p of finished) {
        const d = p.match_date;
        if (!dateMap[d]) dateMap[d] = { total: 0, won: 0, lost: 0 };
        dateMap[d].total++;
        if (isWon(p)) dateMap[d].won++;
        if (isLost(p)) dateMap[d].lost++;
      }
      const dailyTrend = Object.entries(dateMap)
        .map(([date, s]) => ({
          date,
          date_formatted: formatDateTurkish(date),
          total: s.total,
          won: s.won,
          lost: s.lost,
          rate: s.total > 0 ? Math.round((s.won / s.total) * 100) : 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14);

      // 5. Rule stats
      const ruleMap: Record<string, { name: string; total: number; won: number; lost: number }> = {};
      for (const p of finished) {
        const rules = p.matched_rules || [];
        for (const r of rules) {
          const ruleId = r.rule_id || r.kural_id || '';
          const ruleName = r.rule_name || r.kural_adı || r.kural_adi || ruleId;
          if (!ruleId) continue;
          if (!ruleMap[ruleId]) ruleMap[ruleId] = { name: ruleName, total: 0, won: 0, lost: 0 };
          ruleMap[ruleId].total++;
          if (isWon(p)) ruleMap[ruleId].won++;
          if (isLost(p)) ruleMap[ruleId].lost++;
        }
      }
      const ruleStats = Object.entries(ruleMap)
        .map(([ruleId, s]) => ({
          rule_id: ruleId,
          name: s.name,
          total: s.total,
          won: s.won,
          lost: s.lost,
          rate: s.total > 0 ? Math.round((s.won / s.total) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total);

      return NextResponse.json({
        success: true,
        stats: {
          overall: {
            total_predictions: allData.length,
            finished: finished.length,
            won: won.length,
            lost: lost.length,
            pending: allData.length - finished.length,
            overall_rate: finished.length > 0 ? Math.round((won.length / finished.length) * 100) : 0,
            total_days: Object.keys(dateMap).length,
          },
          by_league: leagueStats,
          by_type: typeStats,
          by_confidence: confidenceStats,
          daily_trend: dailyTrend,
          by_rule: ruleStats,
        },
      });
    }

    if (date) {
      const data = await supabaseSelect(
        'predictions',
        `match_date=eq.${date}&order=match_time.asc,confidence.desc&select=*`
      );

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

      const total = predictions.length;
      const finished = predictions.filter((p: any) => p.is_finished).length;
      const won = predictions.filter((p: any) => p.prediction_result === 'won' || p.prediction_result === 'true' || p.prediction_result === true).length;
      const lost = predictions.filter((p: any) => p.prediction_result === 'lost' || p.prediction_result === 'false' || p.prediction_result === false).length;
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

    // No date: return summary of all dates
    const data = await supabaseSelect(
      'predictions',
      'select=match_date,is_finished,is_live,prediction_result&order=match_date.desc'
    );

    const dateMap: Record<string, { total: number; finished: number; won: number; lost: number; live: number }> = {};
    for (const pred of (data || [])) {
      const d = pred.match_date;
      if (!dateMap[d]) {
        dateMap[d] = { total: 0, finished: 0, won: 0, lost: 0, live: 0 };
      }
      dateMap[d].total++;
      if (pred.is_finished) dateMap[d].finished++;
      if (pred.prediction_result === 'won' || pred.prediction_result === 'true' || pred.prediction_result === true) dateMap[d].won++;
      if (pred.prediction_result === 'lost' || pred.prediction_result === 'false' || pred.prediction_result === false) dateMap[d].lost++;
      if (pred.is_live) dateMap[d].live++;
    }

    const today = getTodayDate();
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
export const revalidate = 0;
