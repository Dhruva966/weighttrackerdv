export function formatWeight(value: number, unit: 'lb' | 'kg' = 'lb'): string {
  if (unit === 'kg') {
    return `${Math.round(value * 0.453592 * 10) / 10} kg`;
  }

  return `${Number.isInteger(value) ? value : value.toFixed(1)} lb`;
}

/** Display timezone for lift/chart history so multi-year Pacific baselines don't shift a day in other locales. */
export const CHART_TIME_ZONE = 'America/Los_Angeles';

export function formatDate(value: string, timeZone = CHART_TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone,
  }).format(new Date(value));
}

export function formatChartMonth(value: string | Date | number, timeZone = CHART_TIME_ZONE): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: '2-digit', timeZone }).format(
    value instanceof Date ? value : new Date(value),
  );
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatDateTimeInZone(
  value: string,
  timeZone = 'America/Los_Angeles',
): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(value));
}

export function formatVolume(value: number): string {
  if (value >= 1000) {
    return `${Math.round(value / 100) / 10}k lb`;
  }

  return `${Math.round(value)} lb`;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
