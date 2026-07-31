import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isBoardBaselineSession,
  starterExercises,
  starterGoals,
  starterSessions,
  starterSets,
} from '../data/catalog';
import * as supabaseSync from '../lib/supabase-sync';
import type { Exercise, Goal, LoggedSet, WorkoutSession } from '../types';
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
      expect(exercise.archived).toBe(false);
      expect(useWorkoutStore.getState().exercises[0].id).toBe(exercise.id);
    });

    it('allocates a unique slug when the base slug is already taken', () => {
      const first = useWorkoutStore.getState().addExercise({
        name: 'Lat Pulldown',
        muscleGroup: 'back',
        equipment: 'cable',
      });
      const second = useWorkoutStore.getState().addExercise({
        name: 'Lat Pulldown',
        muscleGroup: 'back',
        equipment: 'cable',
      });

      // Starter catalog already owns `lat-pulldown`.
      expect(first.slug).toBe('lat-pulldown-2');
      expect(second.slug).toBe('lat-pulldown-3');
      expect(useWorkoutStore.getState().exercises.filter((item) => item.name === 'Lat Pulldown').length).toBeGreaterThanOrEqual(2);
    });

    it('is immediately findable via catalog search after create', async () => {
      const { searchExercises } = await import('../hooks/useExercises');
      const exercise = useWorkoutStore.getState().addExercise({
        name: 'Zorp Cable Kickback Deluxe',
        muscleGroup: 'glutes',
        equipment: 'cable',
      });

      const hits = searchExercises(useWorkoutStore.getState().exercises, 'Zorp Cable Kickback Deluxe');
      expect(hits[0]?.id).toBe(exercise.id);
      expect(hits.some((item) => item.id === exercise.id)).toBe(true);
    });
  });

  describe('updateExercise', () => {
    it('updates muscle group and equipment in place without changing id or slug', () => {
      const created = useWorkoutStore.getState().addExercise({
        name: 'Mis-tagged Row',
        muscleGroup: 'cardio',
        equipment: 'other',
        setupNotes: ['Old note'],
      });

      const syncSpy = vi.spyOn(supabaseSync, 'syncExercise').mockResolvedValue(undefined);
      const updated = useWorkoutStore.getState().updateExercise(created.id, {
        name: 'Chest-supported Row',
        muscleGroup: 'back',
        equipment: 'machine',
        setupNotes: ['Seat 4', 'Chest pad mid'],
      });

      expect(updated?.id).toBe(created.id);
      expect(updated?.slug).toBe(created.slug);
      expect(updated?.name).toBe('Chest-supported Row');
      expect(updated?.muscleGroup).toBe('back');
      expect(updated?.equipment).toBe('machine');
      expect(updated?.setupNotes).toEqual(['Seat 4', 'Chest pad mid']);

      const stored = useWorkoutStore.getState().exercises.find((item) => item.id === created.id);
      expect(stored?.muscleGroup).toBe('back');
      expect(syncSpy).toHaveBeenCalledWith(expect.objectContaining({ id: created.id, muscleGroup: 'back' }));
      syncSpy.mockRestore();
    });

    it('preserves existing image when no new photo is provided', () => {
      const created = useWorkoutStore.getState().addExercise({
        name: 'Photo Keep',
        muscleGroup: 'arms',
        equipment: 'dumbbell',
        imageUrl: 'blob:keep-me',
      });

      const updated = useWorkoutStore.getState().updateExercise(created.id, {
        name: 'Photo Keep',
        muscleGroup: 'biceps',
        equipment: 'dumbbell',
      });

      expect(updated?.imageUrl).toBe('blob:keep-me');
      expect(updated?.imageStyle).toBe('photo');
    });

    it('reflects the new muscle group in Library filters immediately', async () => {
      const { searchExercises } = await import('../hooks/useExercises');
      const created = useWorkoutStore.getState().addExercise({
        name: 'Filter Flip Lift',
        muscleGroup: 'cardio',
        equipment: 'machine',
      });

      useWorkoutStore.getState().updateExercise(created.id, {
        name: 'Filter Flip Lift',
        muscleGroup: 'chest',
        equipment: 'machine',
      });

      const chest = useWorkoutStore.getState().exercises.filter((item) => item.muscleGroup === 'chest');
      expect(chest.some((item) => item.id === created.id)).toBe(true);
      expect(
        useWorkoutStore.getState().exercises.some((item) => item.id === created.id && item.muscleGroup === 'cardio'),
      ).toBe(false);

      const hits = searchExercises(
        useWorkoutStore.getState().exercises.filter((item) => item.muscleGroup === 'chest'),
        'Filter Flip Lift',
      );
      expect(hits[0]?.id).toBe(created.id);
    });

    it('returns undefined for unknown ids', () => {
      expect(
        useWorkoutStore.getState().updateExercise('missing-id', {
          name: 'Nope',
          muscleGroup: 'arms',
          equipment: 'other',
        }),
      ).toBeUndefined();
    });
  });

  describe('importLiftDump', () => {
    it('imports parsed sets into a completed import session', () => {
      const beforeSets = useWorkoutStore.getState().sets.length;
      const result = useWorkoutStore.getState().importLiftDump('Lat pulldown 175 lbs\nBench 205 x 3');
      const importSession = useWorkoutStore.getState().sessions[0]!;
      const importedSets = useWorkoutStore
        .getState()
        .sets.filter((setItem) => setItem.sessionId === importSession.id);

      expect(result.imported).toBe(2);
      expect(useWorkoutStore.getState().sets).toHaveLength(beforeSets + 2);
      expect(importSession.notes).toBe('Imported from brain dump');
      expect(importSession.endedAt).toBeTruthy();
      expect(importedSets.map((setItem) => setItem.setNumber)).toEqual([1, 1]);
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

  describe('hydrateFromRemote', () => {
    function remoteExercise(overrides: Partial<Exercise> = {}): Exercise {
      return {
        id: crypto.randomUUID(),
        slug: 'remote-row',
        name: 'Remote Row',
        muscleGroup: 'back',
        secondaryMuscles: [],
        equipment: 'cable',
        instructions: [],
        imageStyle: 'name-only',
        source: 'remote',
        ...overrides,
      };
    }

    it('adds remote-only sessions, sets, exercises, and goals not present locally', () => {
      const remoteSession: WorkoutSession = {
        id: crypto.randomUUID(),
        userId: 'user-1',
        startedAt: '2026-07-01T12:00:00.000Z',
        endedAt: '2026-07-01T13:00:00.000Z',
      };
      const remoteExerciseRow = remoteExercise();
      const remoteSet: LoggedSet = {
        id: crypto.randomUUID(),
        sessionId: remoteSession.id,
        exerciseId: remoteExerciseRow.id,
        setNumber: 1,
        weightLb: 90,
        reps: 8,
        isWarmup: false,
        isPr: false,
        createdAt: '2026-07-01T12:05:00.000Z',
      };
      const remoteGoal: Goal = {
        id: crypto.randomUUID(),
        userId: 'user-1',
        name: 'Remote goal',
        achieved: false,
        createdAt: '2026-07-01T00:00:00.000Z',
      };

      useWorkoutStore.getState().hydrateFromRemote({
        exercises: [remoteExerciseRow],
        sessions: [remoteSession],
        sets: [remoteSet],
        goals: [remoteGoal],
      });

      const state = useWorkoutStore.getState();
      expect(state.exercises.some((item) => item.id === remoteExerciseRow.id)).toBe(true);
      expect(state.sessions.some((item) => item.id === remoteSession.id)).toBe(true);
      expect(state.sets.some((item) => item.id === remoteSet.id)).toBe(true);
      expect(state.goals.some((item) => item.id === remoteGoal.id)).toBe(true);
    });

    it('keeps the local row when a remote row shares its id (dup-session guard)', () => {
      const session = useWorkoutStore.getState().createSession();
      const localVersion = useWorkoutStore.getState().sessions.find((item) => item.id === session.id)!;
      const conflictingRemote: WorkoutSession = {
        ...localVersion,
        notes: 'should not win over local',
      };

      useWorkoutStore.getState().hydrateFromRemote({
        exercises: [],
        sessions: [conflictingRemote],
        sets: [],
        goals: [],
      });

      const state = useWorkoutStore.getState();
      expect(state.sessions.filter((item) => item.id === session.id)).toHaveLength(1);
      expect(state.sessions.find((item) => item.id === session.id)?.notes).toBe(localVersion.notes);
    });

    it('is idempotent across repeated hydration (reload safe)', () => {
      const remoteExerciseRow = remoteExercise();
      const remote = { exercises: [remoteExerciseRow], sessions: [], sets: [], goals: [] };

      useWorkoutStore.getState().hydrateFromRemote(remote);
      const afterFirst = useWorkoutStore.getState().exercises.length;
      useWorkoutStore.getState().hydrateFromRemote(remote);
      const afterSecond = useWorkoutStore.getState().exercises.length;

      expect(afterSecond).toBe(afterFirst);
      expect(
        useWorkoutStore.getState().exercises.filter((item) => item.id === remoteExerciseRow.id),
      ).toHaveLength(1);
    });

    it('skips remote exercises whose slug already exists locally', () => {
      const local = starterExercises.find((item) => item.slug === 'close-grip-pulldown');
      expect(local).toBeDefined();
      const remoteDuplicate = remoteExercise({
        slug: 'close-grip-pulldown',
        name: 'Close-Grip Pulldown (Cable)',
        source: 'pdf-import',
      });

      useWorkoutStore.getState().hydrateFromRemote({
        exercises: [remoteDuplicate],
        sessions: [],
        sets: [],
        goals: [],
      });

      const matches = useWorkoutStore.getState().exercises.filter((item) => item.slug === 'close-grip-pulldown');
      expect(matches).toHaveLength(1);
      expect(matches[0]?.id).toBe(local!.id);
    });

    it('gap-fills imageUrl from a same-slug remote row when local has no photo', () => {
      const local = starterExercises.find((item) => item.slug === 'close-grip-pulldown');
      expect(local).toBeDefined();
      expect(local!.imageUrl).toBeUndefined();

      useWorkoutStore.getState().hydrateFromRemote({
        exercises: [
          remoteExercise({
            slug: 'close-grip-pulldown',
            name: 'Close Grip Pulldown',
            imageUrl: 'https://example.com/close-grip.jpg',
            imageStyle: 'photo',
            source: 'pdf-import',
          }),
        ],
        sessions: [],
        sets: [],
        goals: [],
      });

      const matches = useWorkoutStore.getState().exercises.filter((item) => item.slug === 'close-grip-pulldown');
      expect(matches).toHaveLength(1);
      expect(matches[0]?.id).toBe(local!.id);
      expect(matches[0]?.imageUrl).toBe('https://example.com/close-grip.jpg');
      expect(matches[0]?.imageStyle).toBe('photo');
    });

    it('does not overwrite an existing local imageUrl from remote', () => {
      const local = starterExercises.find((item) => item.slug === 'close-grip-pulldown');
      expect(local).toBeDefined();

      useWorkoutStore.setState((state) => ({
        exercises: state.exercises.map((item) =>
          item.slug === 'close-grip-pulldown'
            ? { ...item, imageUrl: 'https://example.com/local.jpg', imageStyle: 'photo' as const }
            : item,
        ),
      }));

      useWorkoutStore.getState().hydrateFromRemote({
        exercises: [
          remoteExercise({
            slug: 'close-grip-pulldown',
            imageUrl: 'https://example.com/remote.jpg',
            imageStyle: 'photo',
          }),
        ],
        sessions: [],
        sets: [],
        goals: [],
      });

      const match = useWorkoutStore.getState().exercises.find((item) => item.slug === 'close-grip-pulldown');
      expect(match?.imageUrl).toBe('https://example.com/local.jpg');
    });

    it('gap-fills imageUrl from remote even when a stale local PDF icon path was stamped', () => {
      useWorkoutStore.setState((state) => ({
        exercises: [
          ...state.exercises,
          {
            id: 'ex-arnold-press-dumbbell',
            slug: 'arnold-press-dumbbell',
            name: 'Arnold Press (Dumbbell)',
            muscleGroup: 'shoulders' as const,
            secondaryMuscles: [],
            equipment: 'dumbbell' as const,
            instructions: [],
            imageUrl: '/exercise-icons/arnold-press-dumbbell.jpg',
            imageStyle: 'photo' as const,
            source: 'pdf-import',
            archived: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      }));

      useWorkoutStore.getState().hydrateFromRemote({
        exercises: [
          remoteExercise({
            id: 'ex-arnold-press-dumbbell',
            slug: 'arnold-press-dumbbell',
            name: 'Arnold Press (Dumbbell)',
            imageUrl: 'https://example.com/fedb-arnold.jpg',
            imageStyle: 'photo',
            source: 'pdf-import',
          }),
        ],
        sessions: [],
        sets: [],
        goals: [],
      });

      const match = useWorkoutStore.getState().exercises.find((item) => item.slug === 'arnold-press-dumbbell');
      expect(match?.imageUrl).toBe('https://example.com/fedb-arnold.jpg');
      expect(match?.imageStyle).toBe('photo');
    });

    it('keeps remote Supabase imageUrl instead of stamping a local PDF icon path into the store', () => {
      useWorkoutStore.getState().hydrateFromRemote({
        exercises: [
          remoteExercise({
            slug: 'arnold-press-dumbbell',
            name: 'Arnold Press (Dumbbell)',
            imageUrl: 'https://example.com/fedb-arnold.jpg',
            imageStyle: 'photo',
            source: 'pdf-import',
          }),
        ],
        sessions: [],
        sets: [],
        goals: [],
      });

      const match = useWorkoutStore.getState().exercises.find((item) => item.slug === 'arnold-press-dumbbell');
      expect(match?.imageUrl).toBe('https://example.com/fedb-arnold.jpg');
      expect(match?.imageStyle).toBe('photo');
    });
  });
});
