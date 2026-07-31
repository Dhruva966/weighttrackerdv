import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  isBoardBaselineSession,
  starterExercises,
  starterGoals,
  starterSets,
} from '../data/catalog';
import { pdfIconUrl } from '../data/pdfIconSlugs';
import { toDayKey } from '../lib/calendar';
import { slugify } from '../lib/fmt';
import { getDeviceTimeZone } from '../lib/local-day';
import { formatImportedSessionNotes, parseBrainDump } from '../lib/liftImport';
import { parseExerciseLogSmart } from '../lib/exercise-log-parse';
import { isPersonalRecord } from '../lib/pr';
import { deleteSyncedSet, syncExercise, syncGoal, syncSession, syncSet } from '../lib/supabase-sync';
import type { RemoteSnapshot } from '../lib/supabase-hydrate';
import { USER_ID } from '../lib/user';
import type { SessionSnapshot } from '../lib/session-history';
import type { EquipmentKind, Exercise, Goal, LoggedSet, MuscleGroup, WorkoutSession } from '../types';
import { usePrStore } from './prStore';

/** Prefer OCR-cropped IMG_3417.pdf icons over FEDB/remote stock when a verified pair exists. */
function withPdfIcon(exercise: Exercise): Exercise {
  const url = pdfIconUrl(exercise.slug, exercise.equipment);
  if (!url) return exercise;
  return { ...exercise, imageUrl: url, imageStyle: 'photo' };
}

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
  /** Updates metadata in place. Keeps `id` and `slug` stable so set FKs and Library routes stay valid. */
  updateExercise: (id: string, input: ExerciseInput) => Exercise | undefined;
  importLiftDump: (text: string) => { imported: number; notes: number; skipped: string[] };
  setSessionPlan: (sessionId: string, exerciseIds: string[]) => void;
  /** Replaces plan + session sets from an undo/redo snapshot (other sessions untouched). */
  restoreSessionSnapshot: (sessionId: string, snapshot: SessionSnapshot) => void;
  logExerciseNotes: (
    sessionId: string,
    exerciseId: string,
    text: string,
  ) => Promise<{ imported: number; notes: string[] }>;
  clearHistory: () => void;
  toggleGoal: (goalId: string) => void;
  /** One-way remote-fills-gaps merge. Never overwrites local rows; safe to call repeatedly. */
  hydrateFromRemote: (remote: RemoteSnapshot) => void;
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

/**
 * Remote hydration only fills gaps — local always wins on conflict. Local state may hold an
 * optimistic edit that hasn't finished syncing up yet, so a remote row must never clobber it.
 * Union-by-id also makes hydration idempotent: replaying the same remote snapshot never duplicates.
 */
function unionPreferLocal<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const localIds = new Set(local.map((item) => item.id));
  const additions = remote.filter((item) => !localIds.has(item.id));
  return additions.length > 0 ? [...local, ...additions] : local;
}

/**
 * Prefer local exercise identity on id/slug conflicts (board starter + pdf-import must not
 * double). Gap-fill imageUrl/imageStyle from remote when the local row has no photo — that is
 * how Supabase `exercise-images` backfills reach Library without hardcoding starter URLs.
 * Verified IMG_3417.pdf crops always win over remote FEDB stock for the same slug.
 */
function unionExercisesPreferLocal(local: Exercise[], remote: Exercise[]): Exercise[] {
  const remoteById = new Map(remote.map((item) => [item.id, item]));
  const remoteBySlug = new Map(remote.map((item) => [item.slug, item]));

  const merged = local.map((item) => {
    const remoteMatch = remoteById.get(item.id) ?? remoteBySlug.get(item.slug);
    if (!remoteMatch || item.imageUrl || !remoteMatch.imageUrl) {
      return withPdfIcon(item);
    }
    return withPdfIcon({
      ...item,
      imageUrl: remoteMatch.imageUrl,
      imageStyle: remoteMatch.imageStyle ?? 'photo',
    });
  });

  const localIds = new Set(merged.map((item) => item.id));
  const localSlugs = new Set(merged.map((item) => item.slug));
  const additions = remote
    .filter((item) => !localIds.has(item.id) && !localSlugs.has(item.slug))
    .map(withPdfIcon);
  return additions.length > 0 ? [...merged, ...additions] : merged;
}

