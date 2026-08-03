import { describe, expect, it } from 'vitest';
import { useWorkoutStore } from '../stores/workoutStore';
import { starterExercises, starterGoals, starterSets } from '../data/catalog';

function reset() {
  useWorkoutStore.setState({
    exercises: starterExercises,
    sessions: [],
    sets: starterSets,
    goals: starterGoals,
    historyCleared: false,
    boardHistorySeedVersion: useWorkoutStore.getState().boardHistorySeedVersion,
  });
}

describe('cardio set logging', () => {
  it('accepts level/speed/time/calories without weight or reps', () => {
    reset();
    const session = useWorkoutStore.getState().createSession();
    let cardio = useWorkoutStore.getState().exercises.find((item) => item.muscleGroup === 'cardio');
    if (!cardio) {
      cardio = useWorkoutStore.getState().addExercise({
        name: 'Treadmill Walk',
        muscleGroup: 'cardio',
        equipment: 'machine',
      });
    }

    const logged = useWorkoutStore.getState().addSet({
      sessionId: session.id,
      exerciseId: cardio.id,
      weightLb: 0,
      reps: 0,
      isWarmup: false,
      level: 6,
      speed: 3.5,
      durationSec: 1200,
      calories: 140,
    });

    expect(logged.isPr).toBe(false);
    expect(logged.level).toBe(6);
    expect(logged.speed).toBe(3.5);
    expect(logged.durationSec).toBe(1200);
    expect(logged.calories).toBe(140);
  });

  it('logs duration-only NL for full-body stretching via logExerciseNotes', async () => {
    reset();
    const session = useWorkoutStore.getState().createSession();
    const stretching = useWorkoutStore.getState().addExercise({
      name: 'Stretching',
      muscleGroup: 'full-body',
      equipment: 'bodyweight',
    });

    const result = await useWorkoutStore
      .getState()
      .logExerciseNotes(session.id, stretching.id, '15 minutes');

    expect(result.imported).toBe(1);
    expect(result.notes).toEqual([]);

    const logged = useWorkoutStore
      .getState()
      .sets.find((setItem) => setItem.sessionId === session.id && setItem.exerciseId === stretching.id);

    expect(logged).toMatchObject({
      weightLb: 0,
      reps: 0,
      durationSec: 900,
      isPr: false,
    });
  });
});
