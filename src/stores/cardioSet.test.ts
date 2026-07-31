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
});
