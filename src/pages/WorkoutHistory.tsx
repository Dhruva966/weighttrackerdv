import { Link } from 'react-router-dom';
import { SessionSummary } from '../components/SessionSummary';
import { isBoardBaselineSession } from '../data/catalog';
import { formatDateTime } from '../lib/fmt';
import { useWorkoutStore } from '../stores/workoutStore';

/** Secondary gym-only history list, demoted behind mom-first History. */
export function WorkoutHistory() {
  const sessions = useWorkoutStore((state) =>
    state.sessions.filter((session) => !isBoardBaselineSession(session.id)),
  );
  const sets = useWorkoutStore((state) => state.sets);
  const clearHistory = useWorkoutStore((state) => state.clearHistory);
  const listedSessions = [...sessions].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
  const hasClearableWorkouts = listedSessions.length > 0 || sets.some((setItem) => !isBoardBaselineSession(setItem.sessionId));

  return (
    <div className="grid animate-rise gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Your workouts</h1>
          <p className="page-lead mt-3">
            Open any day to keep logging. Empty is fine — you’ve already shown up in other ways.
          </p>
        </div>
        {hasClearableWorkouts ? (
          <button
            className="button-secondary shrink-0"
            type="button"
            onClick={() => {
              if (window.confirm('Clear all workout history on this device?')) {
                clearHistory();
              }
            }}
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="grid gap-3">
        {listedSessions.length ? (
          listedSessions.map((session) => {
            const sessionSets = sets.filter((setItem) => setItem.sessionId === session.id);
            return (
              <Link
                key={session.id}
                className="grid gap-3 rounded-2xl border border-border/80 bg-surface/90 p-4 shadow-card transition hover:border-fg/20"
                to={`/session/${session.id}`}
              >
                <p className="font-medium text-fg">{formatDateTime(session.startedAt)}</p>
                <SessionSummary sets={sessionSets} />
              </Link>
            );
          })
        ) : (
          <div className="app-card text-center">
            <p className="font-medium text-fg">Room to grow — gently</p>
            <p className="mt-2 text-sm leading-relaxed text-fgMuted">
              Workouts will land here. Until then, take pride in the rest of your day.
            </p>
          </div>
        )}
      </div>

      <Link className="text-link" to="/history">
        Back to History
      </Link>
    </div>
  );
}
