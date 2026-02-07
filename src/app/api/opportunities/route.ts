/**
 * API Route: Opportunities
 *
 * Data Sources (priority order):
 * 1. Local JSON files (data/opportunities_*.json) - for local dev with scheduler
 * 2. Supabase predictions table (direct REST API) - for Vercel/production
 *
 * Uses direct REST API for reads to avoid Supabase JS client caching issues.
 *
 * Query params:
 * - date: 'yesterday' | 'today' | 'tomorrow' | 'day_after_tomorrow' (default: 'today')
 */

import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Convert prediction_result from various formats to boolean
function toBooleanResult(val: any): boolean | null {
  if (val === true || val === 'won' || val === 'true') return true;
  if (val === false || val === 'lost' || val === 'false') return false;
  return null;
}

// Check prediction result for alternative predictions
function checkAltPredictionResult(prediction: string, homeScore: number | null, awayScore: number | null, halftimeHome?: number | null, halftimeAway?: number | null): boolean | null {
  if (homeScore === null || homeScore === undefined || awayScore === null || awayScore === undefined) return null;

  const totalGoals = homeScore + awayScore;
  const pred = prediction
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'i')
    .replace(/ü/g, 'U')
    .replace(/Ü/g, 'U')
    .toUpperCase()
    .trim();

  // MS (Match result) predictions
  if (pred === 'MS 1') return homeScore > awayScore;
  if (pred === 'MS 2') return awayScore > homeScore;
  if (pred === 'MS X') return homeScore === awayScore;

  // KG (Both teams to score)
  if (pred === 'KG VAR') return homeScore > 0 && awayScore > 0;
  if (pred === 'KG YOK') return homeScore === 0 || awayScore === 0;

  // MS Over/Under (total goals)
  const msOverMatch = pred.match(/^(?:MS\s+)?(\d+\.?\d*)\s*UST$/);
  if (msOverMatch) return totalGoals > parseFloat(msOverMatch[1]);

  const msUnderMatch = pred.match(/^(?:MS\s+)?(\d+\.?\d*)\s*ALT$/);
  if (msUnderMatch) return totalGoals < parseFloat(msUnderMatch[1]);

  // MS EV (Home team over/under)
  const msEvOverMatch = pred.match(/^MS\s+EV\s+(\d+\.?\d*)\s*UST$/);
  if (msEvOverMatch) return homeScore > parseFloat(msEvOverMatch[1]);

  const msEvUnderMatch = pred.match(/^MS\s+EV\s+(\d+\.?\d*)\s*ALT$/);
  if (msEvUnderMatch) return homeScore < parseFloat(msEvUnderMatch[1]);

  // MS DEP (Away team over/under)
  const msDepOverMatch = pred.match(/^MS\s+DEP\s+(\d+\.?\d*)\s*UST$/);
  if (msDepOverMatch) return awayScore > parseFloat(msDepOverMatch[1]);

  const msDepUnderMatch = pred.match(/^MS\s+DEP\s+(\d+\.?\d*)\s*ALT$/);
  if (msDepUnderMatch) return awayScore < parseFloat(msDepUnderMatch[1]);

  // IY (First half) predictions
  if (halftimeHome !== null && halftimeHome !== undefined && halftimeAway !== null && halftimeAway !== undefined) {
    const htTotal = halftimeHome + halftimeAway;

    // IY Over/Under (first half total)
    const iyOverMatch = pred.match(/^IY\s+(\d+\.?\d*)\s*UST$/);
    if (iyOverMatch) return htTotal > parseFloat(iyOverMatch[1]);

    const iyUnderMatch = pred.match(/^IY\s+(\d+\.?\d*)\s*ALT$/);
    if (iyUnderMatch) return htTotal < parseFloat(iyUnderMatch[1]);

    // IY EV (First half home over/under)
    const iyEvOverMatch = pred.match(/^IY\s+EV\s+(\d+\.?\d*)\s*UST$/);
    if (iyEvOverMatch) return halftimeHome > parseFloat(iyEvOverMatch[1]);

    const iyEvUnderMatch = pred.match(/^IY\s+EV\s+(\d+\.?\d*)\s*ALT$/);
    if (iyEvUnderMatch) return halftimeHome < parseFloat(iyEvUnderMatch[1]);

    // IY DEP (First half away over/under)
    const iyDepOverMatch = pred.match(/^IY\s+DEP\s+(\d+\.?\d*)\s*UST$/);
    if (iyDepOverMatch) return halftimeAway > parseFloat(iyDepOverMatch[1]);

    const iyDepUnderMatch = pred.match(/^IY\s+DEP\s+(\d+\.?\d*)\s*ALT$/);
    if (iyDepUnderMatch) return halftimeAway < parseFloat(iyDepUnderMatch[1]);

    // IY MS (first half result)
    if (pred === 'IY MS 1') return halftimeHome > halftimeAway;
    if (pred === 'IY MS 2') return halftimeAway > halftimeHome;
    if (pred === 'IY MS X') return halftimeHome === halftimeAway;

    // IY KG (first half both teams score)
    if (pred === 'IY KG VAR') return halftimeHome > 0 && halftimeAway > 0;
    if (pred === 'IY KG YOK') return halftimeHome === 0 || halftimeAway === 0;
  }

  return null;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

