/**
 * Vercel Cron Job: Live Score Updater
 *
 * Runs every 2 minutes (triggered by client-side polling) to fetch
 * live scores from API-Football and update Supabase predictions.
 *
 * Uses direct REST API for updates to bypass RLS issues.
 */

import { NextResponse } from 'next/server';

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY || '7bae9873ea873999fe45937343f43628';
const API_FOOTBALL_URL = 'https://v3.football.api-sports.io';

// Supabase config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// --- Supabase REST helpers (bypass RLS issues with JS client) ---

async function supabaseSelect(table: string, params: string): Promise<any[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) return [];
  return res.json();
}

async function supabaseUpdate(table: string, id: string, data: Record<string, any>): Promise<{ ok: boolean; status: number }> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(data),
  });
  // With return=representation, we can verify the update was applied
  if (res.ok) {
    const rows = await res.json();
    // If empty array, the filter didn't match any rows (RLS or wrong ID)
    return { ok: Array.isArray(rows) && rows.length > 0, status: res.status };
  }
  return { ok: false, status: res.status };
}

// --- Date & Team matching ---

function getTodayDate(): string {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const istanbulTime = new Date(utcTime + 3 * 3600000);
  return istanbulTime.toISOString().split('T')[0];
}

function getYesterdayDate(): string {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  const istanbulTime = new Date(utcTime + 3 * 3600000);
  istanbulTime.setDate(istanbulTime.getDate() - 1);
  return istanbulTime.toISOString().split('T')[0];
}

const TEAM_ALIASES: Record<string, string> = {
  'mvv': 'maastricht',
  'maastricht': 'maastricht',
};

function normalizeTeamName(name: string): string {
  let result = name
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[àáâãä]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ýÿ]/g, 'y')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  result = result
    .replace(/^(fc|afc|sc|kvc|rfc|de|fk|nk|sk|mvv|vfb|tsv|bsc|bv|sv|vfl|1fc|gks|k)\s+/, '')
    .replace(/\s+(fc|sc|sk|sport|city|united|utd|u21|u23)\s*$/, '');

  result = result.replace(/\s+\d+$/, '');

  const alias = TEAM_ALIASES[result];
  if (alias) result = alias;

  return result;
}

function teamsMatch(predHome: string, predAway: string, fixtureHome: string, fixtureAway: string): boolean {
  const ph = normalizeTeamName(predHome);
  const pa = normalizeTeamName(predAway);
  const fh = normalizeTeamName(fixtureHome);
  const fa = normalizeTeamName(fixtureAway);

  const homeMatch = ph.includes(fh) || fh.includes(ph);
  const awayMatch = pa.includes(fa) || fa.includes(pa);
  if (homeMatch && awayMatch) return true;

  const phFirst = ph.split(' ')[0];
  const paFirst = pa.split(' ')[0];
  const fhFirst = fh.split(' ')[0];
  const faFirst = fa.split(' ')[0];

  const homeFirstMatch = (phFirst.length > 3 && fhFirst.length > 3) &&
    (phFirst.includes(fhFirst) || fhFirst.includes(phFirst));
  const awayFirstMatch = (paFirst.length > 3 && faFirst.length > 3) &&
    (paFirst.includes(faFirst) || faFirst.includes(paFirst));

  const phNoSpace = ph.replace(/\s/g, '');
  const paNoSpace = pa.replace(/\s/g, '');
  const fhNoSpace = fh.replace(/\s/g, '');
  const faNoSpace = fa.replace(/\s/g, '');

  const homeNoSpaceMatch = phNoSpace.includes(fhNoSpace) || fhNoSpace.includes(phNoSpace);
  const awayNoSpaceMatch = paNoSpace.includes(faNoSpace) || faNoSpace.includes(paNoSpace);

  return (homeMatch || homeFirstMatch || homeNoSpaceMatch) &&
         (awayMatch || awayFirstMatch || awayNoSpaceMatch);
}

// --- Match status & prediction result ---

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

// Returns boolean: true = won, false = lost, null = unknown/unrecognized
function checkPredictionResult(prediction: string, homeScore: number, awayScore: number, halftimeHome?: number | null, halftimeAway?: number | null): boolean | null {
  if (homeScore === null || awayScore === null) return null;

  const totalGoals = homeScore + awayScore;
  // Normalize Turkish chars for matching
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

  // MS Over/Under (full time total goals)
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

// --- API-Football ---

async function fetchFixtures(date: string): Promise<any[]> {
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

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  try {
    const today = getTodayDate();
    const yesterday = getYesterdayDate();

    // Get predictions that need updating: today's + yesterday's unfinished
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

    const allFinished = predictions.every((p: any) => p.is_finished === true);
    if (allFinished) {
      return NextResponse.json({ success: true, message: 'All matches already finished', date: today, total: predictions.length });
    }

    // Fetch fixtures from API-Football for both dates
    const datesToFetch = new Set([today]);
    if (yesterdayUnfinished && yesterdayUnfinished.length > 0) {
      datesToFetch.add(yesterday);
    }

    let fixtures: any[] = [];
    for (const date of datesToFetch) {
      const dateFixtures = await fetchFixtures(date);
      fixtures = fixtures.concat(dateFixtures);
    }

    if (fixtures.length === 0) {
      return NextResponse.json({ success: true, message: 'No fixtures data from API', date: today });
    }

    // Match and update
    let updatedCount = 0;
    let matchedCount = 0;
    const unmatched: string[] = [];

    for (const pred of predictions) {
      if (pred.is_finished) continue;

      const matchedFixture = fixtures.find((f: any) =>
        teamsMatch(pred.home_team, pred.away_team, f.teams?.home?.name || '', f.teams?.away?.name || '')
      );

      if (!matchedFixture) {
        unmatched.push(`${pred.home_team} vs ${pred.away_team}`);
        continue;
      }
      matchedCount++;

      const status = determineMatchStatus(matchedFixture);
      const homeScore = matchedFixture.goals?.home ?? null;
      const awayScore = matchedFixture.goals?.away ?? null;
      const halftimeHome = matchedFixture.score?.halftime?.home ?? null;
      const halftimeAway = matchedFixture.score?.halftime?.away ?? null;

      // Convert prediction_result from all possible formats to boolean
      let predictionResult: boolean | null = null;
      const rawResult = pred.prediction_result;
      if (rawResult === true || rawResult === 'won' || rawResult === 'true') predictionResult = true;
      else if (rawResult === false || rawResult === 'lost' || rawResult === 'false') predictionResult = false;

      if (status.is_finished && homeScore !== null && awayScore !== null && predictionResult === null) {
        predictionResult = checkPredictionResult(pred.prediction || '', homeScore, awayScore, halftimeHome, halftimeAway);
      }

      // Update via direct REST API (bypasses RLS issues with JS client)
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

    // Count match statuses for debugging
    const unfinished = predictions.filter((p: any) => !p.is_finished).length;

    return NextResponse.json({
      success: true,
      dates: Array.from(datesToFetch),
      total_predictions: predictions.length,
      yesterday_unfinished: yesterdayUnfinished?.length || 0,
      matched: matchedCount,
      updated: updatedCount,
      fixtures_found: fixtures.length,
      unmatched: unmatched.length > 0 ? unmatched : undefined,
      updated_at: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Cron live-scores error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 30;
