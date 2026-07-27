import CountUp from 'react-countup';
import { Flame } from 'lucide-react';
import { isBoardBaselineSession } from '../data/catalog';
import { getDeviceTimeZone } from '../lib/local-day';
import { calculateStreaks } from '../lib/streak';
import { useWorkoutStore } from '../stores/workoutStore';

export function StreakBadge() {
  const sessions = useWorkoutStore((state) =>
    state.sessions.filter((session) => !isBoardBaselineSession(session.id)),
  );
  const streak = calculateStreaks(
    sessions.map((session) => session.startedAt),
    { timeZone: getDeviceTimeZone() },
  );

  return (
    <div className="app-card flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-md border border-border bg-surfaceAlt text-fg">
        <Flame size={20} strokeWidth={1.75} />
      </div>
      <div>
        <p className="label">Current streak</p>
        <p className="tabular mt-1 text-2xl font-medium text-fg">
          <CountUp end={streak.current} duration={0.8} /> days
        </p>
      </div>
    </div>
  );
}
