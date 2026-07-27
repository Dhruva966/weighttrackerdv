import { getDeviceTimeZone } from './local-day';

export type CalendarSessionInput = {
  id: string;
  startedAt: string;
  endedAt?: string;
};

export type CalendarSetInput = {
  sessionId: string;
  isPr: boolean;
  isWarmup?: boolean;
};

export type DayWorkoutSessionInput = CalendarSessionInput & {
  notes?: string;
};

export type DayWorkoutSetInput = CalendarSetInput & {
  id: string;
  exerciseId: string;
  setNumber: number;
  weightLb: number;
  reps: number;
  rpe?: number;
  createdAt: string;
};

export type DayWorkoutBundleSet = {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  weightLb: number;
  reps: number;
  rpe?: number;
  isWarmup: boolean;
  isPr: boolean;
  createdAt: string;
};

export type DayWorkoutBundleSession = {
  session: {
    id: string;
    startedAt: string;
    endedAt?: string;
    notes?: string;
  };
  sets: DayWorkoutBundleSet[];
  prCount: number;
  volume: number;
};

export type DayWorkoutBundle = {
  date: string;
  activity?: DayActivity;
  sessions: DayWorkoutBundleSession[];
};

export type DayWorkoutExerciseRef = {
  id: string;
  muscleGroup: string;
};

/** One calendar day → one workout surface (legacy multi-session days roll up). */
export type DayWorkoutSummary = {
  date: string;
  /** Prefer in-progress session; otherwise earliest session that day. */
  primarySessionId: string;
  startedAt: string;
  notes?: string;
  inProgress: boolean;
  /** Distinct muscle groups from exercises logged that day, stable order. */
  muscleGroups: string[];
};

const MUSCLE_GROUP_ORDER = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'biceps',
  'triceps',
  'legs',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'forearms',
  'full-body',
  'cardio',
] as const;

export type DayActivity = {
  date: string;
  sessionIds: string[];
  setCount: number;
  prCount: number;
  hadGymVisit: boolean;
  hadProgressiveOverload: boolean;
};

export type CalendarCell = {
  date: string | null;
  day: number | null;
  activity?: DayActivity;
  isToday: boolean;
};

export type CalendarOptions = {
  timeZone?: string;
  today?: string;
};

const isoDateFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

export function toDayKey(value: string | Date, timeZone: string): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return isoDateFormatter(timeZone).format(value instanceof Date ? value : new Date(value));
}

/** ISO instant for a calendar day in `timeZone` (today → now; otherwise ~local noon). */
export function calendarDayToStartedAt(
  dayKey: string,
  timeZone = getDeviceTimeZone(),
  now = new Date(),
): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) {
    return now.toISOString();
  }

  if (toDayKey(now, timeZone) === dayKey) {
    return now.toISOString();
  }

  for (const hourUtc of [20, 19, 18, 17, 21, 16]) {
    const candidate = new Date(`${dayKey}T${String(hourUtc).padStart(2, '0')}:00:00.000Z`);
    if (toDayKey(candidate, timeZone) === dayKey) {
      return candidate.toISOString();
    }
  }

  return new Date(`${dayKey}T19:00:00.000Z`).toISOString();
}

function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function weekdayForDate(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function buildSessionDayMap(
  sessions: CalendarSessionInput[],
  sets: CalendarSetInput[],
  options: CalendarOptions = {},
): Map<string, DayActivity> {
  const timeZone = options.timeZone ?? getDeviceTimeZone();
  const activityByDay = new Map<string, DayActivity>();

  for (const session of sessions) {
    const date = toDayKey(session.startedAt, timeZone);
    const existing =
      activityByDay.get(date) ??
      ({
        date,
        sessionIds: [],
        setCount: 0,
        prCount: 0,
        hadGymVisit: false,
        hadProgressiveOverload: false,
      } satisfies DayActivity);

    if (!existing.sessionIds.includes(session.id)) {
      existing.sessionIds.push(session.id);
    }

    activityByDay.set(date, existing);
  }

  for (const setItem of sets) {
    const session = sessions.find((item) => item.id === setItem.sessionId);
    if (!session) {
      continue;
    }

    const date = toDayKey(session.startedAt, timeZone);
    const existing = activityByDay.get(date);
    if (!existing) {
      continue;
    }

    existing.setCount += 1;
    if (setItem.isPr && !setItem.isWarmup) {
      existing.prCount += 1;
      existing.hadProgressiveOverload = true;
    }

    existing.hadGymVisit = existing.sessionIds.length > 0;
    activityByDay.set(date, existing);
  }

  for (const activity of activityByDay.values()) {
    activity.hadGymVisit = activity.sessionIds.length > 0;
  }

  return activityByDay;
}

export function buildMonthGrid(
  year: number,
  month: number,
  activityByDay: Map<string, DayActivity>,
  options: CalendarOptions = {},
): CalendarCell[] {
  const timeZone = options.timeZone ?? getDeviceTimeZone();
  const today = options.today ?? toDayKey(new Date(), timeZone);
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const firstDate = `${monthPrefix}-01`;
  const leadingEmpty = weekdayForDate(firstDate);
  const totalDays = daysInMonth(year, month);
  const cells: CalendarCell[] = [];

  for (let index = 0; index < leadingEmpty; index += 1) {
    cells.push({ date: null, day: null, isToday: false });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const date = `${monthPrefix}-${String(day).padStart(2, '0')}`;
    cells.push({
      date,
      day,
      activity: activityByDay.get(date),
      isToday: date === today,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ date: null, day: null, isToday: false });
  }

  return cells;
}

export function formatMonthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
  };
}

