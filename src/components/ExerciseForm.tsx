import { Camera, Save } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';
import { coerceFormMuscleGroup, FORM_MUSCLE_GROUPS } from '../lib/formMuscleGroups';
import type { EquipmentKind, MuscleGroup } from '../types';

export const exerciseFormSchema = z.object({
  name: z.string().min(2),
  muscleGroup: z.enum(FORM_MUSCLE_GROUPS),
  equipment: z.enum(['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'other']),
});

export type ExerciseFormValues = {
  name: string;
  muscleGroup: MuscleGroup;
  equipment: EquipmentKind;
  setupNotes: string[];
  imageUrl?: string;
};

type ExerciseFormProps = {
  title: string;
  description: string;
  submitLabel: string;
  initial?: Partial<ExerciseFormValues> & { imageUrl?: string };
  onSubmit: (values: ExerciseFormValues) => void;
};

export function ExerciseForm({ title, description, submitLabel, initial, onSubmit }: ExerciseFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(coerceFormMuscleGroup(initial?.muscleGroup));
  const [equipment, setEquipment] = useState<EquipmentKind>(initial?.equipment ?? 'machine');
  const [setupNotes, setSetupNotes] = useState((initial?.setupNotes ?? []).join('\n'));
  const [imageUrl, setImageUrl] = useState<string | undefined>(initial?.imageUrl);
  const [error, setError] = useState('');

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = exerciseFormSchema.safeParse({ name, muscleGroup, equipment });
        if (!parsed.success) {
          setError('Name, muscle group, and equipment are required.');
          return;
        }

        onSubmit({
          name: parsed.data.name,
          muscleGroup: parsed.data.muscleGroup,
          equipment: parsed.data.equipment,
          setupNotes: setupNotes
            .split(/\r?\n/)
            .map((note) => note.trim())
            .filter(Boolean),
          imageUrl,
        });
      }}
    >
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="mt-1 text-sm text-fgMuted">{description}</p>
      </div>
      <label>
        <span className="label">Name</span>
        <input
          className="field mt-1"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Seated lateral raise"
        />
      </label>
      <label>
        <span className="label">Muscle group</span>
        <select
          className="field mt-1 capitalize"
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
          className="field mt-1 capitalize"
          value={equipment}
          onChange={(event) => setEquipment(event.target.value as EquipmentKind)}
        >
          {exerciseFormSchema.shape.equipment.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="label">Setup notes</span>
        <textarea
          className="field mt-1 min-h-28 py-3"
          value={setupNotes}
          onChange={(event) => setSetupNotes(event.target.value)}
          placeholder={'Seat level 5\nPin just above middle\nHandle setting 3'}
        />
      </label>
      <label className="app-card flex items-center justify-between gap-3">
        <span className="flex items-center gap-3 font-semibold text-fg">
          <Camera className="text-accent" />
          Camera photo
        </span>
        <input
          className="max-w-[10rem] text-sm text-fgMuted"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              setImageUrl(URL.createObjectURL(file));
            }
          }}
        />
      </label>
      {error ? (
        <p className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm font-semibold text-danger">{error}</p>
      ) : null}
      <button className="button-primary" type="submit">
        <Save size={20} />
        {submitLabel}
      </button>
    </form>
  );
}
