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
  const timeZone = options.timeZone ?? 'America/Los_Angeles';
  const activityByDay = new Map<string, DayActivity>();

  for (const session of sessions) {
    if (!session.endedAt) {
      continue;
    }

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
    if (!session?.endedAt) {
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
  const timeZone = options.timeZone ?? 'America/Los_Angeles';
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
