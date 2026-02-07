/**
 * API Route: Live Alerts
 * Returns currently live matches with their alert states
 */

import { NextResponse } from 'next/server';
import { supabaseSelect } from '@/lib/supabase';
import { getTodayDate } from '@/lib/dates';
import { calculateAlertState, type AlertState } from '@/lib/alert-logic';
import { checkPredictionResult } from '@/lib/predictions';

interface LiveAlert {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  currentScore: string;
  elapsed: number;
  prediction: string;
  confidence: number;
  alertState: AlertState | null;
  alternativeAlerts: Array<{
    prediction: string;
    confidence: number;
    alertState: AlertState | null;
  }>;
  isFinished: boolean;
  predictionResult: boolean | null;
}

export async function GET() {
  try {
    const today = getTodayDate();

    // Fetch today's predictions
    const predictions = await supabaseSelect(
      'predictions',
      `match_date=eq.${today}&order=match_time.asc&select=*`
    );

    if (!predictions || predictions.length === 0) {
      return NextResponse.json({ success: true, alerts: [], message: 'Bugun icin tahmin yok' });
    }

    const alerts: LiveAlert[] = [];

    for (const pred of predictions) {
      const homeScore = pred.home_score ?? null;
      const awayScore = pred.away_score ?? null;
      const elapsed = pred.elapsed ?? 0;
      const isLive = pred.is_live || false;
      const isFinished = pred.is_finished || false;

      // Only process live or recently finished matches
      if (!isLive && !isFinished) continue;

      // Calculate alert for main prediction
      let mainAlert: AlertState | null = null;
      if (isLive && homeScore !== null && awayScore !== null) {
        mainAlert = calculateAlertState(
          pred.prediction || '',
          homeScore,
          awayScore,
          elapsed,
          pred.halftime_home,
          pred.halftime_away
        );
      }

      // Calculate alerts for alternatives
      const altAlerts: Array<{ prediction: string; confidence: number; alertState: AlertState | null }> = [];
      const seenBets = new Set<string>();
      seenBets.add((pred.prediction || '').trim());

      for (const alt of (pred.alternative_predictions || [])) {
        const altName = (alt.bet || alt.tahmin || '').trim();
        if (!altName || seenBets.has(altName)) continue;
        seenBets.add(altName);

        let altAlertState: AlertState | null = null;
        if (isLive && homeScore !== null && awayScore !== null) {
          altAlertState = calculateAlertState(altName, homeScore, awayScore, elapsed, pred.halftime_home, pred.halftime_away);
        }

        altAlerts.push({
          prediction: altName,
          confidence: alt.confidence || alt.güven || 0,
          alertState: altAlertState,
        });
      }

      // Determine prediction result
      let predResult: boolean | null = null;
      if (pred.prediction_result === true || pred.prediction_result === 'true' || pred.prediction_result === 'won') predResult = true;
      else if (pred.prediction_result === false || pred.prediction_result === 'false' || pred.prediction_result === 'lost') predResult = false;

      alerts.push({
        id: pred.id,
        homeTeam: pred.home_team || '',
        awayTeam: pred.away_team || '',
        league: pred.league || '',
        currentScore: homeScore !== null && awayScore !== null ? `${homeScore}-${awayScore}` : '-',
        elapsed,
        prediction: pred.prediction || '',
        confidence: pred.confidence || 0,
        alertState: mainAlert,
        alternativeAlerts: altAlerts,
        isFinished,
        predictionResult: predResult,
      });
    }

    // Sort: hot alerts first, then warm, then cold, then finished
    alerts.sort((a, b) => {
      if (a.isFinished && !b.isFinished) return 1;
      if (!a.isFinished && b.isFinished) return -1;

      const levelOrder = { hot: 0, warm: 1, cold: 2 };
      const aLevel = a.alertState?.alertLevel || 'cold';
      const bLevel = b.alertState?.alertLevel || 'cold';
      return (levelOrder[aLevel] || 3) - (levelOrder[bLevel] || 3);
    });

    return NextResponse.json({
      success: true,
      alerts,
      count: alerts.length,
      hotCount: alerts.filter(a => a.alertState?.alertLevel === 'hot' && !a.isFinished).length,
    });
  } catch (error: any) {
    console.error('Live alerts error:', error);
    return NextResponse.json({ success: false, alerts: [], message: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
