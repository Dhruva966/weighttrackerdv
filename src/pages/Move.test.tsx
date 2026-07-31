import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { starterExercises, starterGoals, starterSets } from '../data/catalog';
import { BOARD_HISTORY_SEED_VERSION, useWorkoutStore } from '../stores/workoutStore';
import { useTemplateStore } from '../stores/templateStore';
import { Move } from './Move';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function resetStores() {
  useWorkoutStore.setState({
    exercises: starterExercises,
    goals: starterGoals,
    sessions: [],
    sets: starterSets,
    historyCleared: false,
    boardHistorySeedVersion: BOARD_HISTORY_SEED_VERSION,
  });
  useTemplateStore.setState({
    templates: [],
    templateExercises: [],
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
    navigateMock.mockReset();
    resetStores();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows exactly one accessible continue action for today’s open session', () => {
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

    const resumeLinks = screen.getAllByRole('link', { name: /continue today’s workout/i });
    expect(resumeLinks).toHaveLength(1);

    const [resumeLink] = resumeLinks;
    expect(resumeLink).toHaveAttribute('href', `/session/${session.id}`);
    expect(screen.getByText(/2 sets logged so far/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /start empty workout/i })).not.toBeInTheDocument();
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

  it('puts templates first: starters are startable and calendar/cardio UI stays off Move', () => {
    renderMove();

    expect(screen.getByRole('heading', { name: 'Move' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Templates' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Example templates' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^all$/i })).toHaveAttribute('href', '/templates');
    expect(screen.getByRole('link', { name: /^new$/i })).toHaveAttribute('href', '/templates/new');
    expect(screen.getByRole('link', { name: /browse exercises/i })).toHaveAttribute('href', '/exercises');

    expect(screen.getByText('Push Day')).toBeInTheDocument();
    expect(screen.getByText('Pull Day')).toBeInTheDocument();
    expect(screen.getByText('Leg Day')).toBeInTheDocument();
    expect(screen.getByText('Chest & Back')).toBeInTheDocument();
    expect(screen.getByText('Arms Day')).toBeInTheDocument();

    const startButtons = screen.getAllByRole('button', { name: /start workout/i });
    expect(startButtons.length).toBeGreaterThanOrEqual(5);
    fireEvent.click(startButtons[0]);
    expect(navigateMock).toHaveBeenCalledWith(
      expect.stringMatching(/^\/session\//),
      expect.objectContaining({ state: { from: '/move' } }),
    );

    expect(screen.queryByText(/pick a day, see what you logged/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/walks & cardio/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Gym days')).not.toBeInTheDocument();
    expect(screen.queryByText('Sets logged')).not.toBeInTheDocument();
  });

  it('lists a saved template ahead of starters and can start it', () => {
    const exercise = starterExercises[0];
    useTemplateStore.getState().createTemplate('Chest focus', [exercise.id]);
    useTemplateStore.getState().createTemplate('Empty draft', []);

    renderMove();

    expect(screen.getByText('Chest focus')).toBeInTheDocument();
    expect(screen.queryByText('Empty draft')).not.toBeInTheDocument();
    const startButtons = screen.getAllByRole('button', { name: /start workout/i });
    fireEvent.click(startButtons[0]);
    expect(navigateMock).toHaveBeenCalledWith(
      expect.stringMatching(/^\/session\//),
      expect.objectContaining({ state: { from: '/move' } }),
    );
  });
});
