import type { MealItemEstimate } from './meal-from-text';
import {
  bodyWeightRowSchema,
  captureSourceFromLabel,
  mealItemRowSchema,
  mealLogRowSchema,
  movementLogRowSchema,
  type CaptureSource,
} from './diary-sync-schemas';
import { drainQueue, enqueueWrite } from './offline-queue';
import {
  bodyWeightToRow,
  exerciseToRow,
  goalToRow,
  mealItemsToRows,
  mealToRow,
  movementToRow,
  rowToBodyWeight,
  rowToMeal,
  rowToMovement,
  sessionToRow,
  setToRow,
} from './supabase-mappers';
import { getSupabase } from './supabase';
import { dayKeyFromLoggedAt } from './diary-day';
import type { BodyWeightLog, MealLog, MovementLog } from '../stores/diaryStore';
import { USER_ID } from './user';
import type { Exercise, Goal, LoggedSet, WorkoutSession } from '../types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null;
}

type UpsertOptions = {
  onConflict?: string;
};

async function persistUpsert(
  table: string,
  payload: Record<string, unknown> | Record<string, unknown>[],
  options?: UpsertOptions,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !navigator.onLine) {
    await enqueueWrite({ table, op: 'upsert', payload });
    return;
  }

  const upsertOptions = options?.onConflict ? { onConflict: options.onConflict } : undefined;
  const { error } = await supabase.from(table).upsert(payload, upsertOptions);
  if (error) {
    await enqueueWrite({ table, op: 'upsert', payload });
  }
}

export async function syncSession(session: WorkoutSession): Promise<void> {
  if (!isUuid(session.id)) {
    return;
  }

  await persistUpsert('sessions', sessionToRow(session));
}

export async function syncSet(setItem: LoggedSet): Promise<void> {
  if (!isUuid(setItem.id) || !isUuid(setItem.sessionId) || !isUuid(setItem.exerciseId)) {
    return;
  }

  await persistUpsert('sets', setToRow(setItem));
}

export async function syncExercise(exercise: Exercise): Promise<void> {
  if (!isUuid(exercise.id)) {
    return;
  }

  await persistUpsert('exercises', exerciseToRow(exercise));
}

export async function syncGoal(goal: Goal): Promise<void> {
  if (!isUuid(goal.id)) {
    return;
  }

  await persistUpsert('goals', goalToRow(goal));
}

export async function syncMeal(
  meal: MealLog,
  options?: { items?: MealItemEstimate[]; captureSource?: CaptureSource },
): Promise<void> {
  if (!isUuid(meal.id)) {
    return;
  }

  const captureSource = options?.captureSource ?? 'text';
  const mealRow = mealLogRowSchema.parse(mealToRow(meal, captureSource));
  await persistUpsert('meal_logs', mealRow);

  const items = options?.items ?? [];
  if (items.length === 0) {
    return;
  }

  const itemRows = mealItemsToRows(meal.id, items).map((row) => mealItemRowSchema.parse(row));
  await persistUpsert('meal_items', itemRows);
}

export async function syncMovement(
  movement: MovementLog,
  captureSource: CaptureSource = 'text',
): Promise<void> {
  if (!isUuid(movement.id)) {
    return;
  }

  const row = movementLogRowSchema.parse(movementToRow(movement, captureSource));
  await persistUpsert('movement_logs', row);
}

export async function syncBodyWeight(
  log: BodyWeightLog,
  captureSource: CaptureSource = 'text',
): Promise<void> {
  const syncId = isUuid(log.id) ? log.id : crypto.randomUUID();
  const row = bodyWeightRowSchema.parse(bodyWeightToRow({ ...log, id: syncId }, captureSource));
  await persistUpsert('body_weight_logs', row, { onConflict: 'user_id,logged_at' });
}

export async function syncConsistencyEvent(input: {
  dayKey?: string;
  eventType: 'meal' | 'weight' | 'movement' | 'workout' | 'intention' | 'gold';
  sourceId?: string;
  note?: string;
}): Promise<void> {
  const row = {
    id: crypto.randomUUID(),
    user_id: USER_ID,
    day_key: input.dayKey ?? dayKeyFromLoggedAt(new Date().toISOString()),
    event_type: input.eventType,
    source_id: input.sourceId ?? null,
    note: input.note ?? null,
  };

  await persistUpsert('consistency_events', row);
}

function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const merged = new Map<string, T>();
  for (const item of remote) {
    merged.set(item.id, item);
  }
  for (const item of local) {
    merged.set(item.id, item);
  }
  return [...merged.values()].sort((a, b) => {
    const aKey = 'loggedAt' in a ? String(a.loggedAt) : '';
    const bKey = 'loggedAt' in b ? String(b.loggedAt) : '';
    return bKey.localeCompare(aKey);
  });
}

export async function hydrateDiaryFromSupabase(): Promise<{
  meals: MealLog[];
  movements: MovementLog[];
  bodyWeightLogs: BodyWeightLog[];
} | null> {
  const supabase = getSupabase();
  if (!supabase || !navigator.onLine) {
    return null;
  }

  const [mealsRes, movementsRes, weightRes] = await Promise.all([
    supabase
      .from('meal_logs')
      .select(
        'id, logged_at, title, summary, raw, calories, protein_g, carbs_g, fat_g, day_key, capture_source',
      )
      .eq('user_id', USER_ID)
      .order('logged_at', { ascending: false })
      .limit(200),
    supabase
      .from('movement_logs')
      .select('id, logged_at, kind, title, summary, raw, duration_min, day_key, capture_source')
      .eq('user_id', USER_ID)
      .order('logged_at', { ascending: false })
      .limit(200),
    supabase
      .from('body_weight_logs')
      .select('id, logged_at, weight_lb')
      .eq('user_id', USER_ID)
      .order('logged_at', { ascending: false })
      .limit(120),
  ]);

  if (mealsRes.error?.code === '42P01' || movementsRes.error?.code === '42P01') {
    return null;
  }

  return {
    meals: (mealsRes.data ?? []).map((row) => rowToMeal(row as Parameters<typeof rowToMeal>[0])),
    movements: (movementsRes.data ?? []).map((row) =>
      rowToMovement(row as Parameters<typeof rowToMovement>[0]),
    ),
    bodyWeightLogs: (weightRes.data ?? []).map((row) =>
      rowToBodyWeight(row as Parameters<typeof rowToBodyWeight>[0]),
    ),
  };
}

export async function pingSupabase(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    return false;
  }

  const { error } = await supabase.from('sessions').select('id').limit(1);
  return !error;
}

export async function bootstrapSupabaseSync(): Promise<{
  configured: boolean;
  reachable: boolean;
  drained: number;
  hydrated: boolean;
}> {
  const configured = isSupabaseConfigured();
  if (!configured) {
    return { configured: false, reachable: false, drained: 0, hydrated: false };
  }

  const reachable = await pingSupabase();
  const drained = reachable ? await drainQueue() : 0;

  let hydrated = false;
  if (reachable) {
    const remote = await hydrateDiaryFromSupabase();
    if (remote) {
      const { useDiaryStore } = await import('../stores/diaryStore');
      useDiaryStore.setState((state) => ({
        meals: mergeById(state.meals, remote.meals),
        movements: mergeById(state.movements, remote.movements),
        bodyWeightLogs: mergeById(state.bodyWeightLogs, remote.bodyWeightLogs),
      }));
      hydrated = true;
    }
  }

  return { configured, reachable, drained, hydrated };
}

export { captureSourceFromLabel };
