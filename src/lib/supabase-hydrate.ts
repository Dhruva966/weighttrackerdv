import { getSupabase } from './supabase';
import { rowToExercise, rowToGoal, rowToSession, rowToSet } from './supabase-mappers';
import type { Exercise, Goal, LoggedSet, WorkoutSession } from '../types';

export type RemoteSnapshot = {
  exercises: Exercise[];
  sessions: WorkoutSession[];
  sets: LoggedSet[];
  goals: Goal[];
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
