import { describe, expect, it } from 'vitest';
import {
  canonicalExerciseSlug,
  mergeExerciseCatalog,
  remapExerciseId,
  remapSetExerciseIds,
} from './exercise-merges';

describe('exercise-merges', () => {
  it('maps board slugs onto imaged PDF survivors', () => {
    expect(canonicalExerciseSlug('bicep-curl')).toBe('bicep-curl-dumbbell');
    expect(canonicalExerciseSlug('cable-chest-fly')).toBe('chest-fly');
    expect(canonicalExerciseSlug('chest-fly')).toBe('chest-fly');
  });

  it('collapses duplicate catalog rows onto the remote UUID when present', () => {
    const merged = mergeExerciseCatalog([
      {
        id: 'ex-bicep-curl',
        slug: 'bicep-curl',
        setupNotes: ['board note'],
      },
      {
        id: '35b5c297-d509-4337-8050-8520b2a7dfec',
        slug: 'bicep-curl-dumbbell',
        setupNotes: [],
      },
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.slug).toBe('bicep-curl-dumbbell');
    expect(merged[0]?.id).toBe('35b5c297-d509-4337-8050-8520b2a7dfec');
    expect(merged[0]?.setupNotes).toEqual(['board note']);
  });

  it('remaps set and plan ids from retired board exercise ids', () => {
    const exercises = [
      { id: '35b5c297-d509-4337-8050-8520b2a7dfec', slug: 'bicep-curl-dumbbell' },
      { id: '4ccd7096-594b-4664-a568-9997bc941928', slug: 'chest-fly' },
    ];

    expect(remapExerciseId('ex-bicep-curl', exercises)).toBe(
      '35b5c297-d509-4337-8050-8520b2a7dfec',
    );
    expect(remapExerciseId('ex-cable-chest-fly', exercises)).toBe(
      '4ccd7096-594b-4664-a568-9997bc941928',
    );

    expect(
      remapSetExerciseIds([{ exerciseId: 'ex-cable-fly', weightLb: 50 }], exercises),
    ).toEqual([{ exerciseId: '4ccd7096-594b-4664-a568-9997bc941928', weightLb: 50 }]);
  });
});
