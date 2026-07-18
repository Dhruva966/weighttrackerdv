import { describe, expect, it } from 'vitest';
import {
  formatChartMonth,
  formatDate,
  formatDateTime,
  formatDateTimeInZone,
  formatVolume,
  formatWeight,
  slugify,
} from './fmt';

describe('slugify', () => {
  it('normalizes exercise names into URL slugs', () => {
    expect(slugify('Lat Pulldown')).toBe('lat-pulldown');
    expect(slugify('  Seated Row!!! ')).toBe('seated-row');
  });
});

describe('formatWeight', () => {
  it('formats pounds with one decimal when needed', () => {
    expect(formatWeight(42.5)).toBe('42.5 lb');
    expect(formatWeight(100)).toBe('100 lb');
  });

  it('converts to kilograms when requested', () => {
    expect(formatWeight(100, 'kg')).toBe('45.4 kg');
  });
});

describe('formatVolume', () => {
  it('abbreviates large volumes', () => {
    expect(formatVolume(1500)).toBe('1.5k lb');
    expect(formatVolume(250)).toBe('250 lb');
  });
});

describe('formatDate', () => {
  it('formats ISO timestamps in America/Los_Angeles so Pacific baselines stay on the seeded day', () => {
    expect(formatDate('2022-09-01T12:00:00-07:00')).toBe('Sep 1');
    expect(formatDate('2026-07-11T12:00:00Z')).toMatch(/Jul/);
  });
});

describe('formatChartMonth', () => {
  it('formats elongated month labels for progress charts with year', () => {
    expect(formatChartMonth('2022-09-01T12:00:00-07:00')).toBe('Sep 22');
    expect(formatChartMonth('2026-07-11T12:00:00-07:00')).toBe('Jul 26');
  });
});

describe('formatDateTime', () => {
  it('includes time for session recaps', () => {
    expect(formatDateTime('2026-07-11T15:30:00Z')).toMatch(/Jul/);
  });
});

describe('formatDateTimeInZone', () => {
  it('formats session times in America/Los_Angeles', () => {
    const label = formatDateTimeInZone('2026-07-10T18:00:00-07:00', 'America/Los_Angeles');
    expect(label).toMatch(/Jul/);
    expect(label).toMatch(/6:00|18:00|6 PM|6:00 PM/i);
  });
});
