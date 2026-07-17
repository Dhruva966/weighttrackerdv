import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MealItemEstimate } from '../lib/meal-from-text';
import type { MovementKind } from '../lib/movement-from-text';
import type { CaptureSource } from '../lib/diary-sync-schemas';
import { dayKeyFromLoggedAt, nowLoggedAt, todayKey } from '../lib/diary-day';

export { DIARY_TIMEZONE, dayKeyFromLoggedAt, nowLoggedAt, todayKey } from '../lib/diary-day';

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
  addMeal: (
    meal: Omit<MealLog, 'id' | 'loggedAt'> & { loggedAt?: string },
    options?: { items?: MealItemEstimate[]; captureSource?: CaptureSource },
  ) => MealLog;
  addMovement: (
    movement: Omit<MovementLog, 'id' | 'loggedAt'> & { loggedAt?: string },
    options?: { captureSource?: CaptureSource },
  ) => MovementLog;
  clearMealsForToday: () => void;
};

function newId(): string {
  return crypto.randomUUID();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function queueDiarySync(
  fn: (sync: typeof import('../lib/supabase-sync')) => void | Promise<void>,
): void {
  void import('../lib/supabase-sync').then((sync) => {
    void fn(sync);
  });
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
          ? {
              ...existing,
              weightLb,
              id: isUuid(existing.id) ? existing.id : newId(),
            }
          : { id: newId(), loggedAt: day, weightLb };
        set((state) => ({
          bodyWeightLogs: [
            next,
            ...state.bodyWeightLogs.filter((log) => log.loggedAt !== day),
          ].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt)),
        }));
        queueDiarySync(({ syncBodyWeight, syncConsistencyEvent }) => {
          void syncBodyWeight(next);
          void syncConsistencyEvent({ eventType: 'weight', sourceId: next.id, dayKey: day });
        });
        return next;
      },
      addMeal: (meal, options) => {
        const entry: MealLog = {
          id: newId(),
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
        const captureSource = options?.captureSource ?? 'text';
        queueDiarySync(({ syncMeal, syncConsistencyEvent }) => {
          void syncMeal(entry, { items: options?.items, captureSource });
          void syncConsistencyEvent({
            eventType: 'meal',
            sourceId: entry.id,
            dayKey: dayKeyFromLoggedAt(entry.loggedAt),
          });
        });
        return entry;
      },
      addMovement: (movement, options) => {
        const entry: MovementLog = {
          id: newId(),
          loggedAt: movement.loggedAt ?? nowLoggedAt(),
          kind: movement.kind,
          title: movement.title,
          durationMin: movement.durationMin,
          summary: movement.summary,
          raw: movement.raw,
        };
        set((state) => ({ movements: [entry, ...state.movements] }));
        queueDiarySync(({ syncMovement, syncConsistencyEvent }) => {
          void syncMovement(entry, options?.captureSource ?? 'text');
          void syncConsistencyEvent({
            eventType: 'movement',
            sourceId: entry.id,
            dayKey: dayKeyFromLoggedAt(entry.loggedAt),
          });
        });
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
