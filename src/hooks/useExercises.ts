import { useMemo } from 'react';
import Fuse from 'fuse.js';
import { useWorkoutStore } from '../stores/workoutStore';
import type { Exercise, MuscleGroup } from '../types';

/** Alphabetical — do not boost photo rows (FEDB stock was surfacing over board/PDF exercises). */
function byName(a: Exercise, b: Exercise): number {
  return a.name.localeCompare(b.name);
}

function isActive(exercise: Exercise): boolean {
  return !exercise.archived;
}

/**
 * Exact and prefix hits first, then Fuse. New user-created names must beat fuzzy
 * near-misses from the ~250-exercise pdf-import catalog (and top-4 picker slices).
 */
export function searchExercises(exercises: Exercise[], query: string): Exercise[] {
  const active = exercises.filter(isActive);
  const trimmed = query.trim();
  if (!trimmed) {
    return [...active].sort(byName);
  }

  const needle = trimmed.toLowerCase();
  const exact: Exercise[] = [];
  const prefix: Exercise[] = [];
  for (const exercise of active) {
    const name = exercise.name.toLowerCase();
    if (name === needle || exercise.slug === needle) {
      exact.push(exercise);
    } else if (name.startsWith(needle) || exercise.slug.startsWith(needle)) {
      prefix.push(exercise);
    }
  }

  const fuse = new Fuse(active, {
    keys: ['name', 'slug', 'muscleGroup', 'equipment'],
    threshold: 0.35,
  });
  const fuzzy = fuse.search(trimmed).map((result) => result.item);

  const seen = new Set<string>();
  const ranked: Exercise[] = [];
  for (const item of [...exact, ...prefix.sort(byName), ...fuzzy]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    ranked.push(item);
  }
  return ranked;
}

export function useExercises(query = '', muscleGroup: MuscleGroup | 'all' = 'all') {
  const exercises = useWorkoutStore((state) => state.exercises);
  return useMemo(() => {
    const byGroup =
      muscleGroup === 'all' ? exercises : exercises.filter((exercise) => exercise.muscleGroup === muscleGroup);
    return searchExercises(byGroup, query);
  }, [exercises, muscleGroup, query]);
}

export function useExerciseBySlug(slug: string | undefined): Exercise | undefined {
  return useWorkoutStore((state) =>
    state.exercises.find((exercise) => exercise.slug === slug && !exercise.archived),
  );
}
