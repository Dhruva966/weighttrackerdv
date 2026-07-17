export const DIARY_TIMEZONE = 'America/Los_Angeles';

export function todayKey(date = new Date(), timeZone = DIARY_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function dayKeyFromLoggedAt(loggedAt: string, timeZone = DIARY_TIMEZONE): string {
  return todayKey(new Date(loggedAt), timeZone);
}

export function nowLoggedAt(): string {
  return new Date().toISOString();
}
