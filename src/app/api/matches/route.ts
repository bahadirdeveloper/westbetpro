/**
 * API Route: Matches Viewer
 * Returns predictions data formatted as matches for the admin panel.
 *
 * GET /api/matches?filter_type=upcoming|today|finished&league=...&limit=100
 */

import { NextResponse } from 'next/server';
import { supabaseSelect, verifyAdminAuth } from '@/lib/supabase';
import { getTodayDate } from '@/lib/dates';

export async function GET(request: Request) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filterType = searchParams.get('filter_type') || 'today';
    const league = searchParams.get('league') || '';
    const limit = searchParams.get('limit') || '100';

    const today = getTodayDate();

    let params = `select=*&order=match_date.desc,match_time.asc&limit=${limit}`;

    if (filterType === 'today') {
      params += `&match_date=eq.${today}`;
    } else if (filterType === 'upcoming') {
      params += `&is_finished=eq.false&is_live=eq.false&match_date=gte.${today}`;
    } else if (filterType === 'finished') {
      params += `&is_finished=eq.true`;
    }

    if (league) {
      params += `&league=eq.${encodeURIComponent(league)}`;
    }

    const data = await supabaseSelect('predictions', params);

    const matches = (data || []).map((p: any) => ({
      id: p.id,
      home_team: p.home_team,
      away_team: p.away_team,
      league: p.league || '',
      date: p.match_date,
      time: p.match_time || '',
      home_odds: null,
      draw_odds: null,
      away_odds: null,
      status: p.is_finished ? 'finished' : p.is_live ? 'live' : 'upcoming',
      home_score: p.home_score,
      away_score: p.away_score,
      prediction: p.prediction,
      confidence: p.confidence,
    }));

    return NextResponse.json({ matches });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, matches: [] }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
