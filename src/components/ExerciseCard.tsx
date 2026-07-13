import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ExerciseImage } from './ExerciseImage';
import type { Exercise } from '../types';

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  return (
    <Link
      to={`/exercises/${exercise.slug}`}
      className="group block rounded-lg border border-border bg-surface p-3 transition hover:border-fg/30 hover:shadow-soft"
    >
      <ExerciseImage exercise={exercise} />
      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-fg">{exercise.name}</h3>
          <p className="mt-1 text-sm capitalize text-fgMuted">
            {exercise.muscleGroup} / {exercise.equipment}
          </p>
          {exercise.setupNotes?.length ? (
            <p className="mt-2 line-clamp-2 text-xs font-medium text-fgMuted">{exercise.setupNotes.join(' / ')}</p>
          ) : null}
        </div>
        <ChevronRight className="mt-1 text-fgMuted transition group-hover:text-fg" size={18} />
      </div>
    </Link>
  );
}
