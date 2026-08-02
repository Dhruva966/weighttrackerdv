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
  extras: Pick<Partial<Exercise>, 'imageUrl' | 'imageStyle' | 'source' | 'instructions'> = {},
): Exercise {
  return {
    id: `ex-${slug}`,
    slug,
    name,
    muscleGroup,
    secondaryMuscles,
    equipment,
    instructions: extras.instructions ?? [],
    setupNotes,
    imageUrl: extras.imageUrl,
    imageStyle: extras.imageUrl ? (extras.imageStyle ?? 'photo') : (extras.imageStyle ?? 'name-only'),
    source: extras.source ?? 'user-board',
  };
}

export const starterExercises: Exercise[] = [
  // Merged into imaged PDF rows — keep board setup notes on the survivor slug.
  exercise('shoulder-press-machine', 'Shoulder Press (Machine)', 'shoulders', 'machine', ['triceps'], [
    'Seat / machine level 12',
  ]),
  exercise('shoulder-press-dumbell', 'Shoulder Press (Dumbell)', 'shoulders', 'dumbbell', ['triceps']),
  exercise('triceps-extension-machine', 'Triceps Extension (Machine)', 'triceps', 'machine'),
  exercise('preacher-curl-dumbbell', 'Preacher Curl (Dumbbell)', 'biceps', 'dumbbell', ['forearms']),
  exercise('slanted-lat-raise-dumbbell-seated', 'Slanted Lateral Raise (Dumbell)', 'shoulders', 'dumbbell', [], [
    'Seated slanted bench setup',
  ]),
  exercise('forearm-curl', 'Forearm Curl', 'forearms', 'dumbbell'),
  exercise('bicep-curl-dumbbell', 'Bicep Curl (Dumbbell)', 'biceps', 'dumbbell'),
  exercise('rope-tricep-extension', 'Rope Tricep Extension', 'triceps', 'cable'),
  exercise('lateral-raise-dumbbell', 'Lateral Raise (Dumbbell)', 'shoulders', 'dumbbell'),
  exercise('lateral-raise-cable', 'Lateral Raise (Cable)', 'shoulders', 'cable'),
  exercise('preacher-curl-machine', 'Preacher Curl Machine', 'biceps', 'machine', [], ['Level 2.5 seat']),
  exercise('lateral-raise-machine', 'Lateral Raise (Machine)', 'shoulders', 'machine', [], ['Level 19']),
  exercise('tricep-rope-overhead-extension', 'Tricep Rope Overhead Extension', 'triceps', 'cable', [], [
    'Level 10',
    'Pin just above usual mark',
  ]),
  exercise('reverse-curl-barbell', 'Reverse Curl (Barbell)', 'biceps', 'barbell', ['forearms']),
  exercise('hammer-curl-cable', 'Hammer Curl (Cable)', 'biceps', 'cable', ['forearms']),

  exercise('squat-curved-stand', 'Squat Curved Stand', 'legs', 'machine', ['glutes'], ['3 plates plus 25 each side']),
  exercise('seated-calf-raise-machine', 'Seated Calf Raise (Machine)', 'calves', 'machine'),
  exercise('leg-extension-machine', 'Leg Extension (Machine)', 'quads', 'machine'),
  exercise('lying-leg-curl-machine', 'Lying Leg Curl (Machine)', 'hamstrings', 'machine'),
  exercise('crunch-machine', 'Crunch (Machine)', 'core', 'machine'),
  exercise('back-extension-machine', 'Back Extension (Machine)', 'back', 'machine'),
  exercise('flat-leg-raise', 'Flat Leg Raise', 'core', 'bodyweight', [], ['15 lb stretch before']),
  exercise('hack-squat-barbell', 'Hack Squat (Barbell)', 'legs', 'barbell', ['glutes']),
  exercise('leg-press', 'Leg Press', 'legs', 'machine', ['glutes'], ['150 lb per leg']),
  exercise('standing-calf-raise-smith-machine', 'Standing Calf Raise (Smith Machine)', 'calves', 'machine', [], [
    '50 lb either side',
  ]),
  exercise('hip-abductor-machine', 'Hip Abductor (Machine)', 'glutes', 'machine'),

  exercise('lat-pulldown-cable', 'Lat Pulldown (Cable)', 'back', 'cable', ['biceps']),
  // Absorbs underhand lat pulldown image; keep this display name.
  exercise('close-grip-pulldown', 'Close Grip Pulldown', 'back', 'cable', [
    'biceps',
    'middle back',
    'shoulders',
  ]),
  exercise('seated-row-machine', 'Seated Row Machine', 'back', 'machine', ['biceps'], ['Level 5', 'Seat 5']),
  exercise('trap-row-gym', 'Trap Row Gym', 'back', 'machine', [], ['155 lb each side', 'Chair level 4']),
  exercise('trap-row-dumbbells', 'Trap Row Dumbbells', 'back', 'dumbbell'),
  exercise('lower-lat-row', 'Lower Lat Row', 'back', 'machine'),
  exercise('seat-row-machine-low-lat', 'Seat Row Machine Low Lat', 'back', 'machine'),
  exercise('incline-chest-press-machine', 'Incline Chest Press (Machine)', 'chest', 'machine', ['shoulders', 'triceps'], [
    '90 lb each side',
  ]),
  exercise('chest-fly', 'Chest Fly', 'chest', 'cable', ['shoulders'], ['Setting 3']),
  exercise('bench-press-barbell', 'Bench Press (Barbell)', 'chest', 'barbell', ['triceps', 'shoulders']),

  exercise('low-row-machine', 'Low Row Machine', 'back', 'machine'),
  exercise('bench-press-smith-machine', 'Bench Press (Smith Machine)', 'chest', 'machine', ['triceps']),
  exercise('back-extension', 'Back Extension', 'back', 'bodyweight'),
  exercise('abs-home', 'Abs Home', 'core', 'other'),
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
  { slug: 'shoulder-press-machine', weightLb: 65, progression: [35, 45, 55, 65] },
  { slug: 'shoulder-press-dumbell', weightLb: 50 },
  { slug: 'triceps-extension-machine', weightLb: 170, progression: [125, 140, 155, 170] },
  { slug: 'preacher-curl-dumbbell', weightLb: 42.5 },
  { slug: 'slanted-lat-raise-dumbbell-seated', weightLb: 25 },
  { slug: 'forearm-curl', weightLb: 57.5 },
  { slug: 'bicep-curl-dumbbell', weightLb: 45, progression: [25, 30, 35, 45] },
  { slug: 'rope-tricep-extension', weightLb: 72.5, progression: [47, 57, 65, 72.5] },
  { slug: 'lateral-raise-dumbbell', weightLb: 32, progression: [20, 25, 27.5, 32] },
  { slug: 'preacher-curl-machine', weightLb: 115 },
  { slug: 'lateral-raise-machine', weightLb: 20 },
  { slug: 'tricep-rope-overhead-extension', weightLb: 60 },
  { slug: 'reverse-curl-barbell', weightLb: 80 },
  { slug: 'hammer-curl-cable', weightLb: 67.5 },

  { slug: 'squat-curved-stand', weightLb: 365 },
  { slug: 'seated-calf-raise-machine', weightLb: 110 },
  { slug: 'leg-extension-machine', weightLb: 210 },
  { slug: 'lying-leg-curl-machine', weightLb: 150 },
  { slug: 'crunch-machine', weightLb: 150 },
  { slug: 'back-extension-machine', weightLb: 125 },
  { slug: 'flat-leg-raise', weightLb: 15 },
  { slug: 'hack-squat-barbell', weightLb: 205 },
  { slug: 'leg-press', weightLb: 150 },
  { slug: 'standing-calf-raise-smith-machine', weightLb: 100 },
  { slug: 'hip-abductor-machine', weightLb: 175 },

  { slug: 'lat-pulldown-cable', weightLb: 175 },
  { slug: 'seated-row-machine', weightLb: 180 },
  { slug: 'trap-row-gym', weightLb: 155 },
  { slug: 'trap-row-dumbbells', weightLb: 80 },
  { slug: 'lower-lat-row', weightLb: 80 },
  { slug: 'seat-row-machine-low-lat', weightLb: 180 },
  { slug: 'incline-chest-press-machine', weightLb: 180 },
  { slug: 'chest-fly', weightLb: 165 },
  { slug: 'bench-press-barbell', weightLb: 205, reps: 3 },
  { slug: 'bench-press-barbell', weightLb: 185, reps: 6 },

  { slug: 'low-row-machine', weightLb: 75 },
  { slug: 'bench-press-smith-machine', weightLb: 175 },
  { slug: 'back-extension', weightLb: 100 },
  { slug: 'abs-home', weightLb: 48 },
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
