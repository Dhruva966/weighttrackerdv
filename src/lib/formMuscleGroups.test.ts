import { describe, expect, it } from 'vitest';
import {
  coerceFormMuscleGroup,
  FORM_MUSCLE_GROUPS,
  LIBRARY_MUSCLE_FILTERS,
  matchesLibraryMuscleFilter,
} from './formMuscleGroups';

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

describe('matchesLibraryMuscleFilter', () => {
  it('exposes broad arms/legs chips on the Library', () => {
    expect(LIBRARY_MUSCLE_FILTERS).toEqual(['all', 'chest', 'back', 'arms', 'legs', 'core', 'shoulders']);
  });

  it('includes specific arm groups under the arms chip', () => {
    expect(matchesLibraryMuscleFilter('biceps', 'arms')).toBe(true);
    expect(matchesLibraryMuscleFilter('triceps', 'arms')).toBe(true);
    expect(matchesLibraryMuscleFilter('arms', 'arms')).toBe(true);
    expect(matchesLibraryMuscleFilter('chest', 'arms')).toBe(false);
  });

  it('includes specific leg groups under the legs chip', () => {
    expect(matchesLibraryMuscleFilter('quads', 'legs')).toBe(true);
    expect(matchesLibraryMuscleFilter('hamstrings', 'legs')).toBe(true);
    expect(matchesLibraryMuscleFilter('glutes', 'legs')).toBe(true);
    expect(matchesLibraryMuscleFilter('calves', 'legs')).toBe(true);
    expect(matchesLibraryMuscleFilter('legs', 'legs')).toBe(true);
    expect(matchesLibraryMuscleFilter('core', 'legs')).toBe(false);
  });

  it('exact-matches narrow chips and accepts all', () => {
    expect(matchesLibraryMuscleFilter('chest', 'chest')).toBe(true);
    expect(matchesLibraryMuscleFilter('back', 'chest')).toBe(false);
    expect(matchesLibraryMuscleFilter('forearms', 'all')).toBe(true);
  });
});
