/**
 * Shared Istanbul timezone date utilities
 * Used by: api/opportunities/route.ts, api/cron/live-scores/route.ts, DashboardScreen.tsx
 */

// Get current time in Istanbul timezone (UTC+3)
export function getIstanbulTime(): Date {
  const now = new Date();
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcTime + 3 * 3600000);
}

// Get today's date in Istanbul timezone (YYYY-MM-DD)
export function getTodayDate(): string {
  return getIstanbulTime().toISOString().split('T')[0];
}

// Get yesterday's date in Istanbul timezone (YYYY-MM-DD)
export function getYesterdayDate(): string {
  const istanbul = getIstanbulTime();
  istanbul.setDate(istanbul.getDate() - 1);
  return istanbul.toISOString().split('T')[0];
}

// Get target date based on date parameter (YYYY-MM-DD)
export function getTargetDate(dateParam: string): string {
  const istanbul = getIstanbulTime();

  if (dateParam === 'yesterday') {
    istanbul.setDate(istanbul.getDate() - 1);
  } else if (dateParam === 'tomorrow') {
    istanbul.setDate(istanbul.getDate() + 1);
  } else if (dateParam === 'day_after_tomorrow') {
    istanbul.setDate(istanbul.getDate() + 2);
  }

  return istanbul.toISOString().split('T')[0];
}

// Format date from YYYY-MM-DD to DD.MM.YYYY (Turkish format)
export function formatDateTurkish(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
}
