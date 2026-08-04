import { Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DayWorkoutSummary } from '../lib/calendar';
import { formatDayKeyLabel } from '../lib/local-day';

function formatMuscleGroupLabel(muscleGroup: string): string {
  if (muscleGroup === 'full-body') {
    return 'Full body';
  }
  return muscleGroup.charAt(0).toUpperCase() + muscleGroup.slice(1);
}

type DayWorkoutPanelProps = {
  selectedDate: string | null;
  summary: DayWorkoutSummary | null;
};

export function DayWorkoutPanel({ selectedDate, summary }: DayWorkoutPanelProps) {
  if (!selectedDate) {
    return (
      <section className="grid gap-3" aria-label="Selected day workouts">
        <h2 className="text-xl font-medium text-fg">Pick a day</h2>
        <p className="app-card text-fgMuted">Select a day on the calendar to see what you logged.</p>
      </section>
    );
  }

  const logHref = `/session/new?date=${encodeURIComponent(selectedDate)}`;

  return (
    <section className="grid gap-3" aria-label="Selected day workouts">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-medium text-fg">{formatDayKeyLabel(selectedDate)}</h2>
      </div>

      {summary ? (
        <Link
          className={
            summary.inProgress
              ? 'grid min-h-9 gap-3 rounded-lg border border-accent/30 bg-accentSoft/40 p-4 hover:border-accent/50'
              : 'grid min-h-9 gap-3 rounded-lg border border-border bg-surface p-4 hover:border-accent/40'
          }
          to={`/session/${summary.primarySessionId}`}
          state={{ from: '/grow' }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold text-fg">This day’s workout</p>
            {summary.inProgress ? (
              <span className="rounded-md bg-accentSoft px-2 py-1 text-xs font-bold text-accent">
                In progress
              </span>
            ) : null}
          </div>
          {summary.notes ? <p className="text-sm text-fgMuted">{summary.notes}</p> : null}
          {summary.muscleGroups.length > 0 ? (
            <div className="grid gap-2">
              <p className="text-sm font-semibold text-fgMuted">Worked</p>
              <ul className="flex flex-wrap gap-2" aria-label="Muscle groups worked">
                {summary.muscleGroups.map((group) => (
                  <li
                    key={group}
                    className="rounded-md border border-border bg-bg px-2.5 py-1 text-sm font-medium text-fg"
                  >
                    {formatMuscleGroupLabel(group)}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-fgMuted">No sets logged yet — open to keep training.</p>
          )}
        </Link>
      ) : (
        <div className="app-card grid gap-3 text-center">
          <p className="text-fgMuted">Nothing logged on this day yet.</p>
          <Link
            className="button-primary mx-auto inline-flex min-h-9 items-center gap-2"
            to={logHref}
            state={{ from: '/grow' }}
          >
            <Dumbbell size={16} />
            Log workout
          </Link>
        </div>
      )}
    </section>
  );
}
