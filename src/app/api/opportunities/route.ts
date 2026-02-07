/**
 * API Route: Opportunities
 *
 * Data Sources (priority order):
 * 1. Local JSON files (data/opportunities_*.json) - for local dev with scheduler
 * 2. Supabase predictions table (direct REST API) - for Vercel/production
 *
 * Query params:
 * - date: 'yesterday' | 'today' | 'tomorrow' | 'day_after_tomorrow' (default: 'today')
 */

import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { toBooleanResult, checkPredictionResult } from '@/lib/predictions';
import { getTargetDate, formatDateTurkish } from '@/lib/dates';
import { supabaseSelect } from '@/lib/supabase';

// Try reading from local JSON file
function tryLocalFile(dateParam: string): any[] | null {
  try {
    let filename: string;
    if (dateParam === 'tomorrow') {
      filename = 'opportunities_tomorrow.json';
    } else if (dateParam === 'day_after_tomorrow') {
      filename = 'opportunities_day_after_tomorrow.json';
    } else {
      filename = 'opportunities_today.json';
    }

    const filepath = join(process.cwd(), 'data', filename);
    if (!existsSync(filepath)) return null;

    const content = readFileSync(filepath, 'utf-8');
    const data = JSON.parse(content);

    if (Array.isArray(data) && data.length > 0) return data;
    if (data?.opportunities && data.opportunities.length > 0) return data.opportunities;
    return null;
  } catch {
    return null;
  }
}

// Transform and validate opportunity
function transformOpportunity(opp: any, index: number): any | null {
  const hasTurkishKeys = opp['Ev Sahibi'] && opp['Deplasman'];

  let transformed;
  if (hasTurkishKeys) {
    transformed = {
      'Ev Sahibi': opp['Ev Sahibi'] || '',
      'Deplasman': opp['Deplasman'] || '',
      'Lig': opp['Lig'] || '',
      'Tarih': opp['Tarih'] || '',
      'Saat': opp['Saat'] || '',
      'best_prediction': opp['best_prediction'] || '',
      'best_confidence': opp['best_confidence'] || 0,
      'predictions': opp['predictions'] || [],
      'matched_rules': opp['matched_rules'] || [],
      'note': opp['note'] || '',
      'alternatif_tahminler': opp['alternatif_tahminler'] || [],
      'eşleşen_kurallar': opp['eşleşen_kurallar'] || [],
      'toplam_tahmin_sayısı': opp['toplam_tahmin_sayısı'] || 0,
      'live_status': opp['live_status'] || 'not_started',
      'home_score': opp['home_score'] ?? null,
      'away_score': opp['away_score'] ?? null,
      'halftime_home': opp['halftime_home'] ?? null,
      'halftime_away': opp['halftime_away'] ?? null,
      'elapsed': opp['elapsed'] ?? null,
      'is_live': opp['is_live'] || false,
      'is_finished': opp['is_finished'] || false,
      'prediction_result': toBooleanResult(opp['prediction_result'])
    };
  } else {
    const raw = opp._raw || {};
    transformed = {
      'Ev Sahibi': raw['Ev Sahibi'] || opp.home_team || '',
      'Deplasman': raw['Deplasman'] || opp.away_team || '',
      'Lig': raw['Lig'] || opp.league || '',
      'Tarih': raw['Tarih'] || opp.match_date || '',
      'Saat': raw['Saat'] || opp.match_time || '',
      'best_prediction': raw['best_prediction'] || opp.predicted_outcome || '',
      'best_confidence': raw['best_confidence'] || opp.confidence_score || 0,
      'predictions': raw['predictions'] || opp.alternative_predictions || [],
      'matched_rules': raw['matched_rules'] || opp.matched_rules || [],
      'note': raw['note'] || opp.note || ''
    };
  }

  const hasRequired =
    transformed['Ev Sahibi'] &&
    transformed['Deplasman'] &&
    transformed['best_prediction'] &&
    typeof transformed['best_confidence'] === 'number';

  if (!hasRequired) {
    console.warn(`Skipping malformed opportunity at index ${index}`);
    return null;
  }

  return transformed;
}

