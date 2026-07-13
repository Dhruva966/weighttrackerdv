import { useWorkoutStore } from '../stores/workoutStore';

export function exportWorkoutData(): string {
  const state = useWorkoutStore.getState();
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      exercises: state.exercises,
      goals: state.goals,
      sessions: state.sessions,
      sets: state.sets,
    },
    null,
    2,
  );
}

export function downloadWorkoutExport(): void {
  const blob = new Blob([exportWorkoutData()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `weight-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
