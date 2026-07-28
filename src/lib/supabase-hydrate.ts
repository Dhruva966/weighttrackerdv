import { getSupabase } from './supabase';
import {
  rowToExercise,
  rowToGoal,
  rowToSession,
  rowToSet,
  rowToTemplate,
  rowToTemplateExercise,
} from './supabase-mappers';
import type { Exercise, Goal, LoggedSet, Template, TemplateExercise, WorkoutSession } from '../types';

export type RemoteSnapshot = {
  exercises: Exercise[];
  sessions: WorkoutSession[];
  sets: LoggedSet[];
  goals: Goal[];
};

export type RemoteTemplateSnapshot = {
  templates: Template[];
  templateExercises: TemplateExercise[];
};

/** Pulls every row this single user owns back down from Supabase. Read-only — never writes. */
export async function fetchRemoteSnapshot(): Promise<RemoteSnapshot | null> {
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }

  // Exercises resolve before sets so callers can merge exercises first (sets reference exercise_id by FK).
  const [exercisesRes, sessionsRes, setsRes, goalsRes] = await Promise.all([
    supabase.from('exercises').select('*'),
    supabase.from('sessions').select('*'),
    supabase.from('sets').select('*'),
    supabase.from('goals').select('*'),
  ]);

  if (exercisesRes.error || sessionsRes.error || setsRes.error || goalsRes.error) {
    return null;
  }

  return {
    exercises: ((exercisesRes.data ?? []) as Parameters<typeof rowToExercise>[0][]).map(rowToExercise),
    sessions: ((sessionsRes.data ?? []) as Parameters<typeof rowToSession>[0][]).map(rowToSession),
    sets: ((setsRes.data ?? []) as Parameters<typeof rowToSet>[0][]).map(rowToSet),
    goals: ((goalsRes.data ?? []) as Parameters<typeof rowToGoal>[0][]).map(rowToGoal),
  };
}

/** Same read-only, gap-filling contract as fetchRemoteSnapshot, scoped to templates. */
export async function fetchTemplateSnapshot(): Promise<RemoteTemplateSnapshot | null> {
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }

  const [templatesRes, templateExercisesRes] = await Promise.all([
    supabase.from('templates').select('*'),
    supabase.from('template_exercises').select('*'),
  ]);

  if (templatesRes.error || templateExercisesRes.error) {
    return null;
  }

  return {
    templates: ((templatesRes.data ?? []) as Parameters<typeof rowToTemplate>[0][]).map(rowToTemplate),
    templateExercises: (
      (templateExercisesRes.data ?? []) as Parameters<typeof rowToTemplateExercise>[0][]
    ).map(rowToTemplateExercise),
  };
}
