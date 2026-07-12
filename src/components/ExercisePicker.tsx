import { Search } from 'lucide-react';
import { useState } from 'react';
import { useExercises } from '../hooks/useExercises';
import type { Exercise } from '../types';

export function ExercisePicker({ onPick }: { onPick: (exercise: Exercise) => void }) {
  const [query, setQuery] = useState('');
  const exercises = useExercises(query);

  return (
    <div className="app-card">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-fgMuted" size={18} />
        <input
          className="field pl-11"
          placeholder="Search exercises"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="mt-3 grid gap-2">
        {exercises.slice(0, 6).map((exercise) => (
          <button
            key={exercise.id}
            className="flex min-h-14 items-center justify-between rounded-xl border border-border bg-bg px-3 text-left hover:border-accent"
            type="button"
            onClick={() => onPick(exercise)}
          >
            <span className="font-semibold text-fg">{exercise.name}</span>
            <span className="text-sm capitalize text-fgMuted">{exercise.muscleGroup}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
