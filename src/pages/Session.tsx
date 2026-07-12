import { CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExercisePicker } from '../components/ExercisePicker';
import { RestTimer } from '../components/RestTimer';
import { SessionSummary } from '../components/SessionSummary';
import { SetLogger } from '../components/SetLogger';
import { SetRow } from '../components/SetRow';
import { useWorkoutStore } from '../stores/workoutStore';
import type { Exercise } from '../types';

export function Session() {
  const { sessionId = '' } = useParams();
  const sessions = useWorkoutStore((state) => state.sessions);
  const sets = useWorkoutStore((state) => state.sets);
  const endSession = useWorkoutStore((state) => state.endSession);
  const [selected, setSelected] = useState<Exercise[]>([]);
  const [lastSetKey, setLastSetKey] = useState('');
  const session = sessions.find((item) => item.id === sessionId);
  const sessionSets = sets.filter((setItem) => setItem.sessionId === sessionId);
  const selectedIds = useMemo(() => new Set(selected.map((exercise) => exercise.id)), [selected]);

  if (!session) {
    return <p className="text-fgMuted">Session not found.</p>;
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-fg">Active Workout</h1>
          <p className="mt-1 text-sm text-fgMuted">Log path has no animation delay.</p>
        </div>
        {session.endedAt ? (
          <Link className="button-secondary" to="/">
            Done
          </Link>
        ) : (
          <button className="button-secondary" type="button" onClick={() => endSession(session.id)}>
            <CheckCircle2 size={18} />
            End
          </button>
        )}
      </div>

      {sessionSets.length ? <RestTimer activeKey={lastSetKey || sessionSets.at(-1)?.id || session.id} /> : null}
      <ExercisePicker
        onPick={(exercise) => {
          if (!selectedIds.has(exercise.id)) {
            setSelected((items) => [...items, exercise]);
          }
        }}
      />

      <div className="grid gap-3">
        {selected.map((exercise) => {
          const exerciseSets = sessionSets.filter((setItem) => setItem.exerciseId === exercise.id);
          return (
            <section key={exercise.id} className="grid gap-2">
              <SetLogger
                sessionId={session.id}
                exercise={exercise}
              />
              <div
                className="grid gap-2"
                onTransitionEnd={() => setLastSetKey(exerciseSets.at(-1)?.id ?? '')}
              >
                {exerciseSets.map((setItem) => (
                  <SetRow key={setItem.id} setItem={setItem} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {session.endedAt ? <SessionSummary sets={sessionSets} /> : null}
    </div>
  );
}
