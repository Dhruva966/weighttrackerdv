import type { Exercise } from '../types';

export function ExerciseImage({ exercise }: { exercise: Exercise }) {
  if (exercise.imageUrl) {
    return (
      <img
        className="h-32 w-full rounded-xl object-cover"
        src={exercise.imageUrl}
        alt={exercise.name}
        loading="lazy"
      />
    );
  }

  return (
    <div className="grid h-32 w-full place-items-center rounded-xl border border-dashed border-border bg-surfaceAlt px-4 text-center">
      <span className="text-lg font-medium text-fg">{exercise.name}</span>
    </div>
  );
}
