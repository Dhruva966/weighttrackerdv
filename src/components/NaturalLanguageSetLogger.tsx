import { useState } from 'react';
import {
  isExerciseLogLlmConfigured,
  isSupabaseLlmConfigured,
  looksLikeSetAttempt,
} from '../lib/exercise-log-parse';
import { useUiStore } from '../stores/uiStore';
import { useWorkoutStore } from '../stores/workoutStore';
import type { Exercise } from '../types';
import { SetRow } from './SetRow';

export function NaturalLanguageSetLogger({
  sessionId,
  exercise,
  disabled = false,
}: {
  sessionId: string;
  exercise: Exercise;
  disabled?: boolean;
}) {
  const logExerciseNotes = useWorkoutStore((state) => state.logExerciseNotes);
  const removeSet = useWorkoutStore((state) => state.removeSet);
  const showPreviewNotice = useUiStore((state) => state.showPreviewNotice);
  const sets = useWorkoutStore((state) => state.sets);
  const exerciseSets = sets.filter((setItem) => setItem.sessionId === sessionId && setItem.exerciseId === exercise.id);
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function handleDeleteSet(setId: string) {
    if (disabled) {
      return;
    }
    removeSet(setId);
    showPreviewNotice('Set deleted.');
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim() || disabled || isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      const result = await logExerciseNotes(sessionId, exercise.id, text);
      if (result.imported > 0) {
        const noteSuffix = result.notes.length > 0 ? ' Notes saved.' : '';
        setMessage(`Logged ${result.imported} set${result.imported === 1 ? '' : 's'}.${noteSuffix}`);
        setText('');
        return;
      }

      if (result.notes.length > 0) {
        if (looksLikeSetAttempt(text)) {
          setMessage(
            'Could not parse weight/reps from that — saved as notes instead. Try "144 for 2 sets of 7" or check Anthropic is configured in Supabase secrets.',
          );
        } else {
          setMessage('Saved notes for this exercise.');
        }
        setText('');
        return;
      }

      setMessage('Could not find sets. Try "115 for 8 7 7" or "144 for 2 sets of 7".');
    } catch {
      setMessage('Could not parse that log. Try again with weight and reps.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="grid gap-3 border-t border-border pt-3" onSubmit={handleSubmit}>
      <label className="grid gap-2">
        <span className="label">Log in your own words</span>
        <textarea
          className="field min-h-28 py-3"
          disabled={disabled || isSaving}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={'115 for 8 7 7\nfirst set was 8 reps, second 7, third 7\nlast rep helped by a friend'}
        />
      </label>
      <p className="text-xs text-fgMuted">
        {isSupabaseLlmConfigured()
          ? 'Claude (via Supabase) reads messy English including number words; clean shorthand stays on-device.'
          : isExerciseLogLlmConfigured()
            ? 'Browser Groq fallback is active. Prefer ANTHROPIC_API_KEY in Supabase secrets.'
            : 'On-device shorthand only. Store ANTHROPIC_API_KEY in Supabase secrets for natural language.'}
      </p>
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
