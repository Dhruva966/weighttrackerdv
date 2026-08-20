import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { starterExercises, starterGoals, starterSets } from '../data/catalog';
import { useSessionHistoryStore } from '../stores/sessionHistoryStore';
import { useTemplateStore } from '../stores/templateStore';
import { BOARD_HISTORY_SEED_VERSION, useWorkoutStore } from '../stores/workoutStore';
import {
  nextPlanAfterClear,
  Session,
  sessionBackFallbackPath,
} from './Session';

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
  useSessionHistoryStore.setState({ bySession: {} });
}

function renderSession(
  sessionId: string,
  options?: { initialEntries?: string[]; state?: { from?: string } },
) {
  const path = `/session/${sessionId}`;
  const entries = options?.initialEntries ?? [options?.state ? { pathname: path, state: options.state } : path];

  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={entries}>
        <Routes>
          <Route path="/session/:sessionId" element={<Session />} />
          <Route path="/move" element={<p>Move home</p>} />
          <Route path="/grow" element={<p>Grow home</p>} />
          <Route path="/exercises/:slug/edit" element={<p>Exercise edit page</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('nextPlanAfterClear', () => {
  it('clears the whole plan when nothing has logged sets', () => {
    expect(nextPlanAfterClear(['a', 'b'], new Set())).toEqual([]);
  });

  it('keeps exercises with logged sets and drops unused ones without confirming', () => {
    const confirm = vi.fn(() => false);
    expect(nextPlanAfterClear(['a', 'b', 'c'], new Set(['b']), confirm)).toEqual(['b']);
    expect(confirm).not.toHaveBeenCalled();
  });

  it('confirms before clearing when every planned exercise has sets', () => {
    const confirm = vi.fn(() => true);
    expect(nextPlanAfterClear(['a', 'b'], new Set(['a', 'b']), confirm)).toEqual([]);
    expect(confirm).toHaveBeenCalledOnce();
  });

  it('returns null when the user cancels clearing exercises that have sets', () => {
    expect(nextPlanAfterClear(['a'], new Set(['a']), () => false)).toBeNull();
  });
});

describe('sessionBackFallbackPath', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStores();
  });

  it('sends today sessions to Move and past-day sessions to Grow', () => {
    const today = useWorkoutStore.getState().createSession();
    expect(sessionBackFallbackPath(today)).toBe('/move');

    const past = useWorkoutStore.getState().createSession({
      startedAt: '2026-07-20T18:00:00-07:00',
    });
    expect(sessionBackFallbackPath(past)).toBe('/grow');
  });
});

