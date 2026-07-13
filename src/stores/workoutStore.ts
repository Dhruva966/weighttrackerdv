import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { starterExercises, starterGoals, starterSessions, starterSets } from '../data/catalog';
import { slugify } from '../lib/fmt';
import { formatImportedSessionNotes, parseBrainDump } from '../lib/liftImport';
import { isPersonalRecord } from '../lib/pr';
import { syncExercise, syncGoal, syncSession, syncSet } from '../lib/supabase-sync';
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

type WorkoutState = {
  exercises: Exercise[];
  goals: Goal[];
  sessions: WorkoutSession[];
  sets: LoggedSet[];
  createSession: () => WorkoutSession;
  endSession: (sessionId: string) => void;
  addSet: (input: Omit<LoggedSet, 'id' | 'setNumber' | 'isPr' | 'createdAt'>) => LoggedSet;
  addExercise: (input: ExerciseInput) => Exercise;
  importLiftDump: (text: string) => { imported: number; notes: number; skipped: string[] };
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
      sessions: starterSessions,
      sets: starterSets,
      createSession: () => {
        const session: WorkoutSession = {
          id: newId(),
          userId: USER_ID,
          startedAt: new Date().toISOString(),
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
      addSet: (input) => {
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
        return {
          ...current,
          ...stored,
          exercises: mergeExercises(starterExercises, stored?.exercises),
          goals: mergeById(starterGoals, stored?.goals),
          sessions: mergeById(starterSessions, stored?.sessions),
          sets: mergeSets(starterSets, stored?.sets),
        };
      },
    },
  ),
);
