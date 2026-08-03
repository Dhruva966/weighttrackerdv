import { resolvePdfIconSlug } from '../data/pdfIconSlugs';
import type { EquipmentKind, Exercise, ImageStyle } from '../types';

/**
 * Bump when image allowlist / sanitize rules change so clients re-strip stale URLs.
 * v5: IMG_3417 Strong crops are hollow/mannequin diagram figures — allowed as PDF art.
 * v6: Cache-bust Storage display URLs so browsers drop stale pre-purge people-photo bytes
 *     that shared the same object path as the hollow-model crops.
 * Still reject stock/FEDB/CDN real-person photos — only Supabase `exercise-images` (+ local crop paths for UI).
 */
export const EXERCISE_IMAGE_POLICY_VERSION = 6;

/**
 * Legacy nuclear switch (kept for emergency rollback). When true, hides all catalog images.
 * Off in v5: hollow-model Strong PDF crops are intended exercise art, not real-person photos.
 * Blob previews on the create form remain allowed for user uploads either way.
 */
export const BLOCK_PEOPLE_EXERCISE_IMAGES = false;

const EXERCISE_IMAGES_PUBLIC = '/storage/v1/object/public/exercise-images/';

/**
 * Durable URLs we may persist and display: Supabase `exercise-images` public objects.
 * Stock/FEDB/CDN real-person photos and arbitrary https hosts are rejected.
 * While BLOCK_PEOPLE_EXERCISE_IMAGES is true, nothing is allowlisted.
 */
export function isAllowedPersistedImageUrl(url: string | undefined | null): boolean {
  if (BLOCK_PEOPLE_EXERCISE_IMAGES) return false;
  const trimmed = url?.trim();
  if (!trimmed) return false;
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.pathname.includes(EXERCISE_IMAGES_PUBLIC);
  } catch {
    return false;
  }
}

/** Local PDF crop path — UI-only candidate, never persist as imageUrl. */
export function isLocalPdfIconPath(url: string | undefined | null): boolean {
  return Boolean(url?.trim().startsWith('/exercise-icons/'));
}

/**
 * True when the URL may appear in <img> candidates.
 * Blob previews (create form) stay allowed; stock/FEDB hosts stay blocked.
 */
export function isAllowedRenderImageUrl(url: string | undefined | null): boolean {
  const trimmed = url?.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('blob:')) return true;
  if (BLOCK_PEOPLE_EXERCISE_IMAGES) return false;
  if (isLocalPdfIconPath(trimmed)) return true;
  return isAllowedPersistedImageUrl(trimmed);
}

/** Canonical public Storage URL for a verified PDF diagram slug. */
export function canonicalPdfStorageUrl(
  slug: string,
  equipment?: EquipmentKind,
): string | undefined {
  if (BLOCK_PEOPLE_EXERCISE_IMAGES) return undefined;
  const resolved = resolvePdfIconSlug(slug, equipment);
  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
  if (!resolved || !base) return undefined;
  return withExerciseImageCacheBust(`${base}${EXERCISE_IMAGES_PUBLIC}${resolved}.jpg`);
}

/**
 * Append policy version so <img> requests skip browser caches of older people-photo
 * bytes that once lived at the same Storage object path.
 * Persist without the query string; only display URLs need the bust.
 */
export function withExerciseImageCacheBust(url: string | undefined | null): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed || !isAllowedPersistedImageUrl(trimmed)) return undefined;
  try {
    const parsed = new URL(trimmed);
    parsed.searchParams.set('v', String(EXERCISE_IMAGE_POLICY_VERSION));
    return parsed.toString();
  } catch {
    return undefined;
  }
}

/**
 * Strip stock/people/local-icon URLs from a catalog row.
 * Keep only allowlisted Storage PDF diagram URLs when the block is off.
 */
export function sanitizeExerciseImage(exercise: Exercise): Exercise {
  if (!exercise.imageUrl && exercise.imageStyle !== 'photo') {
    return exercise;
  }

  if (!BLOCK_PEOPLE_EXERCISE_IMAGES && isAllowedPersistedImageUrl(exercise.imageUrl)) {
    return exercise;
  }

  if (!exercise.imageUrl && exercise.imageStyle === 'photo') {
    return { ...exercise, imageStyle: 'name-only' };
  }

  if (!exercise.imageUrl) {
    return exercise;
  }

  const nextStyle: ImageStyle =
    exercise.imageStyle === 'photo' ? 'name-only' : exercise.imageStyle;

  return {
    ...exercise,
    imageUrl: undefined,
    imageStyle: nextStyle,
  };
}

/** Prefer a durable allowlisted remote PDF URL when filling gaps or replacing stock. */
export function pickPreferredImageUrl(
  localUrl: string | undefined,
  remoteUrl: string | undefined,
): string | undefined {
  if (BLOCK_PEOPLE_EXERCISE_IMAGES) return undefined;
  const remote = isAllowedPersistedImageUrl(remoteUrl) ? remoteUrl!.trim() : undefined;
  const local = isAllowedPersistedImageUrl(localUrl) ? localUrl!.trim() : undefined;
  return remote ?? local;
}
