/**
 * Odds Mapping: API-Football → Golden Rules Format
 *
 * Converts API-Football bet types to the format used in golden rules:
 *   "4-5" → Exact Goals Number (bet 38), values "4" and "5" averaged
 *   "2,5 Ü" → Goals Over/Under (bet 5), value "Over 2.5"
 *   "2,5 A" → Goals Over/Under (bet 5), value "Under 2.5"
 *   "3,5 Ü" → Goals Over/Under (bet 5), value "Over 3.5"
 *   "3,5 A" → Goals Over/Under (bet 5), value "Under 3.5"
 *   "2-3"  → Exact Goals Number (bet 38), values "2" and "3" averaged
 *   "VAR"  → Both Teams Score (bet 8), value "Yes"
 *
 * API-Football Bet IDs:
 *   1  = Match Winner (1X2)
 *   5  = Goals Over/Under
 *   8  = Both Teams Score
 *   10 = Exact Score
 *   38 = Exact Goals Number
 */

export interface ExtractedOdds {
  // Primary: "4-5 gol" odds - average of exact 4 goals + exact 5 goals
  '4-5': number | null;
  // Secondary odds
  '2,5 Ü': number | null;
  '2,5 A': number | null;
  '3,5 Ü': number | null;
  '3,5 A': number | null;
  '2-3': number | null; // average of exact 2 goals + exact 3 goals
  // Exclude
  'VAR': number | null; // BTTS Yes
}

// Preferred bookmaker IDs (in priority order)
// Bet365, 1xBet, Bwin, Unibet, William Hill, Betway, Pinnacle
const PREFERRED_BOOKMAKERS = [6, 29, 8, 5, 2, 34, 3];

export function extractOddsFromApiResponse(bookmakers: any[]): ExtractedOdds {
  const result: ExtractedOdds = {
    '4-5': null,
    '2,5 Ü': null,
    '2,5 A': null,
    '3,5 Ü': null,
    '3,5 A': null,
    '2-3': null,
    'VAR': null,
  };

  if (!bookmakers || bookmakers.length === 0) return result;

  // Sort bookmakers by preference
  const sorted = [...bookmakers].sort((a, b) => {
    const aIdx = PREFERRED_BOOKMAKERS.indexOf(a.id);
    const bIdx = PREFERRED_BOOKMAKERS.indexOf(b.id);
    if (aIdx === -1 && bIdx === -1) return 0;
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });

  // Try each bookmaker until we find the primary "4-5" odds
  for (const bookmaker of sorted) {
    const bets = bookmaker.bets || [];

    // Extract from Exact Goals Number (bet 38) → "4-5" and "2-3"
    const exactGoalsBet = bets.find((b: any) => b.id === 38);
    if (exactGoalsBet && result['4-5'] === null) {
      const val4 = exactGoalsBet.values?.find((v: any) => String(v.value) === '4');
      const val5 = exactGoalsBet.values?.find((v: any) => String(v.value) === '5');
      if (val4 && val5) {
        const odd4 = parseFloat(val4.odd);
        const odd5 = parseFloat(val5.odd);
        if (!isNaN(odd4) && !isNaN(odd5)) {
          // Use harmonic mean for combined odds (closer to betting math)
          result['4-5'] = round2((2 * odd4 * odd5) / (odd4 + odd5));
        }
      }

      const val2 = exactGoalsBet.values?.find((v: any) => String(v.value) === '2');
      const val3 = exactGoalsBet.values?.find((v: any) => String(v.value) === '3');
      if (val2 && val3 && result['2-3'] === null) {
        const odd2 = parseFloat(val2.odd);
        const odd3 = parseFloat(val3.odd);
        if (!isNaN(odd2) && !isNaN(odd3)) {
          result['2-3'] = round2((2 * odd2 * odd3) / (odd2 + odd3));
        }
      }
    }

    // Extract from Goals Over/Under (bet 5) → "2,5 Ü", "2,5 A", "3,5 Ü", "3,5 A"
    const overUnderBet = bets.find((b: any) => b.id === 5);
    if (overUnderBet) {
      for (const v of overUnderBet.values || []) {
        const odd = parseFloat(v.odd);
        if (isNaN(odd)) continue;
        if (v.value === 'Over 2.5' && result['2,5 Ü'] === null) result['2,5 Ü'] = odd;
        if (v.value === 'Under 2.5' && result['2,5 A'] === null) result['2,5 A'] = odd;
        if (v.value === 'Over 3.5' && result['3,5 Ü'] === null) result['3,5 Ü'] = odd;
        if (v.value === 'Under 3.5' && result['3,5 A'] === null) result['3,5 A'] = odd;
      }
    }

    // Extract from Both Teams Score (bet 8) → "VAR"
    const bttsBet = bets.find((b: any) => b.id === 8);
    if (bttsBet && result['VAR'] === null) {
      const yesVal = bttsBet.values?.find((v: any) => v.value === 'Yes');
      if (yesVal) {
        const odd = parseFloat(yesVal.odd);
        if (!isNaN(odd)) result['VAR'] = odd;
      }
    }

    // If we found the primary odds, stop looking at other bookmakers
    if (result['4-5'] !== null) break;
  }

  return result;
}

