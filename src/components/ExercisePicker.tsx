import { Search } from 'lucide-react';
import { useState } from 'react';
import { useExercises } from '../hooks/useExercises';
import type { Exercise } from '../types';

export function ExercisePicker({
  onPick,
  excludeIds = [],
}: {
  onPick: (exercise: Exercise) => void;
  excludeIds?: string[];
}) {
  const [query, setQuery] = useState('');
  const exercises = useExercises(query).filter((exercise) => !excludeIds.includes(exercise.id));

  return (
    <div className="app-card">
      <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 focus-within:border-accent">
        <Search className="shrink-0 text-fgMuted" size={16} strokeWidth={1.5} aria-hidden />
        <span className="sr-only">Search exercises to add</span>
        <input
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm leading-none text-fg outline-none placeholder:text-fgMuted"
          placeholder="Search exercises to add"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="mt-3 grid gap-1.5">
        {exercises.length ? (
          exercises.slice(0, 8).map((exercise) => (
            <button
              key={exercise.id}
              className="flex min-h-10 items-center justify-between gap-3 rounded-xl border border-border bg-bg px-3 py-2 text-left hover:border-fg/30"
              type="button"
              onClick={() => onPick(exercise)}
            >
              <span className="truncate text-sm font-medium text-fg">{exercise.name}</span>
              <span className="shrink-0 text-xs capitalize text-fgMuted">{exercise.muscleGroup}</span>
            </button>
          ))
        ) : (
          <p className="text-sm text-fgMuted">No matches. Try another search or create one in Library.</p>
        )}
      </div>
    </div>
  );
}
