import { Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SessionSummary } from '../components/SessionSummary';
import { formatDateTime } from '../lib/fmt';
import { useWorkoutStore } from '../stores/workoutStore';

export function History() {
  const sessions = useWorkoutStore((state) => state.sessions);
  const sets = useWorkoutStore((state) => state.sets);
  const clearHistory = useWorkoutStore((state) => state.clearHistory);
  const completeSessions = sessions.filter((session) => session.endedAt);

  function handleClearHistory() {
    if (
      !window.confirm(
        'Clear all workout history? This removes every logged session and set from this device. Your exercise library and goals stay.',
      )
    ) {
      return;
    }

    clearHistory();
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">History</h1>
          <p className="mt-1 text-sm text-fgMuted">Completed sessions in chronological order.</p>
        </div>
        {completeSessions.length > 0 || sets.length > 0 ? (
          <button className="button-secondary shrink-0" type="button" onClick={handleClearHistory}>
            <Trash2 size={16} />
            Clear all
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
          <p className="app-card text-fgMuted">No completed sessions yet.</p>
        )}
      </div>
    </div>
  );
}
