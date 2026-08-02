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
    expect(canonicalExerciseSlug('shoulder-press')).toBe('shoulder-press-machine');
    expect(canonicalExerciseSlug('shoulder-press-cable-machine')).toBe('shoulder-press-machine');
    expect(canonicalExerciseSlug('shoulder-press-plate-loaded')).toBe('shoulder-press-machine');
    // Dumbell spelling is a survivor — do not collapse into Machine.
    expect(canonicalExerciseSlug('shoulder-press-dumbell')).toBe('shoulder-press-dumbell');
    expect(canonicalExerciseSlug('shoulder-press-dumbbell')).toBe('shoulder-press-dumbell');
  });

  it('keeps the four lateral-raise survivors and collapses board/band/padded variants', () => {
    expect(canonicalExerciseSlug('lateral-raise-machine')).toBe('lateral-raise-machine');
    expect(canonicalExerciseSlug('lateral-raise-dumbbell')).toBe('lateral-raise-dumbbell');
    expect(canonicalExerciseSlug('slanted-lat-raise-dumbbell-seated')).toBe(
      'slanted-lat-raise-dumbbell-seated',
    );
    expect(canonicalExerciseSlug('lateral-raise-cable')).toBe('lateral-raise-cable');
    expect(canonicalExerciseSlug('lat-raise')).toBe('lateral-raise-dumbbell');
    expect(canonicalExerciseSlug('seated-lateral-raise-padded-machine')).toBe(
      'lateral-raise-machine',
    );
    expect(canonicalExerciseSlug('lateral-raise-band')).toBe('lateral-raise-dumbbell');
  });

  it('maps round-4 approved Strong collapses', () => {
    expect(canonicalExerciseSlug('lat-pulldown-cable-2')).toBe('lat-pulldown-cable');
    expect(canonicalExerciseSlug('lat-pulldown-cable-3')).toBe('lat-pulldown-cable');
    expect(canonicalExerciseSlug('single-arm-dumbell-row')).toBe(
      'bent-over-one-arm-row-dumbbell',
    );
    expect(canonicalExerciseSlug('tricep-extension-machine-w-pad')).toBe(
      'triceps-extension-machine',
    );
    expect(canonicalExerciseSlug('kipping-pull-up')).toBe('pull-up');
    expect(canonicalExerciseSlug('cycling')).toBe('cycling-indoor');
    expect(canonicalExerciseSlug('strict-military-press-barbell')).toBe(
      'overhead-press-barbell',
    );
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
      { id: 'row-uuid', slug: 'bent-over-one-arm-row-dumbbell' },
    ];

    expect(remapExerciseId('ex-bicep-curl', exercises)).toBe(
      '35b5c297-d509-4337-8050-8520b2a7dfec',
    );
    expect(remapExerciseId('ex-cable-chest-fly', exercises)).toBe(
      '4ccd7096-594b-4664-a568-9997bc941928',
    );
    expect(remapExerciseId('ex-single-arm-dumbell-row', exercises)).toBe('row-uuid');

    expect(
      remapSetExerciseIds([{ exerciseId: 'ex-cable-fly', weightLb: 50 }], exercises),
    ).toEqual([{ exerciseId: '4ccd7096-594b-4664-a568-9997bc941928', weightLb: 50 }]);
  });

  it('maps round-5 approved collapses', () => {
    expect(canonicalExerciseSlug('wide-pull-up')).toBe('pull-up');
    expect(canonicalExerciseSlug('straight-bar-tricep-extension-machine')).toBe(
      'triceps-extension-machine',
    );
    expect(canonicalExerciseSlug('pendlay-row-barbell')).toBe('bent-over-row-barbell');
    expect(canonicalExerciseSlug('seated-leg-press-machine')).toBe('leg-press');
    expect(canonicalExerciseSlug('lat-pulldown-machine')).toBe('lat-pulldown-cable');
    expect(canonicalExerciseSlug('seated-overhead-press-barbell')).toBe('overhead-press-barbell');
    expect(canonicalExerciseSlug('seated-overhead-press-dumbbell')).toBe(
      'overhead-press-dumbbell',
    );
    expect(canonicalExerciseSlug('low-back-raise')).toBe('back-extension');
    expect(canonicalExerciseSlug('shrug-smith-machine')).toBe('shrug-machine');
  });

  it('keeps shoulder-press and lateral-raise protected survivors', () => {
    expect(canonicalExerciseSlug('shoulder-press-machine')).toBe('shoulder-press-machine');
    expect(canonicalExerciseSlug('shoulder-press-dumbell')).toBe('shoulder-press-dumbell');
    expect(canonicalExerciseSlug('lateral-raise-machine')).toBe('lateral-raise-machine');
    expect(canonicalExerciseSlug('lateral-raise-dumbbell')).toBe('lateral-raise-dumbbell');
    expect(canonicalExerciseSlug('slanted-lat-raise-dumbbell-seated')).toBe(
      'slanted-lat-raise-dumbbell-seated',
    );
    expect(canonicalExerciseSlug('lateral-raise-cable')).toBe('lateral-raise-cable');
  });
});