describe('Session clear plan and back', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStores();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('clears planned exercises with no sets and returns to the empty template picker', async () => {
    const session = useWorkoutStore.getState().createSession();
    const a = starterExercises[0]!;
    const b = starterExercises[1]!;
    useWorkoutStore.getState().setSessionPlan(session.id, [a.id, b.id]);

    renderSession(session.id);

    expect(screen.getByText(/your exercises/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /clear plan/i }));

    await waitFor(() => {
      expect(
        useWorkoutStore.getState().sessions.find((item) => item.id === session.id)?.plannedExerciseIds,
      ).toEqual([]);
      expect(screen.getByText(/no exercises yet/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Templates' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /clear plan/i })).not.toBeInTheDocument();
    });
  });

  it('keeps exercises that already have logged sets when clearing unused plan items', async () => {
    const session = useWorkoutStore.getState().createSession();
    const withSets = starterExercises[0]!;
    const unused = starterExercises[1]!;
    useWorkoutStore.getState().setSessionPlan(session.id, [withSets.id, unused.id]);
    useWorkoutStore.getState().addSet({
      sessionId: session.id,
      exerciseId: withSets.id,
      weightLb: 95,
      reps: 8,
      isWarmup: false,
    });

    renderSession(session.id);
    fireEvent.click(screen.getByRole('button', { name: /clear plan/i }));

    await waitFor(() => {
      expect(
        useWorkoutStore.getState().sessions.find((item) => item.id === session.id)?.plannedExerciseIds,
      ).toEqual([withSets.id]);
      expect(screen.getByText(withSets.name)).toBeInTheDocument();
      expect(screen.queryByText(unused.name)).not.toBeInTheDocument();
      expect(useWorkoutStore.getState().sets.filter((setItem) => setItem.sessionId === session.id)).toHaveLength(
        1,
      );
    });
  });

  it('asks before clearing when every planned exercise has sets, and never deletes sets', async () => {
    const session = useWorkoutStore.getState().createSession();
    const exercise = starterExercises[0]!;
    useWorkoutStore.getState().setSessionPlan(session.id, [exercise.id]);
    useWorkoutStore.getState().addSet({
      sessionId: session.id,
      exerciseId: exercise.id,
      weightLb: 100,
      reps: 5,
      isWarmup: false,
    });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderSession(session.id);
    fireEvent.click(screen.getByRole('button', { name: /clear plan/i }));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
      expect(
        useWorkoutStore.getState().sessions.find((item) => item.id === session.id)?.plannedExerciseIds,
      ).toEqual([]);
      expect(useWorkoutStore.getState().sets.filter((setItem) => setItem.sessionId === session.id)).toHaveLength(
        1,
      );
      // Logged exercise still surfaces via extras even after plan clear
      expect(screen.getByText(exercise.name)).toBeInTheDocument();
    });
  });

  it('navigates Back using location.state.from when provided', async () => {
    const session = useWorkoutStore.getState().createSession();
    renderSession(session.id, { state: { from: '/grow' } });

    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
    await waitFor(() => expect(screen.getByText(/grow home/i)).toBeInTheDocument());
  });

  it('falls back to Move for today sessions when there is no history', async () => {
    const session = useWorkoutStore.getState().createSession();
    renderSession(session.id);

    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
    await waitFor(() => expect(screen.getByText(/move home/i)).toBeInTheDocument());
  });

  it('falls back to Grow for past-day sessions when there is no history', async () => {
    const session = useWorkoutStore.getState().createSession({
      startedAt: '2026-07-20T18:00:00-07:00',
    });
    renderSession(session.id);

    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));
    await waitFor(() => expect(screen.getByText(/grow home/i)).toBeInTheDocument());
  });
});

