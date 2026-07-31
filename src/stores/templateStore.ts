import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { remapExerciseId } from '../data/exercise-merges';
import { calendarDayToStartedAt, findDaySession, toDayKey } from '../lib/calendar';
import { getDeviceTimeZone } from '../lib/local-day';
import type { RemoteTemplateSnapshot } from '../lib/supabase-hydrate';
import {
  deleteSyncedTemplate,
  deleteSyncedTemplateExercise,
  syncTemplate,
  syncTemplateExercise,
} from '../lib/supabase-sync';
import { USER_ID } from '../lib/user';
import type { Template, TemplateExercise } from '../types';
import { useWorkoutStore } from './workoutStore';

const MOVE_TIMEZONE = getDeviceTimeZone();

function newId(): string {
  return crypto.randomUUID();
}

function unionPreferLocal<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const localIds = new Set(local.map((item) => item.id));
  const additions = remote.filter((item) => !localIds.has(item.id));
  return additions.length > 0 ? [...local, ...additions] : local;
}

export type StartWorkoutOptions = {
  /** Apply into an existing session (e.g. Session page / past-day backfill). */
  sessionId?: string;
  /** Calendar day to find/create when no sessionId is given. Defaults to today. */
  dayKey?: string;
};

/**
 * Reuses the target day's open session (Move is day-centric — one workout per day) and appends
 * these exercises to its plan. Shared by saved templates and read-only starters,
 * which start a workout without ever materializing a persisted Template record.
 *
 * Pass `sessionId` to apply onto a specific workout (including past calendar days). Pass `dayKey`
 * to backfill a forgotten day without jumping to today.
 */
export function startWorkoutWithExercises(
  exerciseIds: string[],
  options: StartWorkoutOptions = {},
): string | null {
  if (exerciseIds.length === 0) {
    return null;
  }

  const workout = useWorkoutStore.getState();
  let sessionId = options.sessionId;

  if (sessionId) {
    const target = workout.sessions.find((item) => item.id === sessionId);
    if (!target) {
      return null;
    }
    if (target.endedAt) {
      workout.reopenSession(target.id);
    }
  } else {
    const dayKey = options.dayKey ?? toDayKey(new Date(), MOVE_TIMEZONE);
    const existing = findDaySession(
      dayKey,
      workout.sessions.map((session) => ({
        id: session.id,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        notes: session.notes,
      })),
      { timeZone: MOVE_TIMEZONE },
    );

    if (existing) {
      if (existing.endedAt) {
        workout.reopenSession(existing.id);
      }
      sessionId = existing.id;
    } else {
      const session = workout.createSession({ startedAt: calendarDayToStartedAt(dayKey, MOVE_TIMEZONE) });
      sessionId = session.id;
    }
  }

  const session = useWorkoutStore.getState().sessions.find((item) => item.id === sessionId);
  const existingPlan = session?.plannedExerciseIds ?? [];
  const mergedPlan = [...existingPlan, ...exerciseIds.filter((id) => !existingPlan.includes(id))];
  workout.setSessionPlan(sessionId, mergedPlan);

  return sessionId;
}

