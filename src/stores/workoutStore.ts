import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  isBoardBaselineSession,
  starterExercises,
  starterGoals,
  starterSets,
} from '../data/catalog';
import { slugify } from '../lib/fmt';
import { formatImportedSessionNotes, parseBrainDump } from '../lib/liftImport';
import { parseExerciseLogSmart } from '../lib/exercise-log-parse';
import { isPersonalRecord } from '../lib/pr';
import { deleteSyncedSet, syncExercise, syncGoal, syncSession, syncSet } from '../lib/supabase-sync';
import { USER_ID } from '../lib/user';
import type { EquipmentKind, Exercise, Goal, LoggedSet, MuscleGroup, WorkoutSession } from '../types';
import { usePrStore } from './prStore';

type ExerciseInput = {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: EquipmentKind;
  imageUrl?: string;
  setupNotes?: string[];
};

/** Bump when re-introducing or changing board baseline seed so cleared browsers re-merge. */
export const BOARD_HISTORY_SEED_VERSION = 3;

function withoutBaselineSessions<T extends { id: string }>(sessions: T[]): T[] {
  return sessions.filter((session) => !isBoardBaselineSession(session.id));
}

type WorkoutState = {
  exercises: Exercise[];
  goals: Goal[];
  sessions: WorkoutSession[];
  sets: LoggedSet[];
  historyCleared?: boolean;
  /** Tracks which board baseline seed is present; bump `BOARD_HISTORY_SEED_VERSION` to re-seed. */
  boardHistorySeedVersion?: number;
  createSession: (options?: { startedAt?: string }) => WorkoutSession;
  endSession: (sessionId: string) => void;
  /** Clears endedAt so a day’s session can accept more sets (soft reopen). */
  reopenSession: (sessionId: string) => void;
  addSet: (input: Omit<LoggedSet, 'id' | 'setNumber' | 'isPr' | 'createdAt'>) => LoggedSet;
  /** Removes a logged set, renumbers remaining sets in that session+exercise, and refreshes PR flags. */
  removeSet: (setId: string) => void;
  addExercise: (input: ExerciseInput) => Exercise;
  importLiftDump: (text: string) => { imported: number; notes: number; skipped: string[] };
  setSessionPlan: (sessionId: string, exerciseIds: string[]) => void;
  logExerciseNotes: (
    sessionId: string,
    exerciseId: string,
    text: string,
  ) => Promise<{ imported: number; notes: string[] }>;
  clearHistory: () => void;
  toggleGoal: (goalId: string) => void;
};

function newId(): string {
  return crypto.randomUUID();
}

function mergeById<T extends { id: string }>(required: T[], persisted: T[] | undefined): T[] {
  const items = new Map(required.map((item) => [item.id, item]));
  for (const item of persisted ?? []) {
    items.set(item.id, item);
  }
  return [...items.values()];
}

function mergeExercises(required: Exercise[], persisted: Exercise[] | undefined): Exercise[] {
  const starterIds = new Set(required.map((item) => item.id));
  const persistedById = new Map((persisted ?? []).map((item) => [item.id, item]));
  const merged = required.map((item) => {
    const stored = persistedById.get(item.id);
    return stored
      ? {
          ...item,
          archived: stored.archived,
          imageUrl: stored.imageUrl ?? item.imageUrl,
          imageStyle: stored.imageUrl ? stored.imageStyle : item.imageStyle,
        }
      : item;
  });

  return [...merged, ...(persisted ?? []).filter((item) => !starterIds.has(item.id))];
}

function mergeSets(required: LoggedSet[], persisted: LoggedSet[] | undefined): LoggedSet[] {
  const starterPrefixes = ['set-current-', 'set-9th-', 'set-10th-', 'set-11th-'];
  const requiredIds = new Set(required.map((item) => item.id));
  const customSets = (persisted ?? []).filter(
    (item) => !requiredIds.has(item.id) && !starterPrefixes.some((prefix) => item.id.startsWith(prefix)),
  );

  return [...required, ...customSets];
}

export class InvalidSetInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSetInputError';
  }
}

