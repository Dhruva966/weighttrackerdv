import { useParams } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ExerciseImage } from '../components/ExerciseImage';
import { SetRow } from '../components/SetRow';
import { estimateOneRepMax } from '../lib/pr';
import { useExerciseBySlug } from '../hooks/useExercises';
import { useWorkoutStore } from '../stores/workoutStore';

export function ExerciseDetail() {
  const { slug } = useParams();
  const exercise = useExerciseBySlug(slug);
  const sets = useWorkoutStore((state) => state.sets.filter((setItem) => setItem.exerciseId === exercise?.id));

  if (!exercise) {
    return <p className="text-fgMuted">Exercise not found.</p>;
  }

  const best = sets.reduce((max, setItem) => Math.max(max, estimateOneRepMax(setItem.weightLb, setItem.reps)), 0);
  const chartData = sets.map((setItem) => ({
    date: new Date(setItem.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    oneRm: estimateOneRepMax(setItem.weightLb, setItem.reps),
  }));

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
      <div className="app-card h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="date" stroke="#A1A1AA" />
            <YAxis stroke="#A1A1AA" />
            <Tooltip contentStyle={{ background: '#18181B', border: '1px solid #3F3F46', borderRadius: 12 }} />
            <Line type="monotone" dataKey="oneRm" stroke="#4A3B2A" strokeWidth={2} dot={false} animationDuration={400} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="grid gap-2">
        {sets.length ? sets.map((setItem) => <SetRow key={setItem.id} setItem={setItem} />) : <p className="app-card text-fgMuted">No sets yet.</p>}
      </div>
    </div>
  );
}
