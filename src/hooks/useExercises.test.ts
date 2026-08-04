import { describe, expect, it } from 'vitest';
import { searchExercises } from './useExercises';
import { matchesLibraryMuscleFilter } from '../lib/formMuscleGroups';
import type { Exercise } from '../types';

function exercise(partial: Partial<Exercise> & Pick<Exercise, 'id' | 'slug' | 'name'>): Exercise {
  return {
    muscleGroup: 'arms',
    secondaryMuscles: [],
    equipment: 'machine',
    instructions: [],
    imageStyle: 'name-only',
    source: 'user-created',
    ...partial,
  };
}

describe('searchExercises', () => {
  const catalog = [
    exercise({ id: '1', slug: 'lat-pulldown', name: 'Lat Pulldown', muscleGroup: 'back', source: 'user-board' }),
    exercise({ id: '2', slug: 'lat-raise', name: 'Lat Raise', muscleGroup: 'shoulders', source: 'user-board' }),
    exercise({
      id: '3',
      slug: 'zorp-cable-kickback',
      name: 'Zorp Cable Kickback',
      muscleGroup: 'glutes',
      source: 'user-created',
    }),
    exercise({
      id: '4',
      slug: 'archived-move',
      name: 'Archived Move',
      archived: true,
      source: 'user-created',
    }),
  ];

  it('finds a newly created exercise by name ahead of fuzzy near-misses', () => {
    const results = searchExercises(catalog, 'Zorp Cable Kickback');
    expect(results[0]?.id).toBe('3');
    expect(results.map((item) => item.id)).not.toContain('4');
  });

  it('ranks exact and prefix matches before fuzzy noise', () => {
    const results = searchExercises(catalog, 'Lat');
    expect(results.map((item) => item.slug).slice(0, 2)).toEqual(['lat-pulldown', 'lat-raise']);
  });

  it('omits archived exercises from empty-query listings', () => {
    const results = searchExercises(catalog, '');
    expect(results.every((item) => !item.archived)).toBe(true);
    expect(results.map((item) => item.id)).not.toContain('4');
  });
});

describe('Library muscle filter + search', () => {
  const catalog = [
    exercise({ id: 'b1', slug: 'bicep-curl', name: 'Bicep Curl', muscleGroup: 'biceps' }),
    exercise({ id: 't1', slug: 'tricep-pushdown', name: 'Tricep Pushdown', muscleGroup: 'triceps' }),
    exercise({ id: 'q1', slug: 'leg-extension', name: 'Leg Extension', muscleGroup: 'quads' }),
    exercise({ id: 'c1', slug: 'bench-press', name: 'Bench Press', muscleGroup: 'chest' }),
  ];

  it('keeps form-created biceps/triceps visible under the arms chip', () => {
    const arms = catalog.filter((item) => matchesLibraryMuscleFilter(item.muscleGroup, 'arms'));
    const results = searchExercises(arms, '');
    expect(results.map((item) => item.id).sort()).toEqual(['b1', 't1']);
  });

  it('keeps form-created quads visible under the legs chip', () => {
    const legs = catalog.filter((item) => matchesLibraryMuscleFilter(item.muscleGroup, 'legs'));
    const results = searchExercises(legs, 'Leg Extension');
    expect(results[0]?.id).toBe('q1');
  });
});
