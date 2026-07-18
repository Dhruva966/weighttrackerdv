import { drainQueue, enqueueWrite } from './offline-queue';
import { exerciseToRow, goalToRow, sessionToRow, setToRow } from './supabase-mappers';
import { getSupabase } from './supabase';
import type { Exercise, Goal, LoggedSet, WorkoutSession } from '../types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function isSupabaseConfigured(): boolean {
  return getSupabase() !== null;
}

async function persistUpsert(table: string, payload: Record<string, unknown>): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !navigator.onLine) {
    await enqueueWrite({ table, op: 'upsert', payload });
    return;
  }

  const { error } = await supabase.from(table).upsert(payload);
  if (error) {
    await enqueueWrite({ table, op: 'upsert', payload });
  }
}

async function persistDelete(table: string, id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !navigator.onLine) {
    await enqueueWrite({ table, op: 'delete', payload: { id } });
    return;
  }

  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) {
    await enqueueWrite({ table, op: 'delete', payload: { id } });
  }
}

export async function syncSession(session: WorkoutSession): Promise<void> {
  if (!isUuid(session.id)) {
    return;
  }

  await persistUpsert('sessions', sessionToRow(session));
}

export async function syncSet(setItem: LoggedSet): Promise<void> {
  // Starter catalog ids (`ex-${slug}`) stay local-only until a UUID migration; never drop local sets.
  if (!isUuid(setItem.id) || !isUuid(setItem.sessionId) || !isUuid(setItem.exerciseId)) {
    return;
  }

  await persistUpsert('sets', setToRow(setItem));
}

export async function deleteSyncedSet(setId: string): Promise<void> {
  if (!isUuid(setId)) {
    return;
  }

  await persistDelete('sets', setId);
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

export async function pingSupabase(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    return false;
  }

  const { error } = await supabase.from('sessions').select('id').limit(1);
  return !error;
}

export async function bootstrapSupabaseSync(): Promise<{ configured: boolean; reachable: boolean; drained: number }> {
  const configured = isSupabaseConfigured();
  if (!configured) {
    return { configured: false, reachable: false, drained: 0 };
  }

  const reachable = await pingSupabase();
  const drained = reachable ? await drainQueue() : 0;
  return { configured, reachable, drained };
}
