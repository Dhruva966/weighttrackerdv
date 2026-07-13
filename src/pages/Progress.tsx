import { useMemo, useState } from 'react';
import { Bar, BarChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BodyMap } from '../components/BodyMap';
import { formatVolume } from '../lib/fmt';
import { buildJaggedSyntheticLiftSeries } from '../lib/syntheticProgress';
import { summarizeWeeklyVolume } from '../lib/volume';
import { useWorkoutStore } from '../stores/workoutStore';

function weekStart(): string {
  const date = new Date();
  const day = date.getDay();
  date.setDate(date.getDate() - ((day + 6) % 7));
  return date.toISOString().slice(0, 10);
}

function liftAnchor(exerciseId: string, sets: ReturnType<typeof useWorkoutStore.getState>['sets']) {
  const exerciseSets = sets.filter((setItem) => setItem.exerciseId === exerciseId && !setItem.isWarmup);
  if (!exerciseSets.length) {
    return { weightLb: 100, reps: 8 };
  }

  const latest = [...exerciseSets].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  )[0];

  return { weightLb: latest.weightLb, reps: latest.reps };
}

const chartAxisTick = { fontSize: 11, fill: '#999999' };

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
  const liftProgress = useMemo(() => {
    if (!selectedExercise) {
      return [];
    }

    const anchor = liftAnchor(selectedExercise.id, sets);
    return buildJaggedSyntheticLiftSeries({
      slug: selectedExercise.slug,
      currentWeightLb: anchor.weightLb,
      currentReps: anchor.reps,
    });
  }, [selectedExercise, sets]);

  const liftLabelInterval = Math.max(1, Math.floor(liftProgress.length / 10));

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
            <XAxis dataKey="muscle" stroke="#999999" />
            <YAxis stroke="#999999" />
            <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E5E5', borderRadius: 8, color: '#4A3B2A' }} />
            <Bar dataKey="volume" fill="#4A3B2A" radius={[4, 4, 0, 0]} animationDuration={400} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <section className="app-card grid gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-medium text-fg">Lift progress</h2>
            <p className="text-sm text-fgMuted">Synthetic long-range history from 9th grade through today.</p>
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
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={liftProgress} margin={{ top: 8, right: 12, left: 0, bottom: 28 }}>
              <XAxis
                dataKey="label"
                stroke="#999999"
                tick={chartAxisTick}
                interval={liftLabelInterval}
                angle={-32}
                textAnchor="end"
                height={56}
              />
              <YAxis stroke="#999999" tick={chartAxisTick} width={42} />
              <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E5E5', borderRadius: 8, color: '#4A3B2A' }} />
              <Legend />
              <Line
                type="linear"
                name="Weight"
                dataKey="weightLb"
                stroke="#4A3B2A"
                strokeWidth={2}
                dot={false}
                animationDuration={400}
              />
              <Line
                type="linear"
                name="Est. 1RM"
                dataKey="oneRm"
                stroke="#8B6914"
                strokeWidth={2}
                dot={false}
                animationDuration={400}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="app-card grid gap-3">
        <div>
          <h2 className="text-xl font-medium text-fg">Brain dump import</h2>
          <p className="text-sm text-fgMuted">
            Paste lines like “Lat pulldown 175 lbs”, “Bench 205 x 3 185 x 6”, or “preacher curl 8 reps 7 reps 7 reps and 115”.
          </p>
        </div>
        <textarea
          className="field min-h-40 py-3"
          value={dumpText}
          onChange={(event) => setDumpText(event.target.value)}
          placeholder={
            'Lat pulldown 175 lbs\nBench 205 x 3 185 x 6\npreacher curl 3 sets first set was 8 reps second was 7 third was 7 and 115'
          }
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
