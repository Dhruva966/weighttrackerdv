/**
 * Canonical exercise merges: retire the board/duplicate slug and keep the imaged PDF row.
 * Applied in catalog seeds, example templates, Zustand persist remaps, and Supabase archives.
 */
export const EXERCISE_MERGES: ReadonlyArray<{ from: string; to: string }> = [
  { from: 'dumbbell-preacher-curl', to: 'preacher-curl-dumbbell' },
  { from: 'bicep-curl', to: 'bicep-curl-dumbbell' },
  { from: 'lat-pulldown', to: 'lat-pulldown-cable' },
  { from: 'cable-fly', to: 'chest-fly' },
  { from: 'cable-chest-fly', to: 'chest-fly' },
  { from: 'cable-fly-custom', to: 'chest-fly' },
  // Board shorthand + pad-machine board name both land on the PDF machine extension.
  { from: 'tricep-machine-extension', to: 'triceps-extension-machine' },
  { from: 'tricep-extension-machine-w-pad', to: 'triceps-extension-machine' },
  { from: 'hack-squat', to: 'hack-squat-barbell' },
  { from: 'leg-press-linear', to: 'leg-press' },
  { from: 'hamstring-curl-laying', to: 'lying-leg-curl-machine' },
  { from: 'calf-raise-standing-smith', to: 'standing-calf-raise-smith-machine' },
  { from: 'hip-abductor', to: 'hip-abductor-machine' },
  { from: 'reverse-bar-curl', to: 'reverse-curl-barbell' },
  { from: 'rope-hammer-curl', to: 'hammer-curl-cable' },
  { from: 'leg-raise', to: 'flat-leg-raise' },
  // Round 2
  { from: 'bench-press', to: 'bench-press-barbell' },
  { from: 'smith-machine-bench', to: 'bench-press-smith-machine' },
  { from: 'incline-press', to: 'incline-chest-press-machine' },
  { from: 'incline-machine-press', to: 'incline-chest-press-machine' },
  { from: 'low-back-extension', to: 'back-extension-machine' },
  // Close grip keeps its own slug/name; underhand collapses into it.
  { from: 'lat-pulldown-underhand-cable', to: 'close-grip-pulldown' },
  { from: 'calf-raise-sitting', to: 'seated-calf-raise-machine' },
  { from: 'quad-extension', to: 'leg-extension-machine' },
  { from: 'ab-crunch-corner-machine', to: 'crunch-machine' },
  // Round 3 — Shoulder Press: keep BOTH Machine and Dumbell (owner spelling).
  { from: 'shoulder-press', to: 'shoulder-press-machine' },
  { from: 'shoulder-press-cable-machine', to: 'shoulder-press-machine' },
  { from: 'shoulder-press-plate-loaded', to: 'shoulder-press-machine' },
  { from: 'shoulder-press-dumbbell', to: 'shoulder-press-dumbell' },
  { from: 'squat-machine', to: 'squat-curved-stand' },
  { from: 'seated-calf-raise-plate-loaded', to: 'seated-calf-raise-machine' },
  // Round 4 — user-approved collapses
  { from: 'lat-pulldown-cable-2', to: 'lat-pulldown-cable' },
  { from: 'lat-pulldown-cable-3', to: 'lat-pulldown-cable' },
  { from: 'single-arm-dumbell-row', to: 'bent-over-one-arm-row-dumbbell' },
  { from: 'kipping-pull-up', to: 'pull-up' },
  { from: 'cycling', to: 'cycling-indoor' },
  { from: 'strict-military-press-barbell', to: 'overhead-press-barbell' },
  // Lateral raises: keep Machine + Dumbbell + Slanted (board) + Cable only.
  { from: 'lat-raise', to: 'lateral-raise-dumbbell' },
  { from: 'seated-lateral-raise-padded-machine', to: 'lateral-raise-machine' },
  { from: 'lateral-raise-band', to: 'lateral-raise-dumbbell' },
  // Round 5 — user-approved collapses (2026-08-02)
  { from: 'wide-pull-up', to: 'pull-up' }, // "Pull Up Normal"
  { from: 'straight-bar-tricep-extension-machine', to: 'triceps-extension-machine' },
  { from: 'pendlay-row-barbell', to: 'bent-over-row-barbell' }, // "Barbell Row"
  { from: 'seated-leg-press-machine', to: 'leg-press' },
  { from: 'lat-pulldown-machine', to: 'lat-pulldown-cable' },
  { from: 'seated-overhead-press-barbell', to: 'overhead-press-barbell' },
  { from: 'seated-overhead-press-dumbbell', to: 'overhead-press-dumbbell' },
  { from: 'low-back-raise', to: 'back-extension' },
  { from: 'shrug-smith-machine', to: 'shrug-machine' },
];

