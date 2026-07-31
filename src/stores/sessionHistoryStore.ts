import { create } from 'zustand';
import {
  captureSessionSnapshot,
  cloneSessionSnapshot,
  emptySessionHistory,
  pushSessionHistory,
  redoSessionHistory,
  snapshotsEqual,
  undoSessionHistory,
  type SessionHistoryEntry,
  type SessionHistoryStacks,
  type SessionSnapshot,
} from '../lib/session-history';
import { useWorkoutStore } from './workoutStore';

type SessionHistoryState = {
  bySession: Record<string, SessionHistoryStacks>;
  commitEdit: (sessionId: string, label: string, mutate: () => void) => boolean;
  commitEditAsync: (sessionId: string, label: string, mutate: () => Promise<void>) => Promise<boolean>;
  undo: (sessionId: string) => SessionHistoryEntry | null;
  redo: (sessionId: string) => SessionHistoryEntry | null;
  canUndo: (sessionId: string) => boolean;
  canRedo: (sessionId: string) => boolean;
  clearSession: (sessionId: string) => void;
};

function stacksFor(
  bySession: Record<string, SessionHistoryStacks>,
  sessionId: string,
): SessionHistoryStacks {
  return bySession[sessionId] ?? emptySessionHistory();
}

function capture(sessionId: string): SessionSnapshot {
  const workout = useWorkoutStore.getState();
  return captureSessionSnapshot(sessionId, workout.sessions, workout.sets);
}

function pushIfChanged(
  set: (updater: (state: SessionHistoryState) => Partial<SessionHistoryState>) => void,
  get: () => SessionHistoryState,
  sessionId: string,
  label: string,
  before: SessionSnapshot,
  after: SessionSnapshot,
): boolean {
  if (snapshotsEqual(before, after)) {
    return false;
  }

  const entry: SessionHistoryEntry = {
    label,
    before: cloneSessionSnapshot(before),
    after: cloneSessionSnapshot(after),
  };

  set((state) => ({
    bySession: {
      ...state.bySession,
      [sessionId]: pushSessionHistory(stacksFor(state.bySession, sessionId), entry),
    },
  }));

  return true;
}

export const useSessionHistoryStore = create<SessionHistoryState>()((set, get) => ({
  bySession: {},
  commitEdit: (sessionId, label, mutate) => {
    const before = capture(sessionId);
    mutate();
    const after = capture(sessionId);
    return pushIfChanged(set, get, sessionId, label, before, after);
  },
  commitEditAsync: async (sessionId, label, mutate) => {
    const before = capture(sessionId);
    await mutate();
    const after = capture(sessionId);
    return pushIfChanged(set, get, sessionId, label, before, after);
  },
  undo: (sessionId) => {
    const current = stacksFor(get().bySession, sessionId);
    const result = undoSessionHistory(current);
    if (!result) {
      return null;
    }
    set((state) => ({
      bySession: { ...state.bySession, [sessionId]: result.stacks },
    }));
    useWorkoutStore.getState().restoreSessionSnapshot(sessionId, result.entry.before);
    return result.entry;
  },
  redo: (sessionId) => {
    const current = stacksFor(get().bySession, sessionId);
    const result = redoSessionHistory(current);
    if (!result) {
      return null;
    }
    set((state) => ({
      bySession: { ...state.bySession, [sessionId]: result.stacks },
    }));
    useWorkoutStore.getState().restoreSessionSnapshot(sessionId, result.entry.after);
    return result.entry;
  },
  canUndo: (sessionId) => stacksFor(get().bySession, sessionId).past.length > 0,
  canRedo: (sessionId) => stacksFor(get().bySession, sessionId).future.length > 0,
  clearSession: (sessionId) =>
    set((state) => {
      if (!state.bySession[sessionId]) {
        return state;
      }
      const next = { ...state.bySession };
      delete next[sessionId];
      return { bySession: next };
    }),
}));
