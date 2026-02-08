/**
 * API Route: Rule Discovery Engine
 *
 * Analyzes historical prediction results to discover new potential golden rules.
 * Looks at odds patterns where predictions were consistently successful.
 *
 * GET /api/engine/discover-rules
 * Requires admin auth (CRON_SECRET or admin token)
 *
 * Returns:
 * - Discovered patterns with success rates
 * - Suggested new rules based on data
 * - Existing rule performance
 */

import { NextResponse } from 'next/server';
import { supabaseSelect, verifyAdminAuth } from '@/lib/supabase';

interface PredictionRecord {
  prediction: string;
  confidence: number;
  prediction_result: boolean | null | string;
  is_finished: boolean;
  matched_rules: any[];
  league: string;
  home_team: string;
  away_team: string;
  match_date: string;
  source: string;
}

interface PatternCandidate {
  pattern_id: string;
  description: string;
  prediction_type: string;
  total_matches: number;
  won: number;
  lost: number;
  success_rate: number;
  avg_confidence: number;
  sample_matches: Array<{
    match: string;
    date: string;
    league: string;
    result: string;
  }>;
  score: number; // Overall quality score
}

interface RulePerformance {
  rule_id: string;
  name: string;
  total: number;
  won: number;
  lost: number;
  success_rate: number;
  status: 'excellent' | 'good' | 'average' | 'poor';
}

function isWon(result: any): boolean {
  return result === true || result === 'true' || result === 'won';
}

function isLost(result: any): boolean {
  return result === false || result === 'false' || result === 'lost';
}

function getPredType(pred: string): string {
  const p = (pred || '').toUpperCase().trim();
  if (p.startsWith('İY') || p.startsWith('IY')) return 'IY';
  if (p.includes('KG')) return 'KG';
  if (p.includes('ÜST') || p.includes('UST') || p.includes('ALT')) return 'ÜSTALT';
  if (p.includes('MS')) return 'MS';
  return 'DİĞER';
}

