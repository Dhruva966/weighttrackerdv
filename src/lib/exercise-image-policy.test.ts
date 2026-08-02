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

  it('allows Storage PDF diagram URLs and rejects stock people-photo hosts', () => {
    expect(BLOCK_PEOPLE_EXERCISE_IMAGES).toBe(false);
    expect(isAllowedPersistedImageUrl(bucket)).toBe(true);
    expect(isAllowedPersistedImageUrl('https://cdn.example.com/fedb/bench.jpg')).toBe(false);
    expect(isAllowedPersistedImageUrl('/exercise-icons/bench-press-barbell.jpg')).toBe(false);
  });

  it('allows local PDF diagrams and Storage URLs for render; blocks stock hosts', () => {
    expect(isLocalPdfIconPath('/exercise-icons/bench-press-barbell.jpg')).toBe(true);
    expect(isAllowedRenderImageUrl('/exercise-icons/bench-press-barbell.jpg')).toBe(true);
    expect(isAllowedRenderImageUrl(bucket)).toBe(true);
    expect(isAllowedRenderImageUrl('https://cdn.example.com/fedb/bench.jpg')).toBe(false);
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

  it('keeps allowlisted Storage PDF diagram URLs on sanitize', () => {
    const exercise: Exercise = {
      id: '1',
      slug: 'bench-press-barbell',
      name: 'Bench Press',
      muscleGroup: 'chest',
      secondaryMuscles: [],
      equipment: 'barbell',
      instructions: [],
      imageUrl: bucket,
      imageStyle: 'silhouette',
      source: 'pdf-import',
    };

    expect(sanitizeExerciseImage(exercise)).toEqual(exercise);
  });

  it('builds canonical Storage URLs for verified PDF diagram slugs', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://svcjdtlmmrisrkjqdsjt.supabase.co');
    expect(canonicalPdfStorageUrl('bicep-curl', 'dumbbell')).toBe(
      'https://svcjdtlmmrisrkjqdsjt.supabase.co/storage/v1/object/public/exercise-images/bicep-curl-dumbbell.jpg',
    );
    expect(canonicalPdfStorageUrl('totally-unknown-exercise')).toBeUndefined();
  });

  it('prefers allowlisted remote PDF URLs over empty local', () => {
    expect(pickPreferredImageUrl(undefined, bucket)).toBe(bucket);
    expect(pickPreferredImageUrl('https://cdn.example.com/stock.jpg', bucket)).toBe(bucket);
    expect(pickPreferredImageUrl('https://cdn.example.com/stock.jpg', undefined)).toBeUndefined();
  });
});
