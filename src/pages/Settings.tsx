import { Download, Database, ListChecks, RefreshCw, Smartphone, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { downloadWorkoutExport } from '../lib/export';
import { isExerciseLogLlmConfigured, isSupabaseLlmConfigured } from '../lib/exercise-log-parse';
import { useOnline } from '../hooks/useOnline';
import { useSupabaseBootstrap } from '../hooks/useSupabaseBootstrap';
import { useUiStore } from '../stores/uiStore';

export function SettingsPage() {
  const unit = useUiStore((state) => state.unit);
  const setUnit = useUiStore((state) => state.setUnit);
  const restSeconds = useUiStore((state) => state.restSeconds);
  const setRestSeconds = useUiStore((state) => state.setRestSeconds);
  const preferredName = useUiStore((state) => state.preferredName);
  const online = useOnline();
  const supabase = useSupabaseBootstrap();

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="page-title">You</h1>
        <p className="mt-1 text-sm text-fgMuted">Settings, units, export — built for {preferredName || 'Dhruva'}.</p>
      </div>
      <section className="app-card grid gap-3">
        <p className="flex items-center gap-2 font-medium text-fg">
          <ListChecks size={18} aria-hidden />
          Intentions
        </p>
        <p className="text-sm leading-relaxed text-fgMuted">
          Add, check off, or reshape the daily intentions that keep you compounding.
        </p>
        <Link className="button-secondary w-fit" to="/goals">
          Open intentions
        </Link>
      </section>
      <section className="app-card grid gap-3">
        <p className="font-medium text-fg">Onboarding (stashed)</p>
        <p className="text-sm leading-relaxed text-fgMuted">
          Welcome tour is paused. Lift stays gold-and-white with a pot that fills as you log.
        </p>
        <button
          className="button-secondary opacity-70"
          type="button"
          disabled
          title="Onboarding is stashed"
          aria-label="Replay onboarding (paused)"
        >
          Replay onboarding (paused)
        </button>
      </section>
      <section className="app-card grid gap-3">
        <p className="flex items-center gap-2 font-bold text-fg">
          <Database size={18} />
          Supabase sync
        </p>
        <p className="text-sm text-fgMuted" role="status" aria-live="polite">
          {supabase.syncing
            ? 'Syncing your latest workout data…'
            : supabase.configured
            ? supabase.reachable
              ? `Connected. ${supabase.drained > 0 ? `Replayed ${supabase.drained} offline write${supabase.drained === 1 ? '' : 's'}.` : supabase.hydrated ? 'Latest data is synced.' : 'Ready to sync new workouts.'}`
              : 'Configured, but the database is not reachable yet. Check migration and keys.'
            : 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local or Cursor secrets.'}
        </p>
        <button
          className="button-secondary w-fit"
          type="button"
          onClick={() => void supabase.refresh()}
          disabled={supabase.syncing}
        >
          <RefreshCw className={supabase.syncing ? 'animate-spin' : undefined} size={16} aria-hidden />
          {supabase.syncing ? 'Syncing…' : 'Refresh sync'}
        </button>
      </section>
      <section className="app-card grid gap-3">
        <p className="flex items-center gap-2 font-bold text-fg">
          <Sparkles size={18} />
          Natural language logging
        </p>
        <p className="text-sm text-fgMuted">
          {isSupabaseLlmConfigured()
            ? 'LLM-first: Claude Haiku via Supabase Edge (ANTHROPIC_API_KEY in secrets; Groq optional fallback). Clean shorthand stays on-device.'
            : isExerciseLogLlmConfigured()
              ? 'Browser Groq fallback is configured. Prefer ANTHROPIC_API_KEY in Supabase secrets (never in VITE_*).'
              : 'Add Supabase URL + anon key, then run `pnpm supabase:secrets` to store ANTHROPIC_API_KEY.'}
        </p>
      </section>
      <section className="app-card grid gap-3">
        <p className="font-bold text-fg" id="units-label">
          Units
        </p>
        <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="units-label">
          {(['lb', 'kg'] as const).map((option) => (
            <button
              key={option}
              className={unit === option ? 'button-primary' : 'button-secondary'}
              type="button"
              aria-pressed={unit === option}
              onClick={() => setUnit(option)}
            >
              {option}
            </button>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-fgMuted">
          Affects workout logging for now. Today’s weight stays a calm demo in pounds.
        </p>
      </section>
      <section className="app-card grid gap-3">
        <label className="font-bold text-fg" htmlFor="rest-timer-default">
          Rest timer
        </label>
        <input
          id="rest-timer-default"
          min="30"
          max="240"
          step="15"
          type="range"
          value={restSeconds}
          onChange={(event) => setRestSeconds(Number(event.target.value))}
          aria-valuetext={`${restSeconds} seconds`}
        />
        <p className="tabular text-sm text-fgMuted">{restSeconds}s default</p>
      </section>
      <section className="app-card grid gap-3">
        <p className="flex items-center gap-2 font-bold text-fg">
          <Smartphone className="text-accent" />
          Install PWA
        </p>
        <p className="text-sm text-fgMuted">On iPhone Safari, use Share then Add to Home Screen.</p>
        <p className={online ? 'text-sm font-bold text-accent' : 'text-sm font-bold text-danger'}>{online ? 'Online' : 'Offline'}</p>
      </section>
      <button className="button-secondary" type="button" onClick={downloadWorkoutExport}>
        <Download size={18} aria-hidden />
        Export data
      </button>
      <p className="text-xs text-fgMuted">Body map attribution: Wikimedia Commons muscle SVG, CC-BY-SA, when the full SVG asset is installed.</p>
    </div>
  );
}
