/**
 * API Route: System Logs
 * Returns system logs from Supabase system_logs table.
 * Falls back to prediction activity as logs if system_logs table doesn't exist.
 *
 * GET /api/logs?level=INFO|WARNING|ERROR&limit=100
 */

import { NextResponse } from 'next/server';
import { supabaseSelect, verifyAdminAuth } from '@/lib/supabase';

export async function GET(request: Request) {
  if (!(await verifyAdminAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') || '';
    const limit = searchParams.get('limit') || '100';

    // Try system_logs table first
    let params = `select=*&order=created_at.desc&limit=${limit}`;
    if (level) {
      params += `&level=eq.${level}`;
    }

    const data = await supabaseSelect('system_logs', params);

    if (data && data.length > 0) {
      const logs = data.map((l: any) => ({
        id: l.id,
        timestamp: l.created_at || l.timestamp,
        level: l.level || 'INFO',
        event: l.event || l.action || '',
        details: l.details || l.metadata || '',
      }));
      return NextResponse.json({ logs });
    }

    // Fallback: generate logs from predictions activity
    const predictions = await supabaseSelect(
      'predictions',
      `select=id,home_team,away_team,prediction,confidence,is_finished,is_live,prediction_result,source,created_at,updated_at&order=updated_at.desc&limit=${limit}`
    );

    const logs = (predictions || []).map((p: any) => {
      let logLevel: 'INFO' | 'WARNING' | 'ERROR' = 'INFO';
      let event = '';
      let details: any = {};

      if (p.is_finished) {
        if (p.prediction_result === true || p.prediction_result === 'true') {
          event = 'Tahmin Tuttu';
          logLevel = 'INFO';
        } else if (p.prediction_result === false || p.prediction_result === 'false') {
          event = 'Tahmin Yattı';
          logLevel = 'WARNING';
        } else {
          event = 'Maç Bitti';
          logLevel = 'INFO';
        }
      } else if (p.is_live) {
        event = 'Canlı Maç';
        logLevel = 'INFO';
      } else {
        event = 'Tahmin Oluşturuldu';
        logLevel = 'INFO';
      }

      details = {
        match: `${p.home_team} vs ${p.away_team}`,
        prediction: p.prediction,
        confidence: p.confidence,
        source: p.source,
      };

      return {
        id: p.id,
        timestamp: p.updated_at || p.created_at,
        level: logLevel,
        event,
        details,
      };
    });

    // Apply level filter on fallback logs
    const filtered = level ? logs.filter((l: any) => l.level === level) : logs;

    return NextResponse.json({ logs: filtered });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, logs: [] }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
