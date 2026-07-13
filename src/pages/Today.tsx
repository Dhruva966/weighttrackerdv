import { Link } from 'react-router-dom';
import { CalendarDays, Dumbbell, LineChart, Plus, Trophy } from 'lucide-react';
import { EncouragementLine } from '../components/EncouragementLine';
import { MuscleGroupRing } from '../components/MuscleGroupRing';
import { SessionSummary } from '../components/SessionSummary';
import { StatCard } from '../components/StatCard';
import { StreakBadge } from '../components/StreakBadge';
import { formatDateTime } from '../lib/fmt';
import { summarizeWeeklyVolume } from '../lib/volume';
import { useWorkoutStore } from '../stores/workoutStore';

function weekStart(): string {
  const date = new Date();
  const day = date.getDay();
  date.setDate(date.getDate() - ((day + 6) % 7));
  return date.toISOString().slice(0, 10);
}

export function Today() {
  const sessions = useWorkoutStore((state) => state.sessions);
  const sets = useWorkoutStore((state) => state.sets);
  const exercises = useWorkoutStore((state) => state.exercises);
  const completeSessions = sessions.filter((session) => session.endedAt);
  const weekly = summarizeWeeklyVolume(
    sets.map((setItem) => ({
      createdAt: setItem.createdAt,
      weightLb: setItem.weightLb,
      reps: setItem.reps,
      muscleGroup: exercises.find((exercise) => exercise.id === setItem.exerciseId)?.muscleGroup ?? 'full-body',
    })),
    { weekStartsOn: weekStart() },
  );
  const lastSession = completeSessions[0];
  const lastSessionSets = lastSession ? sets.filter((setItem) => setItem.sessionId === lastSession.id) : [];

  return (
    <div className="grid max-w-[540px] gap-8">
      <section className="min-w-0 max-w-full overflow-hidden">
        <EncouragementLine />
        <h1 className="page-title mt-3">Track the work. Find the next PR.</h1>
        <p className="page-lead mt-4 text-fgMuted">
          Log sets, watch volume build, and keep your lifting history in one calm place.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <Link className="button-primary" to="/session/new">
            <Plus size={20} />
            Start Workout
          </Link>
          <div className="justify-self-center sm:justify-self-end">
            <MuscleGroupRing percent={Math.max(...Object.values(weekly.percentByMuscle), 0)} />
          </div>
        </div>
      </section>

      <hr className="section-rule" />

      <div className="grid gap-3 sm:grid-cols-2">
        <StreakBadge />
        <StatCard label="Total sessions" value={`${completeSessions.length}`} icon={CalendarDays} />
        <StatCard label="Logged sets" value={`${sets.length}`} icon={Dumbbell} />
        <StatCard label="PR sets" value={`${sets.filter((setItem) => setItem.isPr).length}`} icon={Trophy} />
      </div>

      <section className="grid gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-medium text-fg">Last session</h2>
          <Link className="text-link" to="/calendar">
            View calendar
          </Link>
        </div>
        {lastSession ? (
          <div className="grid gap-3">
            <p className="text-sm text-fgMuted">{formatDateTime(lastSession.startedAt)}</p>
            <SessionSummary sets={lastSessionSets} />
          </div>
        ) : (
          <div className="app-card flex items-center gap-3">
            <LineChart className="text-fgMuted" strokeWidth={1.75} />
            <p className="text-editorial text-fgMuted">No completed sessions yet. Start one and your recap lands here.</p>
          </div>
        )}
      </section>
    </div>
  );
}
