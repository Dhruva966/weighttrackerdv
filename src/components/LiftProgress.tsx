import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatChartMonth } from '../lib/fmt';
import { buildLiftProgress } from '../lib/liftImport';
import { useWorkoutStore } from '../stores/workoutStore';

const chartAxisTick = { fontSize: 11, fill: '#7A7164' };

export function LiftProgress() {
  const sets = useWorkoutStore((state) => state.sets);
  const exercises = useWorkoutStore((state) => state.exercises);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');

  const exercisesWithSets = useMemo(
    () =>
      exercises
        .filter((exercise) => sets.some((setItem) => setItem.exerciseId === exercise.id && !setItem.isWarmup))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [exercises, sets],
  );

  const selectedExercise =
    exercisesWithSets.find((exercise) => exercise.id === selectedExerciseId) ?? exercisesWithSets[0];

  const liftProgress = useMemo(() => {
    if (!selectedExercise) {
      return [];
    }
    return buildLiftProgress(selectedExercise.id, sets);
  }, [selectedExercise, sets]);

  const xDomain = useMemo((): [number, number] | undefined => {
    if (liftProgress.length === 0) {
      return undefined;
    }
    const min = liftProgress[0].t;
    const max = Math.max(liftProgress[liftProgress.length - 1].t, Date.now());
    return [min, max];
  }, [liftProgress]);

  return (
    <section className="app-card grid gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-medium text-fg">Lift progress</h2>
          <p className="text-sm text-fgMuted">
            Working weight over time from logged sets (including board baseline).
          </p>
        </div>
        {exercisesWithSets.length > 0 ? (
          <select
            className="field min-h-11 sm:max-w-xs"
            value={selectedExercise?.id ?? ''}
            onChange={(event) => setSelectedExerciseId(event.target.value)}
            aria-label="Exercise for progress chart"
          >
            {exercisesWithSets.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {exercisesWithSets.length === 0 ? (
        <p className="py-6 text-sm leading-relaxed text-fgMuted">
          No lift history yet. Log sets from{' '}
          <Link className="text-link" to="/move">
            Move
          </Link>{' '}
          and trends will show up here.
        </p>
      ) : liftProgress.length === 0 ? (
        <p className="py-6 text-sm leading-relaxed text-fgMuted">
          No working sets for {selectedExercise?.name ?? 'this lift'} yet.
        </p>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={liftProgress} margin={{ top: 8, right: 12, left: 0, bottom: 28 }}>
              <XAxis
                dataKey="t"
                type="number"
                domain={xDomain}
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
                contentStyle={{
                  background: '#FFFFFF',
                  border: '1px solid #E5E5E5',
                  borderRadius: 8,
                  color: '#4A3B2A',
                }}
              />
              <Legend />
              <Line
                type="linear"
                name="Weight"
                dataKey="weightLb"
                stroke="#C4A35A"
                strokeWidth={2}
                dot={false}
                animationDuration={400}
              />
              <Line
                type="linear"
                name="Est. 1RM"
                dataKey="oneRm"
                stroke="#4A3B2A"
                strokeWidth={2}
                dot={false}
                animationDuration={400}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {selectedExercise ? (
        <p className="text-center text-sm text-fgMuted">
          Detail for this lift:{' '}
          <Link className="text-link" to={`/exercises/${selectedExercise.slug}`}>
            {selectedExercise.name}
          </Link>
        </p>
      ) : null}
    </section>
  );
}
