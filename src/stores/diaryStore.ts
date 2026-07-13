import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

type DiaryState = {
  bodyWeightLogs: BodyWeightLog[];
  meals: MealLog[];
  calorieTarget: number;
  upsertBodyWeight: (weightLb: number, loggedAt?: string) => BodyWeightLog;
  addMeal: (meal: Omit<MealLog, 'id' | 'loggedAt'> & { loggedAt?: string }) => MealLog;
  clearMealsForToday: () => void;
};

function todayKey(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
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
          loggedAt: meal.loggedAt ?? new Date().toISOString(),
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
      clearMealsForToday: () => {
        const day = todayKey();
        set((state) => ({
          meals: state.meals.filter((meal) => !meal.loggedAt.startsWith(day)),
        }));
      },
    }),
    {
      name: 'aloo-diary-v1',
      partialize: (state) => ({
        bodyWeightLogs: state.bodyWeightLogs,
        meals: state.meals,
        calorieTarget: state.calorieTarget,
      }),
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
  return meals.filter((meal) => meal.loggedAt.slice(0, 10) === day);
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
