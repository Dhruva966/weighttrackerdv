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
      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fgMuted" size={18} />
        <input
          className="field pl-11"
          placeholder="Search exercises to add"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="mt-3 grid gap-2">
        {exercises.length ? (
          exercises.slice(0, 8).map((exercise) => (
            <button
              key={exercise.id}
              className="flex min-h-14 items-center justify-between rounded-xl border border-border bg-bg px-3 text-left hover:border-fg/30"
              type="button"
              onClick={() => onPick(exercise)}
            >
              <span className="font-semibold text-fg">{exercise.name}</span>
              <span className="text-sm capitalize text-fgMuted">{exercise.muscleGroup}</span>
            </button>
          ))
        ) : (
          <p className="text-sm text-fgMuted">No matches. Try another search or create one in Library.</p>
        )}
      </div>
    </div>
  );
}
