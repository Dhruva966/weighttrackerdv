import { Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';

export type TodayOpenSession = {
  id: string;
  setCount: number;
};

type TodayWorkoutBannerProps = {
  /** Today's open (unended) session, or null when there isn't one. */
  openSession: TodayOpenSession | null;
};

/**
 * Always-visible entry point for today's workout on Move: a resume banner when a
 * session is already open today, or a one-tap start button when it isn't. This is the
 * load-bearing affordance — it must not require picking a calendar day to see it.
 */
export function TodayWorkoutBanner({ openSession }: TodayWorkoutBannerProps) {
  if (openSession) {
    const { setCount } = openSession;
    return (
      <Link
        className="grid min-h-9 gap-1.5 rounded-lg border border-accent/30 bg-accentSoft/40 p-4 transition hover:border-accent/50"
        to={`/session/${openSession.id}`}
        state={{ from: '/today' }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="font-bold text-fg">Continue today’s workout</p>
          <span className="shrink-0 rounded-md bg-accentSoft px-2 py-1 text-xs font-bold text-accent">
            In progress
          </span>
        </div>
        <p className="text-sm text-fgMuted">
          {setCount > 0
            ? `${setCount} set${setCount === 1 ? '' : 's'} logged so far — tap to keep going`
            : 'No sets logged yet — tap to keep going'}
        </p>
      </Link>
    );
  }

  return (
    <div className="app-card grid gap-3 text-center">
      <p className="text-fgMuted">No workout logged yet today.</p>
      <Link
        className="button-primary mx-auto inline-flex min-h-9 items-center gap-2"
        to="/session/new"
        state={{ from: '/today' }}
      >
        <Dumbbell size={16} strokeWidth={1.75} />
        Start empty workout
      </Link>
    </div>
  );
}
