/**
 * Exercise scheduling and recommendation system.
 * 
 * Tracks exercise recency, calculates staleness, and recommends exercises
 * based on training split, frequency goals, and carryover from incomplete sessions.
 */

import type { Exercise, LoggedSet, WorkoutSession } from '../types';

export type DayType = 'push' | 'pull' | 'legs' | 'arms' | 'chest-back' | 'full-body' | 'any';

export type MuscleGroupSplit = {
  push: string[];      // chest, shoulders, triceps
  pull: string[];      // back, biceps, forearms
  legs: string[];      // quads, hamstrings, glutes, calves
  arms: string[];      // biceps, triceps, forearms
  'chest-back': string[];  // chest, back
};

// Default muscle group assignments for common training splits
export const MUSCLE_GROUP_SPLITS: MuscleGroupSplit = {
  push: ['chest', 'shoulders', 'triceps'],
  pull: ['back', 'biceps', 'forearms'],
  legs: ['legs', 'quads', 'hamstrings', 'glutes', 'calves'],
  arms: ['biceps', 'triceps', 'forearms', 'arms'],
  'chest-back': ['chest', 'back'],
};

export type ExerciseFrequency = {
  exerciseId: string;
  targetDaysInterval: number;  // Target: do this exercise every X days
  priority: 'high' | 'medium' | 'low';  // How important to stick to schedule
};

export type ExerciseRecency = {
  exerciseId: string;
  exerciseName: string;
  exerciseSlug: string;
  muscleGroup: string;
  lastPerformedAt: string | null;  // ISO date of last workout session
  daysSinceLastDone: number | null;  // null if never done
  targetDaysInterval: number;
  staleness: number;  // 0-1 score, 1 = very overdue
  priority: 'high' | 'medium' | 'low';
};

export type ExerciseRecommendation = {
  exercise: Exercise;
  recency: ExerciseRecency;
  score: number;  // Combined priority score (0-100)
  reason: string;  // Why this exercise is recommended
  daysOverdue: number;  // How many days past target interval
};

export type SchedulerConfig = {
  defaultInterval: number;  // Default days between exercises (e.g., 7 for once per week)
  staleThreshold: number;   // Days before considering exercise "stale" (e.g., 14)
  carryoverEnabled: boolean;  // Whether to carry over incomplete exercises
};

const DEFAULT_CONFIG: SchedulerConfig = {
  defaultInterval: 7,
  staleThreshold: 14,
  carryoverEnabled: true,
};

/**
 * Calculate days since an exercise was last performed.
 */
export function daysSinceLastPerformed(
  exerciseId: string,
  sessions: WorkoutSession[],
  sets: LoggedSet[],
): number | null {
  // Find all sessions where this exercise was logged
  const setsForExercise = sets.filter((s) => s.exerciseId === exerciseId);
  if (setsForExercise.length === 0) return null;

  // Find most recent session
  const sessionIds = new Set(setsForExercise.map((s) => s.sessionId));
  const relevantSessions = sessions
    .filter((s) => sessionIds.has(s.id) && s.endedAt)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  if (relevantSessions.length === 0) return null;

  const lastSession = relevantSessions[0];
  const lastDate = new Date(lastSession.startedAt);
  const today = new Date();
  const diffMs = today.getTime() - lastDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate staleness score (0-1) for an exercise.
 * 1.0 = very overdue, 0.0 = done recently
 */
export function calculateStaleness(
  daysSince: number | null,
  targetInterval: number,
  staleThreshold: number,
): number {
  if (daysSince === null) return 1.0;  // Never done = most stale
  if (daysSince <= targetInterval) return 0.0;  // Within target = fresh
  
  const daysOverdue = daysSince - targetInterval;
  const staleness = Math.min(daysOverdue / (staleThreshold - targetInterval), 1.0);
  return staleness;
}

/**
 * Check if an exercise belongs to a specific day type based on muscle group.
 */
export function exerciseMatchesDayType(
  exercise: Exercise,
  dayType: DayType,
): boolean {
  if (dayType === 'any' || dayType === 'full-body') return true;
  
  const muscleGroups = MUSCLE_GROUP_SPLITS[dayType];
  if (!muscleGroups) return false;
  
  return muscleGroups.includes(exercise.muscleGroup);
}

/**
 * Get exercise recency data for all exercises in regimen.
 */
export function calculateExerciseRecency(
  exercises: Exercise[],
  sessions: WorkoutSession[],
  sets: LoggedSet[],
  frequencies: ExerciseFrequency[],
  config: SchedulerConfig = DEFAULT_CONFIG,
): ExerciseRecency[] {
  const frequencyMap = new Map(frequencies.map((f) => [f.exerciseId, f]));

  return exercises
    .filter((ex) => !ex.archived)
    .map((ex) => {
      const freq = frequencyMap.get(ex.id);
      const targetInterval = freq?.targetDaysInterval ?? config.defaultInterval;
      const priority = freq?.priority ?? 'medium';
      
      const daysSince = daysSinceLastPerformed(ex.id, sessions, sets);
      const staleness = calculateStaleness(daysSince, targetInterval, config.staleThreshold);
      
      // Find last session with this exercise
      const exSets = sets.filter((s) => s.exerciseId === ex.id);
      const lastSessionId = exSets.length > 0 
        ? exSets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].sessionId
        : null;
      const lastSession = lastSessionId 
        ? sessions.find((s) => s.id === lastSessionId) 
        : null;

      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        exerciseSlug: ex.slug,
        muscleGroup: ex.muscleGroup,
        lastPerformedAt: lastSession?.startedAt ?? null,
        daysSinceLastDone: daysSince,
        targetDaysInterval: targetInterval,
        staleness,
        priority,
      };
    });
}

