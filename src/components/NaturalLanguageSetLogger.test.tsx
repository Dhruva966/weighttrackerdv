import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { starterExercises, starterGoals, starterSets } from '../data/catalog';
import { USER_ID } from '../lib/user';
import { BOARD_HISTORY_SEED_VERSION, useWorkoutStore } from '../stores/workoutStore';
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

const stretchingExercise: Exercise = {
  id: 'ex-stretching',
  slug: 'stretching',
  name: 'Stretching',
  muscleGroup: 'full-body',
  secondaryMuscles: [],
  equipment: 'bodyweight',
  instructions: [],
  imageStyle: 'name-only',
  source: 'user-created',
};

beforeEach(() => {
  useWorkoutStore.setState({
    exercises: [...starterExercises, stretchingExercise],
    goals: starterGoals,
    sessions: [{ id: 'session-1', userId: USER_ID, startedAt: '2026-07-30T12:00:00.000Z' }],
    sets: starterSets,
    historyCleared: false,
    boardHistorySeedVersion: BOARD_HISTORY_SEED_VERSION,
  });
});

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

  it('uses a slim Log field with an optional previous-workout placeholder', () => {
    render(<NaturalLanguageSetLogger sessionId="session-1" exercise={baseExercise} />);

    expect(screen.getByLabelText(/^log$/i)).toBeInTheDocument();
    expect(screen.queryByText(/log in your own words/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/claude \(via supabase\)/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^log$/i)).toHaveAttribute('placeholder', '');
    expect(screen.queryByText(/first set was 8 reps/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/helped by a friend/i)).not.toBeInTheDocument();
  });

  it('shows a faded previous-session weight, reps, sets placeholder', () => {
    useWorkoutStore.setState({
      sessions: [
        { id: 'prior', userId: USER_ID, startedAt: '2026-07-20T12:00:00.000Z' },
        { id: 'session-1', userId: USER_ID, startedAt: '2026-07-30T12:00:00.000Z' },
      ],
      sets: [
        {
          id: 's1',
          sessionId: 'prior',
          exerciseId: baseExercise.id,
          setNumber: 1,
          weightLb: 44,
          reps: 8,
          isWarmup: false,
          isPr: false,
          createdAt: '2026-07-20T12:01:00.000Z',
        },
        {
          id: 's2',
          sessionId: 'prior',
          exerciseId: baseExercise.id,
          setNumber: 2,
          weightLb: 44,
          reps: 8,
          isWarmup: false,
          isPr: false,
          createdAt: '2026-07-20T12:02:00.000Z',
        },
        {
          id: 's3',
          sessionId: 'prior',
          exerciseId: baseExercise.id,
          setNumber: 3,
          weightLb: 44,
          reps: 7,
          isWarmup: false,
          isPr: false,
          createdAt: '2026-07-20T12:03:00.000Z',
        },
      ],
    });

    render(<NaturalLanguageSetLogger sessionId="session-1" exercise={baseExercise} />);

    expect(screen.getByLabelText(/^log$/i)).toHaveAttribute('placeholder', '44, 8, 3');
  });

  it('logs duration-only text for Stretching as a cardio duration set', async () => {
    render(
      <NaturalLanguageSetLogger sessionId="session-1" exercise={stretchingExercise} />,
    );

    fireEvent.change(screen.getByLabelText(/^log$/i), { target: { value: '15 minutes' } });
    fireEvent.click(screen.getByRole('button', { name: /log sets/i }));

    await waitFor(() => {
      const logged = useWorkoutStore
        .getState()
        .sets.find(
          (setItem) =>
            setItem.sessionId === 'session-1' && setItem.exerciseId === stretchingExercise.id,
        );
      expect(logged?.durationSec).toBe(900);
    });

    expect(screen.queryByText(/could not find sets/i)).not.toBeInTheDocument();
    expect(screen.getByText(/15 min/i)).toBeInTheDocument();
  });

  it('hints duration when a duration attempt fails to parse', async () => {
    render(
      <NaturalLanguageSetLogger sessionId="session-1" exercise={stretchingExercise} />,
    );

    fireEvent.change(screen.getByLabelText(/^log$/i), {
      target: { value: '15 min then 10 min' },
    });
    fireEvent.click(screen.getByRole('button', { name: /log sets/i }));

    await waitFor(() => {
      expect(screen.getByText(/try duration like/i)).toBeInTheDocument();
    });
  });
});
