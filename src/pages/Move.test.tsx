import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { starterExercises, starterGoals, starterSets } from '../data/catalog';
import { BOARD_HISTORY_SEED_VERSION, useWorkoutStore } from '../stores/workoutStore';
import { Move } from './Move';

function resetStores() {
  useWorkoutStore.setState({
    exercises: starterExercises,
    goals: starterGoals,
    sessions: [],
    sets: starterSets,
    historyCleared: false,
    boardHistorySeedVersion: BOARD_HISTORY_SEED_VERSION,
  });
}

function renderMove() {
  return render(
    <MemoryRouter>
      <Move />
    </MemoryRouter>,
  );
}

describe('Move', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStores();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows the resume banner linking to today’s open session, above the Templates row', () => {
    const session = useWorkoutStore.getState().createSession();
    const exercise = starterExercises[0];
    useWorkoutStore.getState().addSet({
      sessionId: session.id,
      exerciseId: exercise.id,
      weightLb: 100,
      reps: 8,
      isWarmup: false,
    });
    useWorkoutStore.getState().addSet({
      sessionId: session.id,
      exerciseId: exercise.id,
      weightLb: 105,
      reps: 6,
      isWarmup: false,
    });

    renderMove();

    const resumeLink = screen.getByRole('link', { name: /continue today’s workout/i });
    expect(resumeLink).toHaveAttribute('href', `/session/${session.id}`);
    expect(screen.getByText(/2 sets logged so far/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /start empty workout/i })).not.toBeInTheDocument();

    // Banner renders before the Templates row in document order (prominent, not buried).
    const body = document.body.innerHTML;
    expect(body.indexOf('Continue today')).toBeLessThan(body.indexOf('Templates'));
  });

  it('shows a one-tap start-empty-workout affordance when there is no session today', () => {
    renderMove();

    const startLink = screen.getByRole('link', { name: /start empty workout/i });
    expect(startLink).toHaveAttribute('href', '/session/new');
    expect(screen.queryByRole('link', { name: /continue today’s workout/i })).not.toBeInTheDocument();
  });

  it('falls back to start-empty-workout when today’s only session is already ended', () => {
    const session = useWorkoutStore.getState().createSession();
    useWorkoutStore.getState().endSession(session.id);

    renderMove();

    expect(screen.getByRole('link', { name: /start empty workout/i })).toHaveAttribute('href', '/session/new');
    expect(screen.queryByRole('link', { name: /continue today’s workout/i })).not.toBeInTheDocument();
  });

  it('still renders the Templates link and page title alongside the banner', () => {
    renderMove();

    expect(screen.getByRole('heading', { name: 'Move' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /templates/i })).toHaveAttribute('href', '/templates');
  });
});
