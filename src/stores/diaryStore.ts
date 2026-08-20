import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDeviceTimeZone } from '../lib/local-day';
import type { MovementKind } from '../lib/movement-from-text';
import { isUuid, syncBodyWeight } from '../lib/supabase-sync';

export type BodyWeightLog = {
  id: string;
  loggedAt: string; // YYYY-MM-DD
  weightLb: number;
};

export type MovementLog = {
  id: string;
  loggedAt: string; // ISO
  kind: MovementKind;
  title: string;
  durationMin: number | null;
  summary: string;
  raw: string;
};

type DiaryState = {
  bodyWeightLogs: BodyWeightLog[];
  movements: MovementLog[];
  upsertBodyWeight: (weightLb: number, loggedAt?: string, timeZone?: string) => BodyWeightLog;
  hydrateBodyWeightFromRemote: (remote: BodyWeightLog[]) => void;
  addMovement: (
    movement: Omit<MovementLog, 'id' | 'loggedAt'> & { loggedAt?: string },
  ) => MovementLog;
};

export function mergeBodyWeightLogs(
  local: BodyWeightLog[],
  remote: BodyWeightLog[],
): BodyWeightLog[] {
  const byDay = new Map<string, BodyWeightLog>();
  for (const log of local) {
    byDay.set(log.loggedAt, log);
  }
  for (const log of remote) {
    byDay.set(log.loggedAt, log);
  }
  return [...byDay.values()].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
}

function todayKey(timeZone: string = getDeviceTimeZone()): string {
  return dayKeyForTimestamp(new Date().toISOString(), timeZone);
}

function dayKeyForTimestamp(value: string, timeZone: string = getDeviceTimeZone()): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/** Dhruva’s current approximate body weight used as the first real weigh-in seed. */
const DHRUVA_WEIGHT_LB = 169;

export const useDiaryStore = create<DiaryState>()(
  persist(
    (set, get) => ({
      bodyWeightLogs: [
        {
          id: 'bw-seed-dhruva',
          loggedAt: todayKey(),
          weightLb: DHRUVA_WEIGHT_LB,
        },
      ],
      movements: [],
      upsertBodyWeight: (weightLb, loggedAt, timeZone) => {
        const day = loggedAt ? dayKeyForTimestamp(loggedAt, timeZone) : todayKey(timeZone);
        const existing = get().bodyWeightLogs.find((log) => log.loggedAt === day);
        const next: BodyWeightLog =
          existing && isUuid(existing.id)
            ? { ...existing, weightLb }
            : { id: crypto.randomUUID(), loggedAt: day, weightLb };
        set((state) => ({
          bodyWeightLogs: [
            next,
            ...state.bodyWeightLogs.filter((log) => log.loggedAt !== day),
          ].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)),
        }));
        void syncBodyWeight(next);
        return next;
      },
      hydrateBodyWeightFromRemote: (remote) => {
        if (remote.length === 0) {
          return;
        }
        set((state) => ({
          bodyWeightLogs: mergeBodyWeightLogs(state.bodyWeightLogs, remote),
        }));
      },
      addMovement: (movement) => {
        const entry: MovementLog = {
          id: newId('move'),
          loggedAt: movement.loggedAt ?? new Date().toISOString(),
          kind: movement.kind,
          title: movement.title,
          durationMin: movement.durationMin,
          summary: movement.summary,
          raw: movement.raw,
        };
        set((state) => ({ movements: [entry, ...state.movements] }));
        return entry;
      },
    }),
    {
      name: 'aloo-diary-v1',
      partialize: (state) => ({
        bodyWeightLogs: state.bodyWeightLogs,
        movements: state.movements,
      }),
      merge: (persisted, current) => {
        const partial = (persisted ?? {}) as Partial<DiaryState>;
        return {
          ...current,
          ...partial,
          movements: partial.movements ?? [],
        };
      },
    },
  ),
);

export function getLatestBodyWeight(logs: BodyWeightLog[]): BodyWeightLog | null {
  return [...logs].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))[0] ?? null;
}

export function getBodyWeightDelta(logs: BodyWeightLog[]): number | null {
  const sorted = [...logs].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
  if (sorted.length < 2) {
    return null;
  }
  return Math.round((sorted[0]!.weightLb - sorted[1]!.weightLb) * 10) / 10;
}

export function movementsForDay(
  movements: MovementLog[],
  day?: string,
  timeZone?: string,
): MovementLog[] {
  const zone = timeZone ?? getDeviceTimeZone();
  const targetDay = day ?? dayKeyForTimestamp(new Date().toISOString(), zone);
  return movements.filter((movement) => dayKeyForTimestamp(movement.loggedAt, zone) === targetDay);
}