async function supabaseSelect(params: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/predictions?${params}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

// Calculate target date in Istanbul timezone
function getTargetDate(dateParam: string): string {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const istanbulTime = new Date(utcTime + 3 * 3600000);

  if (dateParam === 'yesterday') {
    istanbulTime.setDate(istanbulTime.getDate() - 1);
  } else if (dateParam === 'tomorrow') {
    istanbulTime.setDate(istanbulTime.getDate() + 1);
  } else if (dateParam === 'day_after_tomorrow') {
    istanbulTime.setDate(istanbulTime.getDate() + 2);
  }

  return istanbulTime.toISOString().split('T')[0];
}

// Format date from YYYY-MM-DD to DD.MM.YYYY
function formatDateTurkish(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
}

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

// Sort opportunities: by match time (earliest first), then by confidence (highest first)
function sortByMatchTime(opportunities: any[]): any[] {
  return opportunities.sort((a, b) => {
    const timeA = a['Saat'] || '99:99';
    const timeB = b['Saat'] || '99:99';

    if (timeA !== timeB) {
      return timeA.localeCompare(timeB);
    }
    // Same time: sort by confidence descending
    return (b['best_confidence'] || 0) - (a['best_confidence'] || 0);
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || 'today';

    // Strategy 1: Try local JSON file (works in local dev with scheduler)
    let opportunities = tryLocalFile(date);

    // Strategy 2: Fall back to Supabase REST API (works in Vercel/production)
    if (!opportunities && SUPABASE_URL && SUPABASE_KEY) {
      try {
        const targetDate = getTargetDate(date);
        const data = await supabaseSelect(
          `match_date=eq.${targetDate}&order=match_time.asc,confidence.desc&select=*`
        );

        if (data && data.length > 0) {
          opportunities = data.map((pred: any) => {
            const isFinished = pred.is_finished || false;
            const homeScore = pred.home_score ?? null;
            const awayScore = pred.away_score ?? null;
            const htHome = pred.halftime_home ?? null;
            const htAway = pred.halftime_away ?? null;

            // Convert prediction_result from old string format to boolean
            const mainResult = toBooleanResult(pred.prediction_result);

            // Calculate results for alternative predictions (deduplicated)
            const seenBets = new Set<string>();
            const bestPredNorm = (pred.prediction || '').trim();
            seenBets.add(bestPredNorm); // Skip alternatives that match best prediction

            const altPreds: any[] = [];
            for (const alt of (pred.alternative_predictions || [])) {
              const altName = (alt.bet || alt.tahmin || '').trim();
              if (!altName || seenBets.has(altName)) continue;
              seenBets.add(altName);

              let altResult: boolean | null = null;
              if (isFinished && homeScore !== null && awayScore !== null) {
                altResult = checkAltPredictionResult(altName, homeScore, awayScore, htHome, htAway);
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

    // No data from either source
    if (!opportunities || opportunities.length === 0) {
      return NextResponse.json({
        success: false,
        opportunities: [],
        message: 'Su anda gosterilecek firsat mac bulunamadi.'
      }, { status: 200 });
    }

    // Transform and validate
    const uiOpportunities = opportunities
      .map((opp: any, index: number) => transformOpportunity(opp, index))
      .filter((opp: any): opp is NonNullable<typeof opp> => opp !== null);

    // Sort by match time (earliest first)
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

// Enable dynamic rendering (no caching)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
