import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

const storagePdf =
  'https://svcjdtlmmrisrkjqdsjt.supabase.co/storage/v1/object/public/exercise-images/triceps-pushdown-cable-straight-bar.jpg';

describe('exerciseImageCandidates', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefers allowlisted Storage PDF URL, then local PDF diagram', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://svcjdtlmmrisrkjqdsjt.supabase.co');
    expect(
      exerciseImageCandidates({
        ...pdfPaired,
        imageUrl: storagePdf,
      }),
    ).toEqual([
      storagePdf,
      '/exercise-icons/triceps-pushdown-cable-straight-bar.jpg',
    ]);
  });

  it('ignores stock people-photo hosts', () => {
    expect(
      exerciseImageCandidates({
        ...pdfPaired,
        imageUrl: 'https://cdn.example.com/fedb/triceps-pushdown.jpg',
      }),
    ).toEqual(['/exercise-icons/triceps-pushdown-cable-straight-bar.jpg']);
  });

  it('aliases board short slugs onto verified PDF diagram crops', () => {
    expect(exerciseImageCandidates(boardBicep)).toEqual([
      '/exercise-icons/bicep-curl-dumbbell.jpg',
    ]);
  });

  it('builds canonical Storage candidate when env is set', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://svcjdtlmmrisrkjqdsjt.supabase.co');
    expect(exerciseImageCandidates(pdfPaired)).toEqual([
      'https://svcjdtlmmrisrkjqdsjt.supabase.co/storage/v1/object/public/exercise-images/triceps-pushdown-cable-straight-bar.jpg',
      '/exercise-icons/triceps-pushdown-cable-straight-bar.jpg',
    ]);
  });
});

describe('ExerciseImage', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders Storage PDF diagram when allowlisted', () => {
    render(
      <ExerciseImage
        exercise={{ ...pdfPaired, imageUrl: storagePdf }}
        size="sm"
      />,
    );

    expect(screen.getByRole('img', { name: pdfPaired.name })).toHaveAttribute('src', storagePdf);
  });

  it('does not render stock people-photo URLs', () => {
    render(
      <ExerciseImage
        exercise={{
          ...pdfPaired,
          imageUrl: 'https://cdn.example.com/fedb/triceps-pushdown.jpg',
        }}
        size="sm"
      />,
    );

    expect(screen.getByRole('img', { name: pdfPaired.name })).toHaveAttribute(
      'src',
      '/exercise-icons/triceps-pushdown-cable-straight-bar.jpg',
    );
  });

  it('falls back to local PDF icon when remote errors', () => {
    render(
      <ExerciseImage
        exercise={{ ...pdfPaired, imageUrl: storagePdf }}
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

  it('keeps letter-tile style exercises name-only', () => {
    render(
      <ExerciseImage
        exercise={{
          id: 'ex-yoga',
          slug: 'yoga',
          name: 'Yoga',
          muscleGroup: 'full-body',
          secondaryMuscles: [],
          equipment: 'other',
          instructions: [],
          imageStyle: 'name-only',
          source: 'pdf-import',
        }}
      />,
    );

    expect(screen.getByRole('img', { name: 'No photo available for Yoga' })).toBeInTheDocument();
  });
});
