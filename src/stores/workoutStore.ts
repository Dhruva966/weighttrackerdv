import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { starterExercises, starterGoals, starterSessions, starterSets } from '../data/catalog';
import { slugify } from '../lib/fmt';
import { parseLiftBrainDump } from '../lib/liftImport';
import { isPersonalRecord } from '../lib/pr';
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
  importLiftDump: (text: string) => { imported: number; skipped: string[] };
  toggleGoal: (goalId: string) => void;
};

function id(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
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
          id: id('session'),
          userId: USER_ID,
          startedAt: new Date().toISOString(),
        };
        set((state) => ({ sessions: [session, ...state.sessions] }));
        return session;
      },
      endSession: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId ? { ...session, endedAt: new Date().toISOString() } : session,
          ),
        }));
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
          id: id('set'),
          setNumber,
          isPr: isPersonalRecord(input, history),
          createdAt: new Date().toISOString(),
        };
        set({ sets: [...state.sets, loggedSet] });

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
          id: id('exercise'),
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
        return exercise;
      },
      importLiftDump: (text) => {
        const parsed = parseLiftBrainDump(text);
        if (parsed.length === 0) {
          return { imported: 0, skipped: [] };
        }

        const state = get();
        const importSession: WorkoutSession = {
          id: id('session-import'),
          userId: USER_ID,
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          notes: 'Imported from brain dump',
        };
        const exercises = [...state.exercises];
        const nextSets = [...state.sets];
        const skipped: string[] = [];

        for (const entry of parsed) {
          let exercise = findExerciseByName(exercises, entry.exerciseName);
          if (!exercise) {
            const slug = slugify(entry.exerciseName);
            exercise = {
              id: id('exercise'),
              slug,
              name: entry.exerciseName,
              muscleGroup: 'full-body',
              secondaryMuscles: [],
              equipment: 'other',
              instructions: [],
              imageStyle: 'name-only',
              source: 'user-created',
            };
            exercises.unshift(exercise);
          }

          if (!Number.isFinite(entry.weightLb) || entry.weightLb <= 0 || entry.reps <= 0) {
            skipped.push(entry.raw);
            continue;
          }

          const exerciseSets = nextSets.filter((setItem) => setItem.exerciseId === exercise.id);
          const history = exerciseSets.map((setItem) => ({
            weightLb: setItem.weightLb,
            reps: setItem.reps,
            isWarmup: setItem.isWarmup,
          }));
          nextSets.push({
            id: id('set-import'),
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

        set({
          exercises,
          sessions: [importSession, ...state.sessions],
          sets: nextSets,
        });

        return { imported: nextSets.length - state.sets.length, skipped };
      },
      toggleGoal: (goalId) => {
        set((state) => ({
          goals: state.goals.map((goal) =>
            goal.id === goalId
              ? {
                  ...goal,
                  achieved: !goal.achieved,
                  achievedAt: goal.achieved ? undefined : new Date().toISOString().slice(0, 10),
                }
              : goal,
          ),
        }));
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
