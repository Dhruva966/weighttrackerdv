import { Mic, Send } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { isWebSpeechAvailable, listenOnce } from '../lib/speech/web-speech';
import { parseUniversalCommand } from '../lib/universal-command';
import { useUiStore } from '../stores/uiStore';
import { uiMock } from '../data/uiMock';

export function UniversalCommandBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [listening, setListening] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const setMealDraft = useUiStore((state) => state.setMealDraft);
  const showPreviewNotice = useUiStore((state) => state.showPreviewNotice);
  const tendGarden = useUiStore((state) => state.tendGarden);

  async function handleMic() {
    if (!isWebSpeechAvailable()) {
      showPreviewNotice(
        'Free voice works best in Chrome, or Safari on the phone browser. Typing always works — Groq Whisper can be added next for iPhone home-screen.',
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
        items: uiMock.mealDraft.items,
      });
      tendGarden();
      navigate('/log/meal/confirm');
      return;
    }

    if (parsed.intent === 'workout') {
      tendGarden();
      showPreviewNotice(`${parsed.summary} Opening Move — preview will attach sets next.`);
      navigate('/move');
      return;
    }

    if (parsed.intent === 'walk') {
      tendGarden();
      showPreviewNotice(`${parsed.summary} Walks count as Move — garden tended.`);
      navigate('/move');
      return;
    }

    if (parsed.intent === 'weight') {
      tendGarden();
      showPreviewNotice(`${parsed.summary} Weigh-ins stay preview-only on Today for now.`);
      navigate('/');
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
            placeholder="Log anything — ate bhagara rice… walked 20 min… weighed 142…"
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
