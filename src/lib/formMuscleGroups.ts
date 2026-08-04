import type { MuscleGroup } from '../types';

/**
 * Muscle options offered when creating or editing an exercise.
 * Broad `arms` / `legs` stay in the DB enum for legacy rows and session grouping,
 * but are not selectable here — prefer specific groups (biceps, quads, …).
 */
export const FORM_MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'forearms',
  'full-body',
  'cardio',
] as const satisfies readonly MuscleGroup[];

export type FormMuscleGroup = (typeof FORM_MUSCLE_GROUPS)[number];

const FORM_MUSCLE_SET = new Set<string>(FORM_MUSCLE_GROUPS);

/**
 * Library chip filters. Broad `arms` / `legs` chips expand to specific groups so
 * form-created biceps/triceps/quads rows are not hidden behind an empty exact match.
 */
export const LIBRARY_MUSCLE_FILTERS = [
  'all',
  'chest',
  'back',
  'arms',
  'legs',
  'core',
  'shoulders',
] as const satisfies ReadonlyArray<MuscleGroup | 'all'>;

export type LibraryMuscleFilter = (typeof LIBRARY_MUSCLE_FILTERS)[number];

const LIBRARY_FILTER_EXPANSION: Partial<Record<MuscleGroup, readonly MuscleGroup[]>> = {
  arms: ['arms', 'biceps', 'triceps'],
  legs: ['legs', 'quads', 'hamstrings', 'glutes', 'calves'],
};

/** True when an exercise belongs under a Library muscle chip (including broad buckets). */
export function matchesLibraryMuscleFilter(
  muscleGroup: MuscleGroup,
  filter: LibraryMuscleFilter,
): boolean {
  if (filter === 'all') {
    return true;
  }
  const expanded = LIBRARY_FILTER_EXPANSION[filter];
  if (expanded) {
    return expanded.includes(muscleGroup);
  }
  return muscleGroup === filter;
}

/** Map legacy broad groups onto a specific form default. */
export function coerceFormMuscleGroup(value: MuscleGroup | undefined): FormMuscleGroup {
  if (value === 'arms') {
    return 'biceps';
  }
  if (value === 'legs') {
    return 'quads';
  }
  if (value && FORM_MUSCLE_SET.has(value)) {
    return value as FormMuscleGroup;
  }
  return 'chest';
}