type TemplateState = {
  templates: Template[];
  templateExercises: TemplateExercise[];
  exercisesFor: (templateId: string) => string[];
  createTemplate: (name: string, exerciseIds?: string[]) => Template;
  updateTemplateName: (templateId: string, name: string) => void;
  deleteTemplate: (templateId: string) => void;
  duplicateTemplate: (templateId: string, name?: string) => Template | null;
  /** Full reconcile: adds missing exercises, drops removed ones, repositions the rest. One atomic commit. */
  setTemplateExercises: (templateId: string, orderedExerciseIds: string[]) => void;
  /** Reuses the target day's session (or a given sessionId) and appends this template's exercises. */
  startWorkoutFromTemplate: (templateId: string, options?: StartWorkoutOptions) => string | null;
  /** Builds a template from a session's exercises in first-logged order, falling back to its planned exercises. */
  saveSessionAsTemplate: (sessionId: string, name: string) => Template | null;
  hydrateFromRemote: (remote: RemoteTemplateSnapshot) => void;
};

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      templates: [],
      templateExercises: [],
      exercisesFor: (templateId) =>
        get()
          .templateExercises.filter((item) => item.templateId === templateId)
          .sort((a, b) => a.position - b.position)
          .map((item) => item.exerciseId),
      createTemplate: (name, exerciseIds = []) => {
        const now = new Date().toISOString();
        const template: Template = { id: newId(), userId: USER_ID, name, createdAt: now, updatedAt: now };
        const templateExercises: TemplateExercise[] = exerciseIds.map((exerciseId, index) => ({
          id: newId(),
          templateId: template.id,
          exerciseId,
          position: index,
          createdAt: now,
        }));

        set((state) => ({
          templates: [template, ...state.templates],
          templateExercises: [...state.templateExercises, ...templateExercises],
        }));

        void syncTemplate(template);
        for (const templateExercise of templateExercises) {
          void syncTemplateExercise(templateExercise);
        }

        return template;
      },
      updateTemplateName: (templateId, name) => {
        const updated = get().templates.find((item) => item.id === templateId);
        if (!updated) {
          return;
        }
        const next: Template = { ...updated, name, updatedAt: new Date().toISOString() };
        set((state) => ({
          templates: state.templates.map((item) => (item.id === templateId ? next : item)),
        }));
        void syncTemplate(next);
      },
      deleteTemplate: (templateId) => {
        const removedExerciseIds = get()
          .templateExercises.filter((item) => item.templateId === templateId)
          .map((item) => item.id);

        set((state) => ({
          templates: state.templates.filter((item) => item.id !== templateId),
          templateExercises: state.templateExercises.filter((item) => item.templateId !== templateId),
        }));

        void deleteSyncedTemplate(templateId);
        for (const templateExerciseId of removedExerciseIds) {
          void deleteSyncedTemplateExercise(templateExerciseId);
        }
      },
      duplicateTemplate: (templateId, name) => {
        const source = get().templates.find((item) => item.id === templateId);
        if (!source) {
          return null;
        }
        const exerciseIds = get().exercisesFor(templateId);
        return get().createTemplate(name ?? `${source.name} copy`, exerciseIds);
      },
      setTemplateExercises: (templateId, orderedExerciseIds) => {
        const now = new Date().toISOString();
        const current = get().templateExercises.filter((item) => item.templateId === templateId);
        const currentByExerciseId = new Map(current.map((item) => [item.exerciseId, item]));

        const next: TemplateExercise[] = orderedExerciseIds.map((exerciseId, index) => {
          const existing = currentByExerciseId.get(exerciseId);
          return existing ? { ...existing, position: index } : { id: newId(), templateId, exerciseId, position: index, createdAt: now };
        });
        const removed = current.filter((item) => !orderedExerciseIds.includes(item.exerciseId));

        set((state) => ({
          templateExercises: [...state.templateExercises.filter((item) => item.templateId !== templateId), ...next],
        }));

        for (const templateExercise of next) {
          void syncTemplateExercise(templateExercise);
        }
        for (const removedItem of removed) {
          void deleteSyncedTemplateExercise(removedItem.id);
        }
      },
      startWorkoutFromTemplate: (templateId, options) =>
        startWorkoutWithExercises(get().exercisesFor(templateId), options),
      saveSessionAsTemplate: (sessionId, name) => {
        const workout = useWorkoutStore.getState();
        const session = workout.sessions.find((item) => item.id === sessionId);
        const sessionSets = workout.sets
          .filter((item) => item.sessionId === sessionId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

        const orderedExerciseIds: string[] = [];
        for (const setItem of sessionSets) {
          if (!orderedExerciseIds.includes(setItem.exerciseId)) {
            orderedExerciseIds.push(setItem.exerciseId);
          }
        }

        const exerciseIds = orderedExerciseIds.length > 0 ? orderedExerciseIds : session?.plannedExerciseIds ?? [];
        if (exerciseIds.length === 0) {
          return null;
        }

        return get().createTemplate(name, exerciseIds);
      },
      hydrateFromRemote: (remote) => {
        set((state) => ({
          templates: unionPreferLocal(state.templates, remote.templates),
          templateExercises: unionPreferLocal(state.templateExercises, remote.templateExercises),
        }));
      },
    }),
    {
      name: 'weight-tracker-templates',
      merge: (persisted, current) => {
        const stored = persisted as Partial<{ templates: Template[]; templateExercises: TemplateExercise[] }> | undefined;
        const exercises = useWorkoutStore.getState().exercises;
        const remapped = (stored?.templateExercises ?? current.templateExercises).map((item) => ({
          ...item,
          exerciseId: remapExerciseId(item.exerciseId, exercises),
        }));
        // Drop duplicate template↔exercise links created when two slugs collapsed to one id.
        const seen = new Set<string>();
        const templateExercises = remapped.filter((item) => {
          const key = `${item.templateId}:${item.exerciseId}`;
          if (seen.has(key)) {
            return false;
          }
          seen.add(key);
          return true;
        });
        return {
          ...current,
          ...stored,
          templates: stored?.templates ?? current.templates,
          templateExercises,
        };
      },
    },
  ),
);
