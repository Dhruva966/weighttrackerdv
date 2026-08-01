import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { ExerciseCreate } from '../pages/ExerciseCreate';
import { ExerciseEdit } from '../pages/ExerciseEdit';
import { Goals } from '../pages/Goals';
import { History } from '../pages/History';
import { Session } from '../pages/Session';
import { SettingsPage } from '../pages/Settings';
import { starterExercises, starterGoals, starterSets } from '../data/catalog';
import { useDiaryStore } from '../stores/diaryStore';
import { usePrStore } from '../stores/prStore';
import { useTemplateStore } from '../stores/templateStore';
import { useUiStore } from '../stores/uiStore';
import { BOARD_HISTORY_SEED_VERSION, useWorkoutStore } from '../stores/workoutStore';

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
    sessions: [],
    sets: starterSets,
    historyCleared: false,
    boardHistorySeedVersion: BOARD_HISTORY_SEED_VERSION,
  });
  useTemplateStore.setState({ templates: [], templateExercises: [] });
  usePrStore.getState().clearPr();
  useDiaryStore.setState({
    bodyWeightLogs: [{ id: 'bw-seed-dhruva', loggedAt: '2026-07-13', weightLb: 169 }],
    movements: [],
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
    renderApp('/today');
    expect(screen.getByText(/hi dhruva/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /your pot of gold is filling/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /body weight/i })).toBeInTheDocument();
    expect(screen.getByText('169')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/walk, lift, or weigh-in/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /speak to log/i })).toBeInTheDocument();
  });

  it('does not count board baseline sets as today training', () => {
    renderApp('/today');

    expect(screen.getByText(/no lifts or walks yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/sets today/i)).not.toBeInTheDocument();
  });

  it('shows Training log on Today and omits food diary and Intentions', () => {
    renderApp('/today');

    const mainText = screen.getByRole('main').textContent ?? '';
    expect(mainText).toContain('Training log');
    expect(mainText).not.toMatch(/today’s diary|kcal|calorie|meal|eat/i);
    expect(screen.queryByRole('heading', { name: /^Intentions$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Morning weigh-in/i)).not.toBeInTheDocument();
  });

  it('counts only real sets from today in the Today training summary', () => {
    const session = useWorkoutStore.getState().createSession();
    const exercise = starterExercises[0]!;
    useWorkoutStore.getState().addSet({
      sessionId: session.id,
      exerciseId: exercise.id,
      weightLb: 95,
      reps: 8,
      isWarmup: false,
    });

    renderApp('/today');

    expect(screen.getByText(/1 set today/i)).toBeInTheDocument();
    expect(screen.getByText(/1 open workout/i)).toBeInTheDocument();
  });

  it('lands on Move at the root route and navigates Grow, Today, Library, You without an Eat tab', async () => {
    renderApp('/');
    expect(screen.getByRole('heading', { name: /^move$/i })).toBeInTheDocument();
    expect(within(screen.getByRole('navigation')).queryByRole('link', { name: /^eat$/i })).toBeNull();
    expect(within(screen.getByRole('navigation')).getByRole('link', { name: /^library$/i })).toHaveAttribute(
      'href',
      '/exercises',
    );

    clickBottomNav(/^grow$/i);
    await waitFor(() => expect(screen.getByRole('heading', { name: /your pot of gold/i })).toBeInTheDocument());

    clickBottomNav(/^today$/i);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /your pot of gold is filling/i })).toBeInTheDocument(),
    );

    clickBottomNav(/^library$/i);
    await waitFor(() => expect(screen.getByRole('heading', { name: /exercise library/i })).toBeInTheDocument());

    clickBottomNav(/^you$/i);
    await waitFor(() => expect(screen.getByRole('heading', { name: /^you$/i })).toBeInTheDocument());
  });

  it('does not route food text from the universal bar while meal logging is archived', async () => {
    renderApp('/');
    fireEvent.change(screen.getByPlaceholderText(/walk, lift, or weigh-in/i), {
      target: { value: 'I ate a sandwich about 600 calories' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit log/i }));
    await waitFor(() => expect(screen.getAllByText(/add a hint like/i).length).toBeGreaterThan(0));
    expect(screen.queryByRole('heading', { name: /does this feel right/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/600 kcal/i)).not.toBeInTheDocument();
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

  it('adds a picked exercise to the session list', async () => {
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

    expect(screen.getByText(/no exercises yet/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Templates' })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/search exercises to add/i), {
      target: { value: exercise.name },
    });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(exercise.name, 'i') }));

    await waitFor(() => {
      expect(screen.getByText(/your exercises/i)).toBeInTheDocument();
      expect(screen.getByText(/tap to log/i)).toBeInTheDocument();
      expect(
        useWorkoutStore.getState().sessions.find((item) => item.id === session.id)?.plannedExerciseIds,
      ).toEqual([exercise.id]);
    });
  });

  it('creates an exercise from the picker, adds it, and keeps it searchable', async () => {
    const session = useWorkoutStore.getState().createSession();

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[`/session/${session.id}`]}>
          <Routes>
            <Route path="/session/:sessionId" element={<Session />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /create exercise/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Zorp Picker Create' } });
    fireEvent.click(screen.getByRole('button', { name: /create & add/i }));

    await waitFor(() => {
      const created = useWorkoutStore.getState().exercises.find((item) => item.slug === 'zorp-picker-create');
      expect(created).toBeTruthy();
      expect(
        useWorkoutStore.getState().sessions.find((item) => item.id === session.id)?.plannedExerciseIds,
      ).toEqual([created!.id]);
      expect(screen.getByText('Zorp Picker Create')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/search exercises to add/i), {
      target: { value: 'Zorp Picker Create' },
    });

    await waitFor(() => {
      const addedRow = screen.getByRole('button', { name: /zorp picker create.*added/i });
      expect(addedRow).toBeDisabled();
    });
  });

  it('shows photos or no-photo placeholders beside planned exercises', () => {
    const withPhoto = {
      ...starterExercises[0],
      slug: 'triceps-pushdown-cable-straight-bar',
      name: 'Triceps Pushdown (Cable - Straight Bar)',
      // People-photo URLs (any host, including former Storage demos) must not render.
      imageUrl: 'https://example.com/press.jpg',
      imageStyle: 'photo' as const,
    };
    const withoutPhoto = {
      ...starterExercises[1],
      slug: 'totally-unknown-session-exercise',
      name: 'Totally Unknown Session Exercise',
      imageUrl: undefined,
      imageStyle: 'name-only' as const,
    };
    useWorkoutStore.setState({ exercises: [withPhoto, withoutPhoto, ...starterExercises.slice(2)] });
    const session = useWorkoutStore.getState().createSession();
    useWorkoutStore.getState().setSessionPlan(session.id, [withPhoto.id, withoutPhoto.id]);

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[`/session/${session.id}`]}>
          <Routes>
            <Route path="/session/:sessionId" element={<Session />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole('img', { name: `No photo available for ${withPhoto.name}` }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: `No photo available for ${withoutPhoto.name}` }),
    ).toBeInTheDocument();
  });

  it('applies an example template onto a past-day session', async () => {
    const session = useWorkoutStore.getState().createSession({
      startedAt: '2026-07-29T18:00:00-07:00',
    });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[`/session/${session.id}`]}>
          <Routes>
            <Route path="/session/:sessionId" element={<Session />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Prefer Push Day specifically among example templates
    const pushCards = screen.getAllByText('Push Day');
    expect(pushCards.length).toBeGreaterThan(0);
    const pushCard = pushCards[0]!.closest('.app-card');
    expect(pushCard).toBeTruthy();
    fireEvent.click(within(pushCard as HTMLElement).getByRole('button', { name: /add to workout/i }));

    await waitFor(() => {
      const planned =
        useWorkoutStore.getState().sessions.find((item) => item.id === session.id)?.plannedExerciseIds ??
        [];
      expect(planned.length).toBeGreaterThan(0);
      expect(screen.getByText(/your exercises/i)).toBeInTheDocument();
    });
  });

  it('logs a set from the session page and returns via Done', async () => {
    const session = useWorkoutStore.getState().createSession();
    const exercise = starterExercises[0];
    useWorkoutStore.getState().setSessionPlan(session.id, [exercise.id]);

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[`/session/${session.id}`]}>
          <Routes>
            <Route path="/session/:sessionId" element={<Session />} />
            <Route path="/move" element={<p>Move home</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: new RegExp(exercise.name, 'i') })[0]!);
    fireEvent.change(screen.getByLabelText(/^log$/i), {
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
      expect(screen.queryByText(/logged \d+ sets?\./i)).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('link', { name: /^done$/i }));
    await waitFor(() => expect(screen.getByText(/move home/i)).toBeInTheDocument());
  });
});

