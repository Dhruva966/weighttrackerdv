import type { MovementKind } from './movement-from-text';

/**
 * Compendium-style METs for cardio / movement activities only.
 * Not used for gym lifts — lift calories are intentionally out of scope.
 *
 * Sources: Adult Compendium of Physical Activities (conditioning / walking rows),
 * rounded to a small fixed table for client estimates.
 */
const CARDIO_MET_BY_KIND: Record<MovementKind, number> = {
  walk: 3.5,
  incline_walk: 5.0,
  hike: 6.0,
  run: 8.0,
  stairmaster: 9.0,
  bike: 6.8,
  cardio: 5.0,
  other: 4.0,
};

export function metForMovementKind(kind: MovementKind): number {
  return CARDIO_MET_BY_KIND[kind];
}

/**
 * Estimate kcal for a cardio/movement bout.
 * Formula: kcal = MET × 3.5 × weightKg / 200 × minutes
 */
export function estimateCardioCalories(input: {
  kind: MovementKind;
  durationMin: number | null | undefined;
  bodyWeightLb: number | null | undefined;
}): number | null {
  const durationMin = input.durationMin;
  const bodyWeightLb = input.bodyWeightLb;
  if (durationMin == null || durationMin <= 0) {
    return null;
  }
  if (bodyWeightLb == null || bodyWeightLb <= 0) {
    return null;
  }

  const weightKg = bodyWeightLb / 2.2046226218;
  const met = metForMovementKind(input.kind);
  const kcal = (met * 3.5 * weightKg * durationMin) / 200;
  return Math.round(kcal);
}
