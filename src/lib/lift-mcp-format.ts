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

export type ScoredExercise = RankedExercise & { score: number };

/** Prefer exact slug, then exact name (ci), then prefix / contains. Includes score. */
export function scoreExerciseMatches(query: string, exercises: RankedExercise[]): ScoredExercise[] {
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
    return { ...ex, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

/** Prefer exact slug, then exact name (ci), then slug contains / name contains. */
export function rankExerciseMatches(query: string, exercises: RankedExercise[]): RankedExercise[] {
  return scoreExerciseMatches(query, exercises).map(({ score: _score, ...ex }) => ex);
}

export type ResolveStatus = 'exact' | 'ambiguous' | 'none';

export type ResolveCandidate = {
  n: number;
  id: string;
  slug: string;
  name: string;
  muscleGroup?: string;
  equipment?: string;
  archived: boolean;
  score: number;
};

/** Sole match, or top score ≥ 90 with gap ≥ 20 vs second → exact; else ambiguous/none. */
export function resolveExerciseStatus(
  scored: ScoredExercise[],
): { status: ResolveStatus; take: ScoredExercise[] } {
  if (scored.length === 0) {
    return { status: 'none', take: [] };
  }
  if (scored.length === 1) {
    return { status: 'exact', take: scored };
  }
  const top = scored[0]!;
  const second = scored[1]!;
  if (top.score >= 90 && top.score - second.score >= 20) {
    return { status: 'exact', take: [top] };
  }
  return { status: 'ambiguous', take: scored };
}

export function formatResolveCandidates(
  query: string,
  scored: ScoredExercise[],
  limit = 8,
): {
  query: string;
  status: ResolveStatus;
  candidates: ResolveCandidate[];
} {
  const lim = clampLimit(limit, 8, 25);
  const { status, take } = resolveExerciseStatus(scored);
  return {
    query,
    status,
    candidates: take.slice(0, lim).map((ex, i) => ({
      n: i + 1,
      id: ex.id,
      slug: ex.slug,
      name: ex.name,
      archived: ex.archived,
      score: ex.score,
    })),
  };
}

/** YYYY-MM-DD for `now` in an IANA timezone. */
export function todayKeyInTimeZone(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Body-weight lbs for MCP / diary. Schema is numeric(5,2). */
export function normalizeBodyWeightLb(value: number): number | null {
  if (!Number.isFinite(value) || value < 50 || value > 500) {
    return null;
  }
  return Math.round(value * 100) / 100;
}
