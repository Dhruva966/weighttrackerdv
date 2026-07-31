import { describe, expect, it } from 'vitest';
import type { LoggedSet } from '../types';
import {
  captureSessionSnapshot,
  emptySessionHistory,
  MAX_SESSION_HISTORY,
  pushSessionHistory,
  redoSessionHistory,
  snapshotsEqual,
  undoSessionHistory,
  type SessionHistoryEntry,
  type SessionSnapshot,
} from './session-history';

function setItem(overrides: Partial<LoggedSet> & Pick<LoggedSet, 'id' | 'sessionId' | 'exerciseId'>): LoggedSet {
  return {
    setNumber: 1,
    weightLb: 100,
    reps: 8,
    isWarmup: false,
    isPr: false,
    createdAt: '2026-07-30T12:00:00.000Z',
    ...overrides,
  };
}

function entry(label: string, before: SessionSnapshot, after: SessionSnapshot): SessionHistoryEntry {
  return { label, before, after };
}

describe('session-history', () => {
  it('captures plan and session-scoped sets only', () => {
    const snapshot = captureSessionSnapshot(
      's1',
      [{ id: 's1', plannedExerciseIds: ['a', 'b'] }, { id: 's2', plannedExerciseIds: ['c'] }],
      [
        setItem({ id: '1', sessionId: 's1', exerciseId: 'a' }),
        setItem({ id: '2', sessionId: 's2', exerciseId: 'c' }),
      ],
    );

    expect(snapshot.plannedExerciseIds).toEqual(['a', 'b']);
    expect(snapshot.sets).toHaveLength(1);
    expect(snapshot.sets[0]?.id).toBe('1');
  });

  it('compares snapshots by plan order and set identity', () => {
    const a: SessionSnapshot = {
      plannedExerciseIds: ['x'],
      sets: [setItem({ id: '1', sessionId: 's', exerciseId: 'x', weightLb: 95 })],
    };
    const b: SessionSnapshot = {
      plannedExerciseIds: ['x'],
      sets: [setItem({ id: '1', sessionId: 's', exerciseId: 'x', weightLb: 95 })],
    };
    const c: SessionSnapshot = {
      plannedExerciseIds: ['y'],
      sets: [setItem({ id: '1', sessionId: 's', exerciseId: 'x', weightLb: 95 })],
    };

    expect(snapshotsEqual(a, b)).toBe(true);
    expect(snapshotsEqual(a, c)).toBe(false);
  });

  it('pushes, undoes, and redoes while clearing future on new edits', () => {
    const first = entry(
      'add',
      { plannedExerciseIds: [], sets: [] },
      { plannedExerciseIds: ['a'], sets: [] },
    );
    const second = entry(
      'clear',
      { plannedExerciseIds: ['a'], sets: [] },
      { plannedExerciseIds: [], sets: [] },
    );

    let stacks = pushSessionHistory(emptySessionHistory(), first);
    stacks = pushSessionHistory(stacks, second);
    expect(stacks.past).toHaveLength(2);

    const undone = undoSessionHistory(stacks);
    expect(undone?.entry.label).toBe('clear');
    expect(undone?.stacks.past).toHaveLength(1);
    expect(undone?.stacks.future).toHaveLength(1);

    const redone = redoSessionHistory(undone!.stacks);
    expect(redone?.entry.label).toBe('clear');
    expect(redone?.stacks.past).toHaveLength(2);
    expect(redone?.stacks.future).toHaveLength(0);

    const afterUndo = undoSessionHistory(redone!.stacks)!;
    const branched = pushSessionHistory(afterUndo.stacks, first);
    expect(branched.past).toHaveLength(2);
    expect(branched.future).toHaveLength(0);
  });

  it('caps history length', () => {
    let stacks = emptySessionHistory();
    for (let i = 0; i < MAX_SESSION_HISTORY + 5; i += 1) {
      stacks = pushSessionHistory(
        stacks,
        entry(`e${i}`, { plannedExerciseIds: [], sets: [] }, { plannedExerciseIds: [`${i}`], sets: [] }),
      );
    }
    expect(stacks.past).toHaveLength(MAX_SESSION_HISTORY);
    expect(stacks.past[0]?.label).toBe('e5');
  });
});
