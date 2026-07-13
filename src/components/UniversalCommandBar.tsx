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
    <section className="sticky top-[4.5rem] z-20 border-b border-border/70 bg-bg/90 px-5 py-3.5 backdrop-blur-md">
      <form className="mx-auto flex max-w-xl items-stretch gap-2" onSubmit={handleSubmit}>
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Log anything with text or voice</span>
          <input
            className="field border-border/60 bg-surface/95 pr-3 text-base shadow-card"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              if (hint) {
                setHint(null);
              }
            }}
            placeholder="Log anything — ate sandwich 600 cal… walked 20 min… weighed 169…"
          />
        </label>
        <button
          className={`icon-button h-14 w-14 shrink-0 ${listening ? 'border-accent bg-accentSoft text-accent' : ''}`}
          type="button"
          onClick={handleMic}
          aria-label={listening ? 'Listening' : 'Speak to log'}
          disabled={listening}
        >
          <Mic size={20} strokeWidth={1.5} className={listening ? 'animate-pulse' : ''} />
        </button>
        <button className="button-secondary min-h-14 shrink-0 px-4" type="submit" aria-label="Submit log">
          <Send size={18} strokeWidth={1.5} />
        </button>
      </form>
      <div className="mx-auto mt-2 max-w-xl">
        <p className="text-xs leading-relaxed text-fgMuted">
          {hint ??
            'One bar for food, walks, lifts, and weigh-ins. Voice uses free browser dictation when available.'}
        </p>
      </div>
    </section>
  );
}
