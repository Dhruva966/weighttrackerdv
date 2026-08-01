import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '../types';
import {
  BLOCK_PEOPLE_EXERCISE_IMAGES,
  canonicalPdfStorageUrl,
  isAllowedPersistedImageUrl,
  isAllowedRenderImageUrl,
  isLocalPdfIconPath,
  pickPreferredImageUrl,
  sanitizeExerciseImage,
} from './exercise-image-policy';

const bucket =
  'https://svcjdtlmmrisrkjqdsjt.supabase.co/storage/v1/object/public/exercise-images/bench-press-barbell.jpg';

describe('exercise-image-policy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('blocks all persisted exercise image URLs while people images are banned', () => {
    expect(BLOCK_PEOPLE_EXERCISE_IMAGES).toBe(true);
    expect(isAllowedPersistedImageUrl(bucket)).toBe(false);
    expect(isAllowedPersistedImageUrl('https://cdn.example.com/fedb/bench.jpg')).toBe(false);
    expect(isAllowedPersistedImageUrl('/exercise-icons/bench-press-barbell.jpg')).toBe(false);
  });

  it('allows only blob previews for render while blocked', () => {
    expect(isLocalPdfIconPath('/exercise-icons/bench-press-barbell.jpg')).toBe(true);
    expect(isAllowedRenderImageUrl('/exercise-icons/bench-press-barbell.jpg')).toBe(false);
    expect(isAllowedRenderImageUrl(bucket)).toBe(false);
    expect(isAllowedRenderImageUrl('blob:http://localhost/1')).toBe(true);
  });

  it('strips stock people-photo URLs on sanitize', () => {
    const exercise: Exercise = {
      id: '1',
      slug: 'triceps-pushdown-cable-straight-bar',
      name: 'Triceps Pushdown',
      muscleGroup: 'triceps',
      secondaryMuscles: [],
      equipment: 'cable',
      instructions: [],
      imageUrl:
        'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown/0.jpg',
      imageStyle: 'photo',
      source: 'free-exercise-db',
    };

    expect(sanitizeExerciseImage(exercise)).toEqual({
      ...exercise,
      imageUrl: undefined,
      imageStyle: 'name-only',
    });
  });

  it('strips Strong exercise-images people demos on sanitize while blocked', () => {
    const exercise: Exercise = {
      id: '1',
      slug: 'bench-press-barbell',
      name: 'Bench Press',
      muscleGroup: 'chest',
      secondaryMuscles: [],
      equipment: 'barbell',
      instructions: [],
      imageUrl: bucket,
      imageStyle: 'photo',
      source: 'pdf-import',
    };

    expect(sanitizeExerciseImage(exercise)).toEqual({
      ...exercise,
      imageUrl: undefined,
      imageStyle: 'name-only',
    });
  });

  it('does not build canonical Storage URLs while blocked', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://svcjdtlmmrisrkjqdsjt.supabase.co');
    expect(canonicalPdfStorageUrl('bicep-curl', 'dumbbell')).toBeUndefined();
    expect(canonicalPdfStorageUrl('totally-unknown-exercise')).toBeUndefined();
  });

  it('never prefers people-photo URLs while blocked', () => {
    expect(pickPreferredImageUrl('https://cdn.example.com/stock.jpg', bucket)).toBeUndefined();
    expect(pickPreferredImageUrl(bucket, undefined)).toBeUndefined();
  });
});
