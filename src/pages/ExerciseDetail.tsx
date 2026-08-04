import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ExerciseImage } from '../components/ExerciseImage';
import { SetRow } from '../components/SetRow';
import { isBoardBaselineSession } from '../data/catalog';
import { formatChartMonth } from '../lib/fmt';
import { estimateOneRepMax } from '../lib/pr';
import { buildLiftProgress } from '../lib/liftImport';
import { useExerciseBySlug } from '../hooks/useExercises';
import { useWorkoutStore } from '../stores/workoutStore';

const chartAxisTick = { fontSize: 11, fill: '#7A7164' };

export function ExerciseDetail() {
  const { slug } = useParams();
  const exercise = useExerciseBySlug(slug);
  const sets = useWorkoutStore((state) => state.sets.filter((setItem) => setItem.exerciseId === exercise?.id));
  const loggedSets = useMemo(
    () => sets.filter((setItem) => !isBoardBaselineSession(setItem.sessionId)),
    [sets],
  );

  const chartData = useMemo(() => {
    if (!exercise) {
      return [];
    }
    return buildLiftProgress(exercise.id, sets);
  }, [exercise, sets]);

  const chartXDomain = useMemo((): [number, number] | undefined => {
    if (chartData.length === 0) {
      return undefined;
    }
    const min = chartData[0].t;
    const max = Math.max(chartData[chartData.length - 1].t, Date.now());
    return [min, max];
  }, [chartData]);

  if (!exercise) {
    return <p className="text-fgMuted">Exercise not found.</p>;
  }

  const best = sets.reduce((max, setItem) => Math.max(max, estimateOneRepMax(setItem.weightLb, setItem.reps)), 0);

  return (
    <div className="grid gap-4">
      <ExerciseImage exercise={exercise} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">{exercise.name}</h1>
          <p className="mt-1 text-sm capitalize text-fgMuted">
            {exercise.muscleGroup} / {exercise.equipment}
          </p>
        </div>
        <Link
          className="button-secondary inline-flex shrink-0"
          to={`/exercises/${exercise.slug}/edit`}
          state={{ from: `/exercises/${exercise.slug}` }}
        >
          <Pencil size={16} />
          Edit
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="app-card">
          <p className="text-sm font-semibold text-fgMuted">Estimated 1RM</p>
          <p className="tabular mt-2 text-3xl font-medium text-accent">{best ? `${best} lb` : '-'}</p>
        </div>
        <div className="app-card">
          <p className="text-sm font-semibold text-fgMuted">Logged sets</p>
          <p className="tabular mt-2 page-title">{loggedSets.length}</p>
        </div>
      </div>
      <section className="app-card">
        <h2 className="text-lg font-medium text-fg">Machine setup notes</h2>
        {exercise.setupNotes?.length ? (
          <ul className="mt-3 grid gap-2">
            {exercise.setupNotes.map((note) => (
              <li key={note} className="rounded-xl border border-border bg-bg px-3 py-2 text-sm font-semibold text-accent">
                {note}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-fgMuted">No setup notes yet.</p>
        )}
      </section>
      <div className="app-card h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 28 }}>
            <XAxis
              dataKey="t"
              type="number"
              domain={chartXDomain}
              stroke="#999999"
              tick={chartAxisTick}
              tickFormatter={(value: number) => formatChartMonth(value)}
              angle={-32}
              textAnchor="end"
              height={56}
              scale="time"
              minTickGap={28}
            />
            <YAxis stroke="#999999" tick={chartAxisTick} width={42} />
            <Tooltip
              labelFormatter={(_label, payload) => {
                const point = payload?.[0]?.payload as { date?: string } | undefined;
                return point?.date ? formatChartMonth(point.date) : '';
              }}
              contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E5E5', borderRadius: 8, color: '#4A3B2A' }}
            />
            <Line type="linear" dataKey="oneRm" stroke="#4A3B2A" strokeWidth={2} dot={false} animationDuration={400} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="grid gap-2">
        {loggedSets.length ? (
          loggedSets.map((setItem) => <SetRow key={setItem.id} setItem={setItem} />)
        ) : (
          <p className="app-card text-fgMuted">No sets yet.</p>
        )}
      </div>
    </div>
  );
}
