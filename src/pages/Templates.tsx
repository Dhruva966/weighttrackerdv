import { Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { TemplateCard } from '../components/TemplateCard';
import { exampleTemplates, resolveExampleTemplateExerciseIds } from '../data/example-templates';
import { startWorkoutWithExercises, useTemplateStore } from '../stores/templateStore';
import { useUiStore } from '../stores/uiStore';
import { useWorkoutStore } from '../stores/workoutStore';

export function Templates() {
  const navigate = useNavigate();
  const templates = useTemplateStore((state) => state.templates);
  const exercisesFor = useTemplateStore((state) => state.exercisesFor);
  const startWorkoutFromTemplate = useTemplateStore((state) => state.startWorkoutFromTemplate);
  const duplicateTemplate = useTemplateStore((state) => state.duplicateTemplate);
  const deleteTemplate = useTemplateStore((state) => state.deleteTemplate);
  const exercises = useWorkoutStore((state) => state.exercises);
  const showPreviewNotice = useUiStore((state) => state.showPreviewNotice);

  const savedTemplates = templates.filter((template) => exercisesFor(template.id).length > 0);

  function exerciseName(id: string): string {
    return exercises.find((exercise) => exercise.id === id)?.name ?? 'Exercise';
  }

  function handleStart(templateId: string) {
    const sessionId = startWorkoutFromTemplate(templateId);
    if (sessionId) {
      navigate(`/session/${sessionId}`, { state: { from: '/templates' } });
    }
  }

  function handleStartExample(example: (typeof exampleTemplates)[number]) {
    const exerciseIds = resolveExampleTemplateExerciseIds(example, exercises);
    const sessionId = startWorkoutWithExercises(exerciseIds);
    if (sessionId) {
      navigate(`/session/${sessionId}`, { state: { from: '/templates' } });
    }
  }

  function handleDuplicate(templateId: string) {
    const copy = duplicateTemplate(templateId);
    if (copy) {
      showPreviewNotice(`Duplicated as "${copy.name}".`);
    }
  }

  function handleDelete(templateId: string, name: string) {
    deleteTemplate(templateId);
    showPreviewNotice(`Deleted "${name}".`);
  }

  return (
    <div className="grid animate-rise gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Templates</h1>
          <p className="page-lead mt-3">Start a workout in one tap, or build your own.</p>
        </div>
        <Link className="button-primary min-h-9 gap-1.5 px-3 text-sm" to="/templates/new">
          <Plus size={16} strokeWidth={1.75} />
          New
        </Link>
      </div>

      <section className="grid gap-3" aria-labelledby="templates-list-heading">
        <h2 id="templates-list-heading" className="sr-only">
          Templates
        </h2>
        {savedTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            name={template.name}
            exerciseNames={exercisesFor(template.id).map(exerciseName)}
            onStart={() => handleStart(template.id)}
            onEdit={() => navigate(`/templates/${template.id}/edit`)}
            onDuplicate={() => handleDuplicate(template.id)}
            onDelete={() => handleDelete(template.id, template.name)}
          />
        ))}
        {exampleTemplates.map((example) => (
          <TemplateCard
            key={example.id}
            name={example.name}
            exerciseNames={resolveExampleTemplateExerciseIds(example, exercises).map(exerciseName)}
            onStart={() => handleStartExample(example)}
          />
        ))}
      </section>
    </div>
  );
}
