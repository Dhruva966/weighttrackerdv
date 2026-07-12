export function formatWeight(value: number, unit: 'lb' | 'kg' = 'lb'): string {
  if (unit === 'kg') {
    return `${Math.round(value * 0.453592 * 10) / 10} kg`;
  }

  return `${Number.isInteger(value) ? value : value.toFixed(1)} lb`;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
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
