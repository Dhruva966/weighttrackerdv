import type { Exercise } from '../types';

/**
 * Read-only starter suggestions shown alongside "My templates." Generic Push/Pull/Legs
 * split — not a copy of any third-party app's named programs. Tapping one creates a real,
 * editable template in templateStore via createTemplate/startWorkoutFromTemplate.
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
    exerciseSlugs: ['bench-press', 'incline-machine-press', 'shoulder-press', 'cable-chest-fly', 'tricep-machine-extension'],
  },
  {
    id: 'example-pull-day',
    name: 'Pull Day',
    exerciseSlugs: ['lat-pulldown', 'seated-row-machine', 'trap-row-gym', 'bicep-curl', 'rope-hammer-curl'],
  },
  {
    id: 'example-leg-day',
    name: 'Leg Day',
    exerciseSlugs: ['hack-squat', 'leg-press-linear', 'quad-extension', 'hamstring-curl-laying', 'calf-raise-sitting'],
  },
];

/** Resolves an example template's slugs against the live catalog, dropping any that no longer exist. */
export function resolveExampleTemplateExerciseIds(template: ExampleTemplate, exercises: Exercise[]): string[] {
  const bySlug = new Map(exercises.map((exercise) => [exercise.slug, exercise.id]));
  return template.exerciseSlugs.map((slug) => bySlug.get(slug)).filter((id): id is string => id !== undefined);
}
