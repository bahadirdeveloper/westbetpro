/**
 * Vercel Cron Job: Live Score Updater
 *
 * Runs every 2 minutes via Vercel cron to fetch live scores
 * from API-Football and update Supabase predictions.
 *
 * Optimized: Uses /fixtures?live=all to only fetch currently live matches,
 * reducing API calls from ~2,880/day to ~200/day.
 */

import { NextResponse } from 'next/server';
import { supabaseSelect, supabaseUpdate } from '@/lib/supabase';
import { getTodayDate, getYesterdayDate } from '@/lib/dates';
import { checkPredictionResult, toBooleanResult } from '@/lib/predictions';
import { teamsMatch } from '@/lib/teams';

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY || '';
const API_FOOTBALL_URL = 'https://v3.football.api-sports.io';

// --- Match status detection ---

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

// --- API-Football endpoints ---

// Fetch ONLY currently live matches (much cheaper than fetching all fixtures)
async function fetchLiveFixtures(): Promise<any[]> {
  try {
    const res = await fetch(`${API_FOOTBALL_URL}/fixtures?live=all`, {
      headers: {
        'x-rapidapi-key': API_FOOTBALL_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.response || [];
  } catch {
    return [];
  }
}

// Fetch all fixtures for a specific date (used only for recently finished matches)
async function fetchFixturesByDate(date: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_FOOTBALL_URL}/fixtures?date=${date}`, {
      headers: {
        'x-rapidapi-key': API_FOOTBALL_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
      },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.response || [];
  } catch {
    return [];
  }
}

// --- Main handler ---

function verifyAuth(request: Request): boolean {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const cronSecret = process.env.CRON_SECRET || '';

  // Check CRON_SECRET
  if (cronSecret && token === cronSecret) return true;

  // Check admin JWT
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role === 'admin' && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const today = getTodayDate();
    const yesterday = getYesterdayDate();

    // Step 1: Check if there are any unfinished predictions to update
    const todayPredictions = await supabaseSelect(
      'predictions',
      `match_date=eq.${today}&order=match_time.asc&select=*`
    );

    const yesterdayUnfinished = await supabaseSelect(
      'predictions',
      `match_date=eq.${yesterday}&is_finished=eq.false&order=match_time.asc&select=*`
    );

    const predictions = [...(yesterdayUnfinished || []), ...(todayPredictions || [])];

    if (!predictions || predictions.length === 0) {
      return NextResponse.json({ success: true, message: 'No predictions to update', date: today });
    }

    // Step 2: Check if all are already finished -> skip API call entirely
    const unfinishedPreds = predictions.filter((p: any) => !p.is_finished);
    if (unfinishedPreds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All matches already finished',
        date: today,
        total: predictions.length,
        apiCalls: 0
      });
    }

    // Step 3: Fetch only live fixtures (1 API call instead of fetching entire dates)
    let apiCallCount = 0;
    let fixtures = await fetchLiveFixtures();
    apiCallCount++;

    // Step 4: Match live fixtures against our predictions
    let updatedCount = 0;
    let matchedCount = 0;
    const matchedPredIds = new Set<string>();

    for (const pred of unfinishedPreds) {
      const matchedFixture = fixtures.find((f: any) =>
        teamsMatch(pred.home_team, pred.away_team, f.teams?.home?.name || '', f.teams?.away?.name || '')
      );

      if (!matchedFixture) continue;

      matchedCount++;
      matchedPredIds.add(pred.id);

      const status = determineMatchStatus(matchedFixture);
      const homeScore = matchedFixture.goals?.home ?? null;
      const awayScore = matchedFixture.goals?.away ?? null;
      const halftimeHome = matchedFixture.score?.halftime?.home ?? null;
      const halftimeAway = matchedFixture.score?.halftime?.away ?? null;

      let predictionResult: boolean | null = toBooleanResult(pred.prediction_result);

      if (status.is_finished && homeScore !== null && awayScore !== null && predictionResult === null) {
        predictionResult = checkPredictionResult(pred.prediction || '', homeScore, awayScore, halftimeHome, halftimeAway);
      }

      const result = await supabaseUpdate('predictions', pred.id, {
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
      });

      if (result.ok) updatedCount++;
    }

    // Step 5: For unmatched predictions that should have started,
    // fetch by date to catch recently finished matches
    const unmatchedStarted = unfinishedPreds.filter(pred => {
      if (matchedPredIds.has(pred.id)) return false;
      const matchTime = pred.match_time || '99:99';
      const now = new Date();
      const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
      const istanbulNow = new Date(utcTime + 3 * 3600000);
      const currentTime = `${String(istanbulNow.getHours()).padStart(2, '0')}:${String(istanbulNow.getMinutes()).padStart(2, '0')}`;
      return matchTime <= currentTime;
    });

    if (unmatchedStarted.length > 0) {
      const datesToFetch = new Set<string>();
      unmatchedStarted.forEach(p => datesToFetch.add(p.match_date));

      for (const date of datesToFetch) {
        const dateFixtures = await fetchFixturesByDate(date);
        apiCallCount++;
        fixtures = [...fixtures, ...dateFixtures];
      }

      for (const pred of unmatchedStarted) {
        const matchedFixture = fixtures.find((f: any) =>
          teamsMatch(pred.home_team, pred.away_team, f.teams?.home?.name || '', f.teams?.away?.name || '')
        );

        if (!matchedFixture) continue;

        matchedCount++;
        const status = determineMatchStatus(matchedFixture);
        const homeScore = matchedFixture.goals?.home ?? null;
        const awayScore = matchedFixture.goals?.away ?? null;
        const halftimeHome = matchedFixture.score?.halftime?.home ?? null;
        const halftimeAway = matchedFixture.score?.halftime?.away ?? null;

        let predictionResult: boolean | null = toBooleanResult(pred.prediction_result);

        if (status.is_finished && homeScore !== null && awayScore !== null && predictionResult === null) {
          predictionResult = checkPredictionResult(pred.prediction || '', homeScore, awayScore, halftimeHome, halftimeAway);
        }

        const result = await supabaseUpdate('predictions', pred.id, {
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
        });

        if (result.ok) updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      dates: [today, ...(yesterdayUnfinished?.length ? [yesterday] : [])],
      total_predictions: predictions.length,
      unfinished: unfinishedPreds.length,
      matched: matchedCount,
      updated: updatedCount,
      api_calls: apiCallCount,
      updated_at: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Cron live-scores error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
