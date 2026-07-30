import type { Exercise } from '../types';

/**
 * Read-only starter suggestions shown alongside "My templates." Dhruva's usual
 * Push / Pull / Legs / Chest+Back / Arms split — tapping one starts a session
 * with those exercises (via startWorkoutWithExercises).
 *
 * Cardio is intentional but not in the exercise catalog yet, so it is omitted
 * from these lists until a cardio movement exists.
 */
export type ExampleTemplate = {
  id: string;
  name: string;
  exerciseSlugs: string[];
};

export const exampleTemplates: ExampleTemplate[] = [
  {
    id: 'example-push-day',
    name: 'Push Day',
    exerciseSlugs: [
      'bench-press',
      'incline-machine-press',
      'tricep-machine-extension',
      'lateral-raise-machine',
      'ab-crunch-corner-machine',
    ],
  },
  {
    id: 'example-pull-day',
    name: 'Pull Day',
    exerciseSlugs: [
      'lat-pulldown',
      'seated-row-machine',
      'trap-row-gym',
      'bicep-curl',
      'lateral-raise-machine',
      'ab-crunch-corner-machine',
      'low-back-raise',
    ],
  },
  {
    id: 'example-leg-day',
    name: 'Leg Day',
    exerciseSlugs: [
      'leg-press-linear',
      'hack-squat',
      'quad-extension',
      'hamstring-curl-laying',
      'calf-raise-sitting',
      'ab-crunch-corner-machine',
      'low-back-extension',
    ],
  },
  {
    id: 'example-chest-back',
    name: 'Chest & Back',
    exerciseSlugs: [
      'bench-press',
      'incline-machine-press',
      'lat-pulldown',
      'seated-row-machine',
      'trap-row-gym',
    ],
  },
  {
    id: 'example-arms-day',
    name: 'Arms Day',
    exerciseSlugs: [
      'shoulder-press',
      'lateral-raise-machine',
      'lat-raise',
      'bicep-curl',
      'rope-hammer-curl',
      'preacher-curl-machine',
    ],
  },
];

/** Resolves an example template's slugs against the live catalog, dropping any that no longer exist. */
export function resolveExampleTemplateExerciseIds(template: ExampleTemplate, exercises: Exercise[]): string[] {
  const bySlug = new Map(exercises.map((exercise) => [exercise.slug, exercise.id]));
  return template.exerciseSlugs.map((slug) => bySlug.get(slug)).filter((id): id is string => id !== undefined);
}
