import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { starterExercises, starterGoals, starterSets } from '../data/catalog';
import { useWorkoutStore } from '../stores/workoutStore';
import { Progress } from './Progress';

describe('Progress', () => {
  beforeEach(() => {
    useWorkoutStore.setState({
      exercises: starterExercises,
      goals: starterGoals,
      sessions: [],
      sets: starterSets,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('labels the exercise selector and disables empty imports', () => {
    render(<Progress />);

    expect(screen.getByLabelText(/exercise for progress chart/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import lift notes/i })).toBeDisabled();

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Bench 185 x 5' },
    });
    expect(screen.getByRole('button', { name: /import lift notes/i })).not.toBeDisabled();
  });
});
