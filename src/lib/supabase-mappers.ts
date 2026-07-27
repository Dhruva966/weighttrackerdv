import type {
  EquipmentKind,
  Exercise,
  Goal,
  ImageStyle,
  LoggedSet,
  MuscleGroup,
  Template,
  TemplateExercise,
  WorkoutSession,
} from '../types';

type ExerciseRow = {
  id: string;
  slug: string;
  name: string;
  muscle_group: MuscleGroup;
  secondary_muscles: string[] | null;
  equipment: EquipmentKind | null;
  instructions: string[] | null;
  setup_notes: string[] | null;
  image_url: string | null;
  image_style: ImageStyle | null;
  source: string | null;
  archived: boolean | null;
};

type SessionRow = {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
};

type SetRow = {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  weight_lb: number | string;
  reps: number;
  rpe: number | string | null;
  is_warmup: boolean | null;
  is_pr: boolean | null;
  created_at: string;
};

type GoalRow = {
  id: string;
  user_id: string;
  name: string;
  target_value: number | string | null;
  target_unit: Goal['targetUnit'] | null;
  achieved: boolean | null;
  achieved_at: string | null;
  created_at: string;
};

type TemplateRow = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

type TemplateExerciseRow = {
  id: string;
  template_id: string;
  exercise_id: string;
  position: number;
  target_sets: number | null;
  target_reps: number | null;
  target_weight_lb: number | string | null;
  created_at: string;
};

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

export function templateToRow(template: Template) {
  return {
    id: template.id,
    user_id: template.userId,
    name: template.name,
    created_at: template.createdAt,
    updated_at: template.updatedAt,
  };
}

export function templateExerciseToRow(templateExercise: TemplateExercise) {
  return {
    id: templateExercise.id,
    template_id: templateExercise.templateId,
    exercise_id: templateExercise.exerciseId,
    position: templateExercise.position,
    target_sets: templateExercise.targetSets ?? null,
    target_reps: templateExercise.targetReps ?? null,
    target_weight_lb: templateExercise.targetWeightLb ?? null,
    created_at: templateExercise.createdAt,
  };
}

export function rowToExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    muscleGroup: row.muscle_group,
    secondaryMuscles: row.secondary_muscles ?? [],
    equipment: row.equipment ?? 'other',
    instructions: row.instructions ?? [],
    setupNotes: row.setup_notes ?? [],
    imageUrl: row.image_url ?? undefined,
    imageStyle: row.image_style ?? 'name-only',
    source: row.source ?? 'remote',
    archived: row.archived ?? false,
  };
}

export function rowToSession(row: SessionRow): WorkoutSession {
  return {
    id: row.id,
    userId: row.user_id,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export function rowToSet(row: SetRow): LoggedSet {
  return {
    id: row.id,
    sessionId: row.session_id,
    exerciseId: row.exercise_id,
    setNumber: row.set_number,
    weightLb: Number(row.weight_lb),
    reps: row.reps,
    rpe: row.rpe === null || row.rpe === undefined ? undefined : Number(row.rpe),
    isWarmup: row.is_warmup ?? false,
    isPr: row.is_pr ?? false,
    createdAt: row.created_at,
  };
}

export function rowToGoal(row: GoalRow): Goal {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    targetValue: row.target_value === null || row.target_value === undefined ? undefined : Number(row.target_value),
    targetUnit: row.target_unit ?? undefined,
    achieved: row.achieved ?? false,
    achievedAt: row.achieved_at ?? undefined,
    createdAt: row.created_at,
  };
}

export function rowToTemplate(row: TemplateRow): Template {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function rowToTemplateExercise(row: TemplateExerciseRow): TemplateExercise {
  return {
    id: row.id,
    templateId: row.template_id,
    exerciseId: row.exercise_id,
    position: row.position,
    targetSets: row.target_sets ?? undefined,
    targetReps: row.target_reps ?? undefined,
    targetWeightLb:
      row.target_weight_lb === null || row.target_weight_lb === undefined ? undefined : Number(row.target_weight_lb),
    createdAt: row.created_at,
  };
}
