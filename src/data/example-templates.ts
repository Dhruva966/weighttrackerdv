import type { Exercise } from '../types';

/**
 * Read-only starter suggestions in the universal Templates list. Dhruva's usual
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
      'bench-press-barbell',
      'incline-chest-press-machine',
      'tricep-extension-machine-w-pad',
      'lateral-raise-machine',
      'crunch-machine',
    ],
  },
  {
    id: 'example-pull-day',
    name: 'Pull Day',
    exerciseSlugs: [
      'lat-pulldown-cable',
      'seated-row-machine',
      'trap-row-gym',
      'bicep-curl-dumbbell',
      'lateral-raise-machine',
      'crunch-machine',
      'low-back-raise',
    ],
  },
  {
    id: 'example-leg-day',
    name: 'Leg Day',
    exerciseSlugs: [
      'leg-press',
      'hack-squat-barbell',
      'leg-extension-machine',
      'lying-leg-curl-machine',
      'seated-calf-raise-machine',
      'crunch-machine',
      'back-extension-machine',
    ],
  },
  {
    id: 'example-chest-back',
    name: 'Chest & Back',
    exerciseSlugs: [
      'bench-press-barbell',
      'incline-chest-press-machine',
      'lat-pulldown-cable',
      'seated-row-machine',
      'trap-row-gym',
    ],
  },
  {
    id: 'example-arms-day',
    name: 'Arms Day',
    exerciseSlugs: [
      'shoulder-press-machine',
      'lateral-raise-machine',
      'lat-raise',
      'bicep-curl-dumbbell',
      'hammer-curl-cable',
      'preacher-curl-machine',
    ],
  },
];

/** Resolves an example template's slugs against the live catalog, dropping any that no longer exist. */
export function resolveExampleTemplateExerciseIds(template: ExampleTemplate, exercises: Exercise[]): string[] {
  const bySlug = new Map(exercises.map((exercise) => [exercise.slug, exercise.id]));
  return template.exerciseSlugs.map((slug) => bySlug.get(slug)).filter((id): id is string => id !== undefined);
}