// Tolerance for odds matching (±)
const ODDS_TOLERANCE = 0.04;

export interface MatchedRule {
  rule_id: number;
  name: string;
  predictions: string[];
  confidence_base: number;
  importance: string;
  matchQuality: number; // 0-100, how close the odds match
}

export function matchGoldenRules(
  extracted: ExtractedOdds,
  goldenRules: any[]
): MatchedRule[] {
  if (extracted['4-5'] === null) return [];

  const matched: MatchedRule[] = [];

  for (const rule of goldenRules) {
    if (!rule.is_active) continue;

    const primaryOdds = rule.primary_odds || {};
    const secondaryOdds = rule.secondary_odds || {};
    const excludeOdds = rule.exclude_odds || {};

    // Check primary odds ("4-5" key)
    const rulePrimary = primaryOdds['4-5'];
    if (rulePrimary === undefined || rulePrimary === null) continue;

    const primaryDiff = Math.abs(extracted['4-5']! - rulePrimary);
    if (primaryDiff > ODDS_TOLERANCE) continue;

    // Check secondary odds if present
    let secondaryMatch = true;
    let secondaryQuality = 100;

    const secondaryKeys = Object.keys(secondaryOdds);
    if (secondaryKeys.length > 0) {
      for (const key of secondaryKeys) {
        const ruleVal = secondaryOdds[key];
        const extractedVal = extracted[key as keyof ExtractedOdds];

        if (extractedVal === null) {
          secondaryMatch = false;
          break;
        }

        const diff = Math.abs(extractedVal - ruleVal);
        if (diff > ODDS_TOLERANCE) {
          secondaryMatch = false;
          break;
        }
        secondaryQuality = Math.min(secondaryQuality, Math.round(100 - (diff / ODDS_TOLERANCE) * 50));
      }

      if (!secondaryMatch) continue;
    }

    // Check exclude odds
    let excluded = false;
    const excludeKeys = Object.keys(excludeOdds);
    for (const key of excludeKeys) {
      const ruleVal = excludeOdds[key];
      const extractedVal = extracted[key as keyof ExtractedOdds];

      if (extractedVal !== null && Math.abs(extractedVal - ruleVal) <= ODDS_TOLERANCE) {
        excluded = true;
        break;
      }
    }
    if (excluded) continue;

    // Calculate match quality
    const primaryQuality = Math.round(100 - (primaryDiff / ODDS_TOLERANCE) * 50);
    const matchQuality = Math.round((primaryQuality + secondaryQuality) / 2);

    matched.push({
      rule_id: rule.rule_id,
      name: rule.name,
      predictions: rule.predictions || [],
      confidence_base: rule.confidence_base || 85,
      importance: rule.importance || 'normal',
      matchQuality,
    });
  }

  // Sort by confidence_base descending, then match quality
  matched.sort((a, b) => {
    if (b.confidence_base !== a.confidence_base) return b.confidence_base - a.confidence_base;
    return b.matchQuality - a.matchQuality;
  });

  return matched;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
