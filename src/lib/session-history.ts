import type { LoggedSet } from '../types';

export type SessionSnapshot = {
  plannedExerciseIds: string[];
  sets: LoggedSet[];
};

export type SessionHistoryEntry = {
  label: string;
  before: SessionSnapshot;
  after: SessionSnapshot;
};

export type SessionHistoryStacks = {
  past: SessionHistoryEntry[];
  future: SessionHistoryEntry[];
};

export const MAX_SESSION_HISTORY = 50;

export function emptySessionHistory(): SessionHistoryStacks {
  return { past: [], future: [] };
}

export function cloneSessionSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
  return {
    plannedExerciseIds: [...snapshot.plannedExerciseIds],
    sets: snapshot.sets.map((setItem) => ({ ...setItem })),
  };
}

export function captureSessionSnapshot(
  sessionId: string,
  sessions: Array<{ id: string; plannedExerciseIds?: string[] }>,
  sets: LoggedSet[],
): SessionSnapshot {
  const session = sessions.find((item) => item.id === sessionId);
  return cloneSessionSnapshot({
    plannedExerciseIds: session?.plannedExerciseIds ?? [],
    sets: sets.filter((setItem) => setItem.sessionId === sessionId),
  });
}

export function snapshotsEqual(a: SessionSnapshot, b: SessionSnapshot): boolean {
  if (a.plannedExerciseIds.length !== b.plannedExerciseIds.length) {
    return false;
  }
  if (a.plannedExerciseIds.some((id, index) => id !== b.plannedExerciseIds[index])) {
    return false;
  }
  if (a.sets.length !== b.sets.length) {
    return false;
  }

  const sortKey = (setItem: LoggedSet) =>
    `${setItem.id}:${setItem.exerciseId}:${setItem.setNumber}:${setItem.weightLb}:${setItem.reps}:${setItem.isWarmup}`;
  const left = a.sets.map(sortKey).sort();
  const right = b.sets.map(sortKey).sort();
  return left.every((key, index) => key === right[index]);
}

export function pushSessionHistory(
  stacks: SessionHistoryStacks,
  entry: SessionHistoryEntry,
  maxEntries = MAX_SESSION_HISTORY,
): SessionHistoryStacks {
  const past = [...stacks.past, entry];
  return {
    past: past.length > maxEntries ? past.slice(past.length - maxEntries) : past,
    future: [],
  };
}

export function undoSessionHistory(
  stacks: SessionHistoryStacks,
): { stacks: SessionHistoryStacks; entry: SessionHistoryEntry } | null {
  if (stacks.past.length === 0) {
    return null;
  }
  const entry = stacks.past[stacks.past.length - 1]!;
  return {
    entry,
    stacks: {
      past: stacks.past.slice(0, -1),
      future: [entry, ...stacks.future],
    },
  };
}

export function redoSessionHistory(
  stacks: SessionHistoryStacks,
): { stacks: SessionHistoryStacks; entry: SessionHistoryEntry } | null {
  if (stacks.future.length === 0) {
    return null;
  }
  const entry = stacks.future[0]!;
  return {
    entry,
    stacks: {
      past: [...stacks.past, entry],
      future: stacks.future.slice(1),
    },
  };
}
