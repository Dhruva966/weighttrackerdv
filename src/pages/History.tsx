import { Link } from 'react-router-dom';
import { SessionSummary } from '../components/SessionSummary';
import { formatDateTime } from '../lib/fmt';
import { useWorkoutStore } from '../stores/workoutStore';

export function History() {
  const sessions = useWorkoutStore((state) => state.sessions);
  const sets = useWorkoutStore((state) => state.sets);
  const completeSessions = sessions.filter((session) => session.endedAt);

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="page-title">History</h1>
        <p className="mt-1 text-sm text-fgMuted">Completed sessions in chronological order.</p>
      </div>
      <div className="grid gap-3">
        {completeSessions.length ? (
          completeSessions.map((session) => {
            const sessionSets = sets.filter((setItem) => setItem.sessionId === session.id);
            return (
              <Link key={session.id} className="grid gap-3 rounded-lg border border-border bg-surface p-4 hover:border-fg/30" to={`/history/${session.id}`}>
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
