import { resolvePdfIconSlug } from '../data/pdfIconSlugs';
import type { EquipmentKind, Exercise, ImageStyle } from '../types';

/**
 * Bump when image allowlist / sanitize rules change so clients re-strip stale URLs.
 * v3: verified IMG_3417 PDF diagram crops (anatomical illustrations, not photos) are
 * allowlisted again via Storage `exercise-images` + local `/exercise-icons/`.
 * Stock/FEDB/CDN people photographs remain rejected.
 */
export const EXERCISE_IMAGE_POLICY_VERSION = 3;

/**
 * Legacy nuclear switch. Kept false so verified PDF diagrams can render.
 * People photos are still blocked by the Storage-only persist allowlist below —
 * do not reintroduce arbitrary https hosts.
 */
export const BLOCK_PEOPLE_EXERCISE_IMAGES = false;

const EXERCISE_IMAGES_PUBLIC = '/storage/v1/object/public/exercise-images/';

/**
 * Durable URLs we may persist and display: Supabase `exercise-images` public objects.
 * Stock/FEDB/CDN people photos and arbitrary https hosts are rejected.
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
 * Blob previews (create form), local PDF diagrams, and Storage PDF crops are allowed.
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
  return `${base}${EXERCISE_IMAGES_PUBLIC}${resolved}.jpg`;
}

/**
 * Strip stock/people/local-icon URLs from a catalog row.
 * Keep only allowlisted Storage PDF diagram URLs.
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