function mergeExercises(required: Exercise[], persisted: Exercise[] | undefined): Exercise[] {
  const starterIds = new Set(required.map((item) => item.id));
  const persistedById = new Map((persisted ?? []).map((item) => [item.id, item]));
  const merged = required.map((item) => {
    const stored = persistedById.get(item.id);
    const base = stored
      ? {
          ...item,
          archived: stored.archived,
          imageUrl: stored.imageUrl ?? item.imageUrl,
          imageStyle: stored.imageUrl ? stored.imageStyle : item.imageStyle,
        }
      : item;
    return withPdfIcon(base);
  });

  return [
    ...merged,
    ...(persisted ?? []).filter((item) => !starterIds.has(item.id)).map(withPdfIcon),
  ];
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

/** Next free slug for a display name — never collide with an existing catalog row. */
export function uniqueExerciseSlug(name: string, existing: Array<Pick<Exercise, 'slug'>>): string {
  const base = slugify(name) || 'exercise';
  const taken = new Set(existing.map((item) => item.slug));
  if (!taken.has(base)) {
    return base;
  }
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
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
        const startedAt = options?.startedAt ?? new Date().toISOString();
        const timezone = getDeviceTimeZone();
        const session: WorkoutSession = {
          id: newId(),
          userId: USER_ID,
          startedAt,
          localDate: toDayKey(startedAt, timezone),
          timezone,
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
          localDate: session.localDate,
          timezone: session.timezone,
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
        // Unique slug is required for Supabase (`exercises.slug` unique) and Library detail routes.
        // Colliding with a starter/pdf-import slug used to 409 the upsert, so creates looked
        // "UI-only" after refresh when the queued write never landed.
        const slug = uniqueExerciseSlug(input.name, get().exercises);
        const exercise: Exercise = {
          id: newId(),
          slug,
          name: input.name.trim(),
          muscleGroup: input.muscleGroup,
          secondaryMuscles: [],
          equipment: input.equipment,
          instructions: [],
          setupNotes: input.setupNotes ?? [],
          imageUrl: input.imageUrl,
          imageStyle: input.imageUrl ? 'photo' : 'name-only',
          source: 'user-created',
          archived: false,
        };
        set((state) => ({ exercises: [exercise, ...state.exercises] }));
        void syncExercise(exercise);
        return exercise;
      },
      updateExercise: (id, input) => {
        const existing = get().exercises.find((item) => item.id === id);
        if (!existing) {
          return undefined;
        }

        // Keep id + slug stable: sets/templates FK by id; Library/detail routes use slug.
        // Renames update display name only so bookmarks and uniqueness stay intact.
        const nextImageUrl = input.imageUrl !== undefined ? input.imageUrl : existing.imageUrl;
        const exercise: Exercise = {
          ...existing,
          name: input.name.trim(),
          muscleGroup: input.muscleGroup,
          equipment: input.equipment,
          setupNotes: input.setupNotes ?? [],
          imageUrl: nextImageUrl,
          imageStyle: nextImageUrl ? (existing.imageStyle === 'name-only' ? 'photo' : existing.imageStyle) : 'name-only',
        };
        set((state) => ({
          exercises: state.exercises.map((item) => (item.id === id ? exercise : item)),
        }));
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

            const exerciseSets = nextSets.filter(
              (setItem) =>
                setItem.sessionId === importSession.id && setItem.exerciseId === exercise.id,
            );
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
      restoreSessionSnapshot: (sessionId, snapshot) => {
        const state = get();
        const previousSessionSets = state.sets.filter((setItem) => setItem.sessionId === sessionId);
        const otherSets = state.sets.filter((setItem) => setItem.sessionId !== sessionId);
        const nextSessionSets = snapshot.sets.map((setItem) => ({ ...setItem, sessionId }));

        const exerciseIds = new Set([
          ...previousSessionSets.map((setItem) => setItem.exerciseId),
          ...nextSessionSets.map((setItem) => setItem.exerciseId),
        ]);

        let nextSets = [...otherSets, ...nextSessionSets];
        for (const exerciseId of exerciseIds) {
          nextSets = recalculateExercisePrFlags(nextSets, exerciseId);
        }

        set({
          sessions: state.sessions.map((session) =>
            session.id === sessionId
              ? { ...session, plannedExerciseIds: [...snapshot.plannedExerciseIds] }
              : session,
          ),
          sets: nextSets,
        });

        const session = get().sessions.find((item) => item.id === sessionId);
        if (session) {
          void syncSession(session);
        }

        const nextIds = new Set(nextSessionSets.map((setItem) => setItem.id));
        for (const removed of previousSessionSets) {
          if (!nextIds.has(removed.id)) {
            void deleteSyncedSet(removed.id);
          }
        }
        for (const setItem of nextSets) {
          if (setItem.sessionId !== sessionId) {
            continue;
          }
          void syncSet(setItem);
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
      hydrateFromRemote: (remote) => {
        set((state) => ({
          exercises: unionExercisesPreferLocal(state.exercises, remote.exercises),
          sessions: unionPreferLocal(state.sessions, remote.sessions),
          sets: unionPreferLocal(state.sets, remote.sets),
          goals: unionPreferLocal(state.goals, remote.goals),
        }));
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
