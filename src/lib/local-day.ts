/**
 * Device-local calendar day keys (`YYYY-MM-DD`).
 *
 * Own the day-key boundary here so UI never parses bare `YYYY-MM-DD` as UTC midnight
 * (classic off-by-one in US timezones) or formats local midnight with `timeZone: 'UTC'`
 * (classic off-by-one east of UTC, e.g. IST/HKT).
 */

/**
 * Fallback timezone used only when the browser's Intl API cannot resolve a local
 * timezone. This should never realistically trigger in a modern browser PWA, but a
 * throwing Intl call must not crash the app.
 */
const FALLBACK_TIME_ZONE = 'America/Los_Angeles';

export const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Resolves the device's local IANA timezone (e.g. 'America/Los_Angeles', 'Asia/Kolkata'). */
export function getDeviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

export function isDayKey(value: string): boolean {
  return DAY_KEY_PATTERN.test(value);
}

const isoDateFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

/**
 * Normalize an instant (or already-canonical day key) to `YYYY-MM-DD` in `timeZone`.
 * Bare day keys pass through unchanged — never `new Date('YYYY-MM-DD')` (UTC midnight).
 */
export function toDayKey(value: string | Date, timeZone: string = getDeviceTimeZone()): string {
  if (typeof value === 'string' && isDayKey(value)) {
    return value;
  }

  return isoDateFormatter(timeZone).format(value instanceof Date ? value : new Date(value));
}

/**
 * Stable UTC noon for a calendar day key. Use this (not local midnight, not UTC midnight)
 * whenever a day key must become a `Date` for formatting or weekday math.
 */
export function dayKeyToUtcNoon(dayKey: string): Date {
  if (!isDayKey(dayKey)) {
    return new Date(NaN);
  }
  return new Date(`${dayKey}T12:00:00.000Z`);
}

export type DayKeyLabelOptions = {
  weekday?: 'long' | 'short' | 'narrow';
  month?: 'long' | 'short' | 'narrow' | 'numeric' | '2-digit';
  day?: 'numeric' | '2-digit';
};

/** Format a day key for display without timezone shift. */
export function formatDayKeyLabel(dayKey: string, options: DayKeyLabelOptions = {}): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: options.weekday ?? 'long',
    month: options.month ?? 'long',
    day: options.day ?? 'numeric',
    timeZone: 'UTC',
  }).format(dayKeyToUtcNoon(dayKey));
}

export type SessionDayInput = {
  startedAt: string;
  /** Canonical calendar day when known — preferred over re-deriving from `startedAt`. */
  localDate?: string;
  /** IANA zone stamped at session creation; used only when `localDate` is missing. */
  timezone?: string;
};

/**
 * Calendar day a gym session belongs to.
 * Prefer stamped `localDate` so Grow/Move stay stable across device TZ changes and
 * UTC-midnight `startedAt` values.
 */
export function sessionDayKey(
  session: SessionDayInput,
  fallbackTimeZone: string = getDeviceTimeZone(),
): string {
  if (session.localDate && isDayKey(session.localDate)) {
    return session.localDate;
  }
  return toDayKey(session.startedAt, session.timezone ?? fallbackTimeZone);
}
