import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Exercise } from '../types';
import { ExerciseImage, exerciseImageCandidates } from './ExerciseImage';

const pdfPaired: Exercise = {
  id: 'ex-pushdown',
  slug: 'triceps-pushdown-cable-straight-bar',
  name: 'Triceps Pushdown (Cable - Straight Bar)',
  muscleGroup: 'triceps',
  secondaryMuscles: [],
  equipment: 'cable',
  instructions: [],
  imageStyle: 'name-only',
  source: 'pdf-import',
};

const boardBicep: Exercise = {
  id: 'ex-bicep',
  slug: 'bicep-curl',
  name: 'Bicep Curl',
  muscleGroup: 'biceps',
  secondaryMuscles: [],
  equipment: 'dumbbell',
  instructions: [],
  imageStyle: 'name-only',
  source: 'user-board',
};

describe('exerciseImageCandidates', () => {
  it('prefers durable remote imageUrl over local PDF icon (Vercel has no icon binaries)', () => {
    expect(
      exerciseImageCandidates({
        ...pdfPaired,
        imageUrl: 'https://example.com/remote.jpg',
      }),
    ).toEqual([
      'https://example.com/remote.jpg',
      '/exercise-icons/triceps-pushdown-cable-straight-bar.jpg',
    ]);
  });

  it('aliases board short slugs onto verified PDF crops when no remote URL', () => {
    expect(exerciseImageCandidates(boardBicep)).toEqual(['/exercise-icons/bicep-curl-dumbbell.jpg']);
  });

  it('ignores stamped local /exercise-icons paths stored as imageUrl', () => {
    expect(
      exerciseImageCandidates({
        ...pdfPaired,
        imageUrl: '/exercise-icons/triceps-pushdown-cable-straight-bar.jpg',
      }),
    ).toEqual(['/exercise-icons/triceps-pushdown-cable-straight-bar.jpg']);
  });
});

describe('ExerciseImage', () => {
  it('renders remote img first when imageUrl is https', () => {
    render(
      <ExerciseImage
        exercise={{ ...pdfPaired, imageUrl: 'https://example.com/remote.jpg' }}
        size="sm"
      />,
    );

    expect(screen.getByRole('img', { name: pdfPaired.name })).toHaveAttribute(
      'src',
      'https://example.com/remote.jpg',
    );
  });

  it('falls back to local PDF icon when remote errors', () => {
    render(
      <ExerciseImage
        exercise={{ ...pdfPaired, imageUrl: 'https://example.com/fallback.jpg' }}
        size="sm"
      />,
    );

    fireEvent.error(screen.getByRole('img', { name: pdfPaired.name }));

    expect(screen.getByRole('img', { name: pdfPaired.name })).toHaveAttribute(
      'src',
      '/exercise-icons/triceps-pushdown-cable-straight-bar.jpg',
    );
  });

  it('shows no-photo when no candidates remain', () => {
    render(
      <ExerciseImage
        exercise={{
          ...boardBicep,
          slug: 'totally-unknown-exercise',
          name: 'Totally Unknown',
        }}
      />,
    );

    expect(
      screen.getByRole('img', { name: 'No photo available for Totally Unknown' }),
    ).toBeInTheDocument();
  });
});
