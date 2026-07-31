import { useEffect, useState } from 'react';
import { pdfIconUrl } from '../data/pdfIconSlugs';
import type { Exercise } from '../types';

function isDurableRemoteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith('blob:');
}

/**
 * Prefer durable Supabase/blob URLs first. Local `/exercise-icons/*` are gitignored
 * and are not deployed to Vercel (SPA returns HTML 200), so putting them first
 * blanked Library photos in production even when `image_url` was fine.
 */
export function exerciseImageCandidates(exercise: Pick<Exercise, 'slug' | 'equipment' | 'imageUrl'>): string[] {
  const local = pdfIconUrl(exercise.slug, exercise.equipment);
  const remote = exercise.imageUrl?.trim();
  const candidates: string[] = [];

  if (remote && isDurableRemoteUrl(remote)) {
    candidates.push(remote);
  }

  if (local && !candidates.includes(local)) {
    candidates.push(local);
  }

  // Non-http stored paths (rare) after durable remotes / local crops.
  if (
    remote &&
    !isDurableRemoteUrl(remote) &&
    !remote.startsWith('/exercise-icons/') &&
    !candidates.includes(remote)
  ) {
    candidates.push(remote);
  }

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
