/** Pot-of-gold consistency: consecutive device-local days with a weigh-in, walk, or gym sets. */

import { getDeviceTimeZone } from './local-day';

export const GOLD_CAP = 21;
export const GOLD_TIME_ZONE = getDeviceTimeZone();

export type GoldOptions = {
  today?: string;
  timeZone?: string;
};

export type ConsistencySources = {
  /** YYYY-MM-DD weigh-in days */
  weighInDays: string[];
  /** ISO timestamps for logged movements / walks */
  movementAts: string[];
  /** ISO session start times for sessions that have at least one set */
  gymSessionStarts: string[];
};

const isoDateFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

export function toGoldDayKey(value: string, timeZone: string = GOLD_TIME_ZONE): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  return isoDateFormatter(timeZone).format(new Date(value));
}

function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

/** Unique calendar days that count toward the pot (gym + weigh-in + walk/cardio). */
export function collectConsistencyDays(
  sources: ConsistencySources,
  timeZone: string = GOLD_TIME_ZONE,
): string[] {
  const days = new Set<string>();
  for (const day of sources.weighInDays) {
    days.add(toGoldDayKey(day, timeZone));
  }
  for (const at of sources.movementAts) {
    days.add(toGoldDayKey(at, timeZone));
  }
  for (const at of sources.gymSessionStarts) {
    days.add(toGoldDayKey(at, timeZone));
  }
  return [...days].sort();
}

/**
 * Current compounding streak for the pot.
 * Counts consecutive days ending today, or yesterday if today is still empty
 * (streak stays alive until the local day ends without activity).
 * Capped at GOLD_CAP for the visual.
 */
export function calculateGoldDays(consistencyDays: string[], options: GoldOptions = {}): number {
  const timeZone = options.timeZone ?? GOLD_TIME_ZONE;
  const today = options.today ?? toGoldDayKey(new Date().toISOString(), timeZone);
  const yesterday = addDays(today, -1);
  const daySet = new Set(consistencyDays.map((day) => toGoldDayKey(day, timeZone)));

  let cursor: string | null = null;
  if (daySet.has(today)) {
    cursor = today;
  } else if (daySet.has(yesterday)) {
    cursor = yesterday;
  } else {
    return 0;
  }

  let current = 0;
  while (cursor && daySet.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return Math.min(GOLD_CAP, current);
}

/** Visual fill stage 0–21 for PotOfGold. */
export function goldVisualStage(days: number): number {
  return Math.max(0, Math.min(GOLD_CAP, Math.floor(days)));
}
