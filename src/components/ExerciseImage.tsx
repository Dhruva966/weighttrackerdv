import { useEffect, useState } from 'react';
import type { Exercise } from '../types';

export function ExerciseImage({ exercise }: { exercise: Exercise }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [exercise.imageUrl]);

  if (exercise.imageUrl && !failed) {
    return (
      <img
        className="h-16 w-16 shrink-0 rounded-xl object-cover"
        src={exercise.imageUrl}
        alt={exercise.name}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-dashed border-border bg-surfaceAlt text-center text-xs font-medium text-fgMuted"
      role="img"
      aria-label={`No photo available for ${exercise.name}`}
    >
      No photo
    </div>
  );
}
