import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isBoardBaselineSession,
  starterExercises,
  starterGoals,
  starterSessions,
  starterSets,
} from '../data/catalog';
import * as supabaseSync from '../lib/supabase-sync';
import { usePrStore } from './prStore';
import { BOARD_HISTORY_SEED_VERSION, InvalidSetInputError, useWorkoutStore } from './workoutStore';

function resetStores() {
  useWorkoutStore.setState({
    exercises: starterExercises,
    goals: starterGoals,
    sessions: [],
    sets: starterSets,
    historyCleared: false,
    boardHistorySeedVersion: BOARD_HISTORY_SEED_VERSION,
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

    it('accepts a backdated startedAt for a calendar day', () => {
      const startedAt = '2026-07-10T19:00:00.000Z';
      const session = useWorkoutStore.getState().createSession({ startedAt });
      expect(session.startedAt).toBe(startedAt);
    });
  });

  describe('endSession', () => {
    it('marks the session complete', () => {
      const session = useWorkoutStore.getState().createSession();
      useWorkoutStore.getState().endSession(session.id);

      const ended = useWorkoutStore.getState().sessions.find((item) => item.id === session.id);
      expect(ended?.endedAt).toBeTruthy();
    });

    it('sets endedAt as an ISO timestamp', () => {
      const session = useWorkoutStore.getState().createSession();
      useWorkoutStore.getState().endSession(session.id);

      const ended = useWorkoutStore.getState().sessions.find((item) => item.id === session.id);
      expect(ended?.endedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('reopenSession', () => {
    it('clears endedAt so logging can continue', () => {
      const session = useWorkoutStore.getState().createSession();
      useWorkoutStore.getState().endSession(session.id);
      useWorkoutStore.getState().reopenSession(session.id);

      const reopened = useWorkoutStore.getState().sessions.find((item) => item.id === session.id);
      expect(reopened?.endedAt).toBeUndefined();
    });

    it('preserves plannedExerciseIds when reopening', () => {
      const session = useWorkoutStore.getState().createSession();
      const exerciseId = starterExercises[0].id;
      useWorkoutStore.getState().setSessionPlan(session.id, [exerciseId]);
      useWorkoutStore.getState().endSession(session.id);
      useWorkoutStore.getState().reopenSession(session.id);

      const reopened = useWorkoutStore.getState().sessions.find((item) => item.id === session.id);
      expect(reopened?.plannedExerciseIds).toEqual([exerciseId]);
      expect(reopened?.endedAt).toBeUndefined();
    });
  });

  describe('setSessionPlan', () => {
    it('stores planned exercise ids on the session', () => {
      const session = useWorkoutStore.getState().createSession();
      const ids = [starterExercises[0].id, starterExercises[1].id];

      useWorkoutStore.getState().setSessionPlan(session.id, ids);

      const updated = useWorkoutStore.getState().sessions.find((item) => item.id === session.id);
      expect(updated?.plannedExerciseIds).toEqual(ids);
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

    it('accepts decimal weights', () => {
      const session = useWorkoutStore.getState().createSession();
      const exercise = starterExercises[0];
      const beforeCount = useWorkoutStore.getState().sets.length;

      const logged = useWorkoutStore.getState().addSet({
        sessionId: session.id,
        exerciseId: exercise.id,
        weightLb: 117.5,
        reps: 8,
        isWarmup: false,
      });

      expect(logged.weightLb).toBe(117.5);
      expect(useWorkoutStore.getState().sets).toHaveLength(beforeCount + 1);
    });

    it('rejects zero reps without storing a set', () => {
      const session = useWorkoutStore.getState().createSession();
      const exercise = starterExercises[0];
      const beforeCount = useWorkoutStore.getState().sets.length;

      expect(() =>
        useWorkoutStore.getState().addSet({
          sessionId: session.id,
          exerciseId: exercise.id,
          weightLb: 100,
          reps: 0,
          isWarmup: false,
        }),
      ).toThrow(InvalidSetInputError);

      expect(useWorkoutStore.getState().sets).toHaveLength(beforeCount);
    });

    it('does not mark warmup sets as PRs', () => {
      const session = useWorkoutStore.getState().createSession();
      const exercise = starterExercises.find((item) => item.slug === 'lat-pulldown');
      expect(exercise).toBeTruthy();

      const logged = useWorkoutStore.getState().addSet({
        sessionId: session.id,
        exerciseId: exercise!.id,
        weightLb: 250,
        reps: 5,
        isWarmup: true,
      });

      expect(logged.isPr).toBe(false);
      expect(usePrStore.getState().lastPr).toBeUndefined();
    });

    it('keeps catalog sets locally when remote sync skips non-UUID exercise ids', async () => {
      const syncSetSpy = vi.spyOn(supabaseSync, 'syncSet').mockResolvedValue(undefined);
      const session = useWorkoutStore.getState().createSession();
      const exercise = starterExercises[0];
      expect(exercise.id.startsWith('ex-')).toBe(true);
      const beforeCount = useWorkoutStore.getState().sets.length;

      const logged = useWorkoutStore.getState().addSet({
        sessionId: session.id,
        exerciseId: exercise.id,
        weightLb: 95,
        reps: 8,
        isWarmup: false,
      });

      await Promise.resolve();
      expect(useWorkoutStore.getState().sets).toHaveLength(beforeCount + 1);
      expect(useWorkoutStore.getState().sets.some((setItem) => setItem.id === logged.id)).toBe(true);
      expect(syncSetSpy).toHaveBeenCalledWith(expect.objectContaining({ id: logged.id }));
      syncSetSpy.mockRestore();
    });
  });

  describe('removeSet', () => {
    it('removes a set and renumbers remaining sets for that exercise in the session', () => {
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
      const third = useWorkoutStore.getState().addSet({
        sessionId: session.id,
        exerciseId: exercise.id,
        weightLb: 60,
        reps: 6,
        isWarmup: false,
      });

      useWorkoutStore.getState().removeSet(second.id);

      const remaining = useWorkoutStore
        .getState()
        .sets.filter((setItem) => setItem.sessionId === session.id && setItem.exerciseId === exercise.id);
      expect(remaining.map((setItem) => setItem.id)).toEqual([first.id, third.id]);
      expect(remaining.map((setItem) => setItem.setNumber)).toEqual([1, 2]);
    });

    it('recalculates PR flags when a PR set is deleted', () => {
      useWorkoutStore.setState({ sets: [] });
      const session = useWorkoutStore.getState().createSession();
      const exercise = starterExercises[0];

      const lighter = useWorkoutStore.getState().addSet({
        sessionId: session.id,
        exerciseId: exercise.id,
        weightLb: 100,
        reps: 5,
        isWarmup: false,
      });
      const heavier = useWorkoutStore.getState().addSet({
        sessionId: session.id,
        exerciseId: exercise.id,
        weightLb: 120,
        reps: 5,
        isWarmup: false,
      });

      expect(lighter.isPr).toBe(true);
      expect(heavier.isPr).toBe(true);

      useWorkoutStore.getState().removeSet(heavier.id);

      const remaining = useWorkoutStore.getState().sets.find((setItem) => setItem.id === lighter.id);
      expect(remaining?.isPr).toBe(true);
      expect(useWorkoutStore.getState().sets.some((setItem) => setItem.id === heavier.id)).toBe(false);
    });

    it('clears an active PR toast for the deleted set', () => {
      useWorkoutStore.setState({ sets: [] });
      const session = useWorkoutStore.getState().createSession();
      const exercise = starterExercises[0];

      const logged = useWorkoutStore.getState().addSet({
        sessionId: session.id,
        exerciseId: exercise.id,
        weightLb: 200,
        reps: 5,
        isWarmup: false,
      });
      expect(usePrStore.getState().lastPr?.id).toBe(logged.id);

      useWorkoutStore.getState().removeSet(logged.id);
      expect(usePrStore.getState().lastPr).toBeUndefined();
    });

    it('calls deleteSyncedSet for the removed set', async () => {
      const deleteSpy = vi.spyOn(supabaseSync, 'deleteSyncedSet').mockResolvedValue(undefined);
      const session = useWorkoutStore.getState().createSession();
      const exercise = starterExercises[0];
      const logged = useWorkoutStore.getState().addSet({
        sessionId: session.id,
        exerciseId: exercise.id,
        weightLb: 95,
        reps: 8,
        isWarmup: false,
      });

      useWorkoutStore.getState().removeSet(logged.id);
      await Promise.resolve();

      expect(deleteSpy).toHaveBeenCalledWith(logged.id);
      deleteSpy.mockRestore();
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
      const result = useWorkoutStore.getState().importLiftDump('???');
      expect(result.imported).toBe(0);
      expect(result.notes).toBe(0);
    });

    it('imports narrative notes with lifts into session history', () => {
      const result = useWorkoutStore.getState().importLiftDump(
        'preacher curl 115 lbs 8 reps 7 reps\nlast rep was helped by a friend',
      );

      expect(result.imported).toBe(2);
      expect(result.notes).toBe(1);
      expect(useWorkoutStore.getState().sessions[0].notes).toContain('last rep was helped by a friend');
    });

    it('saves note-only brain dumps as a session', () => {
      const beforeSessions = useWorkoutStore.getState().sessions.length;
      const result = useWorkoutStore.getState().importLiftDump('stretch and recover');

      expect(result.imported).toBe(0);
      expect(result.notes).toBe(1);
      expect(useWorkoutStore.getState().sessions).toHaveLength(beforeSessions + 1);
      expect(useWorkoutStore.getState().sessions[0].notes).toBe('stretch and recover');
    });

    it('clears real sessions but keeps board baseline weights for charts', () => {
      useWorkoutStore.getState().importLiftDump('Lat pulldown 175 lbs');
      expect(useWorkoutStore.getState().sets.length).toBeGreaterThan(starterSets.length);

      useWorkoutStore.getState().clearHistory();

      expect(useWorkoutStore.getState().sessions).toEqual([]);
      expect(useWorkoutStore.getState().sets).toEqual(starterSets);
      expect(useWorkoutStore.getState().historyCleared).toBe(true);
      expect(useWorkoutStore.getState().boardHistorySeedVersion).toBe(BOARD_HISTORY_SEED_VERSION);
    });
  });

  describe('board history seed', () => {
    it('keeps baseline weight sets for charts without treating baseline sessions as real gym days', () => {
      expect(starterSessions.length).toBeGreaterThanOrEqual(4);
      expect(starterSets.length).toBeGreaterThan(100);
      expect(starterSessions.every((session) => isBoardBaselineSession(session.id))).toBe(true);
      expect(starterSets.some((setItem) => setItem.id.startsWith('set-current-'))).toBe(true);
      expect(starterSets.some((setItem) => setItem.id.startsWith('set-9th-'))).toBe(true);
      expect(useWorkoutStore.getState().sessions.every((session) => !isBoardBaselineSession(session.id))).toBe(
        true,
      );
      expect(useWorkoutStore.getState().sets.some((setItem) => setItem.id.startsWith('set-9th-'))).toBe(true);
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
