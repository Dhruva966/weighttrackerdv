/**
 * Device-local timezone resolution.
 *
 * Calendar-day bucketing (which day a session/set/weigh-in "belongs to") should use the
 * user's actual device timezone rather than a hardcoded literal, so the app behaves
 * correctly for the owner wherever they are, not only in America/Los_Angeles.
 */

/**
 * Fallback timezone used only when the browser's Intl API cannot resolve a local
 * timezone. This should never realistically trigger in a modern browser PWA, but a
 * throwing Intl call must not crash the app.
 */
const FALLBACK_TIME_ZONE = 'America/Los_Angeles';

/** Resolves the device's local IANA timezone (e.g. 'America/Los_Angeles', 'Asia/Kolkata'). */
export function getDeviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}
