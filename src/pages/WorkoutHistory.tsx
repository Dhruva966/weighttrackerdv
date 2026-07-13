import { Link } from 'react-router-dom';
import { SessionSummary } from '../components/SessionSummary';
import { formatDateTime } from '../lib/fmt';
import { useWorkoutStore } from '../stores/workoutStore';

/** Secondary gym-only history list, demoted behind mom-first History. */
export function WorkoutHistory() {
  const sessions = useWorkoutStore((state) => state.sessions);
  const sets = useWorkoutStore((state) => state.sets);
  const clearHistory = useWorkoutStore((state) => state.clearHistory);
  const completeSessions = sessions.filter((session) => session.endedAt);

  return (
    <div className="grid animate-rise gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Sessions you’ve finished</h1>
          <p className="page-lead mt-3">Only when you want them — no pressure to fill this list.</p>
        </div>
        {completeSessions.length > 0 || sets.length > 0 ? (
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
        {completeSessions.length ? (
          completeSessions.map((session) => {
            const sessionSets = sets.filter((setItem) => setItem.sessionId === session.id);
            return (
              <Link
                key={session.id}
                className="grid gap-3 rounded-2xl border border-border/80 bg-surface/90 p-4 shadow-card transition hover:border-fg/20"
                to={`/history/${session.id}`}
              >
                <p className="font-medium text-fg">{formatDateTime(session.startedAt)}</p>
                <SessionSummary sets={sessionSets} />
              </Link>
            );
          })
        ) : (
          <div className="app-card text-center">
            <p className="font-medium text-fg">A quiet start</p>
            <p className="mt-2 text-sm leading-relaxed text-fgMuted">
              Finished workouts will land here — whenever you’re ready.
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
