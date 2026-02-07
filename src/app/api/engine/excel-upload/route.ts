/**
 * API Route: Excel Upload → Golden Rules Matching → Predictions
 *
 * Admin uploads an Excel file with opening odds,
 * system matches against golden rules and writes predictions to Supabase.
 *
 * POST /api/engine/excel-upload
 * Body: multipart/form-data with file field "excel"
 * Requires admin token (Bearer) for auth
 *
 * Excel expected columns (flexible matching):
 *   - Ev Sahibi / Home
 *   - Deplasman / Away
 *   - Lig / League
 *   - Tarih / Date
 *   - Saat / Time
 *   - 4-5 (or "4-5 gol") → primary odds
 *   - 2,5 Ü (or "2.5 Ü", "Over 2.5") → secondary
 *   - 2,5 A (or "2.5 A", "Under 2.5") → secondary
 *   - 3,5 Ü → secondary
 *   - 3,5 A → secondary
 *   - 2-3 (or "2-3 gol") → secondary
 *   - KG VAR (or "BTTS") → exclude check
 */

import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { supabaseSelect, supabaseInsert } from '@/lib/supabase';
import { matchGoldenRules, type ExtractedOdds, type MatchedRule } from '@/lib/odds-mapping';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Column name mapping (flexible)
const COLUMN_MAP: Record<string, string[]> = {
  home: ['Ev Sahibi', 'Ev sahibi', 'ev sahibi', 'Home', 'home', 'HOME', 'EV'],
  away: ['Deplasman', 'deplasman', 'Away', 'away', 'AWAY', 'DEP'],
  league: ['Lig', 'lig', 'League', 'league', 'LİG'],
  date: ['Tarih', 'tarih', 'Date', 'date', 'TARİH'],
  time: ['Saat', 'saat', 'Time', 'time', 'SAAT'],
  odds_45: ['4-5', '4-5 gol', '4-5 Gol', '4_5', 'Exact 4-5'],
  odds_25u: ['2,5 Ü', '2.5 Ü', '2,5 ü', '2.5 ü', 'Over 2.5', 'Ü 2.5', 'ü 2.5', '2,5 Üst', '2.5 Üst'],
  odds_25a: ['2,5 A', '2.5 A', '2,5 a', '2.5 a', 'Under 2.5', 'A 2.5', 'a 2.5', '2,5 Alt', '2.5 Alt'],
  odds_35u: ['3,5 Ü', '3.5 Ü', '3,5 ü', '3.5 ü', 'Over 3.5', 'Ü 3.5', 'ü 3.5', '3,5 Üst', '3.5 Üst'],
  odds_35a: ['3,5 A', '3.5 A', '3,5 a', '3.5 a', 'Under 3.5', 'A 3.5', 'a 3.5', '3,5 Alt', '3.5 Alt'],
  odds_23: ['2-3', '2-3 gol', '2-3 Gol', '2_3', 'Exact 2-3'],
  odds_btts: ['KG VAR', 'KG Var', 'kg var', 'BTTS', 'btts', 'GG', 'KG', 'Karşılıklı Gol'],
};

function findColumn(headers: string[], candidates: string[]): string | null {
  for (const candidate of candidates) {
    const found = headers.find(h => h.trim() === candidate);
    if (found) return found;
  }
  // Fuzzy match: check if header contains candidate
  for (const candidate of candidates) {
    const found = headers.find(h => h.toLowerCase().includes(candidate.toLowerCase()));
    if (found) return found;
  }
  return null;
}

function parseOddsValue(val: any): number | null {
  if (val === undefined || val === null || val === '' || val === '-') return null;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
  return isNaN(num) ? null : num;
}

