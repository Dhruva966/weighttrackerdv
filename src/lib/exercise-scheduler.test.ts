import { describe, expect, it } from 'vitest';
import type { Exercise, LoggedSet, WorkoutSession } from '../types';
import {
  calculateStaleness,
  daysSinceLastPerformed,
  exerciseMatchesDayType,
  generateRecommendations,
  calculateExerciseRecency,
  getIncompleteExercises,
  type ExerciseFrequency,
} from './exercise-scheduler';

const mockExercise = (id: string, name: string, muscleGroup: string): Exercise => ({
  id,
  slug: name.toLowerCase().replace(/\s+/g, '-'),
  name,
  muscleGroup: muscleGroup as any,
  secondaryMuscles: [],
  equipment: 'barbell' as any,
  instructions: [],
  imageStyle: 'name-only' as any,
  source: 'user',
  archived: false,
});

const mockSession = (id: string, daysAgo: number, ended = true): WorkoutSession => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    id,
    userId: 'user-1',
    startedAt: date.toISOString(),
    endedAt: ended ? date.toISOString() : null,
    plannedExerciseIds: [],
    notes: null,
    localDate: null,
    timezone: null,
  };
};

const mockSet = (id: string, sessionId: string, exerciseId: string): LoggedSet => ({
  id,
  sessionId,
  exerciseId,
  setNumber: 1,
  weightLb: 100,
  reps: 10,
  rpe: null,
  isWarmup: false,
  isPr: false,
  createdAt: new Date().toISOString(),
});

