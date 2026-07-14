import { CheckCircle2, ChevronDown, ChevronUp, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExercisePicker } from '../components/ExercisePicker';
import { MovementLogger } from '../components/MovementLogger';
import { NaturalLanguageSetLogger } from '../components/NaturalLanguageSetLogger';
import { RestTimer } from '../components/RestTimer';
import { SessionSummary } from '../components/SessionSummary';
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
  const endSession = useWorkoutStore((state) => state.endSession);
  const setSessionPlan = useWorkoutStore((state) => state.setSessionPlan);
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(null);
  const [lastSetKey, setLastSetKey] = useState('');
  const session = sessions.find((item) => item.id === sessionId);
  const sessionSets = sets.filter((setItem) => setItem.sessionId === sessionId);
  const isEnded = Boolean(session?.endedAt);

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

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">{isEnded ? 'Workout recap' : 'Today’s workout'}</h1>
          <p className="mt-1 text-sm text-fgMuted">
            {isEnded
              ? 'Session complete.'
              : 'Add exercises, then tap each one and log sets in plain English.'}
          </p>
        </div>
        {isEnded ? (
          <Link className="button-secondary" to="/calendar">
            Done
          </Link>
        ) : (
          <button className="button-secondary" type="button" onClick={() => endSession(session.id)}>
            <CheckCircle2 size={18} />
            End
          </button>
        )}
      </div>

      {!isEnded && sessionSets.length > 0 ? (
        <RestTimer activeKey={lastSetKey || sessionSets.at(-1)?.id || session.id} />
      ) : null}

      {!isEnded ? (
        <section className="grid gap-3">
          <h2 className="text-lg font-medium text-fg">Log movement</h2>
          <p className="text-sm text-fgMuted">
            Walks and cardio go here in plain English — e.g. “walking 30 min”.
          </p>
          <MovementLogger compact />
        </section>
      ) : null}

      {!isEnded ? (
        <section className="grid gap-3">
          <h2 className="text-lg font-medium text-fg">Add exercises for today</h2>
          <ExercisePicker
            excludeIds={plannedExercises.map((exercise) => exercise.id)}
            onPick={addExercise}
          />
        </section>
      ) : null}

      <section className="grid gap-4">
        <h2 className="text-lg font-medium text-fg">
          {plannedExercises.length ? 'Your exercises' : 'No exercises yet'}
        </h2>

        {plannedExercises.length === 0 ? (
          <p className="app-card text-fgMuted">Search above and add everything you plan to train today.</p>
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
                      {!isEnded ? (
                        <button
                          className="icon-button shrink-0"
                          type="button"
                          aria-label={`Remove ${exercise.name}`}
                          onClick={() => removeExercise(exercise.id)}
                        >
                          <X size={16} />
                        </button>
                      ) : null}
                    </div>

                    {isExpanded ? (
                      <NaturalLanguageSetLogger
                        disabled={isEnded}
                        exercise={exercise}
                        sessionId={session.id}
                      />
                    ) : null}
                  </section>
                );
              })}
            </div>
          ))
        )}
      </section>

      {isEnded ? <SessionSummary sets={sessionSets} /> : null}
    </div>
  );
}
