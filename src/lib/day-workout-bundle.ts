import { toDayKey } from './calendar';
import { estimateCardioCalories } from './cardio-calories';
import type { MovementKind } from './movement-from-text';

export const DAY_WORKOUT_TIMEZONE = 'America/Los_Angeles';

export type DayWorkoutSessionInput = {
  id: string;
  startedAt: string;
  endedAt?: string;
  notes?: string;
};

export type DayWorkoutSetInput = {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  weightLb: number;
  reps: number;
  isWarmup: boolean;
  isPr: boolean;
  createdAt: string;
};

export type DayWorkoutExerciseInput = {
  id: string;
  name: string;
};

export type DayWorkoutMovementInput = {
  id: string;
  loggedAt: string;
  kind: MovementKind;
  title: string;
  durationMin: number | null;
  summary: string;
  raw: string;
};

export type DayWorkoutBundleSet = {
  id: string;
  setNumber: number;
  weightLb: number;
  reps: number;
  isWarmup: boolean;
  isPr: boolean;
  createdAt: string;
};

export type DayWorkoutBundleExercise = {
  exerciseId: string;
  name: string;
  setCount: number;
  sets: DayWorkoutBundleSet[];
};

export type DayWorkoutBundleSession = {
  id: string;
  startedAt: string;
  endedAt?: string;
  notes?: string;
  setCount: number;
  prCount: number;
  volumeLb: number;
  exercises: DayWorkoutBundleExercise[];
};

export type DayWorkoutBundleMovement = {
  id: string;
  kind: MovementKind;
  title: string;
  durationMin: number | null;
  summary: string;
  raw: string;
  loggedAt: string;
  /** Cardio/movement estimate only — never derived from gym lifts. */
  estimatedCalories: number | null;
};

export type DayWorkoutBundle = {
  date: string;
  sessions: DayWorkoutBundleSession[];
  movements: DayWorkoutBundleMovement[];
  /** Sum of movement `estimatedCalories` (cardio section only). */
  cardioCalories: number;
  flags: {
    hadGym: boolean;
    hadPr: boolean;
    /** Any logged movement/cardio category for the day. */
    hadCardio: boolean;
  };
};

export type GetDayWorkoutBundleInput = {
  sessions: DayWorkoutSessionInput[];
  sets: DayWorkoutSetInput[];
  exercises: DayWorkoutExerciseInput[];
  movements?: DayWorkoutMovementInput[];
  /** Latest known body weight (lb) for cardio calorie estimates. */
  bodyWeightLb?: number | null;
};

export type GetDayWorkoutBundleOptions = {
  timeZone?: string;
};

function buildSessionBundle(
  session: DayWorkoutSessionInput,
  sets: DayWorkoutSetInput[],
  exerciseNameById: Map<string, string>,
): DayWorkoutBundleSession {
  const sessionSets = sets
    .filter((setItem) => setItem.sessionId === session.id)
    .slice()
    .sort((a, b) => a.setNumber - b.setNumber || a.createdAt.localeCompare(b.createdAt));

  const byExercise = new Map<string, DayWorkoutBundleSet[]>();
  for (const setItem of sessionSets) {
    const list = byExercise.get(setItem.exerciseId) ?? [];
    list.push({
      id: setItem.id,
      setNumber: setItem.setNumber,
      weightLb: setItem.weightLb,
      reps: setItem.reps,
      isWarmup: setItem.isWarmup,
      isPr: setItem.isPr,
      createdAt: setItem.createdAt,
    });
    byExercise.set(setItem.exerciseId, list);
  }

  const exercises: DayWorkoutBundleExercise[] = [...byExercise.entries()].map(
    ([exerciseId, exerciseSets]) => ({
      exerciseId,
      name: exerciseNameById.get(exerciseId) ?? 'Exercise',
      setCount: exerciseSets.length,
      sets: exerciseSets,
    }),
  );

  const workingSets = sessionSets.filter((setItem) => !setItem.isWarmup);
  const volumeLb = workingSets.reduce(
    (total, setItem) => total + setItem.weightLb * setItem.reps,
    0,
  );
  const prCount = workingSets.filter((setItem) => setItem.isPr).length;

  return {
    id: session.id,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    notes: session.notes,
    setCount: sessionSets.length,
    prCount,
    volumeLb,
    exercises,
  };
}

/**
 * Reconstruct one calendar day's Move activity from events.
 * Returns `null` when the day has no gym sessions and no movements
 * (empty calendar cells stay blank — no day spine rows).
 *
 * Day keys use America/Los_Angeles by default. Any session that started that
 * day counts as gym (open or soft-ended). Session notes come from
 * `sessions.notes` (no day_notes table).
 */
export function getDayWorkoutBundle(
  date: string,
  input: GetDayWorkoutBundleInput,
  options: GetDayWorkoutBundleOptions = {},
): DayWorkoutBundle | null {
  const timeZone = options.timeZone ?? DAY_WORKOUT_TIMEZONE;
  const exerciseNameById = new Map(input.exercises.map((exercise) => [exercise.id, exercise.name]));

  const sessions = input.sessions
    .filter((session) => toDayKey(session.startedAt, timeZone) === date)
    .slice()
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((session) => buildSessionBundle(session, input.sets, exerciseNameById));

  const movements = (input.movements ?? [])
    .filter((movement) => toDayKey(movement.loggedAt, timeZone) === date)
    .slice()
    .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
    .map((movement) => {
      const estimatedCalories = estimateCardioCalories({
        kind: movement.kind,
        durationMin: movement.durationMin,
        bodyWeightLb: input.bodyWeightLb,
      });
      return {
        id: movement.id,
        kind: movement.kind,
        title: movement.title,
        durationMin: movement.durationMin,
        summary: movement.summary,
        raw: movement.raw,
        loggedAt: movement.loggedAt,
        estimatedCalories,
      } satisfies DayWorkoutBundleMovement;
    });

  if (sessions.length === 0 && movements.length === 0) {
    return null;
  }

  const cardioCalories = movements.reduce(
    (total, movement) => total + (movement.estimatedCalories ?? 0),
    0,
  );

  return {
    date,
    sessions,
    movements,
    cardioCalories,
    flags: {
      hadGym: sessions.length > 0,
      hadPr: sessions.some((session) => session.prCount > 0),
      hadCardio: movements.length > 0,
    },
  };
}
