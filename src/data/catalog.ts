import { USER_ID } from '../lib/user';
import type { EquipmentKind, Exercise, Goal, LoggedSet, MuscleGroup, WorkoutSession } from '../types';

const importedAt = new Date('2026-07-11T12:00:00-07:00').toISOString();

function exercise(
  slug: string,
  name: string,
  muscleGroup: MuscleGroup,
  equipment: EquipmentKind,
  secondaryMuscles: string[] = [],
  setupNotes: string[] = [],
): Exercise {
  return {
    id: `ex-${slug}`,
    slug,
    name,
    muscleGroup,
    secondaryMuscles,
    equipment,
    instructions: [],
    setupNotes,
    imageStyle: 'name-only',
    source: 'user-board',
  };
}

export const starterExercises: Exercise[] = [
  exercise('shoulder-press-cable-machine', 'Shoulder Press Cable Machine', 'shoulders', 'machine', ['triceps'], [
    'Seat / machine level 12',
  ]),
  exercise('tricep-machine-extension', 'Tricep Machine Extension', 'triceps', 'machine'),
  exercise('dumbbell-preacher-curl', 'Dumbbell Preacher Curl', 'biceps', 'dumbbell', ['forearms']),
  exercise('slanted-lat-raise-dumbbell-seated', 'Slanted Lat Raise Dumbbell Seated', 'shoulders', 'dumbbell', [], [
    'Seated slanted bench setup',
  ]),
  exercise('forearm-curl', 'Forearm Curl', 'forearms', 'dumbbell'),
  exercise('straight-bar-tricep-extension-machine', 'Straight Bar Tricep Extension Machine', 'triceps', 'machine'),
  exercise('bicep-curl', 'Bicep Curl', 'biceps', 'dumbbell'),
  exercise('rope-tricep-extension', 'Rope Tricep Extension', 'triceps', 'cable'),
  exercise('lat-raise', 'Lat Raise', 'shoulders', 'dumbbell'),
  exercise('preacher-curl-machine', 'Preacher Curl Machine', 'biceps', 'machine', [], ['Level 2.5 seat']),
  exercise('shoulder-press', 'Shoulder Press', 'shoulders', 'machine', ['triceps']),
  exercise('lateral-raise-machine', 'Lateral Raise Machine', 'shoulders', 'machine', [], ['Level 19']),
  exercise('tricep-rope-overhead-extension', 'Tricep Rope Overhead Extension', 'triceps', 'cable', [], [
    'Level 10',
    'Pin just above usual mark',
  ]),
  exercise('reverse-bar-curl', 'Reverse Bar Curl', 'biceps', 'barbell', ['forearms']),
  exercise('rope-hammer-curl', 'Rope Hammer Curl', 'biceps', 'cable', ['forearms']),
  exercise('seated-lateral-raise-padded-machine', 'Seated Lateral Raise Padded Machine', 'shoulders', 'machine'),

  exercise('squat-curved-stand', 'Squat Curved Stand', 'legs', 'machine', ['glutes'], ['3 plates plus 25 each side']),
  exercise('calf-raise-sitting', 'Calf Raise Sitting', 'calves', 'machine'),
  exercise('quad-extension', 'Quad Extension', 'quads', 'machine'),
  exercise('hamstring-curl-laying', 'Hamstring Curl Laying', 'hamstrings', 'machine'),
  exercise('ab-crunch-corner-machine', 'Ab Crunch Corner Machine', 'core', 'machine'),
  exercise('low-back-extension', 'Low Back Extension', 'back', 'machine'),
  exercise('leg-raise', 'Leg Raise', 'core', 'bodyweight', [], ['15 lb stretch before']),
  exercise('hack-squat', 'Hack Squat', 'legs', 'machine', ['glutes']),
  exercise('leg-press-linear', 'Leg Press Linear', 'legs', 'machine', ['glutes'], ['150 lb per leg']),
  exercise('calf-raise-standing-smith', 'Calf Raise Standing Smith', 'calves', 'machine', [], ['50 lb either side']),
  exercise('hip-abductor', 'Hip Abductor', 'glutes', 'machine'),

  exercise('lat-pulldown', 'Lat Pulldown', 'back', 'cable', ['biceps']),
  exercise('seated-row-machine', 'Seated Row Machine', 'back', 'machine', ['biceps'], ['Level 5', 'Seat 5']),
  exercise('trap-row-gym', 'Trap Row Gym', 'back', 'machine', [], ['155 lb each side', 'Chair level 4']),
  exercise('trap-row-dumbbells', 'Trap Row Dumbbells', 'back', 'dumbbell'),
  exercise('lower-lat-row', 'Lower Lat Row', 'back', 'machine'),
  exercise('seat-row-machine-low-lat', 'Seat Row Machine Low Lat', 'back', 'machine'),
  exercise('incline-machine-press', 'Incline Machine Press', 'chest', 'machine', ['shoulders', 'triceps'], [
    '90 lb each side',
  ]),
  exercise('cable-chest-fly', 'Cable Chest Fly', 'chest', 'cable', ['shoulders'], ['Setting 3']),
  exercise('bench-press', 'Bench Press', 'chest', 'barbell', ['triceps', 'shoulders']),

  exercise('low-row-machine', 'Low Row Machine', 'back', 'machine'),
  exercise('incline-press', 'Incline Press', 'chest', 'machine', [], ['Level 6']),
  exercise('smith-machine-bench', 'Smith Machine Bench', 'chest', 'machine', ['triceps']),
  exercise('low-back-raise', 'Low Back Raise', 'back', 'bodyweight'),
  exercise('abs-home', 'Abs Home', 'core', 'other'),
  exercise('squat-press', 'Squat Press', 'legs', 'machine', ['glutes']),
  exercise('tricep-extension-home', 'Tricep Extension Home', 'triceps', 'other'),
];

