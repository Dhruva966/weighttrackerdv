import { useMemo, useState } from 'react';
import {
  looksLikeDurationAttempt,
  looksLikeSetAttempt,
} from '../lib/exercise-log-parse';
import { previousWorkoutLogPlaceholder } from '../lib/previousWorkoutPlaceholder';
import { useWorkoutStore } from '../stores/workoutStore';
import type { Exercise } from '../types';
import { CardioSetLogger } from './CardioSetLogger';
import { SetRow } from './SetRow';

const DURATION_HINT = 'Try duration like "15 minutes", "15 min", or "10m".';
const LIFT_HINT = 'Try weight and reps, like "144 for 2 sets of 7".';
const COMBINED_HINT = `${LIFT_HINT} Or ${DURATION_HINT.charAt(0).toLowerCase()}${DURATION_HINT.slice(1)}`;

type EditRunner = (label: string, run: () => void | Promise<void>) => void | Promise<void>;

export function NaturalLanguageSetLogger({
  sessionId,
  exercise,
  disabled = false,
  onEdit,
}: {
  sessionId: string;
  exercise: Exercise;
  disabled?: boolean;
  /** Wraps mutations so Session undo/redo can snapshot before/after. */
  onEdit?: EditRunner;
}) {
  const logExerciseNotes = useWorkoutStore((state) => state.logExerciseNotes);
  const removeSet = useWorkoutStore((state) => state.removeSet);
  const sets = useWorkoutStore((state) => state.sets);
  const sessions = useWorkoutStore((state) => state.sessions);
  const exerciseSets = sets.filter(
    (setItem) => setItem.sessionId === sessionId && setItem.exerciseId === exercise.id,
  );
  const placeholder = useMemo(
    () => previousWorkoutLogPlaceholder(sets, sessions, exercise.id, sessionId),
    [sets, sessions, exercise.id, sessionId],
  );
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function runEdit(label: string, run: () => void | Promise<void>) {
    if (onEdit) {
      await onEdit(label, run);
      return;
    }
    await run();
  }

  async function handleDeleteSet(setId: string) {
    if (disabled) {
      return;
    }
    await runEdit('Set deleted', () => {
      removeSet(setId);
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim() || disabled || isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      let result = { imported: 0, notes: [] as string[] };
      await runEdit('Logged sets', async () => {
        result = await logExerciseNotes(sessionId, exercise.id, text);
      });

      if (result.imported > 0) {
        setText('');
        return;
      }

      if (result.notes.length > 0) {
        if (looksLikeDurationAttempt(text)) {
          setMessage(`Could not parse duration — saved as notes instead. ${DURATION_HINT}`);
        } else if (looksLikeSetAttempt(text)) {
          setMessage(
            `Could not parse weight/reps from that — saved as notes instead. ${LIFT_HINT} Or check Anthropic is configured in Supabase secrets.`,
          );
        } else {
          setMessage('Saved notes for this exercise.');
        }
        setText('');
        return;
      }

      if (looksLikeDurationAttempt(text)) {
        setMessage(`Could not find a duration. ${DURATION_HINT}`);
      } else {
        setMessage(`Could not find sets. ${COMBINED_HINT}`);
      }
    } catch {
      setMessage(
        looksLikeDurationAttempt(text)
          ? `Could not parse that log. ${DURATION_HINT}`
          : `Could not parse that log. ${COMBINED_HINT}`,
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (exercise.muscleGroup === 'cardio') {
    return (
      <div className="grid gap-2 border-t border-border pt-3">
        {exercise.setupNotes?.length ? (
          <ul className="grid gap-1.5">
            {exercise.setupNotes.map((note) => (
              <li
                key={note}
                className="w-fit rounded-lg border border-accent/20 bg-accentSoft px-2.5 py-1 text-xs font-semibold text-accent"
              >
                {note}
              </li>
            ))}
          </ul>
        ) : null}
        <CardioSetLogger sessionId={sessionId} exercise={exercise} disabled={disabled} onEdit={onEdit} />
        {exerciseSets.length > 0 ? (
          <div className="grid gap-2">
            {exerciseSets.map((setItem) => (
              <SetRow key={setItem.id} setItem={setItem} onDelete={handleDeleteSet} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <form className="grid gap-2 border-t border-border pt-3" onSubmit={handleSubmit}>
      {exercise.setupNotes?.length ? (
        <ul className="grid gap-1.5">
          {exercise.setupNotes.map((note) => (
            <li
              key={note}
              className="w-fit rounded-lg border border-accent/20 bg-accentSoft px-2.5 py-1 text-xs font-semibold text-accent"
            >
              {note}
            </li>
          ))}
        </ul>
      ) : null}
      <label className="grid gap-1.5">
        <span className="label">Log</span>
        <textarea
          className="field min-h-9 resize-y py-1.5 placeholder:text-fgMuted/55"
          disabled={disabled || isSaving}
          rows={1}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={placeholder}
        />
      </label>
      <button className="button-primary" type="submit" disabled={disabled || isSaving || !text.trim()}>
        {isSaving ? 'Parsing…' : 'Log sets'}
      </button>
      {message ? <p className="text-sm font-semibold text-accent">{message}</p> : null}
      {exerciseSets.length > 0 ? (
        <div className="grid gap-2">
          {exerciseSets.map((setItem) => (
            <SetRow key={setItem.id} setItem={setItem} onDelete={handleDeleteSet} />
          ))}
        </div>
      ) : null}
    </form>
  );
}