/** Hard-delete (or archive if FK-blocked) — not merges. Keep rope + overhead tricep variants. */
export const EXERCISE_HARD_DELETES: readonly string[] = [
  'calf-press-on-seated-leg-press',
  'calf-press-on-leg-press',
  'triceps-extension-cable',
  'bent-over-row-underhand-barbell',
  'pullover-machine',
  'pullover-dumbbell',
  'zorp-mis-tagged-lift',
  'zorp-picker-create',
  'zorp-library-create',
  'mis-tagged-row',
  'photo-keep',
  // Round 6 (2026-08-02) — purge junk Strong-library rows from Library + seeds.
  // Keep Bent Over Row (Band/Barbell/Dumbbell); drop Upright Row family.
  'abs-home',
  'aerobics',
  'around-the-world',
  'arnold-press-dumbbell',
  'ball-slams',
  'battle-ropes',
  'bench-dip',
  'bench-press-cable',
  'bench-press-close-grip-barbell',
  'bench-press-wide-grip-barbell',
  'bicycle-crunch',
  'chin-up-assisted',
  'clean-and-jerk-barbell',
  'clean-barbell',
  'climbing',
  'floor-press-barbell',
  'front-raise-band',
  'jackknife-sit-up',
  'jump-shrug-barbell',
  'jump-squat',
  'kettlebell-swing',
  'kettlebell-turkish-get-up',
  'kipping-pull-up',
  'knee-raise-captain-s-chair',
  'kneeling-pulldown-band',
  'knees-to-elbows',
  'squat-row-band',
  'standing-calf-raise-bodyweight',
  'step-up',
  'straight-leg-deadlift-band',
  'superman',
  'thruster-barbell',
  'thruster-kettlebell',
  'toes-to-bar',
  'upright-row-barbell',
  'upright-row-cable',
  'upright-row-dumbbell',
  'v-up',
  'zercher-squat-barbell',
  // Round 6 follow-up — letter-tile cardio junk (no hollow-model crop).
  'skating',
  'skiing',
];

const HARD_DELETE_SET = new Set(EXERCISE_HARD_DELETES);

/** True for retired test lifts / hard-deleted catalog rows that must not reappear via local sync. */
export function isHardDeletedExerciseSlug(slug: string): boolean {
  return HARD_DELETE_SET.has(slug) || slug.startsWith('zorp-');
}

/** Old board slug → surviving PDF slug. */
export const EXERCISE_MERGE_BY_FROM: Readonly<Record<string, string>> = Object.fromEntries(
  EXERCISE_MERGES.map((row) => [row.from, row.to]),
);

/** Stable local starter id for a slug (`ex-<slug>`). */
export function starterExerciseId(slug: string): string {
  return `ex-${slug}`;
}

/** Resolve a slug through the merge map (identity if not merged). */
export function canonicalExerciseSlug(slug: string): string {
  return EXERCISE_MERGE_BY_FROM[slug] ?? slug;
}

/**
 * Remap persisted exercise ids after a slug merge. Prefer a live row whose slug is the
 * canonical target (often the remote UUID) over synthesizing `ex-<to>`.
 */
export function remapExerciseId(
  exerciseId: string,
  exercises: Array<{ id: string; slug: string }>,
): string {
  const byId = new Map(exercises.map((item) => [item.id, item]));
  const existing = byId.get(exerciseId);
  if (existing) {
    const canonical = canonicalExerciseSlug(existing.slug);
    if (canonical === existing.slug) {
      return exerciseId;
    }
    const target = exercises.find((item) => item.slug === canonical);
    return target?.id ?? starterExerciseId(canonical);
  }

  if (exerciseId.startsWith('ex-')) {
    const oldSlug = exerciseId.slice(3);
    const canonical = canonicalExerciseSlug(oldSlug);
    if (canonical === oldSlug) {
      return exerciseId;
    }
    const target = exercises.find((item) => item.slug === canonical);
    return target?.id ?? starterExerciseId(canonical);
  }

  return exerciseId;
}

export type MergeableExercise = {
  id: string;
  slug: string;
  archived?: boolean;
  setupNotes?: string[];
};

/**
 * Drop merged-from rows, keep target rows, and carry setup notes from retired board names
 * onto the survivor when the survivor has none.
 */
export function mergeExerciseCatalog<T extends MergeableExercise>(exercises: T[]): T[] {
  const bySlug = new Map<string, T>();

  for (const exercise of exercises) {
    if (isHardDeletedExerciseSlug(exercise.slug) || isHardDeletedExerciseSlug(canonicalExerciseSlug(exercise.slug))) {
      continue;
    }
    const canonical = canonicalExerciseSlug(exercise.slug);
    const incoming: T = {
      ...exercise,
      slug: canonical,
      archived: exercise.archived ?? false,
    };
    const existing = bySlug.get(canonical);

    if (!existing) {
      bySlug.set(canonical, incoming);
      continue;
    }

    // Prefer the row that already carried the canonical slug (PDF/remote UUID id).
    const preferIncoming =
      (Boolean(existing.archived) && !incoming.archived) ||
      (existing.id.startsWith('ex-') && !incoming.id.startsWith('ex-')) ||
      (existing.slug !== exercise.slug && exercise.slug === canonical);

    const setupNotes =
      (preferIncoming ? incoming.setupNotes : existing.setupNotes)?.length
        ? preferIncoming
          ? incoming.setupNotes
          : existing.setupNotes
        : incoming.setupNotes?.length
          ? incoming.setupNotes
          : existing.setupNotes;

    bySlug.set(canonical, {
      ...(preferIncoming ? incoming : existing),
      slug: canonical,
      setupNotes,
      archived: false,
    });
  }

  return [...bySlug.values()];
}

export function remapSetExerciseIds<T extends { exerciseId: string }>(
  sets: T[],
  exercises: Array<{ id: string; slug: string }>,
): T[] {
  return sets.map((item) => ({
    ...item,
    exerciseId: remapExerciseId(item.exerciseId, exercises),
  }));
}