function parseDateToISO(dateStr: string): string {
  if (!dateStr) return '';
  // Handle DD.MM.YYYY format
  const dotParts = dateStr.split('.');
  if (dotParts.length === 3) {
    const [day, month, year] = dotParts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  // Handle YYYY-MM-DD
  if (dateStr.includes('-') && dateStr.length === 10) return dateStr;
  // Handle DD/MM/YYYY
  const slashParts = dateStr.split('/');
  if (slashParts.length === 3) {
    const [day, month, year] = slashParts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return dateStr;
}

// Verify admin token
async function verifyAdmin(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_KEY,
      },
    });
    if (!res.ok) return false;
    const user = await res.json();
    return !!user?.id;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  // Auth check
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await verifyAdmin(token);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('excel') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No Excel file provided' }, { status: 400 });
    }

    // Read file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    // Use first sheet (or 'Acilis' if it exists)
    let sheetName = workbook.SheetNames[0];
    if (workbook.SheetNames.includes('Acilis')) sheetName = 'Acilis';
    if (workbook.SheetNames.includes('Açılış')) sheetName = 'Açılış';

    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      return NextResponse.json({ error: `Sheet "${sheetName}" not found` }, { status: 400 });
    }

    // Convert to JSON
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 });
    }

    // Detect columns
    const headers = Object.keys(rows[0]);
    const colHome = findColumn(headers, COLUMN_MAP.home);
    const colAway = findColumn(headers, COLUMN_MAP.away);
    const colLeague = findColumn(headers, COLUMN_MAP.league);
    const colDate = findColumn(headers, COLUMN_MAP.date);
    const colTime = findColumn(headers, COLUMN_MAP.time);
    const col45 = findColumn(headers, COLUMN_MAP.odds_45);
    const col25u = findColumn(headers, COLUMN_MAP.odds_25u);
    const col25a = findColumn(headers, COLUMN_MAP.odds_25a);
    const col35u = findColumn(headers, COLUMN_MAP.odds_35u);
    const col35a = findColumn(headers, COLUMN_MAP.odds_35a);
    const col23 = findColumn(headers, COLUMN_MAP.odds_23);
    const colBtts = findColumn(headers, COLUMN_MAP.odds_btts);

    if (!colHome || !colAway) {
      return NextResponse.json({
        error: 'Excel\'de Ev Sahibi ve Deplasman sütunları bulunamadı',
        detected_columns: headers,
      }, { status: 400 });
    }

    if (!col45) {
      return NextResponse.json({
        error: 'Excel\'de 4-5 gol oran sütunu bulunamadı',
        detected_columns: headers,
      }, { status: 400 });
    }

    // Fetch golden rules
    const goldenRules = await supabaseSelect(
      'golden_rules',
      'is_active=eq.true&select=*'
    );

    if (!goldenRules || goldenRules.length === 0) {
      return NextResponse.json({ error: 'Golden rules not found in database' }, { status: 500 });
    }

    // Process each row
    const results: Array<{
      home: string;
      away: string;
      league: string;
      date: string;
      time: string;
      odds: ExtractedOdds;
      matched: MatchedRule[];
      prediction: string;
      confidence: number;
      alternatives: Array<{ bet: string; confidence: number }>;
    }> = [];
    const skipped: Array<{ row: number; reason: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const home = String(row[colHome!] || '').trim();
      const away = String(row[colAway!] || '').trim();

      if (!home || !away) {
        skipped.push({ row: i + 2, reason: 'Ev/Deplasman boş' });
        continue;
      }

      const league = colLeague ? String(row[colLeague] || '').trim() : '';
      const rawDate = colDate ? String(row[colDate] || '').trim() : '';
      const time = colTime ? String(row[colTime] || '').trim() : '';

      // Parse odds
      const extracted: ExtractedOdds = {
        '4-5': parseOddsValue(row[col45!]),
        '2,5 Ü': col25u ? parseOddsValue(row[col25u]) : null,
        '2,5 A': col25a ? parseOddsValue(row[col25a]) : null,
        '3,5 Ü': col35u ? parseOddsValue(row[col35u]) : null,
        '3,5 A': col35a ? parseOddsValue(row[col35a]) : null,
        '2-3': col23 ? parseOddsValue(row[col23]) : null,
        'VAR': colBtts ? parseOddsValue(row[colBtts]) : null,
      };

      if (extracted['4-5'] === null) {
        skipped.push({ row: i + 2, reason: '4-5 gol oranı boş' });
        continue;
      }

      // Match golden rules
      const matched = matchGoldenRules(extracted, goldenRules);
      if (matched.length === 0) {
        skipped.push({ row: i + 2, reason: `Kural eşleşmedi (4-5: ${extracted['4-5']})` });
        continue;
      }

      // Build predictions
      const predMap = new Map<string, number>();
      for (const rule of matched) {
        const boost = rule.importance === 'önemli' ? 2 : rule.importance === 'özel' ? 3 : 0;
        const qualityBoost = Math.round((rule.matchQuality - 50) / 25);
        for (const pred of rule.predictions) {
          const conf = Math.min(99, rule.confidence_base + boost + qualityBoost);
          const existing = predMap.get(pred) || 0;
          if (conf > existing) predMap.set(pred, conf);
        }
      }

      const sortedPreds = Array.from(predMap.entries()).sort((a, b) => b[1] - a[1]);
      const [bestPred, bestConf] = sortedPreds[0];
      const alternatives = sortedPreds.slice(1).map(([bet, confidence]) => ({ bet, confidence }));

      const matchDate = parseDateToISO(rawDate);

      results.push({
        home,
        away,
        league,
        date: matchDate,
        time,
        odds: extracted,
        matched,
        prediction: bestPred,
        confidence: bestConf,
        alternatives,
      });
    }

    // Write to Supabase
    let inserted = 0;
    let duplicates = 0;

    for (const r of results) {
      // Check duplicate
      const existing = await supabaseSelect(
        'predictions',
        `home_team=eq.${encodeURIComponent(r.home)}&away_team=eq.${encodeURIComponent(r.away)}&match_date=eq.${r.date}&select=id`
      );

      if (existing && existing.length > 0) {
        duplicates++;
        continue;
      }

      const predRow = {
        home_team: r.home,
        away_team: r.away,
        league: r.league,
        match_date: r.date,
        match_time: r.time,
        prediction: r.prediction,
        confidence: r.confidence,
        alternative_predictions: r.alternatives.map(a => ({
          bet: a.bet,
          tahmin: a.bet,
          confidence: a.confidence,
          güven: a.confidence,
        })),
        matched_rules: r.matched.map(m => ({
          rule_id: m.rule_id,
          kural_id: m.rule_id,
          rule_name: m.name,
          kural_adı: m.name,
        })),
        note: `Excel Upload | ${r.matched.length} kural | 4-5=${r.odds['4-5']}`,
        source: 'excel-upload',
        is_live: false,
        is_finished: false,
        home_score: null,
        away_score: null,
        prediction_result: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const res = await supabaseInsert('predictions', predRow);
      if (res.ok) inserted++;
    }

    // Send Telegram notification
    if (inserted > 0) {
      const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      if (telegramToken && chatId) {
        const topResults = results
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 8);

        let msg = `📊 <b>EXCEL YÜKLEME TAMAMLANDI</b>\n\n`;
        msg += `📁 Dosya: ${file.name}\n`;
        msg += `✅ ${inserted} yeni tahmin eklendi\n`;
        if (duplicates > 0) msg += `⏭ ${duplicates} mükerrer atlandı\n`;
        if (skipped.length > 0) msg += `⚠️ ${skipped.length} satır atlandı\n`;
        msg += `\n`;

        for (const r of topResults) {
          msg += `⚽ <b>${r.home} - ${r.away}</b>\n`;
          msg += `🎯 ${r.prediction} (%${r.confidence}) | ${r.league}\n`;
          if (r.alternatives.length > 0) {
            msg += `📋 ${r.alternatives.slice(0, 2).map(a => `${a.bet}(%${a.confidence})`).join(', ')}\n`;
          }
          msg += `\n`;
        }

        try {
          await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' }),
          });
        } catch {}
      }
    }

    return NextResponse.json({
      success: true,
      file_name: file.name,
      sheet_name: sheetName,
      total_rows: rows.length,
      matched: results.length,
      inserted,
      duplicates,
      skipped: skipped.length,
      skipped_details: skipped.slice(0, 20),
      detected_columns: {
        home: colHome,
        away: colAway,
        league: colLeague,
        date: colDate,
        time: colTime,
        odds_45: col45,
        odds_25u: col25u,
        odds_25a: col25a,
        odds_35u: col35u,
        odds_35a: col35a,
        odds_23: col23,
        btts: colBtts,
      },
      sample_results: results.slice(0, 5).map(r => ({
        match: `${r.home} vs ${r.away}`,
        prediction: r.prediction,
        confidence: r.confidence,
        rules: r.matched.length,
        odds_45: r.odds['4-5'],
      })),
    });

  } catch (error: any) {
    console.error('Excel upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
