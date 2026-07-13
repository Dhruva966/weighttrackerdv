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
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Workout recaps</h1>
          <p className="mt-1 text-sm text-fgMuted">Completed lifting sessions only.</p>
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
                className="grid gap-3 rounded-lg border border-border bg-surface p-4 hover:border-fg/30"
                to={`/history/${session.id}`}
              >
                <p className="font-bold text-fg">{formatDateTime(session.startedAt)}</p>
                <SessionSummary sets={sessionSets} />
              </Link>
            );
          })
        ) : (
          <p className="app-card text-fgMuted">No completed workouts yet.</p>
        )}
      </div>

      <Link className="text-link" to="/history">
        Back to History
      </Link>
    </div>
  );
}
