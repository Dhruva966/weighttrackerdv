import { Dumbbell, LayoutList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { isBoardBaselineSession } from '../data/catalog';
import { findDaySession, toDayKey } from '../lib/calendar';
import { getDeviceTimeZone } from '../lib/local-day';
import { useWorkoutStore } from '../stores/workoutStore';

export function Move() {
  const sessions = useWorkoutStore((state) =>
    state.sessions.filter((session) => !isBoardBaselineSession(session.id)),
  );
  const sets = useWorkoutStore((state) =>
    state.sets.filter((setItem) => !isBoardBaselineSession(setItem.sessionId)),
  );

  const todayKey = toDayKey(new Date(), getDeviceTimeZone());
  const todaySession = findDaySession(todayKey, sessions);
  const openSession =
    todaySession && !todaySession.endedAt
      ? {
          id: todaySession.id,
          setCount: sets.filter((setItem) => setItem.sessionId === todaySession.id).length,
        }
      : null;

  return (
    <div className="grid animate-rise gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Move</h1>
          <p className="page-lead mt-3">
            Start a workout, keep today moving, or use a saved template.
          </p>
        </div>
        <Link className="button-secondary min-h-11 shrink-0 gap-1.5 px-3 text-sm" to="/templates">
          <LayoutList size={16} strokeWidth={1.75} />
          Templates
        </Link>
      </div>

      {openSession ? (
        <Link
          className="grid min-h-11 gap-1.5 rounded-lg border border-accent/30 bg-accentSoft/40 p-4 transition hover:border-accent/50"
          to={`/session/${openSession.id}`}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold text-fg">Continue today’s workout</p>
            <span className="shrink-0 rounded-md bg-accentSoft px-2 py-1 text-xs font-bold text-accent">
              In progress
            </span>
          </div>
          <p className="text-sm text-fgMuted">
            {openSession.setCount > 0
              ? `${openSession.setCount} set${openSession.setCount === 1 ? '' : 's'} logged so far — tap to keep going`
              : 'No sets logged yet — tap to keep going'}
          </p>
        </Link>
      ) : (
        <section className="app-card grid gap-3 text-center">
          <p className="text-fgMuted">No workout logged yet today.</p>
          <Link className="button-primary mx-auto inline-flex min-h-11 items-center gap-2" to="/session/new">
            <Dumbbell size={16} strokeWidth={1.75} />
            Start empty workout
          </Link>
        </section>
      )}

      <section className="grid gap-3 border-t border-border/70 pt-5">
        <h2 className="text-lg font-medium text-fg">Workout tools</h2>
        <Link className="text-link min-h-11 inline-flex items-center" to="/exercises">
          Browse exercises
        </Link>
      </section>
    </div>
  );
}
