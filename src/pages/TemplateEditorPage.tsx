import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ExercisePicker } from '../components/ExercisePicker';
import { useTemplateStore } from '../stores/templateStore';
import { useUiStore } from '../stores/uiStore';
import { useWorkoutStore } from '../stores/workoutStore';
import type { Exercise } from '../types';

export function TemplateEditorPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(templateId);

  const templates = useTemplateStore((state) => state.templates);
  const exercisesFor = useTemplateStore((state) => state.exercisesFor);
  const createTemplate = useTemplateStore((state) => state.createTemplate);
  const updateTemplateName = useTemplateStore((state) => state.updateTemplateName);
  const setTemplateExercises = useTemplateStore((state) => state.setTemplateExercises);
  const deleteTemplate = useTemplateStore((state) => state.deleteTemplate);
  const allExercises = useWorkoutStore((state) => state.exercises);
  const showPreviewNotice = useUiStore((state) => state.showPreviewNotice);

  const existing = templateId ? templates.find((item) => item.id === templateId) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [exerciseIds, setExerciseIds] = useState<string[]>(templateId ? exercisesFor(templateId) : []);

  if (isEditing && !existing) {
    return <p className="text-fgMuted">Template not found.</p>;
  }

  const selectedExercises = exerciseIds
    .map((id) => allExercises.find((exercise) => exercise.id === id))
    .filter((exercise): exercise is Exercise => Boolean(exercise));

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= exerciseIds.length) {
      return;
    }
    const next = [...exerciseIds];
    [next[index], next[target]] = [next[target], next[index]];
    setExerciseIds(next);
  }

  function removeExercise(exerciseId: string) {
    setExerciseIds((current) => current.filter((id) => id !== exerciseId));
  }

  function addExercise(exercise: Exercise) {
    if (exerciseIds.includes(exercise.id)) {
      return;
    }
    setExerciseIds((current) => [...current, exercise.id]);
  }

  function handleSave(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || exerciseIds.length === 0) {
      return;
    }

    if (isEditing && templateId) {
      updateTemplateName(templateId, trimmed);
      setTemplateExercises(templateId, exerciseIds);
      showPreviewNotice(`Saved "${trimmed}".`);
    } else {
      const created = createTemplate(trimmed, exerciseIds);
      showPreviewNotice(`Created "${created.name}".`);
    }
    navigate('/templates');
  }

  function handleDelete() {
    if (!templateId || !existing) {
      return;
    }
    deleteTemplate(templateId);
    showPreviewNotice(`Deleted "${existing.name}".`);
    navigate('/templates');
  }

  return (
    <div className="grid animate-rise gap-6">
      <div>
        <h1 className="page-title">{isEditing ? 'Edit template' : 'New template'}</h1>
        <p className="page-lead mt-3">Name it, add exercises, and put them in the order you train them.</p>
      </div>

      <form className="grid gap-5" onSubmit={handleSave}>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium text-fg">Name</span>
          <input
            className="field"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Push Day"
            maxLength={60}
            required
          />
        </label>

        <div className="grid gap-2">
          <span className="text-sm font-medium text-fg">Exercises</span>
          {selectedExercises.length === 0 ? (
            <p className="app-card text-fgMuted">Add exercises below.</p>
          ) : (
            selectedExercises.map((exercise, index) => (
              <div
                key={exercise.id}
                className="flex min-h-9 items-center gap-2 rounded-2xl border border-border/70 bg-surface/80 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">{exercise.name}</p>
                  <p className="text-xs capitalize text-fgMuted">{exercise.muscleGroup}</p>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Move ${exercise.name} up`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp size={15} strokeWidth={1.75} />
                </button>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Move ${exercise.name} down`}
                  disabled={index === selectedExercises.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown size={15} strokeWidth={1.75} />
                </button>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Remove ${exercise.name}`}
                  onClick={() => removeExercise(exercise.id)}
                >
                  <Trash2 size={15} strokeWidth={1.75} />
                </button>
              </div>
            ))
          )}
        </div>

        <ExercisePicker excludeIds={exerciseIds} onPick={addExercise} />

        <div className="flex items-center gap-2">
          <button
            className="button-primary min-h-9 flex-1 justify-center"
            type="submit"
            disabled={!name.trim() || exerciseIds.length === 0}
          >
            Save template
          </button>
          {isEditing ? (
            <button
              className="button-secondary min-h-9 justify-center text-danger"
              type="button"
              onClick={handleDelete}
            >
              Delete
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
