import type { MealItemEstimate } from './meal-from-text';
import type { CaptureSource } from './diary-sync-schemas';
import { dayKeyFromLoggedAt } from './diary-day';
import type { BodyWeightLog, MealLog, MovementLog } from '../stores/diaryStore';
import type { Exercise, Goal, LoggedSet, WorkoutSession } from '../types';
import { USER_ID } from './user';

export function exerciseToRow(exercise: Exercise) {
  return {
    id: exercise.id,
    slug: exercise.slug,
    name: exercise.name,
    muscle_group: exercise.muscleGroup,
    secondary_muscles: exercise.secondaryMuscles,
    equipment: exercise.equipment,
    instructions: exercise.instructions,
    setup_notes: exercise.setupNotes ?? [],
    image_url: exercise.imageUrl ?? null,
    image_style: exercise.imageStyle,
    source: exercise.source,
    archived: exercise.archived ?? false,
  };
}

export function sessionToRow(session: WorkoutSession) {
  return {
    id: session.id,
    user_id: session.userId,
    started_at: session.startedAt,
    ended_at: session.endedAt ?? null,
    notes: session.notes ?? null,
  };
}

export function setToRow(setItem: LoggedSet) {
  return {
    id: setItem.id,
    session_id: setItem.sessionId,
    exercise_id: setItem.exerciseId,
    set_number: setItem.setNumber,
    weight_lb: setItem.weightLb,
    reps: setItem.reps,
    rpe: setItem.rpe ?? null,
    is_warmup: setItem.isWarmup,
    is_pr: setItem.isPr,
    created_at: setItem.createdAt,
  };
}

export function goalToRow(goal: Goal) {
  return {
    id: goal.id,
    user_id: goal.userId,
    name: goal.name,
    target_value: goal.targetValue ?? null,
    target_unit: goal.targetUnit ?? null,
    achieved: goal.achieved,
    achieved_at: goal.achievedAt ?? null,
    created_at: goal.createdAt,
  };
}

export function mealToRow(meal: MealLog, captureSource: CaptureSource = 'text') {
  return {
    id: meal.id,
    user_id: USER_ID,
    logged_at: meal.loggedAt,
    day_key: dayKeyFromLoggedAt(meal.loggedAt),
    title: meal.title,
    summary: meal.summary,
    raw: meal.raw,
    calories: meal.calories,
    protein_g: meal.proteinG,
    carbs_g: meal.carbsG,
    fat_g: meal.fatG,
    capture_source: captureSource,
  };
}

export function mealItemsToRows(mealId: string, items: MealItemEstimate[]) {
  return items.map((item, index) => ({
    id: crypto.randomUUID(),
    meal_id: mealId,
    name: item.name,
    portion: item.portion,
    calories: item.calories,
    protein_g: item.proteinG,
    carbs_g: item.carbsG,
    fat_g: item.fatG,
    sort_order: index,
  }));
}

export function movementToRow(movement: MovementLog, captureSource: CaptureSource = 'text') {
  return {
    id: movement.id,
    user_id: USER_ID,
    logged_at: movement.loggedAt,
    day_key: dayKeyFromLoggedAt(movement.loggedAt),
    kind: movement.kind,
    title: movement.title,
    summary: movement.summary,
    raw: movement.raw,
    duration_min: movement.durationMin,
    distance_mi: null,
    calories_burned: null,
    capture_source: captureSource,
  };
}

export function bodyWeightToRow(log: BodyWeightLog, captureSource: CaptureSource = 'text') {
  return {
    id: log.id,
    user_id: USER_ID,
    logged_at: log.loggedAt,
    weight_lb: log.weightLb,
    notes: null,
    capture_source: captureSource,
  };
}

type MovementLogRow = ReturnType<typeof movementToRow>;
type BodyWeightRow = ReturnType<typeof bodyWeightToRow>;

export function rowToMeal(row: {
  id: string;
  logged_at: string;
  title: string;
  summary: string;
  raw: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}): MealLog {
  return {
    id: row.id,
    loggedAt: row.logged_at,
    title: row.title,
    summary: row.summary,
    raw: row.raw,
    calories: row.calories,
    proteinG: Number(row.protein_g),
    carbsG: Number(row.carbs_g),
    fatG: Number(row.fat_g),
  };
}

export function rowToMovement(row: MovementLogRow & { id: string }): MovementLog {
  return {
    id: row.id,
    loggedAt: row.logged_at,
    kind: row.kind,
    title: row.title,
    summary: row.summary,
    raw: row.raw,
    durationMin: row.duration_min === null ? null : Number(row.duration_min),
  };
}

export function rowToBodyWeight(row: BodyWeightRow & { id: string }): BodyWeightLog {
  return {
    id: row.id,
    loggedAt: row.logged_at,
    weightLb: Number(row.weight_lb),
  };
}
