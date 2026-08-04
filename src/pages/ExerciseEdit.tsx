import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ExerciseForm } from '../components/ExerciseForm';
import { useExerciseBySlug } from '../hooks/useExercises';
import { useWorkoutStore } from '../stores/workoutStore';

function safeReturnPath(from: unknown): string | null {
  return typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : null;
}

export function ExerciseEdit() {
  const { slug } = useParams();
  const location = useLocation();
  const exercise = useExerciseBySlug(slug);
  const updateExercise = useWorkoutStore((state) => state.updateExercise);
  const navigate = useNavigate();
  const returnTo = safeReturnPath((location.state as { from?: unknown } | null)?.from);

  if (!exercise) {
    return <p className="text-fgMuted">Exercise not found.</p>;
  }

  const afterSavePath = returnTo ?? `/exercises/${exercise.slug}`;

  return (
    <ExerciseForm
      key={exercise.id}
      title="Edit Exercise"
      description="Fix name, muscle group, equipment, or setup notes. Slug and history stay linked."
      submitLabel="Save Changes"
      initial={{
        name: exercise.name,
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment,
        setupNotes: exercise.setupNotes ?? [],
        imageUrl: exercise.imageUrl,
      }}
      onCancel={() => navigate(afterSavePath)}
      onSubmit={(values) => {
        const updated = updateExercise(exercise.id, values);
        if (updated) {
          navigate(returnTo ?? `/exercises/${updated.slug}`);
        }
      }}
    />
  );
}
