import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ExerciseImage } from './ExerciseImage';
import type { Exercise } from '../types';

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  return (
    <Link
      to={`/exercises/${exercise.slug}`}
      className="group flex min-h-20 items-center gap-3 rounded-xl border border-border bg-surface p-3 transition hover:border-fg/30 hover:shadow-soft"
    >
      <ExerciseImage exercise={exercise} />
      <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-fg">{exercise.name}</h3>
          <p className="mt-0.5 text-xs capitalize text-fgMuted">
            {exercise.muscleGroup} / {exercise.equipment}
          </p>
          {exercise.setupNotes?.length ? (
            <p className="mt-0.5 line-clamp-2 text-[11px] font-medium text-fgMuted">{exercise.setupNotes.join(' / ')}</p>
          ) : null}
      </div>
      <ChevronRight className="shrink-0 text-fgMuted transition group-hover:text-fg" size={18} aria-hidden />
    </Link>
  );
}
