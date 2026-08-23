import { Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { ExerciseImage } from './ExerciseImage';
import { ExerciseStalenessIndicator } from './ExerciseRecommendations';
import type { Exercise } from '../types';

export function ExerciseCard({
  exercise,
  from,
}: {
  exercise: Exercise;
  /** Optional return path after edit (e.g. `/exercises` or `/session/:id`). */
  from?: string;
}) {
  return (
    <div className="flex min-h-20 items-center gap-3 rounded-xl border border-border bg-surface p-3 transition hover:border-fg/30 hover:shadow-soft">
      <Link
        to={`/exercises/${exercise.slug}`}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        state={from ? { from } : undefined}
      >
        <ExerciseImage exercise={exercise} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-fg">{exercise.name}</h3>
            <ExerciseStalenessIndicator exerciseId={exercise.id} size="sm" />
          </div>
          <p className="mt-0.5 text-xs capitalize text-fgMuted">
            {exercise.muscleGroup} / {exercise.equipment}
          </p>
          {exercise.setupNotes?.length ? (
            <p className="mt-0.5 line-clamp-2 text-[11px] font-medium text-fgMuted">
              {exercise.setupNotes.join(' / ')}
            </p>
          ) : null}
        </div>
      </Link>
      <Link
        className="icon-button shrink-0"
        to={`/exercises/${exercise.slug}/edit`}
        state={from ? { from } : { from: '/exercises' }}
        aria-label={`Edit ${exercise.name}`}
      >
        <Pencil size={15} strokeWidth={1.75} />
      </Link>
    </div>
  );
}
