import { beforeEach, describe, expect, it, vi } from 'vitest';
import { starterExercises, starterGoals, starterSets } from '../data/catalog';
import * as supabaseSync from '../lib/supabase-sync';
import { BOARD_HISTORY_SEED_VERSION, useWorkoutStore } from './workoutStore';
import { startWorkoutWithExercises, useTemplateStore } from './templateStore';

function resetStores() {
  useTemplateStore.setState({ templates: [], templateExercises: [] });
  useWorkoutStore.setState({
    exercises: starterExercises,
    goals: starterGoals,
    sessions: [],
    sets: starterSets,
    historyCleared: false,
    boardHistorySeedVersion: BOARD_HISTORY_SEED_VERSION,
  });
}

describe('templateStore', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStores();
    vi.spyOn(supabaseSync, 'syncTemplate').mockResolvedValue(undefined);
    vi.spyOn(supabaseSync, 'syncTemplateExercise').mockResolvedValue(undefined);
    vi.spyOn(supabaseSync, 'deleteSyncedTemplate').mockResolvedValue(undefined);
    vi.spyOn(supabaseSync, 'deleteSyncedTemplateExercise').mockResolvedValue(undefined);
  });

  describe('createTemplate', () => {
    it('creates a template with ordered exercises and syncs both', () => {
      const [first, second] = starterExercises;
      const template = useTemplateStore.getState().createTemplate('Push Day', [first.id, second.id]);

      expect(useTemplateStore.getState().templates[0].id).toBe(template.id);
      expect(useTemplateStore.getState().exercisesFor(template.id)).toEqual([first.id, second.id]);
      expect(supabaseSync.syncTemplate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Push Day' }));
      expect(supabaseSync.syncTemplateExercise).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateTemplateName', () => {
    it('renames a template and bumps updatedAt', () => {
      const template = useTemplateStore.getState().createTemplate('Push Day', []);
      const before = template.updatedAt;

      useTemplateStore.getState().updateTemplateName(template.id, 'Push Day v2');

      const updated = useTemplateStore.getState().templates.find((item) => item.id === template.id);
      expect(updated?.name).toBe('Push Day v2');
      expect(updated?.updatedAt >= before).toBe(true);
    });
  });

  describe('deleteTemplate', () => {
    it('removes the template and its exercises, syncing both deletes', () => {
      const exerciseId = starterExercises[0].id;
      const template = useTemplateStore.getState().createTemplate('Push Day', [exerciseId]);

      useTemplateStore.getState().deleteTemplate(template.id);

      expect(useTemplateStore.getState().templates.some((item) => item.id === template.id)).toBe(false);
      expect(useTemplateStore.getState().templateExercises.some((item) => item.templateId === template.id)).toBe(
        false,
      );
      expect(supabaseSync.deleteSyncedTemplate).toHaveBeenCalledWith(template.id);
      expect(supabaseSync.deleteSyncedTemplateExercise).toHaveBeenCalled();
    });
  });

  describe('duplicateTemplate', () => {
    it('clones a template with new ids and a default "copy" name', () => {
      const exerciseId = starterExercises[0].id;
      const original = useTemplateStore.getState().createTemplate('Push Day', [exerciseId]);

      const copy = useTemplateStore.getState().duplicateTemplate(original.id);

      expect(copy).not.toBeNull();
      expect(copy!.id).not.toBe(original.id);
      expect(copy!.name).toBe('Push Day copy');
      expect(useTemplateStore.getState().exercisesFor(copy!.id)).toEqual([exerciseId]);
    });

    it('returns null for an unknown template', () => {
      expect(useTemplateStore.getState().duplicateTemplate('missing')).toBeNull();
    });
  });

  describe('setTemplateExercises', () => {
    it('adds, removes, and repositions in one reconcile', () => {
      const [a, b, c] = starterExercises;
      const template = useTemplateStore.getState().createTemplate('Push Day', [a.id, b.id]);

      useTemplateStore.getState().setTemplateExercises(template.id, [b.id, c.id]);

      expect(useTemplateStore.getState().exercisesFor(template.id)).toEqual([b.id, c.id]);
    });

    it('is a no-op-safe reorder when the same ids are re-passed', () => {
      const [a, b] = starterExercises;
      const template = useTemplateStore.getState().createTemplate('Push Day', [a.id, b.id]);

      useTemplateStore.getState().setTemplateExercises(template.id, [b.id, a.id]);

      expect(useTemplateStore.getState().exercisesFor(template.id)).toEqual([b.id, a.id]);
      expect(useTemplateStore.getState().templateExercises).toHaveLength(2);
    });
  });

  describe('startWorkoutFromTemplate / startWorkoutWithExercises', () => {
    it('creates a session and plans the template exercises when no session exists today', () => {
      const [a, b] = starterExercises;
      const template = useTemplateStore.getState().createTemplate('Push Day', [a.id, b.id]);

      const sessionId = useTemplateStore.getState().startWorkoutFromTemplate(template.id);

      expect(sessionId).not.toBeNull();
      const session = useWorkoutStore.getState().sessions.find((item) => item.id === sessionId);
      expect(session?.plannedExerciseIds).toEqual([a.id, b.id]);
    });

    it('dedupes to the same local-day session and merges plans instead of duplicating', () => {
      const [a, b] = starterExercises;
      const existingSession = useWorkoutStore.getState().createSession();
      useWorkoutStore.getState().setSessionPlan(existingSession.id, [a.id]);
      const template = useTemplateStore.getState().createTemplate('Pull Day', [b.id]);

      const sessionCountBefore = useWorkoutStore.getState().sessions.length;
      const sessionId = useTemplateStore.getState().startWorkoutFromTemplate(template.id);

      expect(sessionId).toBe(existingSession.id);
      expect(useWorkoutStore.getState().sessions).toHaveLength(sessionCountBefore);
      const session = useWorkoutStore.getState().sessions.find((item) => item.id === sessionId);
      expect(session?.plannedExerciseIds).toEqual([a.id, b.id]);
    });

    it('returns null for a template with no exercises', () => {
      const template = useTemplateStore.getState().createTemplate('Empty', []);
      expect(useTemplateStore.getState().startWorkoutFromTemplate(template.id)).toBeNull();
    });

    it('startWorkoutWithExercises powers example templates without creating a Template record', () => {
      const exerciseId = starterExercises[0].id;
      const templatesBefore = useTemplateStore.getState().templates.length;

      const sessionId = startWorkoutWithExercises([exerciseId]);

      expect(sessionId).not.toBeNull();
      expect(useTemplateStore.getState().templates).toHaveLength(templatesBefore);
    });

    it('applies exercises onto a specific past-day session without creating today', () => {
      const [a, b] = starterExercises;
      const past = useWorkoutStore.getState().createSession({
        startedAt: '2026-07-29T18:00:00-07:00',
      });
      useWorkoutStore.getState().setSessionPlan(past.id, [a.id]);
      const sessionCountBefore = useWorkoutStore.getState().sessions.length;

      const sessionId = startWorkoutWithExercises([b.id], { sessionId: past.id });

      expect(sessionId).toBe(past.id);
      expect(useWorkoutStore.getState().sessions).toHaveLength(sessionCountBefore);
      expect(
        useWorkoutStore.getState().sessions.find((item) => item.id === past.id)?.plannedExerciseIds,
      ).toEqual([a.id, b.id]);
    });

    it('creates or reuses a session for an explicit past dayKey when backfilling', () => {
      const [a, b] = starterExercises;
      const dayKey = '2026-07-29';

      const sessionId = startWorkoutWithExercises([a.id], { dayKey });

      expect(sessionId).not.toBeNull();
      const session = useWorkoutStore.getState().sessions.find((item) => item.id === sessionId);
      expect(session?.localDate).toBe(dayKey);
      expect(session?.plannedExerciseIds).toEqual([a.id]);

      const again = startWorkoutWithExercises([b.id], { dayKey });
      expect(again).toBe(sessionId);
      expect(
        useWorkoutStore.getState().sessions.find((item) => item.id === sessionId)?.plannedExerciseIds,
      ).toEqual([a.id, b.id]);
    });
  });

  describe('saveSessionAsTemplate', () => {
    it('builds a template from logged sets in first-logged order', () => {
      const [a, b] = starterExercises;
      const session = useWorkoutStore.getState().createSession();
      useWorkoutStore.getState().addSet({ sessionId: session.id, exerciseId: b.id, weightLb: 50, reps: 8, isWarmup: false });
      useWorkoutStore.getState().addSet({ sessionId: session.id, exerciseId: a.id, weightLb: 60, reps: 8, isWarmup: false });

      const template = useTemplateStore.getState().saveSessionAsTemplate(session.id, 'From today');

      expect(template).not.toBeNull();
      expect(useTemplateStore.getState().exercisesFor(template!.id)).toEqual([b.id, a.id]);
    });

    it('falls back to planned exercises when no sets are logged yet', () => {
      const [a] = starterExercises;
      const session = useWorkoutStore.getState().createSession();
      useWorkoutStore.getState().setSessionPlan(session.id, [a.id]);

      const template = useTemplateStore.getState().saveSessionAsTemplate(session.id, 'Planned only');

      expect(template).not.toBeNull();
      expect(useTemplateStore.getState().exercisesFor(template!.id)).toEqual([a.id]);
    });

    it('returns null when there is nothing to save', () => {
      const session = useWorkoutStore.getState().createSession();
      expect(useTemplateStore.getState().saveSessionAsTemplate(session.id, 'Nothing')).toBeNull();
    });
  });

  describe('hydrateFromRemote', () => {
    it('adds remote-only templates without touching local ones (idempotent, local wins)', () => {
      const local = useTemplateStore.getState().createTemplate('Local', [starterExercises[0].id]);
      const remoteTemplate = {
        id: crypto.randomUUID(),
        userId: 'user-1',
        name: 'Remote',
        createdAt: '2026-07-01T00:00:00.000Z',
        updatedAt: '2026-07-01T00:00:00.000Z',
      };
      const remoteTemplateExercise = {
        id: crypto.randomUUID(),
        templateId: remoteTemplate.id,
        exerciseId: starterExercises[1].id,
        position: 0,
        createdAt: '2026-07-01T00:00:00.000Z',
      };
      const remote = { templates: [remoteTemplate], templateExercises: [remoteTemplateExercise] };

      useTemplateStore.getState().hydrateFromRemote(remote);
      useTemplateStore.getState().hydrateFromRemote(remote);

      const state = useTemplateStore.getState();
      expect(state.templates.find((item) => item.id === local.id)?.name).toBe('Local');
      expect(state.templates.filter((item) => item.id === remoteTemplate.id)).toHaveLength(1);
      expect(state.exercisesFor(remoteTemplate.id)).toEqual([starterExercises[1].id]);
    });
  });
});
