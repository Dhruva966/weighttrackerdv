import { useNavigate } from 'react-router-dom';
import { ExerciseForm } from '../components/ExerciseForm';
import { useWorkoutStore } from '../stores/workoutStore';

export function ExerciseCreate() {
  const addExercise = useWorkoutStore((state) => state.addExercise);
  const navigate = useNavigate();

  return (
    <ExerciseForm
      title="New Exercise"
      description="Add name, target muscle, equipment, and optional camera photo."
      submitLabel="Save Exercise"
      onCancel={() => navigate('/exercises')}
      onSubmit={(values) => {
        const exercise = addExercise(values);
        navigate(`/exercises/${exercise.slug}`);
      }}
    />
  );
}
