/**
 * Shared prediction result checking logic
 * Used by: api/opportunities/route.ts, api/cron/live-scores/route.ts, lib/alert-logic.ts
 */

// Convert prediction_result from various formats to boolean
export function toBooleanResult(val: any): boolean | null {
  if (val === true || val === 'won' || val === 'true') return true;
  if (val === false || val === 'lost' || val === 'false') return false;
  return null;
}

// Normalize Turkish characters for prediction matching
function normalizePrediction(prediction: string): string {
  return prediction
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'i')
    .replace(/ü/g, 'U')
    .replace(/Ü/g, 'U')
    .toUpperCase()
    .trim();
}

/**
 * Check if a prediction result is won/lost based on final scores
 * Returns: true = won, false = lost, null = unrecognized prediction type
 */
export function checkPredictionResult(
  prediction: string,
  homeScore: number,
  awayScore: number,
  halftimeHome?: number | null,
  halftimeAway?: number | null
): boolean | null {
  if (homeScore === null || homeScore === undefined || awayScore === null || awayScore === undefined) return null;

  const totalGoals = homeScore + awayScore;
  const pred = normalizePrediction(prediction);

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
