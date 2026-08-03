import { useEffect, useState } from 'react';
import { pdfIconUrl } from '../data/pdfIconSlugs';
import {
  canonicalPdfStorageUrl,
  isAllowedPersistedImageUrl,
  isAllowedRenderImageUrl,
  withExerciseImageCacheBust,
} from '../lib/exercise-image-policy';
import type { Exercise } from '../types';

/**
 * Prefer durable allowlisted Storage artwork, then local icon crops.
 * Hollow-model Strong PDF crops are allowed; stock/FEDB real-person hosts are not.
 * Storage candidates are cache-busted so stale people-photo bytes never stick.
 */
export function exerciseImageCandidates(exercise: Pick<Exercise, 'slug' | 'equipment' | 'imageUrl'>): string[] {
  const candidates: string[] = [];
  const push = (url: string | undefined) => {
    const trimmed = url?.trim();
    if (!trimmed || !isAllowedRenderImageUrl(trimmed) || candidates.includes(trimmed)) {
      return;
    }
    candidates.push(trimmed);
  };

  const remote = exercise.imageUrl?.trim();
  if (remote && isAllowedPersistedImageUrl(remote)) {
    push(withExerciseImageCacheBust(remote));
  }

  push(canonicalPdfStorageUrl(exercise.slug, exercise.equipment));
  push(pdfIconUrl(exercise.slug, exercise.equipment));

  return candidates;
}

export function ExerciseImage({
  exercise,
  size = 'md',
}: {
  exercise: Exercise;
  size?: 'sm' | 'md';
}) {
  const candidates = exerciseImageCandidates(exercise);
  const [index, setIndex] = useState(0);
  const boxClass = size === 'sm' ? 'h-12 w-12 rounded-lg text-[10px]' : 'h-16 w-16 rounded-xl text-xs';

  useEffect(() => {
    setIndex(0);
  }, [exercise.id, exercise.slug, exercise.equipment, exercise.imageUrl]);

  const src = candidates[index];
  if (src) {
    return (
      <img
        className={`${boxClass} shrink-0 object-cover`}
        src={src}
        alt={exercise.name}
        loading="lazy"
        onError={() => {
          setIndex((current) => (current + 1 < candidates.length ? current + 1 : candidates.length));
        }}
      />
    );
  }

  return (
    <div
      className={`grid ${boxClass} shrink-0 place-items-center border border-dashed border-border bg-surfaceAlt text-center font-medium text-fgMuted`}
      role="img"
      aria-label={`No photo available for ${exercise.name}`}
    >
      No photo
    </div>
  );
}
