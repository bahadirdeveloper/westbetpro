/**
 * API Route: Predictions Viewer
 * Returns all predictions for the admin panel.
 *
 * GET /api/predictions?limit=100
 */

import { NextResponse } from 'next/server';
import { supabaseSelect, verifyAdminAuth } from '@/lib/supabase';

export async function GET(request: Request) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '100';

    const data = await supabaseSelect(
      'predictions',
      `select=id,home_team,away_team,league,match_date,match_time,prediction,confidence,prediction_result,is_finished,is_live,matched_rules,alternative_predictions,source,note&order=match_date.desc,match_time.desc&limit=${limit}`
    );

    const predictions = (data || []).map((p: any) => {
      let result = 'pending';
      if (p.prediction_result === true || p.prediction_result === 'true' || p.prediction_result === 'won') result = 'won';
      else if (p.prediction_result === false || p.prediction_result === 'false' || p.prediction_result === 'lost') result = 'lost';
      else if (p.is_finished) result = 'unknown';

      return {
        id: p.id,
        home_team: p.home_team,
        away_team: p.away_team,
        league: p.league || '',
        match_date: p.match_date,
        prediction_type: p.prediction?.split(' ')[0] || '',
        predicted_value: p.prediction || '',
        confidence: p.confidence || 0,
        result,
        matched_rules: p.matched_rules || [],
        alternative_predictions: p.alternative_predictions || [],
        source: p.source || '',
        note: p.note || '',
      };
    });

    return NextResponse.json({ predictions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, predictions: [] }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
