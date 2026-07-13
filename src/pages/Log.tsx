import { Camera, Dumbbell, Mic, Utensils } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PrivateVoiceCapture } from '../components/PrivateVoiceCapture';
import { estimateMealFromText } from '../lib/meal-from-text';
import { useUiStore } from '../stores/uiStore';

type Props = {
  forcedType?: 'meal' | 'workout';
  hideIntro?: boolean;
};

export function Log({ forcedType, hideIntro = false }: Props) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setMealDraft = useUiStore((state) => state.setMealDraft);
  const tendGold = useUiStore((state) => state.tendGold);
  const type =
    forcedType ?? (params.get('type') === 'workout' ? 'workout' : 'meal');
  const capture = params.get('capture');
  const mode = capture === 'photo' ? 'photo' : capture === 'voice' ? 'voice' : 'describe';
  const [description, setDescription] = useState('');
  const mealBase = '/eat';

  function goToConfirm(source: string, raw: string) {
    setMealDraft({ source, raw, items: estimateMealFromText(raw) });
    tendGold();
    navigate('/log/meal/confirm');
  }

  return (
    <div className={`grid ${hideIntro || forcedType ? 'gap-4' : 'animate-rise gap-7'}`}>
      {!hideIntro && !forcedType ? (
        <div>
          <h1 className="page-title">Log it simply</h1>
          <p className="page-lead mt-3">
            Type it, snap it, or speak — or use the universal bar above.
          </p>
        </div>
      ) : null}

      {!forcedType ? (
        <div className="grid grid-cols-2 gap-2">
          <Link
            className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-medium transition ${
              type === 'meal'
                ? 'border-accent/25 bg-accentSoft text-fg'
                : 'border-border/80 bg-surface/80 text-fgMuted hover:bg-mist/70'
            }`}
            to="/eat"
          >
            <Utensils size={16} strokeWidth={1.5} />
            Meal
          </Link>
          <Link
            className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border text-sm font-medium transition ${
              type === 'workout'
                ? 'border-accent/25 bg-accentSoft text-fg'
                : 'border-border/80 bg-surface/80 text-fgMuted hover:bg-mist/70'
            }`}
            to="/move"
          >
            <Dumbbell size={16} strokeWidth={1.5} />
            Workout
          </Link>
        </div>
      ) : null}

      {type === 'meal' ? (
        <section className="grid gap-4">
          <div className="grid grid-cols-3 gap-2">
            <Link
              className={`button-secondary min-h-12 px-2 text-sm ${mode === 'describe' ? 'border-fg/40' : ''}`}
              to={mealBase}
            >
              Describe
            </Link>
            <Link
              className={`button-secondary min-h-12 px-2 text-sm ${mode === 'photo' ? 'border-fg/40' : ''}`}
              to={`${mealBase}?capture=photo`}
            >
              <Camera size={16} />
              Photo
            </Link>
            <Link
              className={`button-secondary min-h-12 px-2 text-sm ${mode === 'voice' ? 'border-fg/40' : ''}`}
              to={`${mealBase}?capture=voice`}
            >
              <Mic size={16} />
              Voice
            </Link>
          </div>

          {mode === 'photo' ? (
            <div className="app-card grid place-items-center gap-3 py-16 text-center">
              <Camera size={28} className="text-fgMuted" strokeWidth={1.5} />
              <p className="font-medium text-fg">Photo logging</p>
              <p className="max-w-xs text-sm leading-relaxed text-fgMuted">
                Camera capture ships next. Describe the plate for now.
              </p>
              <Link className="button-primary mt-2" to="/eat">
                Describe instead
              </Link>
            </div>
          ) : mode === 'voice' ? (
            <PrivateVoiceCapture
              sampleTranscript="I ate a sandwich about 600 calories 40 grams protein"
              onConfirm={(transcript) => goToConfirm('Private voice on this device', transcript)}
            />
          ) : (
            <div className="grid gap-3">
              <label className="grid gap-2">
                <span className="label">What did you eat?</span>
                <textarea
                  className="field min-h-36 py-3"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="e.g. sandwich 600 calories, 40g protein"
                />
              </label>
              <button
                className="button-primary"
                type="button"
                disabled={!description.trim()}
                onClick={() => goToConfirm('Described in your words', description.trim())}
              >
                Look it over
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="app-card grid gap-4">
          <div>
            <h2 className="text-lg font-medium text-fg">Train when you’re ready</h2>
            <p className="mt-1 text-sm leading-relaxed text-fgMuted">
              Log lifts in a session, or drop plain English into the bar above.
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-mist/50 px-4 py-3 text-sm leading-relaxed text-fgMuted">
            Example: “biceps 3 sets 8 reps 110 pounds”
          </div>
          <Link className="button-secondary" to="/session/new">
            Start a session
          </Link>
          <Link className="text-link" to="/exercises">
            Browse exercises
          </Link>
        </section>
      )}
    </div>
  );
}