function assertValidSetInput(input: Pick<LoggedSet, 'weightLb' | 'reps'>): void {
  if (!Number.isFinite(input.weightLb) || input.weightLb <= 0) {
    throw new InvalidSetInputError('Weight must be greater than zero.');
  }

  if (!Number.isFinite(input.reps) || input.reps <= 0 || !Number.isInteger(input.reps)) {
    throw new InvalidSetInputError('Reps must be a whole number greater than zero.');
  }
}

function renumberSessionExerciseSets(
  sets: LoggedSet[],
  sessionId: string,
  exerciseId: string,
): LoggedSet[] {
  const ordered = sets
    .filter((setItem) => setItem.sessionId === sessionId && setItem.exerciseId === exerciseId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.setNumber - b.setNumber);
  const numberById = new Map(ordered.map((setItem, index) => [setItem.id, index + 1]));

  return sets.map((setItem) => {
    const nextNumber = numberById.get(setItem.id);
    return nextNumber !== undefined && nextNumber !== setItem.setNumber
      ? { ...setItem, setNumber: nextNumber }
      : setItem;
  });
}

function recalculateExercisePrFlags(sets: LoggedSet[], exerciseId: string): LoggedSet[] {
  const chronological = sets
    .filter((setItem) => setItem.exerciseId === exerciseId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.setNumber - b.setNumber);

  const history: Array<{ weightLb: number; reps: number; isWarmup: boolean }> = [];
  const prById = new Map<string, boolean>();

  for (const setItem of chronological) {
    const isPr = isPersonalRecord(
      { weightLb: setItem.weightLb, reps: setItem.reps, isWarmup: setItem.isWarmup },
      history,
    );
    prById.set(setItem.id, isPr);
    history.push({
      weightLb: setItem.weightLb,
      reps: setItem.reps,
      isWarmup: setItem.isWarmup,
    });
  }

  return sets.map((setItem) => {
    const nextPr = prById.get(setItem.id);
    return nextPr !== undefined && nextPr !== setItem.isPr ? { ...setItem, isPr: nextPr } : setItem;
  });
}

