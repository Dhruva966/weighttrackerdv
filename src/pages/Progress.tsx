import { useMemo, useState } from 'react';
import { Bar, BarChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BodyMap } from '../components/BodyMap';
import { formatVolume } from '../lib/fmt';
import { buildLiftProgress } from '../lib/liftImport';
import { summarizeWeeklyVolume } from '../lib/volume';
import { useWorkoutStore } from '../stores/workoutStore';

function weekStart(): string {
  const date = new Date();
  const day = date.getDay();
  date.setDate(date.getDate() - ((day + 6) % 7));
  return date.toISOString().slice(0, 10);
}

export function Progress() {
  const sets = useWorkoutStore((state) => state.sets);
  const exercises = useWorkoutStore((state) => state.exercises);
  const importLiftDump = useWorkoutStore((state) => state.importLiftDump);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [dumpText, setDumpText] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const summary = summarizeWeeklyVolume(
    sets.map((setItem) => ({
      createdAt: setItem.createdAt,
      weightLb: setItem.weightLb,
      reps: setItem.reps,
      muscleGroup: exercises.find((exercise) => exercise.id === setItem.exerciseId)?.muscleGroup ?? 'full-body',
    })),
    { weekStartsOn: weekStart() },
  );
  const chartData = Object.entries(summary.byMuscle).map(([muscle, volume]) => ({ muscle, volume }));
  const exercisesWithSets = useMemo(
    () => exercises.filter((exercise) => sets.some((setItem) => setItem.exerciseId === exercise.id)),
    [exercises, sets],
  );
  const selectedExercise = exercisesWithSets.find((exercise) => exercise.id === selectedExerciseId) ?? exercisesWithSets[0];
  const liftProgress = selectedExercise ? buildLiftProgress(selectedExercise.id, sets) : [];

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="page-title">Progress</h1>
        <p className="mt-1 text-sm text-fgMuted">Weekly volume, muscle balance, and trend surface.</p>
      </div>
      <div className="app-card">
        <p className="text-sm font-semibold text-fgMuted">Weekly volume</p>
        <p className="tabular mt-2 text-4xl font-medium text-accent">{formatVolume(summary.totalVolume)}</p>
      </div>
      <BodyMap summary={summary} />
      <div className="app-card h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="muscle" stroke="#A1A1AA" />
            <YAxis stroke="#A1A1AA" />
            <Tooltip contentStyle={{ background: '#18181B', border: '1px solid #3F3F46', borderRadius: 12 }} />
            <Bar dataKey="volume" fill="#4A3B2A" radius={[4, 4, 0, 0]} animationDuration={400} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <section className="app-card grid gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-medium text-fg">Lift progress</h2>
            <p className="text-sm text-fgMuted">Pick any lift to see weight and estimated 1RM over time.</p>
          </div>
          <select
            className="field sm:max-w-xs"
            value={selectedExercise?.id ?? ''}
            onChange={(event) => setSelectedExerciseId(event.target.value)}
          >
            {exercisesWithSets.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </select>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={liftProgress}>
              <XAxis dataKey="label" stroke="#A1A1AA" />
              <YAxis stroke="#A1A1AA" />
              <Tooltip contentStyle={{ background: '#18181B', border: '1px solid #3F3F46', borderRadius: 12 }} />
              <Legend />
              <Line type="monotone" name="Weight" dataKey="weightLb" stroke="#4A3B2A" strokeWidth={2} dot animationDuration={400} />
              <Line type="monotone" name="Est. 1RM" dataKey="oneRm" stroke="#8B6914" strokeWidth={2} dot animationDuration={400} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="app-card grid gap-3">
        <div>
          <h2 className="text-xl font-medium text-fg">Brain dump import</h2>
          <p className="text-sm text-fgMuted">Paste lines like “Lat pulldown 175 lbs” or “Bench 205 x 3 185 x 6”.</p>
        </div>
        <textarea
          className="field min-h-40 py-3"
          value={dumpText}
          onChange={(event) => setDumpText(event.target.value)}
          placeholder={'Lat pulldown 175 lbs\nBench 205 x 3 185 x 6\nDumbbell preacher curl 42.5 lb'}
        />
        <button
          className="button-primary"
          type="button"
          onClick={() => {
            const result = importLiftDump(dumpText);
            setImportMessage(
              result.imported > 0
                ? `Imported ${result.imported} set${result.imported === 1 ? '' : 's'}.`
                : 'No lift weights found.',
            );
            if (result.imported > 0) {
              setDumpText('');
            }
          }}
        >
          Import Lift Notes
        </button>
        {importMessage ? <p className="text-sm font-semibold text-accent">{importMessage}</p> : null}
      </section>
    </div>
  );
}
