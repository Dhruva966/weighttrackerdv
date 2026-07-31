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
