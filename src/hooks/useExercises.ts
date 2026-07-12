import { useMemo } from 'react';
import Fuse from 'fuse.js';
import { useWorkoutStore } from '../stores/workoutStore';
import type { Exercise, MuscleGroup } from '../types';

export function useExercises(query = '', muscleGroup: MuscleGroup | 'all' = 'all') {
  const exercises = useWorkoutStore((state) => state.exercises);
  const filtered = useMemo(() => {
    const byGroup = muscleGroup === 'all' ? exercises : exercises.filter((exercise) => exercise.muscleGroup === muscleGroup);
    if (!query.trim()) {
      return byGroup;
    }

    const fuse = new Fuse(byGroup, { keys: ['name', 'muscleGroup', 'equipment'], threshold: 0.35 });
    return fuse.search(query).map((result) => result.item);
  }, [exercises, muscleGroup, query]);

  return filtered;
}

export function useExerciseBySlug(slug: string | undefined): Exercise | undefined {
  return useWorkoutStore((state) => state.exercises.find((exercise) => exercise.slug === slug));
}
