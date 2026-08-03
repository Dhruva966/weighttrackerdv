import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Exercise } from '../types';
import {
  BLOCK_PEOPLE_EXERCISE_IMAGES,
  EXERCISE_IMAGE_POLICY_VERSION,
  canonicalPdfStorageUrl,
  isAllowedPersistedImageUrl,
  isAllowedRenderImageUrl,
  isLocalPdfIconPath,
  pickPreferredImageUrl,
  sanitizeExerciseImage,
  withExerciseImageCacheBust,
} from './exercise-image-policy';

const bucket =
  'https://svcjdtlmmrisrkjqdsjt.supabase.co/storage/v1/object/public/exercise-images/bench-press-barbell.jpg';

describe('exercise-image-policy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows Supabase exercise-images hollow-model PDF art (v6)', () => {
    expect(BLOCK_PEOPLE_EXERCISE_IMAGES).toBe(false);
    expect(EXERCISE_IMAGE_POLICY_VERSION).toBe(6);
    expect(isAllowedPersistedImageUrl(bucket)).toBe(true);
    expect(isAllowedPersistedImageUrl('https://cdn.example.com/fedb/bench.jpg')).toBe(false);
    expect(isAllowedPersistedImageUrl('/exercise-icons/bench-press-barbell.jpg')).toBe(false);
  });

  it('allows blob previews, local Strong crops, and Storage; blocks other hosts', () => {
    expect(isLocalPdfIconPath('/exercise-icons/bench-press-barbell.jpg')).toBe(true);
    expect(isAllowedRenderImageUrl('/exercise-icons/bench-press-barbell.jpg')).toBe(true);
    expect(isAllowedRenderImageUrl(bucket)).toBe(true);
    expect(isAllowedRenderImageUrl('https://cdn.example.com/fedb/bench.jpg')).toBe(false);
    expect(isAllowedRenderImageUrl('blob:http://localhost/1')).toBe(true);
  });

  it('strips stock real-person photo URLs on sanitize', () => {
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

  it('keeps Storage hollow-model PDF URLs on sanitize', () => {
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

  it('builds canonical Storage URLs for known PDF icon slugs', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://svcjdtlmmrisrkjqdsjt.supabase.co');
    expect(canonicalPdfStorageUrl('bicep-curl', 'dumbbell')).toBe(
      'https://svcjdtlmmrisrkjqdsjt.supabase.co/storage/v1/object/public/exercise-images/bicep-curl-dumbbell.jpg?v=6',
    );
    expect(canonicalPdfStorageUrl('close-grip-pulldown')).toBe(
      'https://svcjdtlmmrisrkjqdsjt.supabase.co/storage/v1/object/public/exercise-images/lat-pulldown-underhand-cable.jpg?v=6',
    );
    expect(canonicalPdfStorageUrl('seated-calf-raise-machine')).toBe(
      'https://svcjdtlmmrisrkjqdsjt.supabase.co/storage/v1/object/public/exercise-images/seated-calf-raise-plate-loaded.jpg?v=6',
    );
    expect(canonicalPdfStorageUrl('totally-unknown-exercise')).toBeUndefined();
  });

  it('cache-busts Storage display URLs without changing allowlist checks', () => {
    expect(isAllowedPersistedImageUrl(`${bucket}?v=6`)).toBe(true);
    expect(withExerciseImageCacheBust(bucket)).toBe(`${bucket}?v=6`);
    expect(withExerciseImageCacheBust('https://cdn.example.com/fedb/bench.jpg')).toBeUndefined();
  });

  it('prefers allowlisted Storage URLs over stock hosts', () => {
    expect(pickPreferredImageUrl(undefined, bucket)).toBe(bucket);
    expect(pickPreferredImageUrl('https://cdn.example.com/stock.jpg', bucket)).toBe(bucket);
    expect(pickPreferredImageUrl('https://cdn.example.com/stock.jpg', undefined)).toBeUndefined();
  });
});
