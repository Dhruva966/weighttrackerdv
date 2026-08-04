/** Pure helpers for Lift MCP read tools — kept isomorphic for Vitest. */

export function slugifyExerciseQuery(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function estimateOneRepMaxLb(weightLb: number, reps: number): number {
  if (weightLb <= 0 || reps <= 0) {
    return 0;
  }
  return Math.round(weightLb * (1 + reps / 30) * 10) / 10;
}

export function setVolumeLb(weightLb: number | null | undefined, reps: number | null | undefined): number {
  const w = weightLb ?? 0;
  const r = reps ?? 0;
  if (w <= 0 || r <= 0) {
    return 0;
  }
  return w * r;
}

export function isLiftWorkingSet(row: {
  is_warmup?: boolean | null;
  weight_lb?: number | null;
  reps?: number | null;
}): boolean {
  if (row.is_warmup) {
    return false;
  }
  const w = row.weight_lb ?? 0;
  const r = row.reps ?? 0;
  return w > 0 && r > 0;
}

export function clampLimit(value: number | undefined, fallback: number, max: number): number {
  if (value == null || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(1, Math.floor(value)));
}

export function dayKeyFromIso(iso: string): string {
  return iso.slice(0, 10);
}

export type RankedExercise = {
  id: string;
  slug: string;
  name: string;
  archived: boolean;
};

/** Prefer exact slug, then exact name (ci), then slug contains / name contains. */
export function rankExerciseMatches(query: string, exercises: RankedExercise[]): RankedExercise[] {
  const q = query.trim().toLowerCase();
  const slugQ = slugifyExerciseQuery(query);
  if (!q) {
    return [];
  }

  const scored = exercises.map((ex) => {
    const name = ex.name.toLowerCase();
    const slug = ex.slug.toLowerCase();
    let score = 0;
    if (slug === slugQ || slug === q) {
      score = 100;
    } else if (name === q) {
      score = 90;
    } else if (slug.startsWith(slugQ) || name.startsWith(q)) {
      score = 70;
    } else if (slug.includes(slugQ) || name.includes(q)) {
      score = 50;
    }
    if (ex.archived) {
      score -= 5;
    }
    return { ex, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.ex.name.localeCompare(b.ex.name))
    .map((s) => s.ex);
}
