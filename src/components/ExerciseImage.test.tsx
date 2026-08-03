import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
const storagePdfBusted = `${storagePdf}?v=6`;

describe('exerciseImageCandidates', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefers Storage hollow-model PDF URLs when present', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://svcjdtlmmrisrkjqdsjt.supabase.co');
    expect(
      exerciseImageCandidates({
        ...pdfPaired,
        imageUrl: storagePdf,
      }),
    ).toEqual([
      storagePdfBusted,
      '/exercise-icons/triceps-pushdown-cable-straight-bar.jpg',
    ]);
  });

  it('ignores stock real-person photo hosts but still offers hollow-model PDF art', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://svcjdtlmmrisrkjqdsjt.supabase.co');
    expect(
      exerciseImageCandidates({
        ...pdfPaired,
        imageUrl: 'https://cdn.example.com/fedb/triceps-pushdown.jpg',
      }),
    ).toEqual([
      'https://svcjdtlmmrisrkjqdsjt.supabase.co/storage/v1/object/public/exercise-images/triceps-pushdown-cable-straight-bar.jpg?v=6',
      '/exercise-icons/triceps-pushdown-cable-straight-bar.jpg',
    ]);
  });

  it('aliases board slugs onto Strong crops when a PDF pair exists', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://svcjdtlmmrisrkjqdsjt.supabase.co');
    const candidates = exerciseImageCandidates(boardBicep);
    expect(candidates[0]).toContain('/storage/v1/object/public/exercise-images/');
    expect(candidates).toContain('/exercise-icons/bicep-curl-dumbbell.jpg');
  });
});

describe('ExerciseImage', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders Storage hollow-model PDF image when URL is allowlisted', () => {
    render(
      <ExerciseImage
        exercise={{ ...pdfPaired, imageUrl: storagePdf }}
        size="sm"
      />,
    );

    expect(screen.getByRole('img', { name: pdfPaired.name })).toHaveAttribute('src', storagePdfBusted);
  });

  it('falls back to Storage hollow-model art when stock hosts are rejected', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://svcjdtlmmrisrkjqdsjt.supabase.co');
    render(
      <ExerciseImage
        exercise={{
          ...pdfPaired,
          imageUrl: 'https://cdn.example.com/fedb/triceps-pushdown.jpg',
        }}
        size="sm"
      />,
    );

    const img = screen.getByRole('img', { name: pdfPaired.name });
    expect(img).toHaveAttribute(
      'src',
      'https://svcjdtlmmrisrkjqdsjt.supabase.co/storage/v1/object/public/exercise-images/triceps-pushdown-cable-straight-bar.jpg?v=6',
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

  it('keeps letter-tile cardio with no crop as name-only', () => {
    render(
      <ExerciseImage
        exercise={{
          id: 'ex-swimming',
          slug: 'swimming',
          name: 'Swimming',
          muscleGroup: 'cardio',
          secondaryMuscles: [],
          equipment: 'other',
          instructions: [],
          imageStyle: 'name-only',
          source: 'pdf-import',
        }}
      />,
    );

    expect(screen.getByRole('img', { name: 'No photo available for Swimming' })).toBeInTheDocument();
  });

  it('aliases yoga letter-tile to stretching hollow-model crop', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://svcjdtlmmrisrkjqdsjt.supabase.co');
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

    expect(screen.getByRole('img', { name: 'Yoga' })).toHaveAttribute(
      'src',
      'https://svcjdtlmmrisrkjqdsjt.supabase.co/storage/v1/object/public/exercise-images/stretching.jpg?v=6',
    );
  });
});
