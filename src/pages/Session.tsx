import { ChevronDown, ChevronLeft, ChevronUp, Pencil, Redo2, Undo2, X } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ExerciseImage } from '../components/ExerciseImage';
import { ExercisePicker } from '../components/ExercisePicker';
import { MovementLogger } from '../components/MovementLogger';
import { NaturalLanguageSetLogger } from '../components/NaturalLanguageSetLogger';
import { RestTimer } from '../components/RestTimer';
import { TemplateCard } from '../components/TemplateCard';
import { exampleTemplates, resolveExampleTemplateExerciseIds } from '../data/example-templates';
import { toDayKey } from '../lib/calendar';
import { formatDayKeyLabel, getDeviceTimeZone, sessionDayKey } from '../lib/local-day';
import { useSessionHistoryStore } from '../stores/sessionHistoryStore';
import { startWorkoutWithExercises, useTemplateStore } from '../stores/templateStore';
import { useUiStore } from '../stores/uiStore';
import { useWorkoutStore } from '../stores/workoutStore';
import type { Exercise, MuscleGroup, WorkoutSession } from '../types';

const muscleGroupLabels: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  biceps: 'Biceps',
  triceps: 'Triceps',
  legs: 'Legs',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  forearms: 'Forearms',
  'full-body': 'Full body',
  cardio: 'Cardio',
};

const EMPTY_PLAN: string[] = [];

function sessionCalendarDay(session: Pick<WorkoutSession, 'startedAt' | 'localDate' | 'timezone'>): string {
  return sessionDayKey(session, getDeviceTimeZone());
}

function sessionDayLabel(startedAt: string, localDate?: string, timezone?: string): string {
  const dayKey = sessionDayKey({ startedAt, localDate, timezone }, getDeviceTimeZone());
  const todayKey = toDayKey(new Date(), getDeviceTimeZone());
  if (dayKey === todayKey) {
    return "Today's workout";
  }
  return formatDayKeyLabel(dayKey, { weekday: 'short', month: 'short' });
}

/** Fallback when there is no in-app history (deep link / refresh). Past days → Grow; today → Move. */
export function sessionBackFallbackPath(
  session: Pick<WorkoutSession, 'startedAt' | 'localDate' | 'timezone'>,
): string {
  const todayKey = toDayKey(new Date(), getDeviceTimeZone());
  return sessionCalendarDay(session) === todayKey ? '/move' : '/grow';
}

/**
 * Clears planned exercises that have no logged sets. Exercises with sets stay on the plan
 * unless the user confirms removing them (sets are never deleted).
 */
export function nextPlanAfterClear(
  plannedIds: string[],
  loggedExerciseIds: ReadonlySet<string>,
  confirmClearWithSets: () => boolean = () => window.confirm(
    'All planned exercises have logged sets. Remove them from the plan? Your logged sets will stay.',
  ),
): string[] | null {
  if (plannedIds.length === 0) {
    return null;
  }

  const withSets = plannedIds.filter((id) => loggedExerciseIds.has(id));
  const withoutSets = plannedIds.filter((id) => !loggedExerciseIds.has(id));

  if (withSets.length === 0) {
    return [];
  }

  if (withoutSets.length > 0) {
    return withSets;
  }

  return confirmClearWithSets() ? [] : null;
}