describe('history day rollups', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStores();
    useDiaryStore.setState({
      bodyWeightLogs: [],
      movements: [],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders one workout item for multiple sessions on the same day', () => {
    const chest = starterExercises.find((exercise) => exercise.muscleGroup === 'chest')!;
    const back = starterExercises.find((exercise) => exercise.muscleGroup === 'back')!;
    const first = useWorkoutStore
      .getState()
      .createSession({ startedAt: '2026-07-18T18:00:00-07:00' });
    const second = useWorkoutStore
      .getState()
      .createSession({ startedAt: '2026-07-18T20:00:00-07:00' });

    useWorkoutStore.getState().addSet({
      sessionId: first.id,
      exerciseId: chest.id,
      weightLb: 135,
      reps: 8,
      isWarmup: false,
    });
    useWorkoutStore.getState().addSet({
      sessionId: second.id,
      exerciseId: back.id,
      weightLb: 100,
      reps: 10,
      isWarmup: false,
    });

    render(
      <MemoryRouter>
        <History compact showCalendar={false} gymOnly />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getAllByText(/^Workout$/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Chest · Back|Back · Chest/)).toBeInTheDocument();
    expect(screen.queryByText(/135 lb|100 lb|2 sets/i)).not.toBeInTheDocument();
  });

  it('renders ISO timestamp weigh-ins in the normalized day feed', () => {
    useDiaryStore.setState({
      bodyWeightLogs: [
        {
          id: 'bw-late',
          loggedAt: '2026-07-19T06:30:00.000Z',
          weightLb: 170,
        },
      ],
      movements: [],
    });

    render(
      <MemoryRouter>
        <History compact showCalendar={false} />
      </MemoryRouter>,
    );

    expect(screen.getByText('170 lb')).toBeInTheDocument();
    expect(screen.getByText(/Body weight/i)).toBeInTheDocument();
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

  it('creates an exercise from the form and finds it in Library search', async () => {
    const { searchExercises } = await import('../hooks/useExercises');

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/exercises/new']}>
          <Routes>
            <Route path="/exercises/new" element={<ExerciseCreate />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Zorp Library Create' } });
    fireEvent.click(screen.getByRole('button', { name: /save exercise/i }));

    await waitFor(() => {
      const created = useWorkoutStore.getState().exercises.find((item) => item.slug === 'zorp-library-create');
      expect(created).toBeTruthy();
      const hits = searchExercises(useWorkoutStore.getState().exercises, 'Zorp Library Create');
      expect(hits[0]?.id).toBe(created!.id);
    });
  });

  it('edits muscle group from the edit form and updates Library filters', async () => {
    const { searchExercises } = await import('../hooks/useExercises');
    const created = useWorkoutStore.getState().addExercise({
      name: 'Zorp Mis-tagged Lift',
      muscleGroup: 'cardio',
      equipment: 'other',
    });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[`/exercises/${created.slug}/edit`]}>
          <Routes>
            <Route path="/exercises/:slug/edit" element={<ExerciseEdit />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByLabelText(/muscle group/i), { target: { value: 'back' } });
    fireEvent.change(screen.getByLabelText(/equipment/i), { target: { value: 'cable' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      const updated = useWorkoutStore.getState().exercises.find((item) => item.id === created.id);
      expect(updated?.muscleGroup).toBe('back');
      expect(updated?.equipment).toBe('cable');
      expect(updated?.slug).toBe(created.slug);
      const hits = searchExercises(
        useWorkoutStore.getState().exercises.filter((item) => item.muscleGroup === 'back'),
        'Zorp Mis-tagged Lift',
      );
      expect(hits[0]?.id).toBe(created.id);
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
      target: { value: 'Stretch tonight' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
    expect(useUiStore.getState().intentions.some((item) => item.name === 'Stretch tonight')).toBe(
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
