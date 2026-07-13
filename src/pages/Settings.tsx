import { Download, Database, Smartphone } from 'lucide-react';
import { downloadWorkoutExport } from '../lib/export';
import { useOnline } from '../hooks/useOnline';
import { useSupabaseBootstrap } from '../hooks/useSupabaseBootstrap';
import { useUiStore } from '../stores/uiStore';

export function SettingsPage() {
  const unit = useUiStore((state) => state.unit);
  const setUnit = useUiStore((state) => state.setUnit);
  const restSeconds = useUiStore((state) => state.restSeconds);
  const setRestSeconds = useUiStore((state) => state.setRestSeconds);
  const online = useOnline();
  const supabase = useSupabaseBootstrap();

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="mt-1 text-sm text-fgMuted">Units, rest timer, export, and install state.</p>
      </div>
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
        <p className="font-bold text-fg">Units</p>
        <div className="grid grid-cols-2 gap-2">
          {(['lb', 'kg'] as const).map((option) => (
            <button key={option} className={unit === option ? 'button-primary' : 'button-secondary'} type="button" onClick={() => setUnit(option)}>
              {option}
            </button>
          ))}
        </div>
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
