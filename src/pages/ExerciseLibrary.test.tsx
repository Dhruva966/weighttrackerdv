import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useWorkoutStore } from '../stores/workoutStore';
import { ExerciseLibrary } from './ExerciseLibrary';

function resetStores() {
  useWorkoutStore.setState({
    exercises: [],
    sessions: [],
    sets: [],
    goals: [],
  });
}

describe('ExerciseLibrary buttons', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStores();
    useWorkoutStore.getState().addExercise({
      name: 'Zorp Bicep Curl',
      muscleGroup: 'biceps',
      equipment: 'dumbbell',
    });
    useWorkoutStore.getState().addExercise({
      name: 'Zorp Leg Extension',
      muscleGroup: 'quads',
      equipment: 'machine',
    });
    useWorkoutStore.getState().addExercise({
      name: 'Zorp Bench Press',
      muscleGroup: 'chest',
      equipment: 'barbell',
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('links New to create and shows clear search when query is set', () => {
    render(
      <MemoryRouter>
        <ExerciseLibrary />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /new/i })).toHaveAttribute('href', '/exercises/new');

    fireEvent.change(screen.getByPlaceholderText(/search by exercise or equipment/i), {
      target: { value: 'Zorp Bicep Curl' },
    });
    expect(screen.getByText('Zorp Bicep Curl')).toBeInTheDocument();
    expect(screen.queryByText('Zorp Bench Press')).not.toBeInTheDocument();
    expect(screen.queryByText('Zorp Leg Extension')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /clear search/i }));
    expect(screen.getByPlaceholderText(/search by exercise or equipment/i)).toHaveValue('');
    expect(screen.getByText('Zorp Bench Press')).toBeInTheDocument();
  });

  it('arms and legs chips include form-specific muscle groups', () => {
    render(
      <MemoryRouter>
        <ExerciseLibrary />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /^arms$/i }));
    expect(screen.getByText('Zorp Bicep Curl')).toBeInTheDocument();
    expect(screen.queryByText('Zorp Bench Press')).not.toBeInTheDocument();
    expect(screen.queryByText('Zorp Leg Extension')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^legs$/i }));
    expect(screen.getByText('Zorp Leg Extension')).toBeInTheDocument();
    expect(screen.queryByText('Zorp Bicep Curl')).not.toBeInTheDocument();
  });

  it('pencil edit opens the matching slug with return-to library state', () => {
    render(
      <MemoryRouter>
        <ExerciseLibrary />
      </MemoryRouter>,
    );

    const edit = screen.getByRole('link', { name: /edit zorp bench press/i });
    expect(edit).toHaveAttribute('href', '/exercises/zorp-bench-press/edit');
  });
});
