import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExercisePicker } from '../components/ExercisePicker';
import { NaturalLanguageSetLogger } from '../components/NaturalLanguageSetLogger';
import { RestTimer } from '../components/RestTimer';
import { useTemplateStore } from '../stores/templateStore';
import { useUiStore } from '../stores/uiStore';
import { useWorkoutStore } from '../stores/workoutStore';
import type { Exercise, MuscleGroup } from '../types';

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

export function Session() {
  const { sessionId = '' } = useParams();
  const sessions = useWorkoutStore((state) => state.sessions);
  const sets = useWorkoutStore((state) => state.sets);
  const exercises = useWorkoutStore((state) => state.exercises);
  const reopenSession = useWorkoutStore((state) => state.reopenSession);
  const setSessionPlan = useWorkoutStore((state) => state.setSessionPlan);
  const saveSessionAsTemplate = useTemplateStore((state) => state.saveSessionAsTemplate);
  const showPreviewNotice = useUiStore((state) => state.showPreviewNotice);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [lastSetKey, setLastSetKey] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const session = sessions.find((item) => item.id === sessionId);
  const sessionSets = sets.filter((setItem) => setItem.sessionId === sessionId);

  const plannedExercises = useMemo(() => {
    const plannedIds = session?.plannedExerciseIds ?? [];
    const fromPlan = plannedIds
      .map((id) => exercises.find((exercise) => exercise.id === id))
      .filter((exercise): exercise is Exercise => Boolean(exercise));
    const loggedIds = new Set(sessionSets.map((setItem) => setItem.exerciseId));
    const extras = exercises.filter(
      (exercise) => loggedIds.has(exercise.id) && !plannedIds.includes(exercise.id),
    );
    return [...fromPlan, ...extras];
  }, [exercises, session?.plannedExerciseIds, sessionSets]);

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

  function updatePlan(nextExercises: Exercise[]) {
    setSessionPlan(
      session.id,
      nextExercises.map((exercise) => exercise.id),
    );
  }

  function addExercise(exercise: Exercise) {
    if (plannedExercises.some((item) => item.id === exercise.id)) {
      return;
    }
    updatePlan([...plannedExercises, exercise]);
    setExpandedExerciseId(exercise.id);
  }

  function removeExercise(exerciseId: string) {
    updatePlan(plannedExercises.filter((exercise) => exercise.id !== exerciseId));
    if (expandedExerciseId === exerciseId) {
      setExpandedExerciseId(null);
    }
  }

  function handleSaveTemplate(event: FormEvent) {
    event.preventDefault();
    const name = templateName.trim();
    if (!name) {
      return;
    }
    const template = saveSessionAsTemplate(session.id, name);
    if (template) {
      showPreviewNotice(`Saved "${template.name}" to your templates.`);
      setTemplateName('');
      setShowSaveTemplate(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Today's workout</h1>
          <p className="mt-1 text-sm text-fgMuted">
            Tap an exercise and log sets in plain English. Come back any time to keep logging.
          </p>
        </div>
        <Link className="button-secondary min-h-11" to="/move">
          Done
        </Link>
      </div>

      {sessionSets.length > 0 ? (
        <RestTimer activeKey={lastSetKey || sessionSets.at(-1)?.id || session.id} />
      ) : null}

      <section className="grid gap-4">
        <h2 className="text-lg font-medium text-fg">
          {plannedExercises.length ? 'Your exercises' : 'No exercises yet'}
        </h2>

        {plannedExercises.length === 0 ? (
          <p className="app-card text-fgMuted">Search below and add everything you plan to train today.</p>
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
                        className="flex flex-1 items-start justify-between gap-3 text-left"
                        type="button"
                        onClick={() => setExpandedExerciseId(isExpanded ? null : exercise.id)}
                      >
                        <div>
                          <p className="font-bold text-fg">{exercise.name}</p>
                          <p className="text-sm text-fgMuted">
                            {exerciseSets.length
                              ? `${exerciseSets.length} set${exerciseSets.length === 1 ? '' : 's'} logged`
                              : 'Tap to log'}
                          </p>
                        </div>
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      <button
                        className="icon-button shrink-0"
                        type="button"
                        aria-label={`Remove ${exercise.name}`}
                        onClick={() => removeExercise(exercise.id)}
                      >
                        <X size={16} />
                      </button>
                    </div>

                    {isExpanded ? (
                      <NaturalLanguageSetLogger exercise={exercise} sessionId={session.id} />
                    ) : null}
                  </section>
                );
              })}
            </div>
          ))
        )}
      </section>

      {plannedExercises.length > 0 ? (
        <div className="grid gap-2">
          <button
            className="text-link min-h-11 self-start text-sm"
            type="button"
            onClick={() => setShowSaveTemplate((current) => !current)}
          >
            {showSaveTemplate ? 'Cancel' : 'Save as template'}
          </button>
          {showSaveTemplate ? (
            <form className="flex items-center gap-2" onSubmit={handleSaveTemplate}>
              <label className="min-w-0 flex-1">
                <span className="sr-only">Template name</span>
                <input
                  className="field !h-10 !min-h-0 !rounded-xl px-3 text-sm"
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="e.g. Push Day"
                  maxLength={60}
                  autoFocus
                />
              </label>
              <button
                className="button-primary !min-h-10 px-3 text-sm"
                type="submit"
                disabled={!templateName.trim()}
              >
                Save
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      <section className="grid gap-3 border-t border-border/70 pt-5">
        <h2 className="text-lg font-medium text-fg">Add exercises for today</h2>
        <ExercisePicker
          excludeIds={plannedExercises.map((exercise) => exercise.id)}
          onPick={addExercise}
        />
      </section>
    </div>
  );
}
