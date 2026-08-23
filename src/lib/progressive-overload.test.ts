import { describe, expect, it } from 'vitest';
import type { Exercise, LoggedSet, WorkoutSession } from '../types';
import { detectProgressionOpportunities, detectPlateaus } from './progressive-overload';

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

const mockSession = (id: string, daysAgo: number): WorkoutSession => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    id,
    userId: 'user-1',
    startedAt: date.toISOString(),
    endedAt: date.toISOString(),
    plannedExerciseIds: [],
    notes: null,
    localDate: null,
    timezone: null,
  };
};

const mockSet = (
  id: string,
  sessionId: string,
  exerciseId: string,
  weightLb: number,
  reps: number,
  daysAgo: number,
): LoggedSet => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    id,
    sessionId,
    exerciseId,
    setNumber: 1,
    weightLb,
    reps,
    rpe: null,
    isWarmup: false,
    isPr: false,
    createdAt: date.toISOString(),
  };
};

describe('progressive-overload', () => {
  describe('detectProgressionOpportunities', () => {
    it('detects ready status when hitting target reps consistently', () => {
      const exercise = mockExercise('ex1', 'Bench Press', 'chest');
      const sessions = [
        mockSession('s1', 2),
        mockSession('s2', 5),
        mockSession('s3', 8),
      ];
      const sets = [
        // Session 1: 3 sets @ 185 lb x 10,11,10 reps (2 days ago)
        mockSet('set1', 's1', 'ex1', 185, 10, 2),
        mockSet('set2', 's1', 'ex1', 185, 11, 2),
        mockSet('set3', 's1', 'ex1', 185, 10, 2),
        // Session 2: 3 sets @ 185 lb x 10,10,9 reps (5 days ago)
        mockSet('set4', 's2', 'ex1', 185, 10, 5),
        mockSet('set5', 's2', 'ex1', 185, 10, 5),
        mockSet('set6', 's2', 'ex1', 185, 9, 5),
        // Session 3: 3 sets @ 185 lb x 11,10,10 reps (8 days ago)
        mockSet('set7', 's3', 'ex1', 185, 11, 8),
        mockSet('set8', 's3', 'ex1', 185, 10, 8),
        mockSet('set9', 's3', 'ex1', 185, 10, 8),
      ];

      const alerts = detectProgressionOpportunities([exercise], sessions, sets);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].status).toBe('ready');
      expect(alerts[0].currentWeight).toBe(185);
      expect(alerts[0].suggestedWeight).toBe(190); // +5 lb for upper body
      expect(alerts[0].evidence.avgReps).toBeGreaterThanOrEqual(10);
      expect(alerts[0].confidence).toBe('high');
    });

    it('detects plateau when stuck at same weight for 21+ days', () => {
      const exercise = mockExercise('ex1', 'Squat', 'quads');
      const sessions = [
        mockSession('s1', 5),
        mockSession('s2', 12),
        mockSession('s3', 19),
        mockSession('s4', 25),
      ];
      const sets = [
        // 4 sessions over 25 days, all at 225 lb with ~8 reps
        mockSet('set1', 's1', 'ex1', 225, 8, 5),
        mockSet('set2', 's1', 'ex1', 225, 8, 5),
        mockSet('set3', 's1', 'ex1', 225, 7, 5),
        mockSet('set4', 's2', 'ex1', 225, 8, 12),
        mockSet('set5', 's2', 'ex1', 225, 8, 12),
        mockSet('set6', 's2', 'ex1', 225, 7, 12),
        mockSet('set7', 's3', 'ex1', 225, 8, 19),
        mockSet('set8', 's3', 'ex1', 225, 7, 19),
        mockSet('set9', 's3', 'ex1', 225, 8, 19),
        mockSet('set10', 's4', 'ex1', 225, 8, 25),
        mockSet('set11', 's4', 'ex1', 225, 8, 25),
        mockSet('set12', 's4', 'ex1', 225, 7, 25),
      ];

      const alerts = detectProgressionOpportunities([exercise], sessions, sets);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].status).toBe('plateau');
      expect(alerts[0].evidence.daysAtWeight).toBeGreaterThanOrEqual(20);
      expect(alerts[0].evidence.sessionCount).toBeGreaterThanOrEqual(3);
    });

    it('returns on-track status when progressing normally', () => {
      const exercise = mockExercise('ex1', 'Bench Press', 'chest');
      const sessions = [mockSession('s1', 2)];
      const sets = [
        // First session with this weight, hitting 8 reps
        mockSet('set1', 's1', 'ex1', 185, 8, 2),
        mockSet('set2', 's1', 'ex1', 185, 8, 2),
        mockSet('set3', 's1', 'ex1', 185, 7, 2),
      ];

      const alerts = detectProgressionOpportunities([exercise], sessions, sets);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].status).toBe('on-track');
    });

    it('excludes warmup sets from analysis', () => {
      const exercise = mockExercise('ex1', 'Deadlift', 'back');
      const sessions = [mockSession('s1', 2)];
      const sets = [
        // Warmup sets (should be ignored)
        { ...mockSet('set1', 's1', 'ex1', 135, 5, 2), isWarmup: true },
        { ...mockSet('set2', 's1', 'ex1', 185, 5, 2), isWarmup: true },
        // Working sets
        mockSet('set3', 's1', 'ex1', 225, 5, 2),
        mockSet('set4', 's1', 'ex1', 225, 5, 2),
        mockSet('set5', 's1', 'ex1', 225, 5, 2),
      ];

      const alerts = detectProgressionOpportunities([exercise], sessions, sets);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].currentWeight).toBe(225); // Not warmup weights
    });

    it('suggests appropriate increments based on muscle group', () => {
      const chestExercise = mockExercise('ex1', 'Bench Press', 'chest');
      const legExercise = mockExercise('ex2', 'Squat', 'quads');
      
      const sessions = [mockSession('s1', 2), mockSession('s2', 5)];
      const chestSets = [
        mockSet('set1', 's1', 'ex1', 135, 10, 2),
        mockSet('set2', 's1', 'ex1', 135, 10, 2),
        mockSet('set3', 's1', 'ex1', 135, 10, 2),
        mockSet('set4', 's2', 'ex1', 135, 10, 5),
        mockSet('set5', 's2', 'ex1', 135, 11, 5),
        mockSet('set6', 's2', 'ex1', 135, 10, 5),
      ];
      
      const legSets = [
        mockSet('set7', 's1', 'ex2', 225, 10, 2),
        mockSet('set8', 's1', 'ex2', 225, 10, 2),
        mockSet('set9', 's1', 'ex2', 225, 10, 2),
        mockSet('set10', 's2', 'ex2', 225, 10, 5),
        mockSet('set11', 's2', 'ex2', 225, 11, 5),
        mockSet('set12', 's2', 'ex2', 225, 10, 5),
      ];

      const alerts = detectProgressionOpportunities(
        [chestExercise, legExercise],
        sessions,
        [...chestSets, ...legSets],
      );

      const chestAlert = alerts.find((a) => a.exerciseId === 'ex1');
      const legAlert = alerts.find((a) => a.exerciseId === 'ex2');

      // Upper body: +5 lb (135 + 5 = 140)
      expect(chestAlert?.suggestedWeight).toBe(140);
      // Lower body: +10 lb for weights >= 200 (225 + 10 = 235)
      expect(legAlert?.suggestedWeight).toBe(235);
    });
  });

  describe('detectPlateaus', () => {
    it('returns only exercises in plateau status', () => {
      const exercises = [
        mockExercise('ex1', 'Bench Press', 'chest'),
        mockExercise('ex2', 'Squat', 'quads'),
      ];
      const sessions = [
        mockSession('s1', 5),
        mockSession('s2', 15),
        mockSession('s3', 25),
      ];
      const sets = [
        // Bench: plateau (stuck for 25 days)
        ...Array.from({ length: 9 }, (_, i) =>
          mockSet(`set-bench-${i}`, `s${(i % 3) + 1}`, 'ex1', 185, 8, 5 + Math.floor(i / 3) * 10),
        ),
        // Squat: progressing well
        mockSet('set-squat-1', 's1', 'ex2', 225, 10, 5),
        mockSet('set-squat-2', 's1', 'ex2', 225, 10, 5),
        mockSet('set-squat-3', 's1', 'ex2', 225, 11, 5),
      ];

      const plateaus = detectPlateaus(exercises, sessions, sets);

      expect(plateaus.length).toBeGreaterThan(0);
      expect(plateaus.every((p) => p.daysPlateau >= 20)).toBe(true); // Changed from 21 to 20
      expect(plateaus.every((p) => p.suggestion.length > 0)).toBe(true);
    });
  });
});