describe('Session undo/redo and edit', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStores();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows Refresh next to Undo/Redo/Done', () => {
    const session = useWorkoutStore.getState().createSession();
    renderSession(session.id);

    expect(screen.getByRole('button', { name: /refresh from cloud/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^undo$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^redo$/i })).toBeDisabled();
    expect(screen.getByRole('link', { name: /^done$/i })).toBeInTheDocument();
  });

  it('shows Undo/Redo next to Done, disabled until there is history', () => {
    const session = useWorkoutStore.getState().createSession();
    renderSession(session.id);

    expect(screen.getByRole('button', { name: /^undo$/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /^redo$/i })).toBeDisabled();
    expect(screen.getByRole('link', { name: /^done$/i })).toBeInTheDocument();
  });

  it('undoes and redoes clearing the plan from the header controls', async () => {
    const session = useWorkoutStore.getState().createSession();
    const a = starterExercises[0]!;
    const b = starterExercises[1]!;
    useWorkoutStore.getState().setSessionPlan(session.id, [a.id, b.id]);

    renderSession(session.id);
    expect(screen.getByText(/your exercises/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /clear plan/i }));
    await waitFor(() => {
      expect(
        useWorkoutStore.getState().sessions.find((item) => item.id === session.id)?.plannedExerciseIds,
      ).toEqual([]);
      expect(screen.getByRole('button', { name: /^undo$/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /^undo$/i }));
    await waitFor(() => {
      expect(
        useWorkoutStore.getState().sessions.find((item) => item.id === session.id)?.plannedExerciseIds,
      ).toEqual([a.id, b.id]);
      expect(screen.getByText(a.name)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^redo$/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /^redo$/i }));
    await waitFor(() => {
      expect(
        useWorkoutStore.getState().sessions.find((item) => item.id === session.id)?.plannedExerciseIds,
      ).toEqual([]);
      expect(screen.getByText(/no exercises yet/i)).toBeInTheDocument();
    });
  });

  it('undoes removing an exercise and redoes it', async () => {
    const session = useWorkoutStore.getState().createSession();
    const exercise = starterExercises[0]!;
    useWorkoutStore.getState().setSessionPlan(session.id, [exercise.id]);

    renderSession(session.id);
    fireEvent.click(screen.getByRole('button', { name: `Remove ${exercise.name}` }));

    await waitFor(() => {
      expect(
        useWorkoutStore.getState().sessions.find((item) => item.id === session.id)?.plannedExerciseIds,
      ).toEqual([]);
    });

    fireEvent.click(screen.getByRole('button', { name: /^undo$/i }));
    await waitFor(() => {
      expect(
        useWorkoutStore.getState().sessions.find((item) => item.id === session.id)?.plannedExerciseIds,
      ).toEqual([exercise.id]);
      expect(screen.getByText(exercise.name)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^redo$/i }));
    await waitFor(() => {
      expect(
        useWorkoutStore.getState().sessions.find((item) => item.id === session.id)?.plannedExerciseIds,
      ).toEqual([]);
    });
  });

  it('does not promote logged extras into the plan when removing a planned exercise', async () => {
    const session = useWorkoutStore.getState().createSession();
    const planned = starterExercises[0]!;
    const extra = starterExercises[1]!;
    useWorkoutStore.getState().setSessionPlan(session.id, [planned.id]);
    useWorkoutStore.getState().addSet({
      sessionId: session.id,
      exerciseId: extra.id,
      weightLb: 40,
      reps: 10,
      isWarmup: false,
    });

    renderSession(session.id);
    fireEvent.click(screen.getByRole('button', { name: `Remove ${planned.name}` }));

    await waitFor(() => {
      expect(
        useWorkoutStore.getState().sessions.find((item) => item.id === session.id)?.plannedExerciseIds,
      ).toEqual([]);
    });
    // Extra stays visible via logged sets, but must not be written onto the plan.
    expect(screen.getByText(extra.name)).toBeInTheDocument();
    expect(
      useWorkoutStore.getState().sets.filter((setItem) => setItem.sessionId === session.id),
    ).toHaveLength(1);
  });

  it('asks before removing a planned exercise that has sets, and never deletes those sets', async () => {
    const session = useWorkoutStore.getState().createSession();
    const exercise = starterExercises[0]!;
    useWorkoutStore.getState().setSessionPlan(session.id, [exercise.id]);
    useWorkoutStore.getState().addSet({
      sessionId: session.id,
      exerciseId: exercise.id,
      weightLb: 100,
      reps: 5,
      isWarmup: false,
    });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderSession(session.id);
    fireEvent.click(screen.getByRole('button', { name: `Remove ${exercise.name}` }));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
      expect(
        useWorkoutStore.getState().sessions.find((item) => item.id === session.id)?.plannedExerciseIds,
      ).toEqual([]);
      expect(
        useWorkoutStore.getState().sets.filter((setItem) => setItem.sessionId === session.id),
      ).toHaveLength(1);
      expect(screen.getByText(exercise.name)).toBeInTheDocument();
    });
  });

  it('deletes logged sets when removing an unplanned extra after confirm', async () => {
    const session = useWorkoutStore.getState().createSession();
    const planned = starterExercises[0]!;
    const extra = starterExercises[1]!;
    useWorkoutStore.getState().setSessionPlan(session.id, [planned.id]);
    useWorkoutStore.getState().addSet({
      sessionId: session.id,
      exerciseId: extra.id,
      weightLb: 55,
      reps: 8,
      isWarmup: false,
    });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderSession(session.id);
    const extraStrip = screen
      .getAllByRole('button', { name: extra.name })
      .find((el) => el.getAttribute('aria-pressed') != null);
    fireEvent.click(extraStrip!);
    fireEvent.click(screen.getByRole('button', { name: `Remove ${extra.name}` }));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
      expect(
        useWorkoutStore.getState().sessions.find((item) => item.id === session.id)?.plannedExerciseIds,
      ).toEqual([planned.id]);
      expect(
        useWorkoutStore.getState().sets.filter((setItem) => setItem.sessionId === session.id),
      ).toHaveLength(0);
      expect(screen.queryByText(extra.name)).not.toBeInTheDocument();
    });
  });

  it('undoes applying a template to the session', async () => {
    const session = useWorkoutStore.getState().createSession();
    const a = starterExercises[0]!;
    const b = starterExercises[1]!;
    useTemplateStore.getState().createTemplate('Push', [a.id, b.id]);

    renderSession(session.id);
    // Saved templates render before examples; first "Add to workout" is ours.
    fireEvent.click(screen.getAllByRole('button', { name: /add to workout/i })[0]!);

    await waitFor(() => {
      expect(
        useWorkoutStore.getState().sessions.find((item) => item.id === session.id)?.plannedExerciseIds,
      ).toEqual([a.id, b.id]);
    });

    fireEvent.click(screen.getByRole('button', { name: /^undo$/i }));
    await waitFor(() => {
      expect(
        useWorkoutStore.getState().sessions.find((item) => item.id === session.id)?.plannedExerciseIds,
      ).toEqual([]);
    });
  });

  it('links each exercise row Edit control to the exercise edit page', async () => {
    const session = useWorkoutStore.getState().createSession();
    const exercise = starterExercises[0]!;
    useWorkoutStore.getState().setSessionPlan(session.id, [exercise.id]);

    renderSession(session.id);

    const editLink = screen.getByRole('link', { name: `Edit ${exercise.name}` });
    expect(editLink).toHaveAttribute('href', `/exercises/${exercise.slug}/edit`);

    fireEvent.click(editLink);
    await waitFor(() => expect(screen.getByText(/exercise edit page/i)).toBeInTheDocument());
  });

  it('shows a horizontal exercise strip with an add control', () => {
    const session = useWorkoutStore.getState().createSession();
    const a = starterExercises[0]!;
    const b = starterExercises[1]!;
    useWorkoutStore.getState().setSessionPlan(session.id, [a.id, b.id]);

    renderSession(session.id);

    const stripA = screen
      .getAllByRole('button', { name: a.name })
      .find((el) => el.getAttribute('aria-pressed') != null);
    const stripB = screen
      .getAllByRole('button', { name: b.name })
      .find((el) => el.getAttribute('aria-pressed') != null);
    expect(stripA).toHaveAttribute('aria-pressed', 'true');
    expect(stripB).toBeTruthy();
    expect(screen.getByRole('button', { name: /add exercise/i })).toBeInTheDocument();
    fireEvent.click(stripB!);
    expect(stripB).toHaveAttribute('aria-pressed', 'true');
  });

  it('saves the current planned exercises as a template from the header', async () => {
    const session = useWorkoutStore.getState().createSession();
    const a = starterExercises[0]!;
    const b = starterExercises[1]!;
    useWorkoutStore.getState().setSessionPlan(session.id, [a.id, b.id]);

    renderSession(session.id);

    fireEvent.click(screen.getByRole('button', { name: /save as template/i }));
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. push day/i), {
      target: { value: 'Arms from session' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      const templates = useTemplateStore.getState().templates;
      expect(templates.some((item) => item.name === 'Arms from session')).toBe(true);
      const saved = templates.find((item) => item.name === 'Arms from session')!;
      expect(useTemplateStore.getState().exercisesFor(saved.id)).toEqual([a.id, b.id]);
    });
  });
});
