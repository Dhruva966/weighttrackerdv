import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ExerciseImage } from '../components/ExerciseImage';
import { SetRow } from '../components/SetRow';
import { estimateOneRepMax } from '../lib/pr';
import { buildJaggedSyntheticLiftSeries } from '../lib/syntheticProgress';
import { useExerciseBySlug } from '../hooks/useExercises';
import { useWorkoutStore } from '../stores/workoutStore';

const chartAxisTick = { fontSize: 11, fill: '#999999' };

export function ExerciseDetail() {
  const { slug } = useParams();
  const exercise = useExerciseBySlug(slug);
  const sets = useWorkoutStore((state) => state.sets.filter((setItem) => setItem.exerciseId === exercise?.id));

  const chartData = useMemo(() => {
    if (!exercise) {
      return [];
    }

    const workingSets = sets.filter((setItem) => !setItem.isWarmup);
    const latest = [...workingSets].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )[0];

    return buildJaggedSyntheticLiftSeries({
      slug: exercise.slug,
      currentWeightLb: latest?.weightLb ?? 100,
      currentReps: latest?.reps ?? 8,
    }).map((point) => ({
      label: point.label,
      oneRm: point.oneRm,
      weightLb: point.weightLb,
    }));
  }, [exercise, sets]);

  if (!exercise) {
    return <p className="text-fgMuted">Exercise not found.</p>;
  }

  const best = sets.reduce((max, setItem) => Math.max(max, estimateOneRepMax(setItem.weightLb, setItem.reps)), 0);
  const labelInterval = Math.max(1, Math.floor(chartData.length / 10));

  return (
    <div className="grid gap-4">
      <ExerciseImage exercise={exercise} />
      <div>
        <h1 className="page-title">{exercise.name}</h1>
        <p className="mt-1 text-sm capitalize text-fgMuted">
          {exercise.muscleGroup} / {exercise.equipment}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="app-card">
          <p className="text-sm font-semibold text-fgMuted">Estimated 1RM</p>
          <p className="tabular mt-2 text-3xl font-medium text-accent">{best ? `${best} lb` : '-'}</p>
        </div>
        <div className="app-card">
          <p className="text-sm font-semibold text-fgMuted">Logged sets</p>
          <p className="tabular mt-2 page-title">{sets.length}</p>
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
              dataKey="label"
              stroke="#999999"
              tick={chartAxisTick}
              interval={labelInterval}
              angle={-32}
              textAnchor="end"
              height={56}
            />
            <YAxis stroke="#999999" tick={chartAxisTick} width={42} />
            <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E5E5', borderRadius: 8, color: '#4A3B2A' }} />
            <Line type="linear" dataKey="oneRm" stroke="#4A3B2A" strokeWidth={2} dot={false} animationDuration={400} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="grid gap-2">
        {sets.length ? sets.map((setItem) => <SetRow key={setItem.id} setItem={setItem} />) : <p className="app-card text-fgMuted">No sets yet.</p>}
      </div>
    </div>
  );
}
