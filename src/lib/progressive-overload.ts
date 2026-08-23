/**
 * Progressive overload detection and recommendation system.
 * 
 * Detects when users are ready to increase weights based on consistent performance.
 */

import type { Exercise, LoggedSet, WorkoutSession } from '../types';

export type ProgressionStatus = 'ready' | 'plateau' | 'on-track' | 'new';

export type ProgressionAlert = {
  exerciseId: string;
  exerciseName: string;
  status: ProgressionStatus;
  currentWeight: number;
  suggestedWeight: number;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  evidence: {
    recentSets: {
      date: string;
      weight: number;
      reps: number;
      rpe?: number;
    }[];
    sessionCount: number;
    daysAtWeight: number;
    avgReps: number;
    targetReps: number;
  };
};

export type PlateauDetection = {
  exerciseId: string;
  exerciseName: string;
  currentWeight: number;
  daysPlateau: number;
  plateauStartDate: string;
  recentVolume: number;
  suggestion: string;
};

/**
 * Get suggested weight increment based on exercise and current weight
 */
function getSuggestedIncrement(exercise: Exercise, currentWeight: number): number {
  // Upper body: smaller increments
  const upperBodyGroups = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'arms'];
  if (upperBodyGroups.includes(exercise.muscleGroup)) {
    return currentWeight < 100 ? 2.5 : 5;
  }
  
  // Lower body: larger increments
  return currentWeight >= 200 ? 10 : 5;
}

/**
 * Get target reps based on exercise type
 */
function getTargetReps(_exercise: Exercise): number {
  // Most exercises: 8-12 reps
  // Can be customized per exercise later
  return 10;
}

/**
 * Analyze sets for a specific weight to determine readiness for progression
 */
function analyzeWeightReadiness(
  sets: LoggedSet[],
  targetReps: number,
): {
  avgReps: number;
  consistency: number; // 0-1, how consistent the reps are
  isReady: boolean;
  confidence: 'high' | 'medium' | 'low';
} {
  if (sets.length === 0) {
    return { avgReps: 0, consistency: 0, isReady: false, confidence: 'low' };
  }

  const reps = sets.map((s) => s.reps ?? 0).filter((r) => r > 0);
  const avgReps = reps.reduce((sum, r) => sum + r, 0) / reps.length;
  
  // Consistency: how close are all reps to average?
  const variance = reps.reduce((sum, r) => sum + Math.abs(r - avgReps), 0) / reps.length;
  const consistency = Math.max(0, 1 - variance / avgReps);
  
  // Ready if: avg reps >= target AND consistent
  const isReady = avgReps >= targetReps && consistency > 0.7;
  
  // Confidence based on sample size and consistency
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (sets.length >= 9 && consistency > 0.8) confidence = 'high';
  else if (sets.length >= 6 && consistency > 0.7) confidence = 'medium';
  
  return { avgReps, consistency, isReady, confidence };
}

/**
 * Detect progressive overload opportunities for all exercises
 */
