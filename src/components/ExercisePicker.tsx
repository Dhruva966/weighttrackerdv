import { Plus, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { useExercises } from '../hooks/useExercises';
import { FORM_MUSCLE_GROUPS } from '../lib/formMuscleGroups';
import { useWorkoutStore } from '../stores/workoutStore';
import type { EquipmentKind, Exercise, MuscleGroup } from '../types';
import { ExerciseImage } from './ExerciseImage';

const createSchema = z.object({
  name: z.string().min(2),
  muscleGroup: z.enum(FORM_MUSCLE_GROUPS),
  equipment: z.enum(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'other']),
});

export function ExercisePicker({
  onPick,
  excludeIds = [],
}: {
  onPick: (exercise: Exercise) => void;
  excludeIds?: string[];
}) {
  const addExercise = useWorkoutStore((state) => state.addExercise);
  const [query, setQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('chest');
  const [equipment, setEquipment] = useState<EquipmentKind>('machine');
  const [createError, setCreateError] = useState('');
  const trimmed = query.trim();
  // Keep already-planned matches visible — filtering them out made Create & add look
  // like a no-op when searching the new name (it was only hidden via excludeIds).
  const matches = useExercises(trimmed).slice(0, 6);
  const excludeSet = new Set(excludeIds);

  function handlePick(exercise: Exercise) {
    onPick(exercise);
    setQuery('');
    setShowCreate(false);
  }

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    const parsed = createSchema.safeParse({
      name: name.trim() || trimmed,
      muscleGroup,
      equipment,
    });
    if (!parsed.success) {
      setCreateError('Name, muscle group, and equipment are required.');
      return;
    }

    const exercise = addExercise({
      name: parsed.data.name,
      muscleGroup: parsed.data.muscleGroup,
      equipment: parsed.data.equipment,
    });
    handlePick(exercise);
    setName('');
    setCreateError('');
    setShowCreate(false);
  }

  return (
    <div className="app-card grid gap-3">
      <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 focus-within:border-accent">
        <Search className="shrink-0 text-fgMuted" size={16} strokeWidth={1.5} aria-hidden />
        <span className="sr-only">Search exercises to add</span>
        <input
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm leading-none text-fg outline-none placeholder:text-fgMuted"
          placeholder="Search exercises to add"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {trimmed ? (
        <div className="grid gap-1.5">
          {matches.length ? (
            matches.map((exercise) => {
              const alreadyAdded = excludeSet.has(exercise.id);
              return (
                <button
                  key={exercise.id}
                  className={`flex min-h-12 items-center gap-3 rounded-xl border px-2.5 py-2 text-left ${
                    alreadyAdded
                      ? 'border-border/70 bg-surface text-fgMuted'
                      : 'border-border bg-bg hover:border-fg/30'
                  }`}
                  type="button"
                  disabled={alreadyAdded}
                  onClick={() => handlePick(exercise)}
                >
                  <ExerciseImage exercise={exercise} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-fg">{exercise.name}</span>
                  <span className="shrink-0 text-[11px] capitalize text-fgMuted">
                    {alreadyAdded ? 'Added' : exercise.muscleGroup}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="text-sm text-fgMuted">No matches — create one below.</p>
          )}
        </div>
      ) : null}

      {showCreate ? (
        <form className="grid gap-3 rounded-xl border border-border bg-bg p-3" onSubmit={handleCreate}>
          <p className="text-sm font-semibold text-fg">Create exercise</p>
          <label>
            <span className="label">Name</span>
            <input
              className="field mt-1 !h-10 !min-h-0 text-sm"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Seated lateral raise"
              autoFocus
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="label">Muscle</span>
              <select
                className="field mt-1 !h-10 !min-h-0 capitalize text-sm"
                value={muscleGroup}
                onChange={(event) => setMuscleGroup(event.target.value as MuscleGroup)}
              >
                {FORM_MUSCLE_GROUPS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Equipment</span>
              <select
                className="field mt-1 !h-10 !min-h-0 capitalize text-sm"
                value={equipment}
                onChange={(event) => setEquipment(event.target.value as EquipmentKind)}
              >
                {createSchema.shape.equipment.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {createError ? <p className="text-sm font-medium text-danger">{createError}</p> : null}
          <div className="flex gap-2">
            <button className="button-primary min-h-10 flex-1 justify-center text-sm" type="submit">
              Create &amp; add
            </button>
            <button
              className="button-secondary min-h-10 px-3 text-sm"
              type="button"
              onClick={() => {
                setShowCreate(false);
                setCreateError('');
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          className="button-secondary min-h-9 w-full justify-center gap-1.5 text-sm"
          type="button"
          onClick={() => {
            setShowCreate(true);
            if (trimmed && !name) {
              setName(trimmed);
            }
          }}
        >
          <Plus size={16} strokeWidth={1.75} />
          Create exercise
        </button>
      )}
    </div>
  );
}
