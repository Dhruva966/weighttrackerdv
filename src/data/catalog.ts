/**
 * Board-imported exercise catalog + lift baseline for Grow charts.
 *
 * Current weights come from the owner’s board screenshot import (Jul 2026).
 * Intermediate 9th/10th/11th points are documented grade baselines (via
 * `buildSyntheticProgressRows`) so `buildLiftProgress` has real LoggedSet rows —
 * not the old jagged UI-only chart series. Bump `BOARD_HISTORY_SEED_VERSION` in
 * workoutStore when changing this seed so existing browsers re-merge.
 *
 * Baseline sessions exist only as FK anchors for starterSets. They are NOT loaded
 * into workoutStore.sessions — otherwise Grow/Move calendar treat them as real gym days.
 */
import { USER_ID } from '../lib/user';
import { buildSyntheticProgressRows } from '../lib/syntheticProgress';
import type { EquipmentKind, Exercise, Goal, LoggedSet, MuscleGroup, WorkoutSession } from '../types';

const importedAt = new Date('2026-07-11T12:00:00-07:00').toISOString();
const sessionByGrade = {
  '9th': 'session-synthetic-9th',
  '10th': 'session-synthetic-10th',
  '11th': 'session-synthetic-11th',
  Current: 'session-current-board-import',
} as const;

/** Session IDs used only to attach baseline weight history — never real workouts. */
export const BOARD_BASELINE_SESSION_IDS = new Set<string>(Object.values(sessionByGrade));

export function isBoardBaselineSession(sessionId: string): boolean {
  return BOARD_BASELINE_SESSION_IDS.has(sessionId);
}

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

export const starterSessions: WorkoutSession[] = [
  {
    id: 'session-synthetic-9th',
    userId: USER_ID,
    startedAt: new Date('2022-09-01T12:00:00-07:00').toISOString(),
    endedAt: new Date('2022-09-01T12:00:00-07:00').toISOString(),
    notes: 'Synthetic baseline from 9th grade',
  },
  {
    id: 'session-synthetic-10th',
    userId: USER_ID,
    startedAt: new Date('2023-09-01T12:00:00-07:00').toISOString(),
    endedAt: new Date('2023-09-01T12:00:00-07:00').toISOString(),
    notes: 'Synthetic baseline from 10th grade',
  },
  {
    id: 'session-synthetic-11th',
    userId: USER_ID,
    startedAt: new Date('2024-09-01T12:00:00-07:00').toISOString(),
    endedAt: new Date('2024-09-01T12:00:00-07:00').toISOString(),
    notes: 'Synthetic baseline from 11th grade',
  },
  {
    id: 'session-current-board-import',
    userId: USER_ID,
    startedAt: importedAt,
    endedAt: importedAt,
    notes: 'Imported current lifts from board screenshot',
  },
];

const baselineRows: Array<{ slug: string; weightLb: number; reps?: number; progression?: number[] }> = [
  { slug: 'shoulder-press-cable-machine', weightLb: 120 },
  { slug: 'tricep-machine-extension', weightLb: 125 },
  { slug: 'dumbbell-preacher-curl', weightLb: 42.5 },
  { slug: 'slanted-lat-raise-dumbbell-seated', weightLb: 25 },
  { slug: 'forearm-curl', weightLb: 57.5 },
  { slug: 'straight-bar-tricep-extension-machine', weightLb: 170 },
  { slug: 'bicep-curl', weightLb: 45, progression: [25, 30, 35, 45] },
  { slug: 'rope-tricep-extension', weightLb: 72.5, progression: [47, 57, 65, 72.5] },
  { slug: 'lat-raise', weightLb: 32, progression: [20, 25, 27.5, 32] },
  { slug: 'preacher-curl-machine', weightLb: 115 },
  { slug: 'shoulder-press', weightLb: 65, progression: [35, 45, 55, 65] },
  { slug: 'lateral-raise-machine', weightLb: 20 },
  { slug: 'tricep-rope-overhead-extension', weightLb: 60 },
  { slug: 'reverse-bar-curl', weightLb: 80 },
  { slug: 'rope-hammer-curl', weightLb: 67.5 },
  { slug: 'seated-lateral-raise-padded-machine', weightLb: 130 },

  { slug: 'squat-curved-stand', weightLb: 365 },
  { slug: 'calf-raise-sitting', weightLb: 110 },
  { slug: 'quad-extension', weightLb: 210 },
  { slug: 'hamstring-curl-laying', weightLb: 150 },
  { slug: 'ab-crunch-corner-machine', weightLb: 150 },
  { slug: 'low-back-extension', weightLb: 125 },
  { slug: 'leg-raise', weightLb: 15 },
  { slug: 'hack-squat', weightLb: 205 },
  { slug: 'leg-press-linear', weightLb: 150 },
  { slug: 'calf-raise-standing-smith', weightLb: 100 },
  { slug: 'hip-abductor', weightLb: 175 },

  { slug: 'lat-pulldown', weightLb: 175 },
  { slug: 'seated-row-machine', weightLb: 180 },
  { slug: 'trap-row-gym', weightLb: 155 },
  { slug: 'trap-row-dumbbells', weightLb: 80 },
  { slug: 'lower-lat-row', weightLb: 80 },
  { slug: 'seat-row-machine-low-lat', weightLb: 180 },
  { slug: 'incline-machine-press', weightLb: 180 },
  { slug: 'cable-chest-fly', weightLb: 165 },
  { slug: 'bench-press', weightLb: 205, reps: 3 },
  { slug: 'bench-press', weightLb: 185, reps: 6 },

  { slug: 'low-row-machine', weightLb: 75 },
  { slug: 'incline-press', weightLb: 75 },
  { slug: 'smith-machine-bench', weightLb: 175 },
  { slug: 'low-back-raise', weightLb: 100 },
  { slug: 'abs-home', weightLb: 48 },
  { slug: 'squat-press', weightLb: 400 },
  { slug: 'tricep-extension-home', weightLb: 70 },
];

const setNumbersByExerciseAndSession = new Map<string, number>();

export const starterSets: LoggedSet[] = baselineRows.flatMap((row, rowIndex) =>
  buildSyntheticProgressRows({
    slug: row.slug,
    currentWeightLb: row.weightLb,
    currentReps: row.reps,
    progression: row.progression,
  }).map((progressRow, gradeIndex) => {
    const sessionId = sessionByGrade[progressRow.grade];
    const key = `${row.slug}:${sessionId}`;
    const setNumber = (setNumbersByExerciseAndSession.get(key) ?? 0) + 1;
    setNumbersByExerciseAndSession.set(key, setNumber);

    return {
      id: `set-${progressRow.grade.toLowerCase()}-${row.slug}-${setNumber}-${rowIndex}`,
      sessionId,
      exerciseId: `ex-${row.slug}`,
      setNumber,
      weightLb: progressRow.weightLb,
      reps: progressRow.reps,
      isWarmup: false,
      isPr: true,
      createdAt: new Date(new Date(progressRow.date).getTime() + (rowIndex * 4 + gradeIndex) * 1000).toISOString(),
    };
  }),
);

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