export const starterSessions: WorkoutSession[] = [];

export const starterSets: LoggedSet[] = [];

export const starterGoals: Goal[] = [
  {
    id: 'goal-bench-225',
    userId: USER_ID,
    name: 'Bench 225 lb',
    targetValue: 225,
    targetUnit: 'lb',
    achieved: false,
    createdAt: importedAt,
  },
  {
    id: 'goal-backflip',
    userId: USER_ID,
    name: 'Backflip',
    targetUnit: 'other',
    achieved: false,
    createdAt: importedAt,
  },
  {
    id: 'goal-dunk',
    userId: USER_ID,
    name: 'Dunk',
    targetUnit: 'other',
    achieved: false,
    createdAt: importedAt,
  },
  {
    id: 'goal-pullups-25',
    userId: USER_ID,
    name: '25 pull-ups in a row',
    targetValue: 25,
    targetUnit: 'reps',
    achieved: false,
    createdAt: importedAt,
  },
  {
    id: 'goal-muscle-up',
    userId: USER_ID,
    name: 'One clean muscle up',
    targetUnit: 'reps',
    achieved: false,
    createdAt: importedAt,
  },
  {
    id: 'goal-flexible',
    userId: USER_ID,
    name: 'Become fully flexible',
    targetUnit: 'flexibility',
    achieved: false,
    createdAt: importedAt,
  },
  {
    id: 'goal-pushups-60',
    userId: USER_ID,
    name: '60 push-ups in a row',
    targetValue: 60,
    targetUnit: 'reps',
    achieved: false,
    createdAt: importedAt,
  },
  {
    id: 'goal-visible-abs-170',
    userId: USER_ID,
    name: 'Visible abs at 170 lb',
    targetValue: 170,
    targetUnit: 'lb',
    achieved: false,
    createdAt: importedAt,
  },
  {
    id: 'goal-pistol-squat',
    userId: USER_ID,
    name: 'Pistol squat both sides',
    targetUnit: 'reps',
    achieved: false,
    createdAt: importedAt,
  },
];