function findExerciseByName(exercises: Exercise[], name: string): Exercise | undefined {
  const slug = slugify(name);
  return (
    exercises.find((exercise) => exercise.slug === slug) ??
    exercises.find((exercise) => exercise.name.toLowerCase() === name.toLowerCase()) ??
    exercises.find((exercise) => exercise.slug.includes(slug) || slug.includes(exercise.slug))
  );
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      exercises: starterExercises,
      goals: starterGoals,
      // Baseline weight history lives in `sets` only — no fake gym-day sessions.
      sessions: [],
      sets: starterSets,
      historyCleared: false,
      boardHistorySeedVersion: BOARD_HISTORY_SEED_VERSION,
      createSession: (options) => {
        const session: WorkoutSession = {
          id: newId(),
          userId: USER_ID,
          startedAt: options?.startedAt ?? new Date().toISOString(),
        };
        set((state) => ({ sessions: [session, ...state.sessions] }));
        void syncSession(session);
        return session;
      },
      endSession: (sessionId) => {
        const endedAt = new Date().toISOString();
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId ? { ...session, endedAt } : session,
          ),
        }));
        const session = get().sessions.find((item) => item.id === sessionId);
        if (session) {
          void syncSession({ ...session, endedAt });
        }
      },
      reopenSession: (sessionId) => {
        const session = get().sessions.find((item) => item.id === sessionId);
        if (!session?.endedAt) {
          return;
        }
        const reopened: WorkoutSession = {
          id: session.id,
          userId: session.userId,
          startedAt: session.startedAt,
          notes: session.notes,
          plannedExerciseIds: session.plannedExerciseIds,
        };
        set((state) => ({
          sessions: state.sessions.map((item) => (item.id === sessionId ? reopened : item)),
        }));
        void syncSession(reopened);
      },
      addSet: (input) => {
        assertValidSetInput(input);
        const state = get();
        const setNumber =
          state.sets.filter((setItem) => setItem.sessionId === input.sessionId && setItem.exerciseId === input.exerciseId)
            .length + 1;
        const history = state.sets
          .filter((setItem) => setItem.exerciseId === input.exerciseId)
          .map((setItem) => ({
            weightLb: setItem.weightLb,
            reps: setItem.reps,
            isWarmup: setItem.isWarmup,
          }));
        const loggedSet: LoggedSet = {
          ...input,
          id: newId(),
          setNumber,
          isPr: isPersonalRecord(input, history),
          createdAt: new Date().toISOString(),
        };
        set({ sets: [...state.sets, loggedSet] });
        void syncSet(loggedSet);

        if (loggedSet.isPr) {
          const exercise = state.exercises.find((item) => item.id === input.exerciseId);
          usePrStore.getState().firePr({
            id: loggedSet.id,
            exerciseName: exercise?.name ?? 'Exercise',
            weightLb: loggedSet.weightLb,
            reps: loggedSet.reps,
          });
        }

        return loggedSet;
      },
      removeSet: (setId) => {
        const state = get();
        const target = state.sets.find((setItem) => setItem.id === setId);
        if (!target) {
          return;
        }

        let nextSets = state.sets.filter((setItem) => setItem.id !== setId);
        nextSets = renumberSessionExerciseSets(nextSets, target.sessionId, target.exerciseId);
        nextSets = recalculateExercisePrFlags(nextSets, target.exerciseId);
        set({ sets: nextSets });

        if (usePrStore.getState().lastPr?.id === setId) {
          usePrStore.getState().clearPr();
        }

        void deleteSyncedSet(target.id);

        for (const setItem of nextSets) {
          if (setItem.exerciseId !== target.exerciseId) {
            continue;
          }
          const previous = state.sets.find((item) => item.id === setItem.id);
          if (
            previous &&
            (previous.setNumber !== setItem.setNumber || previous.isPr !== setItem.isPr)
          ) {
            void syncSet(setItem);
          }
        }
      },
      addExercise: (input) => {
        const slug = slugify(input.name);
        const exercise: Exercise = {
          id: newId(),
          slug,
          name: input.name,
          muscleGroup: input.muscleGroup,
          secondaryMuscles: [],
          equipment: input.equipment,
          instructions: [],
          setupNotes: input.setupNotes ?? [],
          imageUrl: input.imageUrl,
          imageStyle: input.imageUrl ? 'photo' : 'name-only',
          source: 'user-created',
        };
        set((state) => ({ exercises: [exercise, ...state.exercises] }));
        void syncExercise(exercise);
        return exercise;
      },
      importLiftDump: (text) => {
        const parsed = parseBrainDump(text);
        const importedSets = parsed.blocks.flatMap((block) => block.sets);
        const noteCount =
          parsed.sessionNotes.length + parsed.blocks.reduce((total, block) => total + block.notes.length, 0);

        if (importedSets.length === 0 && noteCount === 0) {
          return { imported: 0, notes: 0, skipped: [] };
        }

        const state = get();
        const importSession: WorkoutSession = {
          id: newId(),
          userId: USER_ID,
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          notes: formatImportedSessionNotes(parsed) ?? (importedSets.length > 0 ? 'Imported from brain dump' : undefined),
        };
        const exercises = [...state.exercises];
        const nextSets = [...state.sets];
        const skipped: string[] = [];

        for (const block of parsed.blocks) {
          let exercise = findExerciseByName(exercises, block.exerciseName);
          if (!exercise) {
            const slug = slugify(block.exerciseName);
            exercise = {
              id: newId(),
              slug,
              name: block.exerciseName,
              muscleGroup: 'full-body',
              secondaryMuscles: [],
              equipment: 'other',
              instructions: [],
              imageStyle: 'name-only',
              source: 'user-created',
            };
            exercises.unshift(exercise);
          }

          for (const entry of block.sets) {
            if (!Number.isFinite(entry.weightLb) || entry.weightLb <= 0 || entry.reps <= 0) {
              skipped.push(block.raw);
              continue;
            }

            const exerciseSets = nextSets.filter((setItem) => setItem.exerciseId === exercise.id);
            const history = exerciseSets.map((setItem) => ({
              weightLb: setItem.weightLb,
              reps: setItem.reps,
              isWarmup: setItem.isWarmup,
            }));
            nextSets.push({
              id: newId(),
              sessionId: importSession.id,
              exerciseId: exercise.id,
              setNumber: exerciseSets.length + 1,
              weightLb: entry.weightLb,
              reps: entry.reps,
              isWarmup: false,
              isPr: isPersonalRecord(entry, history),
              createdAt: new Date().toISOString(),
            });
          }
        }

        set({
          exercises,
          sessions: [importSession, ...state.sessions],
          sets: nextSets,
        });

        void syncSession(importSession);
        for (const exerciseItem of exercises.filter((item) => !state.exercises.some((existing) => existing.id === item.id))) {
          void syncExercise(exerciseItem);
        }
        for (const setItem of nextSets.slice(state.sets.length)) {
          void syncSet(setItem);
        }

        return { imported: nextSets.length - state.sets.length, notes: noteCount, skipped };
      },
      setSessionPlan: (sessionId, exerciseIds) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId ? { ...session, plannedExerciseIds: exerciseIds } : session,
          ),
        }));
        const session = get().sessions.find((item) => item.id === sessionId);
        if (session) {
          void syncSession({ ...session, plannedExerciseIds: exerciseIds });
        }
      },
      logExerciseNotes: async (sessionId, exerciseId, text) => {
        const state = get();
        const exercise = state.exercises.find((item) => item.id === exerciseId);
        const session = state.sessions.find((item) => item.id === sessionId);
        if (!exercise || !session) {
          return { imported: 0, notes: [] };
        }

        const parsed = await parseExerciseLogSmart(text, exercise.name);
        let imported = 0;

        for (const entry of parsed.sets) {
          try {
            assertValidSetInput(entry);
          } catch {
            continue;
          }

          get().addSet({
            sessionId,
            exerciseId,
            weightLb: entry.weightLb,
            reps: entry.reps,
            isWarmup: false,
          });
          imported += 1;
        }

        if (parsed.notes.length > 0) {
          const noteLine = `${exercise.name}: ${parsed.notes.join(' ')}`;
          const nextNotes = session.notes ? `${session.notes}\n${noteLine}` : noteLine;
          set((current) => ({
            sessions: current.sessions.map((item) =>
              item.id === sessionId ? { ...item, notes: nextNotes } : item,
            ),
          }));
          void syncSession({ ...session, notes: nextNotes });
        }

        return { imported, notes: parsed.notes };
      },
      clearHistory: () => {
        set({
          sessions: [],
          // Keep board baseline weights for Grow charts; drop real logged workouts only.
          sets: starterSets,
          historyCleared: true,
          // Stay cleared for the current seed; a future version bump can re-seed intentionally.
          boardHistorySeedVersion: BOARD_HISTORY_SEED_VERSION,
        });
        usePrStore.getState().clearPr();
      },
      toggleGoal: (goalId) => {
        const current = get().goals.find((goal) => goal.id === goalId);
        if (!current) {
          return;
        }

        const updated: Goal = {
          ...current,
          achieved: !current.achieved,
          achievedAt: current.achieved ? undefined : new Date().toISOString().slice(0, 10),
        };

        set((state) => ({
          goals: state.goals.map((goal) => (goal.id === goalId ? updated : goal)),
        }));
        void syncGoal(updated);
      },
    }),
    {
      name: 'weight-tracker-workouts',
      merge: (persisted, current) => {
        const stored = persisted as Partial<WorkoutState> | undefined;
        const storedSeedVersion = stored?.boardHistorySeedVersion ?? 0;
        const needsReseed = storedSeedVersion < BOARD_HISTORY_SEED_VERSION;
        // Re-merge board baseline when seed version bumps (e.g. after the Jul 13 clear),
        // or when history was never explicitly cleared for the current seed.
        const useStarterHistory = needsReseed || !stored?.historyCleared;

        return {
          ...current,
          ...stored,
          historyCleared: needsReseed ? false : Boolean(stored?.historyCleared),
          boardHistorySeedVersion: BOARD_HISTORY_SEED_VERSION,
          exercises: mergeExercises(starterExercises, stored?.exercises),
          goals: mergeById(starterGoals, stored?.goals),
          // Never re-introduce baseline sessions as real gym history.
          sessions: withoutBaselineSessions(stored?.sessions ?? []),
          sets: useStarterHistory ? mergeSets(starterSets, stored?.sets) : (stored?.sets ?? []),
        };
      },
    },
  ),
);
