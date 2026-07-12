import CountUp from 'react-countup';
import { Flame } from 'lucide-react';
import { calculateStreaks } from '../lib/streak';
import { useWorkoutStore } from '../stores/workoutStore';

export function StreakBadge() {
  const sessions = useWorkoutStore((state) => state.sessions);
  const streak = calculateStreaks(
    sessions.filter((session) => session.endedAt).map((session) => session.startedAt),
    { timeZone: 'America/Los_Angeles' },
  );

  return (
    <div className="app-card flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-accentSoft text-accent">
        <Flame size={22} />
      </div>
      <div>
        <p className="text-sm font-semibold text-fgMuted">Current streak</p>
        <p className="tabular text-2xl font-extrabold text-fg">
          <CountUp end={streak.current} duration={0.8} /> days
        </p>
      </div>
    </div>
  );
}
