import { dailyQuotes, type DailyQuote } from '../data/daily-quotes';
import { toDayKey } from './calendar';
import { getDeviceTimeZone } from './local-day';

/** Stable non-cryptographic hash so the same YYYY-MM-DD always maps to the same quote. */
export function hashDayKey(dayKey: string): number {
  let hash = 0;
  for (let i = 0; i < dayKey.length; i += 1) {
    hash = (hash * 31 + dayKey.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function quoteIndexForDay(dayKey: string, quoteCount = dailyQuotes.length): number {
  if (quoteCount <= 0) {
    return 0;
  }
  return hashDayKey(dayKey) % quoteCount;
}

export function dailyQuoteForDay(
  dayKey: string,
  quotes: readonly DailyQuote[] = dailyQuotes,
): DailyQuote {
  const index = quoteIndexForDay(dayKey, quotes.length);
  return quotes[index] ?? quotes[0]!;
}

/** Quote for the device-local calendar day (stable across re-renders that day). */
export function dailyQuoteForToday(
  now: Date = new Date(),
  timeZone: string = getDeviceTimeZone(),
  quotes: readonly DailyQuote[] = dailyQuotes,
): DailyQuote {
  return dailyQuoteForDay(toDayKey(now, timeZone), quotes);
}
