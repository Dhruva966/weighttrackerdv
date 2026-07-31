import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import type { Exercise } from '../types';
import { ExerciseCard } from './ExerciseCard';

const baseExercise: Exercise = {
  id: 'exercise-1',
  slug: 'incline-dumbbell-press',
  name: 'Incline Dumbbell Press',
  muscleGroup: 'chest',
  secondaryMuscles: ['triceps'],
  equipment: 'dumbbell',
  instructions: [],
  setupNotes: ['Bench at 30 degrees', 'Use a neutral grip'],
  imageStyle: 'photo',
  source: 'seed',
};

function renderCard(exercise: Exercise) {
  return render(
    <MemoryRouter>
      <ExerciseCard exercise={exercise} />
    </MemoryRouter>,
  );
}

describe('ExerciseCard', () => {
  it('renders a photo before its name and links to the exercise detail', () => {
    renderCard({ ...baseExercise, imageUrl: 'https://example.com/incline-press.jpg' });

    const image = screen.getByRole('img', { name: 'Incline Dumbbell Press' });
    const name = screen.getByRole('heading', { name: 'Incline Dumbbell Press' });

    expect(image.compareDocumentPosition(name) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Edit Incline Dumbbell Press' })).toHaveAttribute(
      'href',
      '/exercises/incline-dumbbell-press/edit',
    );
    const detailLink = screen.getAllByRole('link').find((link) => link.getAttribute('href') === '/exercises/incline-dumbbell-press');
    expect(detailLink).toBeTruthy();
    expect(screen.getByText('chest / dumbbell')).toBeInTheDocument();
    expect(screen.getByText('Bench at 30 degrees / Use a neutral grip')).toBeInTheDocument();
  });

  it('shows an accessible no-photo state when no image URL exists', () => {
    renderCard(baseExercise);

    expect(screen.getByRole('img', { name: 'No photo available for Incline Dumbbell Press' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Incline Dumbbell Press' })).not.toBeInTheDocument();
  });

  it('replaces a failed image with the accessible no-photo state', () => {
    renderCard({ ...baseExercise, imageUrl: 'https://example.com/missing.jpg' });

    fireEvent.error(screen.getByRole('img', { name: 'Incline Dumbbell Press' }));

    expect(screen.getByRole('img', { name: 'No photo available for Incline Dumbbell Press' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Incline Dumbbell Press' })).not.toBeInTheDocument();
  });
});
