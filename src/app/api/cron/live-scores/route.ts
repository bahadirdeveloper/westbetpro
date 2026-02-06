/**
 * Vercel Cron Job: Live Score Updater
 *
 * Runs every 2 minutes to fetch live scores from API-Football
 * and update the Supabase predictions table.
 *
 * This replaces the Python scheduler for production.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY || '7bae9873ea873999fe45937343f43628';
const API_FOOTBALL_URL = 'https://v3.football.api-sports.io';

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function getTodayDate(): string {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const istanbulTime = new Date(utcTime + 3 * 3600000);
  return istanbulTime.toISOString().split('T')[0];
}

function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[İıĞğÜüŞşÖöÇç]/g, (c) => {
      const map: Record<string, string> = {
        'İ': 'i', 'ı': 'i', 'Ğ': 'g', 'ğ': 'g',
        'Ü': 'u', 'ü': 'u', 'Ş': 's', 'ş': 's',
        'Ö': 'o', 'ö': 'o', 'Ç': 'c', 'ç': 'c'
      };
      return map[c] || c;
    })
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

function teamsMatch(predHome: string, predAway: string, fixtureHome: string, fixtureAway: string): boolean {
  const ph = normalizeTeamName(predHome);
  const pa = normalizeTeamName(predAway);
  const fh = normalizeTeamName(fixtureHome);
  const fa = normalizeTeamName(fixtureAway);

  return (ph.includes(fh) || fh.includes(ph)) && (pa.includes(fa) || fa.includes(pa));
}

function determineMatchStatus(fixture: any): {
  is_live: boolean;
  is_finished: boolean;
  live_status: string;
  elapsed: number | null;
} {
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

function checkPredictionResult(prediction: string, homeScore: number, awayScore: number): string | null {
  if (homeScore === null || awayScore === null) return null;

  const totalGoals = homeScore + awayScore;
  const pred = prediction.toUpperCase().trim();

  // MS 1 (Home win)
  if (pred === 'MS 1' && homeScore > awayScore) return 'won';
  if (pred === 'MS 1' && homeScore <= awayScore) return 'lost';

  // MS 2 (Away win)
  if (pred === 'MS 2' && awayScore > homeScore) return 'won';
  if (pred === 'MS 2' && awayScore <= homeScore) return 'lost';

  // MS X (Draw)
  if (pred === 'MS X' && homeScore === awayScore) return 'won';
  if (pred === 'MS X' && homeScore !== awayScore) return 'lost';

  // KG VAR (Both teams score)
  if (pred === 'KG VAR' && homeScore > 0 && awayScore > 0) return 'won';
  if (pred === 'KG VAR' && (homeScore === 0 || awayScore === 0)) return 'lost';

  // KG YOK (Both teams don't score)
  if (pred === 'KG YOK' && (homeScore === 0 || awayScore === 0)) return 'won';
  if (pred === 'KG YOK' && homeScore > 0 && awayScore > 0) return 'lost';

  // Over/Under patterns
  const overMatch = pred.match(/^(?:MS\s+)?(\d+\.?\d*)\s*[UÜ]ST$/i);
  if (overMatch) {
    const line = parseFloat(overMatch[1]);
    return totalGoals > line ? 'won' : 'lost';
  }

  const underMatch = pred.match(/^(?:MS\s+)?(\d+\.?\d*)\s*ALT$/i);
  if (underMatch) {
    const line = parseFloat(underMatch[1]);
    return totalGoals < line ? 'won' : 'lost';
  }

  // IY Over/Under (first half)
  const iyOverMatch = pred.match(/^[Ii][Yy]\s+(\d+\.?\d*)\s*[UÜ]ST$/i);
  if (iyOverMatch) return null; // Need halftime data

  const iyUnderMatch = pred.match(/^[Ii][Yy]\s+(\d+\.?\d*)\s*ALT$/i);
  if (iyUnderMatch) return null;

  return null;
}

async function fetchFixtures(date: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_FOOTBALL_URL}/fixtures?date=${date}`, {
      headers: {
        'x-rapidapi-key': API_FOOTBALL_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      }
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.response || [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  // Verify cron secret (optional but recommended for security)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    const today = getTodayDate();

    // Get today's predictions from Supabase
    const { data: predictions, error: fetchError } = await supabase
      .from('predictions')
      .select('*')
      .eq('match_date', today);

    if (fetchError || !predictions || predictions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No predictions to update',
        date: today
      });
    }

    // Check if all matches are finished already
    const allFinished = predictions.every((p: any) => p.is_finished === true);
    if (allFinished) {
      return NextResponse.json({
        success: true,
        message: 'All matches already finished',
        date: today,
        total: predictions.length
      });
    }

    // Fetch fixtures from API-Football
    const fixtures = await fetchFixtures(today);
    if (fixtures.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No fixtures data from API',
        date: today
      });
    }

    // Match predictions with fixtures and update
    let updatedCount = 0;
    for (const pred of predictions) {
      if (pred.is_finished) continue;

      const matchedFixture = fixtures.find((f: any) =>
        teamsMatch(
          pred.home_team,
          pred.away_team,
          f.teams?.home?.name || '',
          f.teams?.away?.name || ''
        )
      );

      if (!matchedFixture) continue;

      const status = determineMatchStatus(matchedFixture);
      const homeScore = matchedFixture.goals?.home ?? null;
      const awayScore = matchedFixture.goals?.away ?? null;
      const halftimeHome = matchedFixture.score?.halftime?.home ?? null;
      const halftimeAway = matchedFixture.score?.halftime?.away ?? null;

      let predictionResult = pred.prediction_result;
      if (status.is_finished && homeScore !== null && awayScore !== null && !predictionResult) {
        predictionResult = checkPredictionResult(pred.prediction || '', homeScore, awayScore);
      }

      // Update Supabase
      const { error: updateError } = await supabase
        .from('predictions')
        .update({
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
        })
        .eq('id', pred.id);

      if (!updateError) updatedCount++;
    }

    return NextResponse.json({
      success: true,
      date: today,
      total_predictions: predictions.length,
      fixtures_found: fixtures.length,
      updated: updatedCount,
      updated_at: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Cron live-scores error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
