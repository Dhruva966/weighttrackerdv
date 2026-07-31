import { describe, expect, it } from 'vitest';
import { coerceFormMuscleGroup, FORM_MUSCLE_GROUPS } from './formMuscleGroups';

describe('FORM_MUSCLE_GROUPS', () => {
  it('excludes broad arms and legs options', () => {
    expect(FORM_MUSCLE_GROUPS).not.toContain('arms');
    expect(FORM_MUSCLE_GROUPS).not.toContain('legs');
    expect(FORM_MUSCLE_GROUPS).toEqual(
      expect.arrayContaining(['biceps', 'triceps', 'quads', 'hamstrings', 'chest', 'back']),
    );
  });

  it('coerces legacy broad groups to specific defaults', () => {
    expect(coerceFormMuscleGroup('arms')).toBe('biceps');
    expect(coerceFormMuscleGroup('legs')).toBe('quads');
    expect(coerceFormMuscleGroup('chest')).toBe('chest');
    expect(coerceFormMuscleGroup(undefined)).toBe('chest');
  });
});
