import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Exercise } from '../types';
import { NaturalLanguageSetLogger } from './NaturalLanguageSetLogger';

const baseExercise: Exercise = {
  id: 'ex-test-logger',
  slug: 'test-logger-exercise',
  name: 'Test Logger Exercise',
  muscleGroup: 'back',
  secondaryMuscles: [],
  equipment: 'machine',
  instructions: [],
  imageStyle: 'name-only',
  source: 'user-created',
};

describe('NaturalLanguageSetLogger', () => {
  it('shows machine setup notes when the exercise has them', () => {
    render(
      <NaturalLanguageSetLogger
        sessionId="session-1"
        exercise={{ ...baseExercise, setupNotes: ['Seat 5', 'Pin 8'] }}
      />,
    );

    expect(screen.getByText('Seat 5')).toBeInTheDocument();
    expect(screen.getByText('Pin 8')).toBeInTheDocument();
  });

  it('renders nothing extra when the exercise has no setup notes', () => {
    render(<NaturalLanguageSetLogger sessionId="session-1" exercise={baseExercise} />);

    expect(screen.queryByText('Seat 5')).not.toBeInTheDocument();
  });
});
