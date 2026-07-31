import { describe, expect, it } from 'vitest';
import { dailyQuotes } from '../data/daily-quotes';
import { dailyQuoteForDay, hashDayKey, quoteIndexForDay } from './daily-quote';

describe('daily-quote', () => {
  it('hashes the same day key to the same index', () => {
    const day = '2026-07-30';
    expect(quoteIndexForDay(day)).toBe(quoteIndexForDay(day));
    expect(hashDayKey(day)).toBe(hashDayKey(day));
  });

  it('returns different quotes for different days across the curated list', () => {
    const seen = new Set<string>();
    for (let day = 1; day <= 31; day += 1) {
      const key = `2026-07-${String(day).padStart(2, '0')}`;
      seen.add(dailyQuoteForDay(key).text);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('stays within the curated quote list', () => {
    const quote = dailyQuoteForDay('2026-01-01');
    expect(dailyQuotes).toContainEqual(quote);
    expect(quote.attribution.length).toBeGreaterThan(0);
  });
});
