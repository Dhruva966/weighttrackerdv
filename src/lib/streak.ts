export type StreakOptions = {
  today?: string;
  timeZone?: string;
};

export type StreakSummary = {
  current: number;
  longest: number;
};

const isoDateFormatter = (timeZone: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

function toDayKey(value: string, timeZone: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  return isoDateFormatter(timeZone).format(new Date(value));
}

function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function calculateStreaks(sessionStarts: string[], options: StreakOptions = {}): StreakSummary {
  const timeZone = options.timeZone ?? 'America/Los_Angeles';
  const today = options.today ?? toDayKey(new Date().toISOString(), timeZone);
  const days = [...new Set(sessionStarts.map((start) => toDayKey(start, timeZone)))].sort();

  let longest = 0;
  let run = 0;
  let previous: string | undefined;

  for (const day of days) {
    run = previous && addDays(previous, 1) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = day;
  }

  let current = 0;
  let cursor = today;
  const daySet = new Set(days);

  while (daySet.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return { current, longest };
}
