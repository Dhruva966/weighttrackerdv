import type { Exercise, Goal, LoggedSet, WorkoutSession } from '../types';

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
