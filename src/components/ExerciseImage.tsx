import { useEffect, useState } from 'react';
import { pdfIconUrl } from '../data/pdfIconSlugs';
import type { Exercise } from '../types';

/** Local PDF crop first, then stored/remote imageUrl. Dedupes identical paths. */
export function exerciseImageCandidates(exercise: Pick<Exercise, 'slug' | 'equipment' | 'imageUrl'>): string[] {
  const local = pdfIconUrl(exercise.slug, exercise.equipment);
  const remote = exercise.imageUrl?.trim();
  const candidates: string[] = [];
  if (local) {
    candidates.push(local);
  }
  if (remote && remote !== local) {
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
