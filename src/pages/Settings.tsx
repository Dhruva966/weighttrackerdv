import { Download, Database, Smartphone, Sparkles } from 'lucide-react';
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
        <p className="font-medium text-fg">Onboarding (stashed)</p>
        <p className="text-sm leading-relaxed text-fgMuted">
          Welcome tour is paused. Aloo stays gold-and-white with a pot that fills as you log.
        </p>
        <button
          className="button-secondary opacity-70"
          type="button"
          disabled
          title="Onboarding is stashed"
        >
          Replay onboarding (paused)
        </button>
      </section>
      <section className="app-card grid gap-3">
        <p className="flex items-center gap-2 font-bold text-fg">
          <Database size={18} />
          Supabase sync
        </p>
        <p className="text-sm text-fgMuted">
          {supabase.configured
            ? supabase.reachable
              ? `Connected. ${supabase.drained > 0 ? `Replayed ${supabase.drained} offline write${supabase.drained === 1 ? '' : 's'}.` : 'Ready to sync new workouts.'}`
              : 'Configured, but the database is not reachable yet. Check migration and keys.'
            : 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local or Cursor secrets.'}
        </p>
      </section>
      <section className="app-card grid gap-3">
        <p className="flex items-center gap-2 font-bold text-fg">
          <Sparkles size={18} />
          Natural language logging
        </p>
        <p className="text-sm text-fgMuted">
          {isSupabaseLlmConfigured()
            ? 'Groq runs through Supabase Edge Functions (key stored in Supabase secrets, not the browser). On-device parsing runs first.'
            : isExerciseLogLlmConfigured()
              ? 'Browser Groq fallback is configured. Prefer storing GROQ_API_KEY in Supabase secrets instead.'
              : 'Add Supabase URL + anon key, then run `pnpm supabase:secrets` to store GROQ_API_KEY in Supabase.'}
        </p>
      </section>
      <section className="app-card grid gap-3">
        <p className="font-bold text-fg">Units</p>
        <div className="grid grid-cols-2 gap-2">
          {(['lb', 'kg'] as const).map((option) => (
            <button key={option} className={unit === option ? 'button-primary' : 'button-secondary'} type="button" onClick={() => setUnit(option)}>
              {option}
            </button>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-fgMuted">
          Affects workout logging for now. Today’s weight stays a calm demo in pounds.
        </p>
      </section>
      <section className="app-card grid gap-3">
        <p className="font-bold text-fg">Rest timer</p>
        <input min="30" max="240" step="15" type="range" value={restSeconds} onChange={(event) => setRestSeconds(Number(event.target.value))} />
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
        <Download size={18} />
        Export data
      </button>
      <p className="text-xs text-fgMuted">Body map attribution: Wikimedia Commons muscle SVG, CC-BY-SA, when the full SVG asset is installed.</p>
    </div>
  );
}
