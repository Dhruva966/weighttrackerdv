import { Dumbbell, LayoutList, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { TemplateCard } from '../components/TemplateCard';
import { isBoardBaselineSession } from '../data/catalog';
import { exampleTemplates, resolveExampleTemplateExerciseIds } from '../data/example-templates';
import { findDaySession, toDayKey } from '../lib/calendar';
import { getDeviceTimeZone } from '../lib/local-day';
import { startWorkoutWithExercises, useTemplateStore } from '../stores/templateStore';
import { useUiStore } from '../stores/uiStore';
import { useWorkoutStore } from '../stores/workoutStore';

export function Move() {
  const navigate = useNavigate();
  const sessions = useWorkoutStore((state) =>
    state.sessions.filter((session) => !isBoardBaselineSession(session.id)),
  );
  const sets = useWorkoutStore((state) =>
    state.sets.filter((setItem) => !isBoardBaselineSession(setItem.sessionId)),
  );
  const exercises = useWorkoutStore((state) => state.exercises);
  const templates = useTemplateStore((state) => state.templates);
  const exercisesFor = useTemplateStore((state) => state.exercisesFor);
  const startWorkoutFromTemplate = useTemplateStore((state) => state.startWorkoutFromTemplate);
  const duplicateTemplate = useTemplateStore((state) => state.duplicateTemplate);
  const deleteTemplate = useTemplateStore((state) => state.deleteTemplate);
  const showPreviewNotice = useUiStore((state) => state.showPreviewNotice);

  const todayKey = toDayKey(new Date(), getDeviceTimeZone());
  const todaySession = findDaySession(todayKey, sessions);
  const openSession =
    todaySession && !todaySession.endedAt
      ? {
          id: todaySession.id,
          setCount: sets.filter((setItem) => setItem.sessionId === todaySession.id).length,
        }
      : null;

  function exerciseName(id: string): string {
    return exercises.find((exercise) => exercise.id === id)?.name ?? 'Exercise';
  }

  function handleStart(templateId: string) {
    const sessionId = startWorkoutFromTemplate(templateId);
    if (sessionId) {
      navigate(`/session/${sessionId}`, { state: { from: '/move' } });
    }
  }

  function handleStartExample(example: (typeof exampleTemplates)[number]) {
    const exerciseIds = resolveExampleTemplateExerciseIds(example, exercises);
    const sessionId = startWorkoutWithExercises(exerciseIds);
    if (sessionId) {
      navigate(`/session/${sessionId}`, { state: { from: '/move' } });
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
      <div>
        <h1 className="page-title">Move</h1>
        <p className="page-lead mt-3">
          {openSession
            ? 'Pick up today’s workout, or add exercises from a template.'
            : 'Start from a template — or open a blank workout when you need one.'}
        </p>
      </div>

      {openSession ? (
        <Link
          className="grid min-h-9 gap-1.5 rounded-lg border border-accent/30 bg-accentSoft/40 p-4 transition hover:border-accent/50"
          to={`/session/${openSession.id}`}
          state={{ from: '/move' }}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-bold text-fg">Continue today’s workout</p>
            <span className="shrink-0 rounded-md bg-accentSoft px-2 py-1 text-xs font-bold text-accent">
              In progress
            </span>
          </div>
          <p className="text-sm text-fgMuted">
            {openSession.setCount > 0
              ? `${openSession.setCount} set${openSession.setCount === 1 ? '' : 's'} logged so far — tap to keep going`
              : 'No sets logged yet — tap to keep going'}
          </p>
        </Link>
      ) : null}

      <section className="grid gap-3" aria-labelledby="move-templates-heading">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="move-templates-heading" className="text-lg font-medium text-fg">
              Templates
            </h2>
            <p className="mt-1 text-sm text-fgMuted">One tap to start a planned workout.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link className="button-secondary min-h-9 gap-1.5 px-3 text-sm" to="/templates/new">
              <Plus size={16} strokeWidth={1.75} />
              New
            </Link>
            <Link className="button-secondary min-h-9 gap-1.5 px-3 text-sm" to="/templates">
              <LayoutList size={16} strokeWidth={1.75} />
              All
            </Link>
          </div>
        </div>

        {templates
          .filter((template) => exercisesFor(template.id).length > 0)
          .map((template) => (
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

      <section className="grid gap-3 border-t border-border/70 pt-5">
        <h2 className="text-lg font-medium text-fg">Other ways to start</h2>
        {!openSession ? (
          <Link
            className="button-primary inline-flex min-h-9 w-full items-center justify-center gap-2 sm:w-auto"
            to="/session/new"
            state={{ from: '/move' }}
          >
            <Dumbbell size={16} strokeWidth={1.75} />
            Start empty workout
          </Link>
        ) : null}
        <Link className="text-link min-h-9 inline-flex items-center" to="/exercises">
          Browse exercises
        </Link>
      </section>
    </div>
  );
}