describe('exercise-scheduler', () => {
  describe('daysSinceLastPerformed', () => {
    it('returns null if exercise never performed', () => {
      const sessions: WorkoutSession[] = [mockSession('s1', 5)];
      const sets: LoggedSet[] = [];
      const days = daysSinceLastPerformed('ex1', sessions, sets);
      expect(days).toBeNull();
    });

    it('calculates days since last performed', () => {
      const sessions = [mockSession('s1', 10), mockSession('s2', 5)];
      const sets = [mockSet('set1', 's1', 'ex1'), mockSet('set2', 's2', 'ex1')];
      const days = daysSinceLastPerformed('ex1', sessions, sets);
      expect(days).toBe(5);
    });

    it('ignores sessions without ended_at', () => {
      const sessions = [mockSession('s1', 10), mockSession('s2', 5, false)];
      const sets = [mockSet('set1', 's1', 'ex1'), mockSet('set2', 's2', 'ex1')];
      const days = daysSinceLastPerformed('ex1', sessions, sets);
      expect(days).toBe(10);
    });
  });

  describe('calculateStaleness', () => {
    it('returns 1.0 for never done exercises', () => {
      expect(calculateStaleness(null, 7, 14)).toBe(1.0);
    });

    it('returns 0.0 for recently done exercises within target', () => {
      expect(calculateStaleness(3, 7, 14)).toBe(0.0);
      expect(calculateStaleness(7, 7, 14)).toBe(0.0);
    });

    it('returns increasing staleness as days overdue increases', () => {
      expect(calculateStaleness(10, 7, 14)).toBeCloseTo(0.43, 1);
      expect(calculateStaleness(14, 7, 14)).toBe(1.0);
      expect(calculateStaleness(20, 7, 14)).toBe(1.0);
    });
  });

  describe('exerciseMatchesDayType', () => {
    it('matches push exercises', () => {
      expect(exerciseMatchesDayType(mockExercise('1', 'Bench', 'chest'), 'push')).toBe(true);
      expect(exerciseMatchesDayType(mockExercise('2', 'OHP', 'shoulders'), 'push')).toBe(true);
      expect(exerciseMatchesDayType(mockExercise('3', 'Tricep', 'triceps'), 'push')).toBe(true);
    });

    it('matches pull exercises', () => {
      expect(exerciseMatchesDayType(mockExercise('1', 'Row', 'back'), 'pull')).toBe(true);
      expect(exerciseMatchesDayType(mockExercise('2', 'Curl', 'biceps'), 'pull')).toBe(true);
      expect(exerciseMatchesDayType(mockExercise('3', 'Wrist', 'forearms'), 'pull')).toBe(true);
    });

    it('matches legs exercises', () => {
      expect(exerciseMatchesDayType(mockExercise('1', 'Squat', 'quads'), 'legs')).toBe(true);
      expect(exerciseMatchesDayType(mockExercise('2', 'RDL', 'hamstrings'), 'legs')).toBe(true);
      expect(exerciseMatchesDayType(mockExercise('3', 'Calf', 'calves'), 'legs')).toBe(true);
    });

    it('matches any day type for full-body', () => {
      expect(exerciseMatchesDayType(mockExercise('1', 'Bench', 'chest'), 'full-body')).toBe(true);
      expect(exerciseMatchesDayType(mockExercise('2', 'Squat', 'quads'), 'full-body')).toBe(true);
    });

    it('does not match wrong day types', () => {
      expect(exerciseMatchesDayType(mockExercise('1', 'Bench', 'chest'), 'pull')).toBe(false);
      expect(exerciseMatchesDayType(mockExercise('2', 'Squat', 'quads'), 'push')).toBe(false);
    });
  });

  describe('calculateExerciseRecency', () => {
    it('calculates recency for all exercises', () => {
      const exercises = [
        mockExercise('ex1', 'Bench Press', 'chest'),
        mockExercise('ex2', 'Squat', 'quads'),
      ];
      const sessions = [mockSession('s1', 5), mockSession('s2', 10)];
      const sets = [mockSet('set1', 's1', 'ex1')];
      const frequencies: ExerciseFrequency[] = [
        { exerciseId: 'ex1', targetDaysInterval: 7, priority: 'high' },
      ];

      const recency = calculateExerciseRecency(exercises, sessions, sets, frequencies);

      expect(recency).toHaveLength(2);
      expect(recency[0].exerciseId).toBe('ex1');
      expect(recency[0].daysSinceLastDone).toBe(5);
      expect(recency[0].staleness).toBe(0.0);
      expect(recency[1].exerciseId).toBe('ex2');
      expect(recency[1].daysSinceLastDone).toBeNull();
      expect(recency[1].staleness).toBe(1.0);
    });
  });

  describe('generateRecommendations', () => {
    it('prioritizes stale exercises', () => {
      const exercises = [
        mockExercise('ex1', 'Fresh Exercise', 'chest'),
        mockExercise('ex2', 'Stale Exercise', 'chest'),
      ];
      const recency = [
        {
          exerciseId: 'ex1',
          exerciseName: 'Fresh Exercise',
          exerciseSlug: 'fresh-exercise',
          muscleGroup: 'chest',
          lastPerformedAt: new Date().toISOString(),
          daysSinceLastDone: 3,
          targetDaysInterval: 7,
          staleness: 0.0,
          priority: 'medium' as const,
        },
        {
          exerciseId: 'ex2',
          exerciseName: 'Stale Exercise',
          exerciseSlug: 'stale-exercise',
          muscleGroup: 'chest',
          lastPerformedAt: null,
          daysSinceLastDone: null,
          targetDaysInterval: 7,
          staleness: 1.0,
          priority: 'high' as const,
        },
      ];

      const recs = generateRecommendations(exercises, recency, 'any', 10);

      expect(recs).toHaveLength(2);
      expect(recs[0].exercise.id).toBe('ex2');
      expect(recs[0].score).toBeGreaterThan(recs[1].score);
    });

    it('filters by day type', () => {
      const exercises = [
        mockExercise('ex1', 'Bench Press', 'chest'),
        mockExercise('ex2', 'Squat', 'quads'),
      ];
      const recency = exercises.map((ex) => ({
        exerciseId: ex.id,
        exerciseName: ex.name,
        exerciseSlug: ex.slug,
        muscleGroup: ex.muscleGroup,
        lastPerformedAt: null,
        daysSinceLastDone: null,
        targetDaysInterval: 7,
        staleness: 0.5,
        priority: 'medium' as const,
      }));

      const pushRecs = generateRecommendations(exercises, recency, 'push', 10);
      expect(pushRecs).toHaveLength(1);
      expect(pushRecs[0].exercise.muscleGroup).toBe('chest');

      const legsRecs = generateRecommendations(exercises, recency, 'legs', 10);
      expect(legsRecs).toHaveLength(1);
      expect(legsRecs[0].exercise.muscleGroup).toBe('quads');
    });
  });

  describe('getIncompleteExercises', () => {
    it('returns empty for session with no plan', () => {
      const session = mockSession('s1', 1);
      const incomplete = getIncompleteExercises(session, [], []);
      expect(incomplete).toHaveLength(0);
    });

    it('returns exercises that were planned but not logged', () => {
      const exercises = [
        mockExercise('ex1', 'Bench Press', 'chest'),
        mockExercise('ex2', 'OHP', 'shoulders'),
        mockExercise('ex3', 'Triceps', 'triceps'),
      ];
      const session = {
        ...mockSession('s1', 1),
        plannedExerciseIds: ['ex1', 'ex2', 'ex3'],
      };
      const sets = [mockSet('set1', 's1', 'ex1')]; // Only logged ex1

      const incomplete = getIncompleteExercises(session, exercises, sets);
      expect(incomplete).toHaveLength(2);
      expect(incomplete.map((ex) => ex.id).sort()).toEqual(['ex2', 'ex3']);
    });

    it('excludes archived exercises', () => {
      const exercises = [
        mockExercise('ex1', 'Bench Press', 'chest'),
        { ...mockExercise('ex2', 'OHP', 'shoulders'), archived: true },
      ];
      const session = {
        ...mockSession('s1', 1),
        plannedExerciseIds: ['ex1', 'ex2'],
      };
      const sets: LoggedSet[] = [];

      const incomplete = getIncompleteExercises(session, exercises, sets);
      expect(incomplete).toHaveLength(1);
      expect(incomplete[0].id).toBe('ex1');
    });
  });
});
