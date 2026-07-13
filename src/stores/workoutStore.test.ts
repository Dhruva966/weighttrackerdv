import { beforeEach, describe, expect, it } from 'vitest';
import { starterExercises, starterGoals, starterSessions, starterSets } from '../data/catalog';
import { usePrStore } from './prStore';
import { useWorkoutStore } from './workoutStore';

function resetStores() {
  useWorkoutStore.setState({
    exercises: starterExercises,
    goals: starterGoals,
    sessions: starterSessions,
    sets: starterSets,
  });
  usePrStore.getState().clearPr();
}

describe('workoutStore', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStores();
  });

  describe('createSession', () => {
    it('prepends a new active session', () => {
      const before = useWorkoutStore.getState().sessions.length;
      const session = useWorkoutStore.getState().createSession();

      expect(session.endedAt).toBeUndefined();
      expect(useWorkoutStore.getState().sessions).toHaveLength(before + 1);
      expect(useWorkoutStore.getState().sessions[0].id).toBe(session.id);
    });
  });

  describe('endSession', () => {
    it('marks the session complete', () => {
      const session = useWorkoutStore.getState().createSession();
      useWorkoutStore.getState().endSession(session.id);

      const ended = useWorkoutStore.getState().sessions.find((item) => item.id === session.id);
      expect(ended?.endedAt).toBeTruthy();
    });
  });

  describe('addSet', () => {
    it('increments set numbers per exercise in a session', () => {
      const session = useWorkoutStore.getState().createSession();
      const exercise = starterExercises[0];

      const first = useWorkoutStore.getState().addSet({
        sessionId: session.id,
        exerciseId: exercise.id,
        weightLb: 50,
        reps: 10,
        isWarmup: false,
      });
      const second = useWorkoutStore.getState().addSet({
        sessionId: session.id,
        exerciseId: exercise.id,
        weightLb: 55,
        reps: 8,
        isWarmup: false,
      });

      expect(first.setNumber).toBe(1);
      expect(second.setNumber).toBe(2);
    });

    it('fires PR events when a set beats prior performance', () => {
      const session = useWorkoutStore.getState().createSession();
      const exercise = starterExercises.find((item) => item.slug === 'lat-pulldown');
      expect(exercise).toBeTruthy();

      useWorkoutStore.getState().addSet({
        sessionId: session.id,
        exerciseId: exercise!.id,
        weightLb: 200,
        reps: 5,
        isWarmup: false,
      });

      expect(usePrStore.getState().lastPr?.exerciseName).toBe('Lat Pulldown');
    });

    it('does not mark repeat performances as PRs', () => {
      const session = useWorkoutStore.getState().createSession();
      const exercise = starterExercises[0];

      useWorkoutStore.getState().addSet({
        sessionId: session.id,
        exerciseId: exercise.id,
        weightLb: 60,
        reps: 10,
        isWarmup: false,
      });
      usePrStore.getState().clearPr();

      useWorkoutStore.getState().addSet({
        sessionId: session.id,
        exerciseId: exercise.id,
        weightLb: 60,
        reps: 10,
        isWarmup: false,
      });

      expect(usePrStore.getState().lastPr).toBeUndefined();
    });
  });

  describe('addExercise', () => {
    it('creates a slugged user exercise at the front of the catalog', () => {
      const exercise = useWorkoutStore.getState().addExercise({
        name: 'Cable Fly',
        muscleGroup: 'chest',
        equipment: 'cable',
        setupNotes: ['Seat level 4'],
      });

      expect(exercise.slug).toBe('cable-fly');
      expect(exercise.source).toBe('user-created');
      expect(useWorkoutStore.getState().exercises[0].id).toBe(exercise.id);
    });
  });

  describe('importLiftDump', () => {
    it('imports parsed sets into a completed import session', () => {
      const beforeSets = useWorkoutStore.getState().sets.length;
      const result = useWorkoutStore.getState().importLiftDump('Lat pulldown 175 lbs\nBench 205 x 3');

      expect(result.imported).toBe(2);
      expect(useWorkoutStore.getState().sets).toHaveLength(beforeSets + 2);
      expect(useWorkoutStore.getState().sessions[0].notes).toBe('Imported from brain dump');
      expect(useWorkoutStore.getState().sessions[0].endedAt).toBeTruthy();
    });

    it('creates exercises for unknown lift names', () => {
      useWorkoutStore.getState().importLiftDump('Custom movement 100 lbs');
      const created = useWorkoutStore.getState().exercises.find((item) => item.slug === 'custom-movement');
      expect(created?.name).toBe('Custom movement');
    });

    it('returns zero imports for empty brain dumps', () => {
      const result = useWorkoutStore.getState().importLiftDump('stretch and recover');
      expect(result.imported).toBe(0);
    });
  });

  describe('toggleGoal', () => {
    it('marks goals achieved with a date stamp', () => {
      const goal = starterGoals[0];
      expect(goal.achieved).toBe(false);

      useWorkoutStore.getState().toggleGoal(goal.id);
      const updated = useWorkoutStore.getState().goals.find((item) => item.id === goal.id);
      expect(updated?.achieved).toBe(true);
      expect(updated?.achievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      useWorkoutStore.getState().toggleGoal(goal.id);
      const cleared = useWorkoutStore.getState().goals.find((item) => item.id === goal.id);
      expect(cleared?.achieved).toBe(false);
      expect(cleared?.achievedAt).toBeUndefined();
    });
  });
});
