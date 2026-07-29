import { Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExerciseCard } from '../components/ExerciseCard';
import { useExercises } from '../hooks/useExercises';
import type { MuscleGroup } from '../types';

const filters: Array<MuscleGroup | 'all'> = ['all', 'chest', 'back', 'arms', 'legs', 'core', 'shoulders'];

export function ExerciseLibrary() {
  const [query, setQuery] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | 'all'>('all');
  const exercises = useExercises(query, muscleGroup);

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Exercise Library</h1>
          <p className="mt-1 text-sm text-fgMuted">Search, filter, and open past performance.</p>
        </div>
        <Link className="button-secondary hidden sm:inline-flex" to="/exercises/new">
          <Plus size={18} />
          New
        </Link>
      </div>

      <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 focus-within:border-accent">
        <Search className="shrink-0 text-fgMuted" size={16} strokeWidth={1.5} aria-hidden />
        <span className="sr-only">Search by exercise or equipment</span>
        <input
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm leading-none text-fg outline-none placeholder:text-fgMuted"
          placeholder="Search by exercise or equipment"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => (
          <button
            key={filter}
            className={`min-h-10 whitespace-nowrap rounded-full border px-4 text-sm font-bold capitalize ${
              muscleGroup === filter ? 'border-accent bg-accentSoft text-accent' : 'border-border bg-surface text-fgMuted'
            }`}
            type="button"
            onClick={() => setMuscleGroup(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="grid gap-2">
        {exercises.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} />
        ))}
      </div>
    </div>
  );
}
