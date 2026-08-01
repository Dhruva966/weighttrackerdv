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

const peopleRemote =
  'https://svcjdtlmmrisrkjqdsjt.supabase.co/storage/v1/object/public/exercise-images/triceps-pushdown-cable-straight-bar.jpg';

describe('exerciseImageCandidates', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns no candidates for Strong people-photo Storage URLs while blocked', () => {
    expect(
      exerciseImageCandidates({
        ...pdfPaired,
        imageUrl: peopleRemote,
      }),
    ).toEqual([]);
  });

  it('ignores stock people-photo hosts', () => {
    expect(
      exerciseImageCandidates({
        ...pdfPaired,
        imageUrl: 'https://cdn.example.com/fedb/triceps-pushdown.jpg',
      }),
    ).toEqual([]);
  });

  it('does not invent Storage URLs from slug while people images are blocked', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://svcjdtlmmrisrkjqdsjt.supabase.co');
    expect(exerciseImageCandidates(pdfPaired)).toEqual([]);
  });

  it('does not use local Strong people-icon paths', () => {
    expect(exerciseImageCandidates(boardBicep)).toEqual([]);
    expect(
      exerciseImageCandidates({
        ...pdfPaired,
        imageUrl: '/exercise-icons/triceps-pushdown-cable-straight-bar.jpg',
      }),
    ).toEqual([]);
  });
});

describe('ExerciseImage', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not render Strong people-photo Storage URLs', () => {
    render(
      <ExerciseImage
        exercise={{ ...pdfPaired, imageUrl: peopleRemote }}
        size="sm"
      />,
    );

    expect(
      screen.getByRole('img', { name: `No photo available for ${pdfPaired.name}` }),
    ).toBeInTheDocument();
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

    expect(
      screen.getByRole('img', { name: `No photo available for ${pdfPaired.name}` }),
    ).toBeInTheDocument();
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
