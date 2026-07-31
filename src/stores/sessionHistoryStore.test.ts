import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { starterExercises, starterGoals, starterSets } from '../data/catalog';
import { useSessionHistoryStore } from './sessionHistoryStore';
import { BOARD_HISTORY_SEED_VERSION, useWorkoutStore } from './workoutStore';

function resetStores() {
  useWorkoutStore.setState({
    exercises: starterExercises,
    goals: starterGoals,
    sessions: [],
    sets: starterSets,
    historyCleared: false,
    boardHistorySeedVersion: BOARD_HISTORY_SEED_VERSION,
  });
  useSessionHistoryStore.setState({ bySession: {} });
}

describe('sessionHistoryStore', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStores();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('commits plan edits and undoes/redoes them', () => {
    const session = useWorkoutStore.getState().createSession();
    const a = starterExercises[0]!;
    const b = starterExercises[1]!;

    const changed = useSessionHistoryStore.getState().commitEdit(session.id, 'Added exercises', () => {
      useWorkoutStore.getState().setSessionPlan(session.id, [a.id, b.id]);
    });
    expect(changed).toBe(true);
    expect(
      useWorkoutStore.getState().sessions.find((item) => item.id === session.id)?.plannedExerciseIds,
    ).toEqual([a.id, b.id]);
    expect(useSessionHistoryStore.getState().canUndo(session.id)).toBe(true);
    expect(useSessionHistoryStore.getState().canRedo(session.id)).toBe(false);

    const undone = useSessionHistoryStore.getState().undo(session.id);
    expect(undone?.label).toBe('Added exercises');
    expect(
      useWorkoutStore.getState().sessions.find((item) => item.id === session.id)?.plannedExerciseIds,
    ).toEqual([]);
    expect(useSessionHistoryStore.getState().canRedo(session.id)).toBe(true);

    const redone = useSessionHistoryStore.getState().redo(session.id);
    expect(redone?.label).toBe('Added exercises');
    expect(
      useWorkoutStore.getState().sessions.find((item) => item.id === session.id)?.plannedExerciseIds,
    ).toEqual([a.id, b.id]);
  });

  it('restores logged sets when undoing a set delete', () => {
    const session = useWorkoutStore.getState().createSession();
    const exercise = starterExercises[0]!;
    useWorkoutStore.getState().setSessionPlan(session.id, [exercise.id]);
    const logged = useWorkoutStore.getState().addSet({
      sessionId: session.id,
      exerciseId: exercise.id,
      weightLb: 95,
      reps: 8,
      isWarmup: false,
    });

    useSessionHistoryStore.getState().commitEdit(session.id, 'Set deleted', () => {
      useWorkoutStore.getState().removeSet(logged.id);
    });
    expect(useWorkoutStore.getState().sets.filter((setItem) => setItem.sessionId === session.id)).toHaveLength(
      0,
    );

    useSessionHistoryStore.getState().undo(session.id);
    const restored = useWorkoutStore.getState().sets.filter((setItem) => setItem.sessionId === session.id);
    expect(restored).toHaveLength(1);
    expect(restored[0]?.id).toBe(logged.id);
    expect(restored[0]?.weightLb).toBe(95);
  });

  it('skips no-op commits', () => {
    const session = useWorkoutStore.getState().createSession();
    const changed = useSessionHistoryStore.getState().commitEdit(session.id, 'noop', () => undefined);
    expect(changed).toBe(false);
    expect(useSessionHistoryStore.getState().canUndo(session.id)).toBe(false);
  });
});
