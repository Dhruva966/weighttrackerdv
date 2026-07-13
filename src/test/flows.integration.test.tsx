import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { ExerciseCreate } from '../pages/ExerciseCreate';
import { Goals } from '../pages/Goals';
import { Progress } from '../pages/Progress';
import { Session } from '../pages/Session';
import { SettingsPage } from '../pages/Settings';
import { starterExercises, starterGoals, starterSessions, starterSets } from '../data/catalog';
import { usePrStore } from '../stores/prStore';
import { useWorkoutStore } from '../stores/workoutStore';

vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

function renderApp(initialPath = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function resetStores() {
  useWorkoutStore.setState({
    exercises: starterExercises,
    goals: starterGoals,
    sessions: starterSessions,
    sets: starterSets,
  });
  usePrStore.getState().clearPr();
}

function clickBottomNav(label: RegExp) {
  const nav = screen.getByRole('navigation');
  fireEvent.click(within(nav).getByRole('link', { name: label }));
}

describe('app shell', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStores();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the Today dashboard with starter stats', () => {
    renderApp('/');
    expect(screen.getByRole('heading', { name: /track the work/i })).toBeInTheDocument();
    expect(screen.getByText('Total sessions')).toBeInTheDocument();
    expect(screen.getByText('Logged sets')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start workout/i })).toBeInTheDocument();
  });

  it('navigates to the exercise library tab', async () => {
    renderApp('/');
    clickBottomNav(/^library$/i);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /exercise library/i })).toBeInTheDocument();
    });
  });

  it('navigates to progress and history tabs', async () => {
    renderApp('/');
    clickBottomNav(/^progress$/i);
    await waitFor(() => expect(screen.getByRole('heading', { name: /^progress$/i })).toBeInTheDocument());

    clickBottomNav(/^history$/i);
    await waitFor(() => expect(screen.getByRole('heading', { name: /^history$/i })).toBeInTheDocument());
  });
});

describe('active session flow', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStores();
  });

  afterEach(() => {
    cleanup();
  });

  it('logs a set and ends the workout from the session page', async () => {
    const session = useWorkoutStore.getState().createSession();
    const exercise = starterExercises[0];

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[`/session/${session.id}`]}>
          <Routes>
            <Route path="/session/:sessionId" element={<Session />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByPlaceholderText(/search exercises/i), {
      target: { value: exercise.name },
    });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(exercise.name, 'i') }));

    const form = screen.getByRole('button', { name: /save set/i }).closest('form');
    expect(form).toBeTruthy();
    const spinbuttons = within(form!).getAllByRole('spinbutton');
    fireEvent.change(spinbuttons[0], { target: { value: '95' } });
    fireEvent.change(spinbuttons[1], { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: /save set/i }));

    await waitFor(() => {
      const saved = useWorkoutStore
        .getState()
        .sets.find((setItem) => setItem.sessionId === session.id && setItem.exerciseId === exercise.id);
      expect(saved?.weightLb).toBe(95);
      expect(saved?.reps).toBe(8);
      expect(screen.getByText('95 lb x 8')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /end/i }));
    expect(useWorkoutStore.getState().sessions.find((item) => item.id === session.id)?.endedAt).toBeTruthy();
  });
});

describe('exercise creation', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStores();
  });

  afterEach(() => {
    cleanup();
  });

  it('validates required fields before saving', () => {
    render(
      <MemoryRouter initialEntries={['/exercises/new']}>
        <Routes>
          <Route path="/exercises/new" element={<ExerciseCreate />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /save exercise/i }));
    expect(screen.getByText(/required/i)).toBeInTheDocument();
    expect(useWorkoutStore.getState().exercises).toHaveLength(starterExercises.length);
  });

  it('creates a new exercise when the form is valid', async () => {
    render(
      <MemoryRouter initialEntries={['/exercises/new']}>
        <Routes>
          <Route path="/exercises/new" element={<ExerciseCreate />} />
          <Route path="/exercises/:slug" element={<div>Exercise saved</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText(/seated lateral raise/i), {
      target: { value: 'Incline Cable Fly' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save exercise/i }));

    await waitFor(() => {
      expect(useWorkoutStore.getState().exercises.some((item) => item.slug === 'incline-cable-fly')).toBe(true);
    });
  });
});

describe('goals and progress tools', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStores();
  });

  afterEach(() => {
    cleanup();
  });

  it('toggles a goal from the goals page', () => {
    const goal = starterGoals[0];
    render(
      <MemoryRouter>
        <Goals />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: goal.name }));
    expect(useWorkoutStore.getState().goals.find((item) => item.id === goal.id)?.achieved).toBe(true);
  });

  it('imports lift notes from the progress page', async () => {
    const before = useWorkoutStore.getState().sets.length;
    render(
      <MemoryRouter>
        <Progress />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText(/lat pulldown 175 lbs/i), {
      target: { value: 'Lat pulldown 180 lbs' },
    });
    fireEvent.click(screen.getByRole('button', { name: /import lift notes/i }));

    await waitFor(() => {
      expect(useWorkoutStore.getState().sets.length).toBeGreaterThan(before);
      expect(screen.getByText(/imported 1 set/i)).toBeInTheDocument();
    });
  });
});

describe('settings', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStores();
  });

  afterEach(() => {
    cleanup();
  });

  it('switches units and updates the rest timer default', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'kg' }));
    fireEvent.change(screen.getByRole('slider'), { target: { value: '120' } });

    expect(screen.getByText('120s default')).toBeInTheDocument();
    expect(screen.getByText(/online/i)).toBeInTheDocument();
  });
});
