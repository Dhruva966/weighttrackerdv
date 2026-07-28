export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'biceps'
  | 'triceps'
  | 'legs'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core'
  | 'forearms'
  | 'full-body'
  | 'cardio';

export type EquipmentKind =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'other';

export type ImageStyle = 'photo' | 'silhouette' | 'name-only';

export type Exercise = {
  id: string;
  slug: string;
  name: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles: string[];
  equipment: EquipmentKind;
  instructions: string[];
  setupNotes?: string[];
  imageUrl?: string;
  imageStyle: ImageStyle;
  source: string;
  archived?: boolean;
};

export type WorkoutSession = {
  id: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  notes?: string;
  plannedExerciseIds?: string[];
  /** Calendar day (YYYY-MM-DD) this session belongs to, in `timezone`. */
  localDate?: string;
  /** IANA timezone the session was created in (device-local at creation time). */
  timezone?: string;
};

export type LoggedSet = {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  weightLb: number;
  reps: number;
  rpe?: number;
  isWarmup: boolean;
  isPr: boolean;
  createdAt: string;
};

export type Goal = {
  id: string;
  userId: string;
  name: string;
  targetValue?: number;
  targetUnit?: 'lb' | 'reps' | 'flexibility' | 'other';
  achieved: boolean;
  achievedAt?: string;
  createdAt: string;
};

export type Template = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type TemplateExercise = {
  id: string;
  templateId: string;
  exerciseId: string;
  position: number;
  targetSets?: number;
  targetReps?: number;
  targetWeightLb?: number;
  createdAt: string;
};
