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
import { useDiaryStore } from '../stores/diaryStore';
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
  useDiaryStore.setState({
    bodyWeightLogs: [{ id: 'bw-seed-dhruva', loggedAt: '2026-07-13', weightLb: 169 }],
    meals: [],
    calorieTarget: 2400,
  });
  useUiStore.setState({
    onboardingComplete: true,
    preferredName: 'Dhruva',
    focus: 'both',
    unit: 'lb',
    restSeconds: 90,
    goldDays: 3,
    intentions: [
      { id: 'g1', name: 'Morning weigh-in', done: true },
      { id: 'g2', name: 'Train today (gym or walk)', done: false },
      { id: 'g3', name: 'Better than yesterday', done: false },
    ],
    previewNotice: null,
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

  it('renders Aloo Today with universal command bar', () => {
    renderApp('/');
    expect(screen.getByText(/hi dhruva/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /your pot of gold is filling/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /body weight/i })).toBeInTheDocument();
    expect(screen.getByText('169')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/log anything/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /speak to log/i })).toBeInTheDocument();
  });

  it('navigates Eat Move Grow tabs', async () => {
    renderApp('/');
    clickBottomNav(/^eat$/i);
    await waitFor(() => expect(screen.getByRole('heading', { name: /^eat$/i })).toBeInTheDocument());

    clickBottomNav(/^move$/i);
    await waitFor(() => expect(screen.getByRole('heading', { name: /^move$/i })).toBeInTheDocument());

    clickBottomNav(/^grow$/i);
    await waitFor(() => expect(screen.getByRole('heading', { name: /your pot of gold/i })).toBeInTheDocument());
  });

  it('routes meal text from the universal bar into confirm', async () => {
    renderApp('/');
    fireEvent.change(screen.getByPlaceholderText(/log anything/i), {
      target: { value: 'I ate a sandwich about 600 calories' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit log/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /does this feel right/i })).toBeInTheDocument(),
    );
    expect(
      within(screen.getByRole('main')).getByText(/I ate a sandwich about 600 calories/),
    ).toBeInTheDocument();
    expect(within(screen.getByRole('main')).getAllByText(/600 kcal/i).length).toBeGreaterThan(0);
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

    fireEvent.click(screen.getByRole('button', { name: /^end$/i }));
    await waitFor(() => expect(screen.getByText(/workout recap/i)).toBeInTheDocument());
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

  it('creates an exercise from the form', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/exercises/new']}>
          <Routes>
            <Route path="/exercises/new" element={<ExerciseCreate />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Cable Fly' } });
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

  it('toggles an intention from the goals page', () => {
    render(
      <MemoryRouter>
        <Goals />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: /train today/i })[0]!);
    expect(useUiStore.getState().intentions.find((item) => item.id === 'g2')?.done).toBe(true);
  });

  it('adds a custom intention', () => {
    render(
      <MemoryRouter>
        <Goals />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText(/add an intention/i), {
      target: { value: 'Hit protein target' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
    expect(useUiStore.getState().intentions.some((item) => item.name === 'Hit protein target')).toBe(
      true,
    );
  });

  it('renders You settings', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /^you$/i })).toBeInTheDocument();
  });
});