export async function GET(request: Request) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ success: false, error: 'Yetkisiz erişim' }, { status: 401 });
  }

  try {
    // Fetch all finished predictions with their details
    const data = await supabaseSelect(
      'predictions',
      'is_finished=eq.true&select=prediction,confidence,prediction_result,is_finished,matched_rules,league,home_team,away_team,match_date,source&order=match_date.desc'
    );

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Henüz yeterli veri yok',
        total_analyzed: 0,
        patterns: [],
        rule_performance: [],
        insights: [],
      });
    }

    const predictions: PredictionRecord[] = data;
    const finished = predictions.filter(p => p.is_finished);

    // ===== 1. RULE PERFORMANCE ANALYSIS =====
    const ruleMap: Record<string, { name: string; total: number; won: number; lost: number }> = {};
    for (const p of finished) {
      const rules = p.matched_rules || [];
      for (const r of rules) {
        const id = r.rule_id || r.kural_id || '';
        const name = r.rule_name || r.kural_adı || r.kural_adi || id;
        if (!id) continue;
        if (!ruleMap[id]) ruleMap[id] = { name, total: 0, won: 0, lost: 0 };
        ruleMap[id].total++;
        if (isWon(p.prediction_result)) ruleMap[id].won++;
        if (isLost(p.prediction_result)) ruleMap[id].lost++;
      }
    }

    const rulePerformance: RulePerformance[] = Object.entries(ruleMap)
      .filter(([, s]) => s.total >= 2)
      .map(([id, s]) => {
        const rate = s.total > 0 ? Math.round((s.won / s.total) * 100) : 0;
        let status: 'excellent' | 'good' | 'average' | 'poor';
        if (rate >= 80) status = 'excellent';
        else if (rate >= 65) status = 'good';
        else if (rate >= 50) status = 'average';
        else status = 'poor';
        return { rule_id: id, name: s.name, total: s.total, won: s.won, lost: s.lost, success_rate: rate, status };
      })
      .sort((a, b) => b.success_rate - a.success_rate || b.total - a.total);

    // ===== 2. PREDICTION TYPE PATTERNS =====
    const typeMap: Record<string, { total: number; won: number; lost: number; preds: PredictionRecord[] }> = {};
    for (const p of finished) {
      const type = getPredType(p.prediction);
      if (!typeMap[type]) typeMap[type] = { total: 0, won: 0, lost: 0, preds: [] };
      typeMap[type].total++;
      if (isWon(p.prediction_result)) typeMap[type].won++;
      if (isLost(p.prediction_result)) typeMap[type].lost++;
      typeMap[type].preds.push(p);
    }

    // ===== 3. LEAGUE PATTERNS =====
    const leagueMap: Record<string, { total: number; won: number; lost: number; preds: PredictionRecord[] }> = {};
    for (const p of finished) {
      const league = p.league || 'Bilinmeyen';
      if (!leagueMap[league]) leagueMap[league] = { total: 0, won: 0, lost: 0, preds: [] };
      leagueMap[league].total++;
      if (isWon(p.prediction_result)) leagueMap[league].won++;
      if (isLost(p.prediction_result)) leagueMap[league].lost++;
      leagueMap[league].preds.push(p);
    }

    // ===== 4. CONFIDENCE RANGE PATTERNS =====
    const confRanges: Record<string, { total: number; won: number; lost: number }> = {};
    for (const p of finished) {
      const conf = p.confidence || 0;
      let range: string;
      if (conf >= 95) range = '95-100';
      else if (conf >= 90) range = '90-94';
      else if (conf >= 85) range = '85-89';
      else if (conf >= 80) range = '80-84';
      else range = '<80';
      if (!confRanges[range]) confRanges[range] = { total: 0, won: 0, lost: 0 };
      confRanges[range].total++;
      if (isWon(p.prediction_result)) confRanges[range].won++;
      if (isLost(p.prediction_result)) confRanges[range].lost++;
    }

    // ===== 5. DISCOVER PATTERNS =====
    const patterns: PatternCandidate[] = [];

    // 5a. League + prediction type combos
    const leagueTypeMap: Record<string, { total: number; won: number; lost: number; avgConf: number; samples: PredictionRecord[] }> = {};
    for (const p of finished) {
      const key = `${p.league || 'Bilinmeyen'}|${getPredType(p.prediction)}`;
      if (!leagueTypeMap[key]) leagueTypeMap[key] = { total: 0, won: 0, lost: 0, avgConf: 0, samples: [] };
      leagueTypeMap[key].total++;
      if (isWon(p.prediction_result)) leagueTypeMap[key].won++;
      if (isLost(p.prediction_result)) leagueTypeMap[key].lost++;
      leagueTypeMap[key].avgConf += p.confidence || 0;
      if (leagueTypeMap[key].samples.length < 5) leagueTypeMap[key].samples.push(p);
    }

    for (const [key, val] of Object.entries(leagueTypeMap)) {
      if (val.total < 3) continue;
      const [league, type] = key.split('|');
      const rate = Math.round((val.won / val.total) * 100);
      if (rate < 60) continue; // Only interesting if above 60%

      const score = rate * Math.log2(val.total + 1); // Reward both rate and volume
      patterns.push({
        pattern_id: `league-type-${key.replace(/[^a-zA-Z0-9]/g, '-')}`,
        description: `${league} liginde ${type} tipi tahminler`,
        prediction_type: type,
        total_matches: val.total,
        won: val.won,
        lost: val.lost,
        success_rate: rate,
        avg_confidence: Math.round(val.avgConf / val.total),
        sample_matches: val.samples.map(p => ({
          match: `${p.home_team} vs ${p.away_team}`,
          date: p.match_date,
          league: p.league,
          result: isWon(p.prediction_result) ? 'Kazandı' : 'Kaybetti',
        })),
        score,
      });
    }

    // 5b. Specific prediction patterns (exact prediction text)
    const predMap: Record<string, { total: number; won: number; lost: number; samples: PredictionRecord[] }> = {};
    for (const p of finished) {
      const pred = (p.prediction || '').trim();
      if (!predMap[pred]) predMap[pred] = { total: 0, won: 0, lost: 0, samples: [] };
      predMap[pred].total++;
      if (isWon(p.prediction_result)) predMap[pred].won++;
      if (isLost(p.prediction_result)) predMap[pred].lost++;
      if (predMap[pred].samples.length < 3) predMap[pred].samples.push(p);
    }

    for (const [pred, val] of Object.entries(predMap)) {
      if (val.total < 3) continue;
      const rate = Math.round((val.won / val.total) * 100);
      if (rate < 65) continue;

      const score = rate * Math.log2(val.total + 1);
      patterns.push({
        pattern_id: `pred-${pred.replace(/[^a-zA-Z0-9]/g, '-')}`,
        description: `"${pred}" tahmini`,
        prediction_type: getPredType(pred),
        total_matches: val.total,
        won: val.won,
        lost: val.lost,
        success_rate: rate,
        avg_confidence: 0,
        sample_matches: val.samples.map(p => ({
          match: `${p.home_team} vs ${p.away_team}`,
          date: p.match_date,
          league: p.league,
          result: isWon(p.prediction_result) ? 'Kazandı' : 'Kaybetti',
        })),
        score,
      });
    }

    // 5c. Source-based patterns
    const sourceMap: Record<string, { total: number; won: number; lost: number }> = {};
    for (const p of finished) {
      const src = p.source || 'excel';
      if (!sourceMap[src]) sourceMap[src] = { total: 0, won: 0, lost: 0 };
      sourceMap[src].total++;
      if (isWon(p.prediction_result)) sourceMap[src].won++;
      if (isLost(p.prediction_result)) sourceMap[src].lost++;
    }

    // Sort patterns by score
    patterns.sort((a, b) => b.score - a.score);

    // ===== 6. GENERATE INSIGHTS =====
    const insights: string[] = [];

    // Overall stats
    const totalFinished = finished.length;
    const totalWon = finished.filter(p => isWon(p.prediction_result)).length;
    const overallRate = totalFinished > 0 ? Math.round((totalWon / totalFinished) * 100) : 0;
    insights.push(`Toplam ${totalFinished} sonuçlanmış tahmin, %${overallRate} başarı oranı`);

    // Best prediction type
    const bestType = Object.entries(typeMap)
      .filter(([, v]) => v.total >= 3)
      .sort((a, b) => {
        const rateA = a[1].total > 0 ? a[1].won / a[1].total : 0;
        const rateB = b[1].total > 0 ? b[1].won / b[1].total : 0;
        return rateB - rateA;
      })[0];
    if (bestType) {
      const rate = Math.round((bestType[1].won / bestType[1].total) * 100);
      insights.push(`En başarılı tahmin tipi: ${bestType[0]} (%${rate}, ${bestType[1].total} maç)`);
    }

    // Best league
    const bestLeague = Object.entries(leagueMap)
      .filter(([, v]) => v.total >= 3)
      .sort((a, b) => {
        const rateA = a[1].total > 0 ? a[1].won / a[1].total : 0;
        const rateB = b[1].total > 0 ? b[1].won / b[1].total : 0;
        return rateB - rateA;
      })[0];
    if (bestLeague) {
      const rate = Math.round((bestLeague[1].won / bestLeague[1].total) * 100);
      insights.push(`En başarılı lig: ${bestLeague[0]} (%${rate}, ${bestLeague[1].total} maç)`);
    }

    // Best confidence range
    const bestConf = Object.entries(confRanges)
      .filter(([, v]) => v.total >= 3)
      .sort((a, b) => {
        const rateA = a[1].total > 0 ? a[1].won / a[1].total : 0;
        const rateB = b[1].total > 0 ? b[1].won / b[1].total : 0;
        return rateB - rateA;
      })[0];
    if (bestConf) {
      const rate = Math.round((bestConf[1].won / bestConf[1].total) * 100);
      insights.push(`En iyi güven aralığı: %${bestConf[0]} (%${rate} başarı)`);
    }

    // Source comparison
    for (const [src, val] of Object.entries(sourceMap)) {
      if (val.total >= 2) {
        const rate = Math.round((val.won / val.total) * 100);
        const label = src === 'api-engine' ? 'API Motor' : src === 'excel-upload' ? 'Excel' : 'Manuel';
        insights.push(`${label} kaynağı: %${rate} başarı (${val.total} maç)`);
      }
    }

    // Underperforming rules warning
    const poorRules = rulePerformance.filter(r => r.status === 'poor' && r.total >= 3);
    if (poorRules.length > 0) {
      insights.push(`⚠️ ${poorRules.length} kural düşük performans gösteriyor (<50% başarı)`);
    }

    return NextResponse.json({
      success: true,
      total_analyzed: finished.length,
      overall_success_rate: overallRate,
      patterns: patterns.slice(0, 20), // Top 20 patterns
      rule_performance: rulePerformance,
      source_stats: Object.entries(sourceMap).map(([src, val]) => ({
        source: src,
        total: val.total,
        won: val.won,
        lost: val.lost,
        rate: val.total > 0 ? Math.round((val.won / val.total) * 100) : 0,
      })),
      confidence_stats: Object.entries(confRanges).map(([range, val]) => ({
        range,
        total: val.total,
        won: val.won,
        lost: val.lost,
        rate: val.total > 0 ? Math.round((val.won / val.total) * 100) : 0,
      })).sort((a, b) => b.range.localeCompare(a.range)),
      type_stats: Object.entries(typeMap).map(([type, val]) => ({
        type,
        total: val.total,
        won: val.won,
        lost: val.lost,
        rate: val.total > 0 ? Math.round((val.won / val.total) * 100) : 0,
      })).sort((a, b) => b.total - a.total),
      insights,
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Analiz hatası',
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
