/**
 * Live Alert Logic - Determines how close each prediction is to being fulfilled
 * Used by: LiveAnalysisScreen, api/live-alerts/route.ts
 */

export interface AlertState {
  predictionType: string;
  goalsNeeded: number;
  currentScore: { home: number; away: number };
  targetDescription: string;
  isFirstHalf: boolean;
  minutesElapsed: number;
  alertLevel: 'hot' | 'warm' | 'cold';
  message: string;
  isAlreadyHit: boolean;
}

function normalizePred(prediction: string): string {
  return prediction
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'i')
    .replace(/ü/g, 'U')
    .replace(/Ü/g, 'U')
    .toUpperCase()
    .trim();
}

function getAlertLevel(needed: number): 'hot' | 'warm' | 'cold' {
  if (needed <= 1) return 'hot';
  if (needed <= 2) return 'warm';
  return 'cold';
}

function getMessage(needed: number, isHit: boolean): string {
  if (isHit) return 'TUTTU!';
  if (needed === 1) return '1 GOL KALA!';
  if (needed === 2) return '2 gol kala';
  return `${needed} gol kala`;
}

export function calculateAlertState(
  prediction: string,
  homeScore: number,
  awayScore: number,
  elapsed: number,
  halftimeHome?: number | null,
  halftimeAway?: number | null
): AlertState | null {
  if (homeScore === null || homeScore === undefined || awayScore === null || awayScore === undefined) return null;

  const pred = normalizePred(prediction);
  const totalGoals = homeScore + awayScore;
  const isFirstHalf = elapsed <= 45;
  const base = { predictionType: prediction, currentScore: { home: homeScore, away: awayScore }, isFirstHalf, minutesElapsed: elapsed };

  // MS Over (e.g., "2.5 UST" or "MS 2.5 UST")
  const msOverMatch = pred.match(/^(?:MS\s+)?(\d+\.?\d*)\s*UST$/);
  if (msOverMatch) {
    const target = parseFloat(msOverMatch[1]);
    const needed = Math.ceil(target) - totalGoals;
    if (needed <= 0) return { ...base, goalsNeeded: 0, targetDescription: `Toplam ${Math.ceil(target)}+ gol`, alertLevel: 'hot', message: getMessage(0, true), isAlreadyHit: true };
    return { ...base, goalsNeeded: needed, targetDescription: `Toplam ${Math.ceil(target)}+ gol gerekli`, alertLevel: getAlertLevel(needed), message: getMessage(needed, false), isAlreadyHit: false };
  }

  // MS Under (e.g., "2.5 ALT")
  const msUnderMatch = pred.match(/^(?:MS\s+)?(\d+\.?\d*)\s*ALT$/);
  if (msUnderMatch) {
    const target = parseFloat(msUnderMatch[1]);
    const remaining = Math.floor(target) - totalGoals;
    if (totalGoals >= target) return { ...base, goalsNeeded: 0, targetDescription: `${target} alt gecildi`, alertLevel: 'hot', message: 'YATTI!', isAlreadyHit: true };
    if (remaining <= 1) return { ...base, goalsNeeded: remaining, targetDescription: `1 gol daha olursa yatar`, alertLevel: 'hot', message: 'DIKKAT! 1 gol daha = yatar', isAlreadyHit: false };
    return null; // Not close enough to alert
  }

  // MS EV Over (Home team)
  const msEvOverMatch = pred.match(/^MS\s+EV\s+(\d+\.?\d*)\s*UST$/);
  if (msEvOverMatch) {
    const target = parseFloat(msEvOverMatch[1]);
    const needed = Math.ceil(target) - homeScore;
    if (needed <= 0) return { ...base, goalsNeeded: 0, targetDescription: `Ev sahibi ${Math.ceil(target)}+ gol`, alertLevel: 'hot', message: getMessage(0, true), isAlreadyHit: true };
    return { ...base, goalsNeeded: needed, targetDescription: `Ev sahibi ${needed} gol daha atmali`, alertLevel: getAlertLevel(needed), message: `Ev sahibi ${needed} gol kala`, isAlreadyHit: false };
  }

  // MS DEP Over (Away team)
  const msDepOverMatch = pred.match(/^MS\s+DEP\s+(\d+\.?\d*)\s*UST$/);
  if (msDepOverMatch) {
    const target = parseFloat(msDepOverMatch[1]);
    const needed = Math.ceil(target) - awayScore;
    if (needed <= 0) return { ...base, goalsNeeded: 0, targetDescription: `Deplasman ${Math.ceil(target)}+ gol`, alertLevel: 'hot', message: getMessage(0, true), isAlreadyHit: true };
    return { ...base, goalsNeeded: needed, targetDescription: `Deplasman ${needed} gol daha atmali`, alertLevel: getAlertLevel(needed), message: `Deplasman ${needed} gol kala`, isAlreadyHit: false };
  }

  // IY Over (First half) - only relevant during first half
  const iyOverMatch = pred.match(/^IY\s+(\d+\.?\d*)\s*UST$/);
  if (iyOverMatch && isFirstHalf) {
    const target = parseFloat(iyOverMatch[1]);
    const needed = Math.ceil(target) - totalGoals;
    if (needed <= 0) return { ...base, goalsNeeded: 0, targetDescription: `IY ${Math.ceil(target)}+ gol`, alertLevel: 'hot', message: getMessage(0, true), isAlreadyHit: true };
    return { ...base, goalsNeeded: needed, targetDescription: `IY ${needed} gol daha gerekli`, alertLevel: getAlertLevel(needed), message: `IY ${needed} gol kala!`, isAlreadyHit: false };
  }

  // IY EV Over
  const iyEvOverMatch = pred.match(/^IY\s+EV\s+(\d+\.?\d*)\s*UST$/);
  if (iyEvOverMatch && isFirstHalf) {
    const target = parseFloat(iyEvOverMatch[1]);
    const needed = Math.ceil(target) - homeScore;
    if (needed <= 0) return { ...base, goalsNeeded: 0, targetDescription: `IY Ev ${Math.ceil(target)}+ gol`, alertLevel: 'hot', message: getMessage(0, true), isAlreadyHit: true };
    return { ...base, goalsNeeded: needed, targetDescription: `IY Ev sahibi ${needed} gol kala`, alertLevel: getAlertLevel(needed), message: `IY Ev ${needed} gol kala`, isAlreadyHit: false };
  }

  // IY DEP Over
  const iyDepOverMatch = pred.match(/^IY\s+DEP\s+(\d+\.?\d*)\s*UST$/);
  if (iyDepOverMatch && isFirstHalf) {
    const target = parseFloat(iyDepOverMatch[1]);
    const needed = Math.ceil(target) - awayScore;
    if (needed <= 0) return { ...base, goalsNeeded: 0, targetDescription: `IY Dep ${Math.ceil(target)}+ gol`, alertLevel: 'hot', message: getMessage(0, true), isAlreadyHit: true };
    return { ...base, goalsNeeded: needed, targetDescription: `IY Deplasman ${needed} gol kala`, alertLevel: getAlertLevel(needed), message: `IY Dep ${needed} gol kala`, isAlreadyHit: false };
  }

  // KG VAR (Both teams to score)
  if (pred === 'KG VAR') {
    const homeNeeds = homeScore === 0 ? 1 : 0;
    const awayNeeds = awayScore === 0 ? 1 : 0;
    const needed = homeNeeds + awayNeeds;
    if (needed === 0) return { ...base, goalsNeeded: 0, targetDescription: 'Her iki takim da gol atti', alertLevel: 'hot', message: getMessage(0, true), isAlreadyHit: true };
    const who = homeNeeds > 0 ? 'Ev sahibi gol atmali' : 'Deplasman gol atmali';
    return { ...base, goalsNeeded: needed, targetDescription: who, alertLevel: getAlertLevel(needed), message: `${who}!`, isAlreadyHit: false };
  }

  // KG YOK
  if (pred === 'KG YOK') {
    if (homeScore > 0 && awayScore > 0) return { ...base, goalsNeeded: 0, targetDescription: 'Iki takim da atti', alertLevel: 'hot', message: 'YATTI!', isAlreadyHit: true };
    return null; // Still alive, no alert needed unless close to end
  }

  // MS 1 (Home win)
  if (pred === 'MS 1') {
    if (homeScore > awayScore) return { ...base, goalsNeeded: 0, targetDescription: 'Ev sahibi onde', alertLevel: 'hot', message: 'TUTTU!', isAlreadyHit: true };
    const needed = awayScore - homeScore + 1;
    return { ...base, goalsNeeded: needed, targetDescription: `Ev sahibi ${needed} gol fark atmali`, alertLevel: getAlertLevel(needed), message: `${needed} gol fark gerekli`, isAlreadyHit: false };
  }

  // MS 2 (Away win)
  if (pred === 'MS 2') {
    if (awayScore > homeScore) return { ...base, goalsNeeded: 0, targetDescription: 'Deplasman onde', alertLevel: 'hot', message: 'TUTTU!', isAlreadyHit: true };
    const needed = homeScore - awayScore + 1;
    return { ...base, goalsNeeded: needed, targetDescription: `Deplasman ${needed} gol fark atmali`, alertLevel: getAlertLevel(needed), message: `${needed} gol fark gerekli`, isAlreadyHit: false };
  }

  // MS X (Draw)
  if (pred === 'MS X') {
    if (homeScore === awayScore) return { ...base, goalsNeeded: 0, targetDescription: 'Berabere', alertLevel: 'hot', message: 'TUTTU!', isAlreadyHit: true };
    const diff = Math.abs(homeScore - awayScore);
    return { ...base, goalsNeeded: diff, targetDescription: `${diff} gol fark var`, alertLevel: getAlertLevel(diff), message: `${diff} gol ile esitlenmeli`, isAlreadyHit: false };
  }

  // IY MS 1/2/X
  if (pred === 'IY MS 1' && isFirstHalf) {
    if (homeScore > awayScore) return { ...base, goalsNeeded: 0, targetDescription: 'IY Ev sahibi onde', alertLevel: 'hot', message: 'TUTTU!', isAlreadyHit: true };
    const needed = awayScore - homeScore + 1;
    return { ...base, goalsNeeded: needed, targetDescription: `IY Ev sahibi ${needed} gol fark atmali`, alertLevel: getAlertLevel(needed), message: `IY ${needed} gol fark gerekli`, isAlreadyHit: false };
  }
  if (pred === 'IY MS 2' && isFirstHalf) {
    if (awayScore > homeScore) return { ...base, goalsNeeded: 0, targetDescription: 'IY Deplasman onde', alertLevel: 'hot', message: 'TUTTU!', isAlreadyHit: true };
    const needed = homeScore - awayScore + 1;
    return { ...base, goalsNeeded: needed, targetDescription: `IY Deplasman ${needed} gol fark atmali`, alertLevel: getAlertLevel(needed), message: `IY ${needed} gol fark gerekli`, isAlreadyHit: false };
  }
  if (pred === 'IY MS X' && isFirstHalf) {
    if (homeScore === awayScore) return { ...base, goalsNeeded: 0, targetDescription: 'IY Berabere', alertLevel: 'hot', message: 'TUTTU!', isAlreadyHit: true };
    const diff = Math.abs(homeScore - awayScore);
    return { ...base, goalsNeeded: diff, targetDescription: `IY ${diff} gol fark var`, alertLevel: getAlertLevel(diff), message: `IY ${diff} gol ile esitlenmeli`, isAlreadyHit: false };
  }

  // IY KG VAR
  if (pred === 'IY KG VAR' && isFirstHalf) {
    const homeNeeds = homeScore === 0 ? 1 : 0;
    const awayNeeds = awayScore === 0 ? 1 : 0;
    const needed = homeNeeds + awayNeeds;
    if (needed === 0) return { ...base, goalsNeeded: 0, targetDescription: 'IY Her iki takim gol atti', alertLevel: 'hot', message: getMessage(0, true), isAlreadyHit: true };
    return { ...base, goalsNeeded: needed, targetDescription: `IY KG icin ${needed} gol gerekli`, alertLevel: getAlertLevel(needed), message: `IY ${needed} gol kala`, isAlreadyHit: false };
  }

  return null;
}
