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

export type EquipmentKind = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell' | 'other';

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
