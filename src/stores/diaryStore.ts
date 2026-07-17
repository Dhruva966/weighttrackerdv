import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MovementKind } from '../lib/movement-from-text';

export type BodyWeightLog = {
  id: string;
  loggedAt: string; // YYYY-MM-DD
  weightLb: number;
};

export type MealLog = {
  id: string;
  loggedAt: string; // ISO
  title: string;
  summary: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  raw: string;
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
  meals: MealLog[];
  movements: MovementLog[];
  calorieTarget: number;
  upsertBodyWeight: (weightLb: number, loggedAt?: string) => BodyWeightLog;
  addMeal: (meal: Omit<MealLog, 'id' | 'loggedAt'> & { loggedAt?: string }) => MealLog;
  addMovement: (
    movement: Omit<MovementLog, 'id' | 'loggedAt'> & { loggedAt?: string },
  ) => MovementLog;
  clearMealsForToday: () => void;
};

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
      meals: [],
      movements: [],
      calorieTarget: 2400,
      upsertBodyWeight: (weightLb, loggedAt) => {
        const day = loggedAt ?? todayKey();
        const existing = get().bodyWeightLogs.find((log) => log.loggedAt === day);
        const next: BodyWeightLog = existing
          ? { ...existing, weightLb }
          : { id: newId('bw'), loggedAt: day, weightLb };
        set((state) => ({
          bodyWeightLogs: [
            next,
            ...state.bodyWeightLogs.filter((log) => log.loggedAt !== day),
          ].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)),
        }));
        return next;
      },
      addMeal: (meal) => {
        const entry: MealLog = {
          id: newId('meal'),
          loggedAt: meal.loggedAt ?? nowLoggedAt(),
          title: meal.title,
          summary: meal.summary,
          calories: meal.calories,
          proteinG: meal.proteinG,
          carbsG: meal.carbsG,
          fatG: meal.fatG,
          raw: meal.raw,
        };
        set((state) => ({ meals: [entry, ...state.meals] }));
        return entry;
      },
      addMovement: (movement) => {
        const entry: MovementLog = {
          id: newId('move'),
          loggedAt: movement.loggedAt ?? nowLoggedAt(),
          kind: movement.kind,
          title: movement.title,
          durationMin: movement.durationMin,
          summary: movement.summary,
          raw: movement.raw,
        };
        set((state) => ({ movements: [entry, ...state.movements] }));
        return entry;
      },
      clearMealsForToday: () => {
        const day = todayKey();
        set((state) => ({
          meals: state.meals.filter((meal) => dayKeyFromLoggedAt(meal.loggedAt) !== day),
        }));
      },
    }),
    {
      name: 'aloo-diary-v1',
      partialize: (state) => ({
        bodyWeightLogs: state.bodyWeightLogs,
        meals: state.meals,
        movements: state.movements,
        calorieTarget: state.calorieTarget,
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

export function mealsForDay(meals: MealLog[], day = todayKey()): MealLog[] {
  return meals.filter((meal) => dayKeyFromLoggedAt(meal.loggedAt) === day);
}

export function movementsForDay(movements: MovementLog[], day = todayKey()): MovementLog[] {
  return movements.filter((movement) => dayKeyFromLoggedAt(movement.loggedAt) === day);
}

export function sumMacros(meals: MealLog[]) {
  return meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      proteinG: acc.proteinG + meal.proteinG,
      carbsG: acc.carbsG + meal.carbsG,
      fatG: acc.fatG + meal.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}
