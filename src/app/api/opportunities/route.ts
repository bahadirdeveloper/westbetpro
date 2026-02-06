/**
 * API Route: Opportunities
 *
 * Serves real backend data from opportunity_engine.py output
 * Files:
 * - data/opportunities_today.json (default)
 * - data/opportunities_tomorrow.json
 * - data/opportunities_day_after_tomorrow.json
 *
 * Query params:
 * - date: 'today' | 'tomorrow' | 'day_after_tomorrow' (default: 'today')
 *
 * NO MOCK DATA - Real opportunities only
 */

import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET(request: Request) {
  try {
    // Parse query params
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || 'today';

    // Determine which file to read
    let filename: string;
    if (date === 'tomorrow') {
      filename = 'opportunities_tomorrow.json';
    } else if (date === 'day_after_tomorrow') {
      filename = 'opportunities_day_after_tomorrow.json';
    } else {
      filename = 'opportunities_today.json';
    }

    const OPPORTUNITIES_FILE = join(process.cwd(), 'data', filename);

    // Check if file exists
    if (!existsSync(OPPORTUNITIES_FILE)) {
      return NextResponse.json({
        success: false,
        opportunities: [],
        message: 'Şu anda gösterilecek fırsat maç bulunamadı.'
      }, { status: 200 });
    }

    // Read file
    const fileContent = readFileSync(OPPORTUNITIES_FILE, 'utf-8');

    // Parse JSON
    let backendData;
    try {
      backendData = JSON.parse(fileContent);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json({
        success: false,
        opportunities: [],
        message: 'Veri formatı hatalı.'
      }, { status: 200 });
    }

    // Extract opportunities array (handle both formats)
    let backendOpportunities;
    if (Array.isArray(backendData)) {
      // New format: direct array
      backendOpportunities = backendData;
    } else if (backendData?.opportunities) {
      // Old format: wrapped in object with meta
      backendOpportunities = backendData.opportunities;
    } else {
      backendOpportunities = [];
    }

    // Handle empty array
    if (!Array.isArray(backendOpportunities) || backendOpportunities.length === 0) {
      return NextResponse.json({
        success: false,
        opportunities: [],
        message: 'Şu anda gösterilecek fırsat maç bulunamadı.'
      }, { status: 200 });
    }

    // Transform to UI format with Turkish keys at top level
    const uiOpportunities = backendOpportunities
      .map((opp, index) => {
        // Check if Turkish keys already exist at top level (new format)
        const hasTurkishKeys = opp['Ev Sahibi'] && opp['Deplasman'];

        let transformed;
        if (hasTurkishKeys) {
          // New format: Turkish keys already at top level, use directly
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
            // Detailed view fields
            'alternatif_tahminler': opp['alternatif_tahminler'] || [],
            'eşleşen_kurallar': opp['eşleşen_kurallar'] || [],
            'toplam_tahmin_sayısı': opp['toplam_tahmin_sayısı'] || 0,
            // Live score fields
            'live_status': opp['live_status'] || 'not_started',
            'home_score': opp['home_score'],
            'away_score': opp['away_score'],
            'halftime_home': opp['halftime_home'],
            'halftime_away': opp['halftime_away'],
            'elapsed': opp['elapsed'],
            'is_live': opp['is_live'] || false,
            'is_finished': opp['is_finished'] || false,
            'prediction_result': opp['prediction_result']
          };
        } else {
          // Old format: Extract from _raw or use English keys
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

        // Validate required fields
        const hasRequiredFields =
          transformed['Ev Sahibi'] &&
          transformed['Deplasman'] &&
          transformed['best_prediction'] &&
          typeof transformed['best_confidence'] === 'number';

        if (!hasRequiredFields) {
          console.warn(`Skipping malformed opportunity at index ${index}`);
          return null;
        }

        return transformed;
      })
      .filter(opp => opp !== null); // Remove invalid items

    // Return data
    return NextResponse.json({
      success: true,
      opportunities: uiOpportunities,
      count: uiOpportunities.length,
      message: null
    });

  } catch (error) {
    console.error('Error reading opportunities:', error);
    return NextResponse.json({
      success: false,
      opportunities: [],
      message: 'Veri yüklenirken hata oluştu.'
    }, { status: 500 });
  }
}

// Enable dynamic rendering (no caching)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