export function detectProgressionOpportunities(
  exercises: Exercise[],
  _sessions: WorkoutSession[],
  sets: LoggedSet[],
  lookbackDays = 30,
): ProgressionAlert[] {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
  
  const alerts: ProgressionAlert[] = [];

  for (const exercise of exercises) {
    if (exercise.archived) continue;

    // Get recent sets for this exercise
    const exerciseSets = sets
      .filter((s) => s.exerciseId === exercise.id)
      .filter((s) => !s.isWarmup) // Exclude warmup sets
      .filter((s) => s.weightLb && s.reps) // Only sets with weight and reps
      .filter((s) => new Date(s.createdAt) >= cutoffDate)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (exerciseSets.length === 0) {
      // Never done or not done recently
      continue;
    }

    // Find current working weight (most common recent weight)
    const weightCounts = new Map<number, number>();
    for (const set of exerciseSets.slice(0, 12)) { // Last ~12 sets
      const weight = set.weightLb!;
      weightCounts.set(weight, (weightCounts.get(weight) || 0) + 1);
    }
    
    const currentWeight = Array.from(weightCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;

    if (currentWeight === 0) continue;

    // Get all sets at current weight
    const setsAtWeight = exerciseSets.filter((s) => s.weightLb === currentWeight);
    
    // Calculate days at this weight
    const firstSetDate = new Date(setsAtWeight[setsAtWeight.length - 1].createdAt);
    const lastSetDate = new Date(setsAtWeight[0].createdAt);
    const daysAtWeight = Math.floor(
      (lastSetDate.getTime() - firstSetDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Get unique sessions with this weight
    const sessionIds = new Set(setsAtWeight.map((s) => s.sessionId));
    const sessionCount = sessionIds.size;

    const targetReps = getTargetReps(exercise);
    const analysis = analyzeWeightReadiness(setsAtWeight, targetReps);
    
    // Determine status
    let status: ProgressionStatus = 'on-track';
    let reason = '';
    
    // Check plateau first (higher priority than ready)
    if (daysAtWeight >= 20 && sessionCount >= 3 && !analysis.isReady) {
      status = 'plateau';
      reason = `Stuck at ${currentWeight} lb for ${daysAtWeight} days across ${sessionCount} sessions. Consider increasing or changing approach.`;
    } else if (analysis.isReady && sessionCount >= 2) {
      status = 'ready';
      reason = `You've hit ${Math.round(analysis.avgReps)} reps consistently for ${sessionCount} sessions. Time to go heavier!`;
    } else if (sessionCount === 0) {
      status = 'new';
      reason = 'Not enough data yet.';
    } else {
      status = 'on-track';
      reason = `Keep working at ${currentWeight} lb until you hit ${targetReps}+ reps consistently.`;
    }

    const increment = getSuggestedIncrement(exercise, currentWeight);
    const suggestedWeight = status === 'ready' ? currentWeight + increment : currentWeight;

    // Build evidence
    const recentSets = setsAtWeight.slice(0, 9).map((s) => ({
      date: new Date(s.createdAt).toISOString().split('T')[0],
      weight: s.weightLb!,
      reps: s.reps!,
      rpe: s.rpe ?? undefined,
    }));

    alerts.push({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      status,
      currentWeight,
      suggestedWeight,
      confidence: analysis.confidence,
      reason,
      evidence: {
        recentSets,
        sessionCount,
        daysAtWeight,
        avgReps: Math.round(analysis.avgReps * 10) / 10,
        targetReps,
      },
    });
  }

  // Sort: ready first, then plateau, then on-track
  const statusOrder = { ready: 0, plateau: 1, 'on-track': 2, new: 3 };
  alerts.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return alerts;
}

/**
 * Detect exercises stuck in a plateau (no progress for 21+ days)
 */
export function detectPlateaus(
  exercises: Exercise[],
  sessions: WorkoutSession[],
  sets: LoggedSet[],
): PlateauDetection[] {
  const alerts = detectProgressionOpportunities(exercises, sessions, sets, 60);
  
  return alerts
    .filter((a) => a.status === 'plateau')
    .map((a) => ({
      exerciseId: a.exerciseId,
      exerciseName: a.exerciseName,
      currentWeight: a.currentWeight,
      daysPlateau: a.evidence.daysAtWeight,
      plateauStartDate: a.evidence.recentSets[a.evidence.recentSets.length - 1]?.date ?? '',
      recentVolume: a.evidence.recentSets.reduce((sum, s) => sum + s.weight * s.reps, 0),
      suggestion: generatePlateauSuggestion(a),
    }));
}

function generatePlateauSuggestion(alert: ProgressionAlert): string {
  const { daysAtWeight, sessionCount, avgReps } = alert.evidence;
  const mockExercise: Exercise = { muscleGroup: 'chest' } as Exercise;
  
  if (avgReps < 6) {
    return `Try reducing weight by 10% and focus on hitting ${alert.evidence.targetReps} reps with good form.`;
  }
  
  if (sessionCount >= 4 && avgReps >= 8) {
    return `You're close! Try increasing by just ${getSuggestedIncrement(mockExercise, alert.currentWeight)} lb.`;
  }
  
  if (daysAtWeight >= 30) {
    return `Consider a deload week (70% weight) or try a different variation of this exercise.`;
  }
  
  return `Increase volume (add 1-2 sets) or try tempo/pause reps to break through.`;
}
