import { useDiaryStore } from '../stores/diaryStore';
import { useUiStore } from '../stores/uiStore';
import { useWorkoutStore } from '../stores/workoutStore';

export function exportWorkoutData(): string {
  const workout = useWorkoutStore.getState();
  const diary = useDiaryStore.getState();
  const ui = useUiStore.getState();
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      exercises: workout.exercises,
      goals: workout.goals,
      sessions: workout.sessions,
      sets: workout.sets,
      bodyWeightLogs: diary.bodyWeightLogs,
      movements: diary.movements,
      intentions: ui.intentions,
      unit: ui.unit,
      restSeconds: ui.restSeconds,
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