export function summarizeMonth(activityByDay: Map<string, DayActivity>, year: number, month: number) {
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
  const days = [...activityByDay.values()].filter((activity) => activity.date.startsWith(monthPrefix));

  return {
    gymDays: days.filter((activity) => activity.hadGymVisit).length,
    overloadDays: days.filter((activity) => activity.hadProgressiveOverload).length,
    totalSets: days.reduce((total, activity) => total + activity.setCount, 0),
  };
}

export function compareDayKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function dayRangeAround(date: string, radius: number): string[] {
  const values: string[] = [];
  for (let offset = -radius; offset <= radius; offset += 1) {
    values.push(addDays(date, offset));
  }
  return values;
}

export function getDayWorkoutBundle(
  date: string,
  sessions: DayWorkoutSessionInput[],
  sets: DayWorkoutSetInput[],
  options: CalendarOptions = {},
): DayWorkoutBundle {
  const timeZone = options.timeZone ?? getDeviceTimeZone();
  const activityByDay = buildSessionDayMap(sessions, sets, options);

  const daySessions = sessions
    .filter((session) => toDayKey(session.startedAt, timeZone) === date)
    .slice()
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const bundleSessions: DayWorkoutBundleSession[] = daySessions.map((session) => {
    const sessionSets = sets
      .filter((setItem) => setItem.sessionId === session.id)
      .map(
        (setItem): DayWorkoutBundleSet => ({
          id: setItem.id,
          sessionId: setItem.sessionId,
          exerciseId: setItem.exerciseId,
          setNumber: setItem.setNumber,
          weightLb: setItem.weightLb,
          reps: setItem.reps,
          rpe: setItem.rpe,
          isWarmup: setItem.isWarmup ?? false,
          isPr: setItem.isPr,
          createdAt: setItem.createdAt,
        }),
      );

    const workingSets = sessionSets.filter((setItem) => !setItem.isWarmup);
    const prCount = workingSets.filter((setItem) => setItem.isPr).length;
    const volume = workingSets.reduce((total, setItem) => total + setItem.weightLb * setItem.reps, 0);

    return {
      session: {
        id: session.id,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        notes: session.notes,
      },
      sets: sessionSets,
      prCount,
      volume,
    };
  });

  return {
    date,
    activity: activityByDay.get(date),
    sessions: bundleSessions,
  };
}

/**
 * Roll every session that started on `date` into one day workout surface.
 * Prefer the earliest in-progress session as the entry point; otherwise the earliest session.
 * Muscle groups come from exercises that have sets logged that day (all sessions).
 */
export function summarizeDayWorkout(
  date: string,
  sessions: DayWorkoutSessionInput[],
  sets: DayWorkoutSetInput[],
  exercises: DayWorkoutExerciseRef[],
  options: CalendarOptions = {},
): DayWorkoutSummary | null {
  const timeZone = options.timeZone ?? getDeviceTimeZone();
  const daySessions = sessions
    .filter((session) => toDayKey(session.startedAt, timeZone) === date)
    .slice()
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  if (daySessions.length === 0) {
    return null;
  }

  const openSessions = daySessions.filter((session) => !session.endedAt);
  const primary = openSessions[0] ?? daySessions[0]!;
  const sessionIds = new Set(daySessions.map((session) => session.id));
  const exerciseById = new Map(exercises.map((exercise) => [exercise.id, exercise.muscleGroup]));
  const muscleSet = new Set<string>();

  for (const setItem of sets) {
    if (!sessionIds.has(setItem.sessionId)) {
      continue;
    }
    const muscleGroup = exerciseById.get(setItem.exerciseId);
    if (muscleGroup) {
      muscleSet.add(muscleGroup);
    }
  }

  const muscleGroups: string[] = MUSCLE_GROUP_ORDER.filter((group) => muscleSet.has(group));
  for (const group of muscleSet) {
    if (!muscleGroups.includes(group)) {
      muscleGroups.push(group);
    }
  }

  return {
    date,
    primarySessionId: primary.id,
    startedAt: primary.startedAt,
    notes: primary.notes ?? daySessions.find((session) => session.notes)?.notes,
    inProgress: openSessions.length > 0,
    muscleGroups,
  };
}

/** Existing session for a calendar day, preferring in-progress then earliest. */
export function findDaySession(
  date: string,
  sessions: DayWorkoutSessionInput[],
  options: CalendarOptions = {},
): DayWorkoutSessionInput | undefined {
  const timeZone = options.timeZone ?? getDeviceTimeZone();
  const daySessions = sessions
    .filter((session) => toDayKey(session.startedAt, timeZone) === date)
    .slice()
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  return daySessions.find((session) => !session.endedAt) ?? daySessions[0];
}
