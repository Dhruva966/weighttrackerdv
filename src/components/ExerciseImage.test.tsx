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
  it('prefers local PDF icon over remote imageUrl for paired slugs', () => {
    expect(
      exerciseImageCandidates({
        ...pdfPaired,
        imageUrl: 'https://example.com/remote.jpg',
      }),
    ).toEqual([
      '/exercise-icons/triceps-pushdown-cable-straight-bar.jpg',
      'https://example.com/remote.jpg',
    ]);
  });

  it('aliases board short slugs onto verified PDF crops', () => {
    expect(exerciseImageCandidates(boardBicep)).toEqual(['/exercise-icons/bicep-curl-dumbbell.jpg']);
  });
});

describe('ExerciseImage', () => {
  it('renders an img for a known PDF-paired slug', () => {
    render(<ExerciseImage exercise={pdfPaired} size="sm" />);

    expect(screen.getByRole('img', { name: pdfPaired.name })).toHaveAttribute(
      'src',
      '/exercise-icons/triceps-pushdown-cable-straight-bar.jpg',
    );
  });

  it('falls back to remote imageUrl when the local icon errors', () => {
    render(
      <ExerciseImage
        exercise={{ ...pdfPaired, imageUrl: 'https://example.com/fallback.jpg' }}
        size="sm"
      />,
    );

    fireEvent.error(screen.getByRole('img', { name: pdfPaired.name }));

    expect(screen.getByRole('img', { name: pdfPaired.name })).toHaveAttribute(
      'src',
      'https://example.com/fallback.jpg',
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