export function Session() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const sessions = useWorkoutStore((state) => state.sessions);
  const sets = useWorkoutStore((state) => state.sets);
  const exercises = useWorkoutStore((state) => state.exercises);
  const reopenSession = useWorkoutStore((state) => state.reopenSession);
  const setSessionPlan = useWorkoutStore((state) => state.setSessionPlan);
  const templates = useTemplateStore((state) => state.templates);
  const exercisesFor = useTemplateStore((state) => state.exercisesFor);
  const startWorkoutFromTemplate = useTemplateStore((state) => state.startWorkoutFromTemplate);
  const saveSessionAsTemplate = useTemplateStore((state) => state.saveSessionAsTemplate);
  const createTemplate = useTemplateStore((state) => state.createTemplate);
  const showPreviewNotice = useUiStore((state) => state.showPreviewNotice);
  const commitEdit = useSessionHistoryStore((state) => state.commitEdit);
  const undoEdit = useSessionHistoryStore((state) => state.undo);
  const redoEdit = useSessionHistoryStore((state) => state.redo);
  const canUndo = useSessionHistoryStore((state) => state.canUndo(sessionId));
  const canRedo = useSessionHistoryStore((state) => state.canRedo(sessionId));
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [lastSetKey, setLastSetKey] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const session = sessions.find((item) => item.id === sessionId);
  const sessionSets = sets.filter((setItem) => setItem.sessionId === sessionId);
  const plannedIds = session?.plannedExerciseIds ?? EMPTY_PLAN;

  const plannedExercises = useMemo(() => {
    const fromPlan = plannedIds
      .map((id) => exercises.find((exercise) => exercise.id === id))
      .filter((exercise): exercise is Exercise => Boolean(exercise));
    const loggedIds = new Set(sessionSets.map((setItem) => setItem.exerciseId));
    const extras = exercises.filter(
      (exercise) => loggedIds.has(exercise.id) && !plannedIds.includes(exercise.id),
    );
    return [...fromPlan, ...extras];
  }, [exercises, plannedIds, sessionSets]);

  const groupedExercises = useMemo(() => {
    const groups = new Map<MuscleGroup, Exercise[]>();
    for (const exercise of plannedExercises) {
      const bucket = groups.get(exercise.muscleGroup) ?? [];
      bucket.push(exercise);
      groups.set(exercise.muscleGroup, bucket);
    }
    return [...groups.entries()];
  }, [plannedExercises]);

  useEffect(() => {
    if (session?.endedAt) {
      reopenSession(session.id);
    }
  }, [reopenSession, session?.endedAt, session?.id]);

  useEffect(() => {
    const lastSet = sessionSets.at(-1);
    if (lastSet) {
      setLastSetKey(lastSet.id);
    }
  }, [sessionSets]);

  if (!session) {
    return <p className="text-fgMuted">Session not found.</p>;
  }

  function exerciseName(id: string): string {
    return exercises.find((exercise) => exercise.id === id)?.name ?? 'Exercise';
  }

  function updatePlan(nextExercises: Exercise[], label: string) {
    commitEdit(session.id, label, () => {
      setSessionPlan(
        session.id,
        nextExercises.map((exercise) => exercise.id),
      );
    });
  }

  function addExercise(exercise: Exercise) {
    if (plannedExercises.some((item) => item.id === exercise.id)) {
      return;
    }
    updatePlan([...plannedExercises, exercise], `Added ${exercise.name}`);
    setExpandedExerciseId(exercise.id);
    showPreviewNotice(`Added ${exercise.name}`);
  }

  function removeExercise(exerciseId: string) {
    const name = exerciseName(exerciseId);
    const inPlan = plannedIds.includes(exerciseId);
    const loggedForExercise = sessionSets.filter((setItem) => setItem.exerciseId === exerciseId);

    // Logged-only extras are not on the plan — filtering plannedExercises would be a no-op
    // (or worse, promote other extras into the plan). Delete sets to hide them.
    if (!inPlan) {
      if (loggedForExercise.length === 0) {
        return;
      }
      if (
        !window.confirm(
          `Remove ${name} and delete its ${loggedForExercise.length} logged set${
            loggedForExercise.length === 1 ? '' : 's'
          } from this workout?`,
        )
      ) {
        return;
      }
      const changed = commitEdit(session.id, `Removed ${name}`, () => {
        for (const setItem of loggedForExercise) {
          useWorkoutStore.getState().removeSet(setItem.id);
        }
      });
      if (!changed) {
        return;
      }
      if (expandedExerciseId === exerciseId) {
        setExpandedExerciseId(null);
      }
      showPreviewNotice(`Removed ${name}`);
      return;
    }

    if (loggedForExercise.length > 0) {
      if (
        !window.confirm(
          `Remove ${name} from the plan? Logged sets will stay and this exercise will still appear.`,
        )
      ) {
        return;
      }
    }

    // Only touch plannedExerciseIds — never rebuild from plannedExercises (includes extras).
    commitEdit(session.id, `Removed ${name}`, () => {
      setSessionPlan(
        session.id,
        plannedIds.filter((id) => id !== exerciseId),
      );
    });
    if (expandedExerciseId === exerciseId) {
      setExpandedExerciseId(null);
    }
    showPreviewNotice(`Removed ${name}`);
  }

  function clearPlan() {
    const loggedExerciseIds = new Set(sessionSets.map((setItem) => setItem.exerciseId));
    const next = nextPlanAfterClear(plannedIds, loggedExerciseIds);
    if (next === null) {
      return;
    }

    const notice =
      next.length === 0
        ? 'Cleared planned exercises'
        : `Cleared ${plannedIds.length - next.length} unused exercise${plannedIds.length - next.length === 1 ? '' : 's'}`;

    commitEdit(session.id, notice, () => {
      setSessionPlan(session.id, next);
    });
    setExpandedExerciseId(null);
    setShowSaveTemplate(false);
    showPreviewNotice(notice);
  }

  function handleUndo() {
    const entry = undoEdit(session.id);
    if (entry) {
      showPreviewNotice(`Undid: ${entry.label}`);
    }
  }

  function handleRedo() {
    const entry = redoEdit(session.id);
    if (entry) {
      showPreviewNotice(`Redid: ${entry.label}`);
    }
  }

  function handleBack() {
    const from = (location.state as { from?: unknown } | null)?.from;
    if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) {
      navigate(from);
      return;
    }

    const historyIndex = (window.history.state as { idx?: number } | null)?.idx;
    if (typeof historyIndex === 'number' && historyIndex > 0) {
      navigate(-1);
      return;
    }

    navigate(sessionBackFallbackPath(session));
  }

  function applyTemplateExercises(exerciseIds: string[]) {
    const changed = commitEdit(session.id, 'Added template exercises', () => {
      startWorkoutWithExercises(exerciseIds, { sessionId: session.id });
    });
    if (changed) {
      const firstNew = exerciseIds.find((id) => !plannedExercises.some((item) => item.id === id));
      if (firstNew) {
        setExpandedExerciseId(firstNew);
      }
      showPreviewNotice('Added template exercises');
    }
  }

  function handleApplySavedTemplate(templateId: string) {
    const ids = exercisesFor(templateId);
    const changed = commitEdit(session.id, 'Added template exercises', () => {
      startWorkoutFromTemplate(templateId, { sessionId: session.id });
    });
    if (changed) {
      const firstNew = ids.find((id) => !plannedExercises.some((item) => item.id === id));
      if (firstNew) {
        setExpandedExerciseId(firstNew);
      }
      showPreviewNotice('Added template exercises');
    }
  }

  function handleSaveTemplate(event: FormEvent) {
    event.preventDefault();
    const name = templateName.trim();
    if (!name) {
      return;
    }
    // Prefer the visible planned order on this session; fall back to logged-first helper.
    const plannedOrder = plannedExercises.map((exercise) => exercise.id);
    const template =
      plannedOrder.length > 0
        ? createTemplate(name, plannedOrder)
        : saveSessionAsTemplate(session.id, name);
    if (template) {
      showPreviewNotice(`Saved "${template.name}" to your templates.`);
      setTemplateName('');
      setShowSaveTemplate(false);
    }
  }

  const title = sessionDayLabel(session.startedAt, session.localDate, session.timezone);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <button
          className="button-secondary inline-flex min-h-9 items-center gap-1.5"
          type="button"
          onClick={handleBack}
          aria-label="Back"
        >
          <ChevronLeft size={18} aria-hidden />
          Back
        </button>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {plannedExercises.length > 0 ? (
            <button
              className="button-secondary inline-flex min-h-9 items-center gap-1 px-2.5 text-sm"
              type="button"
              onClick={() => setShowSaveTemplate((current) => !current)}
            >
              {showSaveTemplate ? 'Cancel' : 'Save as template'}
            </button>
          ) : null}
          <button
            className="button-secondary inline-flex min-h-9 items-center gap-1 px-2.5 text-sm disabled:opacity-40"
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            aria-label="Undo"
          >
            <Undo2 size={15} strokeWidth={1.75} aria-hidden />
            Undo
          </button>
          <button
            className="button-secondary inline-flex min-h-9 items-center gap-1 px-2.5 text-sm disabled:opacity-40"
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            aria-label="Redo"
          >
            <Redo2 size={15} strokeWidth={1.75} aria-hidden />
            Redo
          </button>
          <Link className="button-secondary min-h-9" to="/move">
            Done
          </Link>
        </div>
      </div>

      {showSaveTemplate && plannedExercises.length > 0 ? (
        <form className="flex items-center gap-2" onSubmit={handleSaveTemplate}>
          <label className="min-w-0 flex-1">
            <span className="sr-only">Template name</span>
            <input
              className="field !h-9 !min-h-0 !rounded-xl px-3 text-sm"
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
              placeholder="e.g. Push Day"
              maxLength={60}
              autoFocus
            />
          </label>
          <button
            className="button-primary !min-h-9 px-3 text-sm"
            type="submit"
            disabled={!templateName.trim()}
          >
            Save
          </button>
        </form>
      ) : null}

      <div>
        <h1 className="page-title">{title}</h1>
        <p className="mt-1 text-sm text-fgMuted">
          Start from a template, or search and add exercises. Log sets in plain English.
        </p>
      </div>

      {sessionSets.length > 0 ? (
        <RestTimer activeKey={lastSetKey || sessionSets.at(-1)?.id || session.id} />
      ) : null}

      {/* 1. Your exercises — top */}
      <section className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-medium text-fg">
            {plannedExercises.length ? 'Your exercises' : 'No exercises yet'}
          </h2>
          {plannedIds.length > 0 ? (
            <button
              className="text-link min-h-9 shrink-0 text-sm"
              type="button"
              onClick={clearPlan}
            >
              Clear plan
            </button>
          ) : null}
        </div>

        {plannedExercises.length === 0 ? (
          <p className="app-card text-fgMuted">
            Pick a template below, or search to add everything you plan to train.
          </p>
        ) : (
          groupedExercises.map(([muscleGroup, groupExercises]) => (
            <div key={muscleGroup} className="grid gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-fgMuted">
                {muscleGroupLabels[muscleGroup]}
              </h3>
              {groupExercises.map((exercise) => {
                const exerciseSets = sessionSets.filter((setItem) => setItem.exerciseId === exercise.id);
                const isExpanded = expandedExerciseId === exercise.id;

                return (
                  <section key={exercise.id} className="app-card grid gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        type="button"
                        onClick={() => setExpandedExerciseId(isExpanded ? null : exercise.id)}
                      >
                        <ExerciseImage exercise={exercise} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-fg">{exercise.name}</p>
                          <p className="text-xs text-fgMuted">
                            {exerciseSets.length
                              ? `${exerciseSets.length} set${exerciseSets.length === 1 ? '' : 's'} logged`
                              : 'Tap to log'}
                          </p>
                        </div>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Link
                          className="icon-button"
                          to={`/exercises/${exercise.slug}/edit`}
                          state={{ from: `/session/${session.id}` }}
                          aria-label={`Edit ${exercise.name}`}
                        >
                          <Pencil size={15} strokeWidth={1.75} />
                        </Link>
                        <button
                          className="icon-button"
                          type="button"
                          aria-label={`Remove ${exercise.name}`}
                          onClick={() => removeExercise(exercise.id)}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    {isExpanded ? (
                      <NaturalLanguageSetLogger
                        exercise={exercise}
                        sessionId={session.id}
                        onEdit={async (label, run) => {
                          const changed = await useSessionHistoryStore
                            .getState()
                            .commitEditAsync(session.id, label, async () => {
                              await run();
                            });
                          if (changed) {
                            showPreviewNotice(label);
                          }
                        }}
                      />
                    ) : null}
                  </section>
                );
              })}
            </div>
          ))
        )}
      </section>

      {/* 2. Templates — apply to this session (including past-day backfill) */}
      <section className="grid gap-3 border-t border-border/70 pt-5" aria-labelledby="session-templates-heading">
        <div>
          <h2 id="session-templates-heading" className="text-lg font-medium text-fg">
            Templates
          </h2>
          <p className="mt-1 text-sm text-fgMuted">Add a planned set of exercises to this workout.</p>
        </div>

        {templates
          .filter((template) => exercisesFor(template.id).length > 0)
          .map((template) => (
            <TemplateCard
              key={template.id}
              name={template.name}
              exerciseNames={exercisesFor(template.id).map(exerciseName)}
              actionLabel="Add to workout"
              onStart={() => handleApplySavedTemplate(template.id)}
            />
          ))}
        {exampleTemplates.map((example) => (
          <TemplateCard
            key={example.id}
            name={example.name}
            exerciseNames={resolveExampleTemplateExerciseIds(example, exercises).map(exerciseName)}
            actionLabel="Add to workout"
            onStart={() => applyTemplateExercises(resolveExampleTemplateExerciseIds(example, exercises))}
          />
        ))}
      </section>

      {/* 3. Add exercises */}
      <section className="grid gap-3 border-t border-border/70 pt-5">
        <h2 className="text-lg font-medium text-fg">Add exercises</h2>
        <ExercisePicker
          excludeIds={plannedExercises.map((exercise) => exercise.id)}
          onPick={addExercise}
        />
      </section>

      {/* 4. Log movement — very bottom */}
      <section className="grid gap-3 border-t border-border/70 pt-5">
        <h2 className="text-lg font-medium text-fg">Log movement</h2>
        <p className="text-sm text-fgMuted">
          Walks and cardio go here in plain English — e.g. &ldquo;walking 30 min&rdquo;.
        </p>
        <MovementLogger compact />
      </section>
    </div>
  );
}
