import { useParams } from 'react-router-dom';
import { SessionSummary } from '../components/SessionSummary';
import { SetRow } from '../components/SetRow';
import { formatDateTime } from '../lib/fmt';
import { useWorkoutStore } from '../stores/workoutStore';

export function HistorySession() {
  const { sessionId = '' } = useParams();
  const sessions = useWorkoutStore((state) => state.sessions);
  const sets = useWorkoutStore((state) => state.sets);
  const session = sessions.find((item) => item.id === sessionId);
  const sessionSets = sets.filter((setItem) => setItem.sessionId === sessionId);

  if (!session) {
    return <p className="text-fgMuted">Session not found.</p>;
  }

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="page-title">Session Recap</h1>
        <p className="mt-1 text-sm text-fgMuted">{formatDateTime(session.startedAt)}</p>
      </div>
      <SessionSummary sets={sessionSets} />
      <div className="grid gap-2">
        {sessionSets.map((setItem) => (
          <SetRow key={setItem.id} setItem={setItem} />
        ))}
      </div>
    </div>
  );
}
