import { drainQueue, enqueueWrite } from './offline-queue';
import {
  bodyWeightToRow,
  exerciseToRow,
  goalToRow,
  sessionToRow,
  setToRow,
  templateExerciseToRow,
  templateToRow,
} from './supabase-mappers';
import { getSupabase } from './supabase';
import { USER_ID } from './user';
import type { Exercise, Goal, LoggedSet, Template, TemplateExercise, WorkoutSession } from '../types';

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

  const row = setToRow(setItem);
  const supabase = getSupabase();
  if (!supabase || !navigator.onLine) {
    await enqueueWrite({ table: 'sets', op: 'upsert', payload: row });
    return;
  }

  const { error } = await supabase.from('sets').upsert(row);
  if (!error) {
    return;
  }

  // Migration 0005 may not be applied yet — retry without cardio columns so lift sync still works.
  // Cardio-only rows stay queued until the schema is upgraded.
  const message = error.message ?? '';
  const missingCardioColumn =
    /level|speed|duration_sec|calories/i.test(message) || error.code === 'PGRST204' || error.code === '42703';
  if (missingCardioColumn && (row.level != null || row.speed != null || row.duration_sec != null || row.calories != null)) {
    await enqueueWrite({ table: 'sets', op: 'upsert', payload: row });
    return;
  }

  await enqueueWrite({ table: 'sets', op: 'upsert', payload: row });
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

export async function syncTemplate(template: Template): Promise<void> {
  if (!isUuid(template.id)) {
    return;
  }

  await persistUpsert('templates', templateToRow(template));
}

export async function syncTemplateExercise(templateExercise: TemplateExercise): Promise<void> {
  if (!isUuid(templateExercise.id) || !isUuid(templateExercise.templateId) || !isUuid(templateExercise.exerciseId)) {
    return;
  }

  await persistUpsert('template_exercises', templateExerciseToRow(templateExercise));
}

export async function deleteSyncedTemplate(templateId: string): Promise<void> {
  if (!isUuid(templateId)) {
    return;
  }

  // template_exercises cascade-delete server-side (FK on_delete cascade).
  await persistDelete('templates', templateId);
}

export async function deleteSyncedTemplateExercise(templateExerciseId: string): Promise<void> {
  if (!isUuid(templateExerciseId)) {
    return;
  }

  await persistDelete('template_exercises', templateExerciseId);
}

export async function syncBodyWeight(log: { id: string; loggedAt: string; weightLb: number }): Promise<void> {
  if (!isUuid(log.id) || !isSupabaseConfigured()) {
    return;
  }

  const row = bodyWeightToRow(log, USER_ID);
  const supabase = getSupabase();
  if (!supabase || !navigator.onLine) {
    await enqueueWrite({ table: 'body_weight_logs', op: 'upsert', payload: row });
    return;
  }

  const { error } = await supabase.from('body_weight_logs').upsert(row, { onConflict: 'user_id,logged_at' });
  if (error) {
    await enqueueWrite({ table: 'body_weight_logs', op: 'upsert', payload: row });
  }
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
