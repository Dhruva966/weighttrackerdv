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
    <div className="grid gap-5">
      <section className="min-w-0 max-w-full overflow-hidden rounded-3xl border border-accent/30 bg-surface p-5 shadow-glow-soft">
        <EncouragementLine />
        <h1 className="mt-3 max-w-[18rem] break-words text-2xl font-extrabold tracking-normal text-fg min-[420px]:text-3xl sm:max-w-none sm:text-4xl">
          Track the work. Find the next PR.
        </h1>
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <Link className="button-primary" to="/session/new">
            <Plus size={22} />
            Start Workout
          </Link>
          <div className="justify-self-center sm:justify-self-end">
            <MuscleGroupRing percent={Math.max(...Object.values(weekly.percentByMuscle), 0)} />
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StreakBadge />
        <StatCard label="Total sessions" value={`${completeSessions.length}`} icon={CalendarDays} />
        <StatCard label="Logged sets" value={`${sets.length}`} icon={Dumbbell} />
        <StatCard label="PR sets" value={`${sets.filter((setItem) => setItem.isPr).length}`} icon={Trophy} />
      </div>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-fg">Last session</h2>
          <Link className="text-sm font-bold text-accent" to="/history">
            View history
          </Link>
        </div>
        {lastSession ? (
          <div className="grid gap-3">
            <p className="text-sm text-fgMuted">{formatDateTime(lastSession.startedAt)}</p>
            <SessionSummary sets={lastSessionSets} />
          </div>
        ) : (
          <div className="app-card flex items-center gap-3">
            <LineChart className="text-accent" />
            <p className="text-fgMuted">No completed sessions yet. Start one and your recap lands here.</p>
          </div>
        )}
      </section>
    </div>
  );
}
