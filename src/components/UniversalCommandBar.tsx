import { Mic, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { estimateMealFromText, extractWeightLb } from '../lib/meal-from-text';
import { isWebSpeechAvailable, listenOnce } from '../lib/speech/web-speech';
import { parseUniversalCommand } from '../lib/universal-command';
import { useDiaryStore } from '../stores/diaryStore';
import { useUiStore } from '../stores/uiStore';

export function UniversalCommandBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [listening, setListening] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const setMealDraft = useUiStore((state) => state.setMealDraft);
  const showPreviewNotice = useUiStore((state) => state.showPreviewNotice);
  const tendGold = useUiStore((state) => state.tendGold);
  const upsertBodyWeight = useDiaryStore((state) => state.upsertBodyWeight);

  async function handleMic() {
    if (!isWebSpeechAvailable()) {
      showPreviewNotice(
        'Free voice works best in Chrome, or Safari in the browser tab. Typing always works.',
      );
      return;
    }

    setListening(true);
    setHint('Listening… speak a meal, walk, lift, or weigh-in.');
    try {
      const transcript = await listenOnce();
      setQuery(transcript);
      setHint(`Heard: “${transcript}”`);
    } catch (error) {
      setHint(error instanceof Error ? error.message : 'Voice failed — type instead.');
    } finally {
      setListening(false);
    }
  }

  function submit(raw: string) {
    const parsed = parseUniversalCommand(raw);
    setHint(parsed.summary);

    if (parsed.intent === 'meal') {
      setMealDraft({
        source: 'Universal command (text or voice)',
        raw: parsed.raw,
        items: estimateMealFromText(parsed.raw),
      });
      tendGold();
      navigate('/log/meal/confirm');
      setQuery('');
      return;
    }

    if (parsed.intent === 'workout') {
      tendGold();
      showPreviewNotice(`${parsed.summary} Opening Move.`);
      navigate('/move');
      setQuery('');
      return;
    }

    if (parsed.intent === 'walk') {
      tendGold();
      showPreviewNotice(`${parsed.summary} Walks count as Move.`);
      navigate('/move');
      setQuery('');
      return;
    }

    if (parsed.intent === 'weight') {
      const weightLb = extractWeightLb(parsed.raw);
      if (weightLb === null) {
        showPreviewNotice('Couldn’t read a weight — try “weighed 169”.');
        return;
      }
      upsertBodyWeight(weightLb);
      tendGold();
      showPreviewNotice(`Logged ${weightLb} lb.`);
      navigate('/');
      setQuery('');
      return;
    }

    showPreviewNotice(parsed.summary);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) {
      return;
    }
    submit(query);
  }

  return (
    <section className="sticky top-[4.5rem] z-20 border-b border-border/70 bg-bg/90 px-4 py-1.5 backdrop-blur-md">
      <form
        className="mx-auto grid h-9 max-w-xl grid-cols-[minmax(0,1fr)_2.25rem_2.25rem] items-stretch gap-1.5"
        onSubmit={handleSubmit}
      >
        <label className="relative block min-w-0">
          <span className="sr-only">Log anything with text or voice</span>
          <input
            className="box-border h-full w-full rounded-xl border border-border/60 bg-surface/95 px-3 text-sm leading-none text-fg shadow-card outline-none placeholder:text-fgMuted focus:border-accent"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (hint) {
                setHint(null);
              }
            }}
            placeholder="Log anything — meal, walk, lift, weigh-in…"
          />
        </label>
        <button
          className={`box-border grid h-full w-full place-items-center rounded-full border border-border bg-surface p-0 leading-none text-fgMuted transition hover:bg-mist hover:text-fg disabled:opacity-60 ${listening ? 'border-accent bg-accentSoft text-accent' : ''}`}
          type="button"
          onClick={handleMic}
          aria-label={listening ? 'Listening' : 'Speak to log'}
          disabled={listening}
        >
          <Mic
            size={16}
            strokeWidth={1.5}
            absoluteStrokeWidth
            className={`block size-4 shrink-0 ${listening ? 'animate-pulse' : ''}`}
            aria-hidden
          />
        </button>
        <button
          className="box-border grid h-full w-full place-items-center rounded-xl border border-border bg-surface p-0 leading-none text-fgMuted transition hover:bg-mist hover:text-fg"
          type="submit"
          aria-label="Submit log"
        >
          <Send size={15} strokeWidth={1.5} absoluteStrokeWidth className="block size-3.5 shrink-0" aria-hidden />
        </button>
      </form>
      {hint ? (
        <p className="mx-auto mt-1 max-w-xl truncate text-[11px] leading-tight text-fgMuted">{hint}</p>
      ) : null}
    </section>
  );
}
