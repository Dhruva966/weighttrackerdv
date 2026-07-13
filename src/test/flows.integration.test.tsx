import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { ExerciseCreate } from '../pages/ExerciseCreate';
import { Goals } from '../pages/Goals';
import { Session } from '../pages/Session';
import { SettingsPage } from '../pages/Settings';
import { starterExercises, starterGoals, starterSessions, starterSets } from '../data/catalog';
import { usePrStore } from '../stores/prStore';
import { useUiStore } from '../stores/uiStore';
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
  useUiStore.setState({
    onboardingComplete: true,
    preferredName: 'Aloo',
    focus: 'both',
    unit: 'lb',
    restSeconds: 90,
  });
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

  it('renders mom-first Today with weight and meals', () => {
    renderApp('/');
    expect(screen.getByText(/hi aloo/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /today is already going well/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /morning weight/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /what’s on your plate/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ask how you’re doing/i)).toBeInTheDocument();
  });

  it('navigates Log and History tabs', async () => {
    renderApp('/');
    clickBottomNav(/^log$/i);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /you’re doing something kind/i })).toBeInTheDocument(),
    );

    clickBottomNav(/^history$/i);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /look how far you’ve come/i })).toBeInTheDocument(),
    );
  });

  it('shows onboarding until completed, then Today', async () => {
    useUiStore.setState({ onboardingComplete: false, preferredName: 'Aloo', focus: 'both' });
    renderApp('/');

    expect(await screen.findByRole('heading', { name: /you’re in the right place/i })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
    expect(await screen.findByRole('heading', { name: /three gentle habits/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
    expect(await screen.findByRole('heading', { name: /what should we call you/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Aloo')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }));
    expect(
      await screen.findByRole('heading', { name: /aloo, today’s waiting gently/i }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /begin today/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /today is already going well/i })).toBeInTheDocument(),
    );
    expect(screen.getByText(/hi aloo/i)).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
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
    useWorkoutStore.getState().setSessionPlan(session.id, [exercise.id]);

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[`/session/${session.id}`]}>
          <Routes>
            <Route path="/session/:sessionId" element={<Session />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: new RegExp(exercise.name, 'i') })[0]!);
    fireEvent.change(screen.getByPlaceholderText(/115 for 8 7 7/i), {
      target: { value: '95 for 8' },
    });
    fireEvent.click(screen.getByRole('button', { name: /log sets/i }));

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

  it('shows validation errors for incomplete create form', async () => {
    render(
      <MemoryRouter initialEntries={['/exercises/new']}>
        <Routes>
          <Route path="/exercises/new" element={<ExerciseCreate />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /save exercise/i }));
    expect(await screen.findByText(/name, muscle group, and equipment are required/i)).toBeInTheDocument();
  });

  it('creates an exercise from the form', async () => {
    render(
      <MemoryRouter initialEntries={['/exercises/new']}>
        <Routes>
          <Route path="/exercises/new" element={<ExerciseCreate />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Cable Fly' } });
    fireEvent.change(screen.getByLabelText(/muscle group/i), { target: { value: 'chest' } });
    fireEvent.change(screen.getByLabelText(/equipment/i), { target: { value: 'cable' } });
    fireEvent.click(screen.getByRole('button', { name: /save exercise/i }));

    await waitFor(() => {
      expect(useWorkoutStore.getState().exercises.some((item) => item.slug === 'cable-fly')).toBe(true);
    });
  });
});

describe('goals and settings', () => {
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

  it('renders settings', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument();
  });
});
