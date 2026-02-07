/**
 * Shared team name normalization and matching utilities
 * Used by: api/cron/live-scores/route.ts
 */

const TEAM_ALIASES: Record<string, string> = {
  'mvv': 'maastricht',
  'maastricht': 'maastricht',
};

export function normalizeTeamName(name: string): string {
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

export function teamsMatch(
  predHome: string,
  predAway: string,
  fixtureHome: string,
  fixtureAway: string
): boolean {
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