// Sort: by match time (earliest first), then by confidence (highest first)
function sortByMatchTime(opportunities: any[]): any[] {
  return opportunities.sort((a, b) => {
    const timeA = a['Saat'] || '99:99';
    const timeB = b['Saat'] || '99:99';
    if (timeA !== timeB) return timeA.localeCompare(timeB);
    return (b['best_confidence'] || 0) - (a['best_confidence'] || 0);
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || 'today';

    // Strategy 1: Try local JSON file
    let opportunities = tryLocalFile(date);

    // Strategy 2: Fall back to Supabase REST API
    if (!opportunities) {
      try {
        const targetDate = getTargetDate(date);
        const data = await supabaseSelect(
          'predictions',
          `match_date=eq.${targetDate}&order=match_time.asc,confidence.desc&select=*`
        );

        if (data && data.length > 0) {
          opportunities = data.map((pred: any) => {
            const isFinished = pred.is_finished || false;
            const homeScore = pred.home_score ?? null;
            const awayScore = pred.away_score ?? null;
            const htHome = pred.halftime_home ?? null;
            const htAway = pred.halftime_away ?? null;

            const mainResult = toBooleanResult(pred.prediction_result);

            // Deduplicate alternative predictions
            const seenBets = new Set<string>();
            const bestPredNorm = (pred.prediction || '').trim();
            seenBets.add(bestPredNorm);

            const altPreds: any[] = [];
            for (const alt of (pred.alternative_predictions || [])) {
              const altName = (alt.bet || alt.tahmin || '').trim();
              if (!altName || seenBets.has(altName)) continue;
              seenBets.add(altName);

              let altResult: boolean | null = null;
              if (isFinished && homeScore !== null && awayScore !== null) {
                altResult = checkPredictionResult(altName, homeScore, awayScore, htHome, htAway);
              }

              altPreds.push({
                tahmin: altName,
                güven: alt.confidence || alt.güven || 0,
                not: alt.note || alt.not || '',
                sonuç: altResult
              });
            }

            return {
              'Ev Sahibi': pred.home_team || '',
              'Deplasman': pred.away_team || '',
              'Lig': pred.league || '',
              'Tarih': formatDateTurkish(pred.match_date || targetDate),
              'Saat': pred.match_time || '',
              'best_prediction': pred.prediction || '',
              'best_confidence': pred.confidence || 0,
              'alternatif_tahminler': altPreds,
              'eşleşen_kurallar': (pred.matched_rules || []).map((r: any) => ({
                kural_id: r.rule_id || r.kural_id || '',
                kural_adı: r.rule_name || r.kural_adı || ''
              })),
              'toplam_tahmin_sayısı': altPreds.length + 1,
              'predictions': pred.alternative_predictions || [],
              'matched_rules': pred.matched_rules || [],
              'note': pred.note || '',
              'live_status': pred.live_status || 'not_started',
              'home_score': homeScore,
              'away_score': awayScore,
              'halftime_home': htHome,
              'halftime_away': htAway,
              'elapsed': pred.elapsed ?? null,
              'is_live': pred.is_live || false,
              'is_finished': isFinished,
              'prediction_result': mainResult
            };
          });
        }
      } catch (e: any) {
        console.error('Supabase REST fetch error:', e.message);
      }
    }

    if (!opportunities || opportunities.length === 0) {
      return NextResponse.json({
        success: false,
        opportunities: [],
        message: 'Su anda gosterilecek firsat mac bulunamadi.'
      }, { status: 200 });
    }

    const uiOpportunities = opportunities
      .map((opp: any, index: number) => transformOpportunity(opp, index))
      .filter((opp: any): opp is NonNullable<typeof opp> => opp !== null);

    const sorted = sortByMatchTime(uiOpportunities);

    return NextResponse.json({
      success: true,
      opportunities: sorted,
      count: sorted.length,
      message: null
    });

  } catch (error) {
    console.error('Error reading opportunities:', error);
    return NextResponse.json({
      success: false,
      opportunities: [],
      message: 'Veri yuklenirken hata olustu.'
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
