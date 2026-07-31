import { useMemo, useState } from 'react';
import { Bar, BarChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BodyMap } from '../components/BodyMap';
import { formatChartMonth, formatVolume } from '../lib/fmt';
import { buildLiftProgress } from '../lib/liftImport';
import { summarizeWeeklyVolume } from '../lib/volume';
import { useWorkoutStore } from '../stores/workoutStore';

function weekStart(): string {
  const date = new Date();
  const day = date.getDay();
  date.setDate(date.getDate() - ((day + 6) % 7));
  return date.toISOString().slice(0, 10);
}

const chartAxisTick = { fontSize: 11, fill: '#7A7164' };

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
    return buildLiftProgress(selectedExercise.id, sets);
  }, [selectedExercise, sets]);

  const liftXDomain = useMemo((): [number, number] | undefined => {
    if (liftProgress.length === 0) {
      return undefined;
    }
    const min = liftProgress[0].t;
    const max = Math.max(liftProgress[liftProgress.length - 1].t, Date.now());
    return [min, max];
  }, [liftProgress]);

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
                dataKey="t"
                type="number"
                domain={liftXDomain}
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
            Paste messy workout notes — lifts, reps, weights, and side comments like “last rep was helped by a friend”.
          </p>
        </div>
        <textarea
          className="field min-h-40 py-3"
          value={dumpText}
          onChange={(event) => setDumpText(event.target.value)}
          placeholder={
            'preacher curl 3 sets first set was 8 reps second was 7 third was 7 and 115\nlast rep was helped by a friend\n\nBench 205 x 3 185 x 6\nLat pulldown 175 lbs'
          }
        />
        <button
          className="button-primary"
          type="button"
          onClick={() => {
            const result = importLiftDump(dumpText);
            if (result.imported > 0 && result.notes > 0) {
              setImportMessage(
                `Imported ${result.imported} set${result.imported === 1 ? '' : 's'} with notes.`,
              );
            } else if (result.imported > 0) {
              setImportMessage(`Imported ${result.imported} set${result.imported === 1 ? '' : 's'}.`);
            } else if (result.notes > 0) {
              setImportMessage(`Saved ${result.notes} note${result.notes === 1 ? '' : 's'} to history.`);
            } else {
              setImportMessage('No lift weights or notes found.');
            }
            if (result.imported > 0 || result.notes > 0) {
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