/**
 * Generate exercise recommendations based on recency, day type, and priorities.
 */
export function generateRecommendations(
  exercises: Exercise[],
  recencyData: ExerciseRecency[],
  dayType: DayType = 'any',
  limit = 10,
): ExerciseRecommendation[] {
  const recencyMap = new Map(recencyData.map((r) => [r.exerciseId, r]));

  const recommendations = exercises
    .filter((ex) => !ex.archived)
    .filter((ex) => exerciseMatchesDayType(ex, dayType))
    .map((ex) => {
      const recency = recencyMap.get(ex.id);
      if (!recency) return null;

      // Calculate priority score (0-100)
      let score = 0;

      // Staleness contributes 50 points
      score += recency.staleness * 50;

      // Priority level contributes 30 points
      const priorityBonus = { high: 30, medium: 20, low: 10 };
      score += priorityBonus[recency.priority];

      // Days overdue contributes 20 points
      const daysOverdue = recency.daysSinceLastDone !== null
        ? Math.max(0, recency.daysSinceLastDone - recency.targetDaysInterval)
        : recency.targetDaysInterval * 2;  // Never done = 2x interval overdue
      score += Math.min(daysOverdue / 7, 1) * 20;  // Cap at 1 week = 20 points

      // Generate reason
      let reason = '';
      if (recency.daysSinceLastDone === null) {
        reason = 'Never logged - add to your routine';
      } else if (daysOverdue >= 14) {
        reason = `Very overdue - ${daysOverdue} days past target`;
      } else if (daysOverdue >= 7) {
        reason = `Overdue - ${daysOverdue} days past target`;
      } else if (daysOverdue > 0) {
        reason = `Due soon - ${daysOverdue} days past target`;
      } else {
        reason = `Last done ${recency.daysSinceLastDone} days ago`;
      }

      return {
        exercise: ex,
        recency,
        score,
        reason,
        daysOverdue,
      };
    })
    .filter((r): r is ExerciseRecommendation => r !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return recommendations;
}

/**
 * Get exercises that were planned but not completed in a session.
 */
export function getIncompleteExercises(
  session: WorkoutSession,
  exercises: Exercise[],
  sets: LoggedSet[],
): Exercise[] {
  if (!session.plannedExerciseIds || session.plannedExerciseIds.length === 0) {
    return [];
  }

  const loggedExerciseIds = new Set(
    sets.filter((s) => s.sessionId === session.id).map((s) => s.exerciseId)
  );

  const incompleteIds = session.plannedExerciseIds.filter(
    (id) => !loggedExerciseIds.has(id)
  );

  return exercises.filter((ex) => incompleteIds.includes(ex.id) && !ex.archived);
}

/**
 * Get high-priority exercises for a specific day type.
 * Combines overdue exercises + incomplete carryover.
 */
export function getPriorityExercises(
  exercises: Exercise[],
  sessions: WorkoutSession[],
  sets: LoggedSet[],
  frequencies: ExerciseFrequency[],
  dayType: DayType = 'any',
  config: SchedulerConfig = DEFAULT_CONFIG,
): {
  overdue: ExerciseRecommendation[];
  carryover: Exercise[];
  suggested: ExerciseRecommendation[];
} {
  const recency = calculateExerciseRecency(exercises, sessions, sets, frequencies, config);
  
  // Get overdue exercises (staleness > 0.5)
  const overdueData = recency.filter((r) => r.staleness > 0.5);
  const overdue = generateRecommendations(
    exercises.filter((ex) => overdueData.some((r) => r.exerciseId === ex.id)),
    recency,
    dayType,
    5
  );

  // Get carryover from last incomplete session
  const lastSession = sessions
    .filter((s) => s.endedAt)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
  
  const carryover = config.carryoverEnabled && lastSession
    ? getIncompleteExercises(lastSession, exercises, sets).filter((ex) =>
        exerciseMatchesDayType(ex, dayType)
      )
    : [];

  // Get suggested exercises for this day type (not overdue, just good options)
  const suggested = generateRecommendations(
    exercises.filter((ex) => !overdueData.some((r) => r.exerciseId === ex.id)),
    recency,
    dayType,
    8
  );

  return { overdue, carryover, suggested };
}
