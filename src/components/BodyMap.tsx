import type { WeeklyVolumeSummary } from '../lib/volume';

export function BodyMap({ summary }: { summary: WeeklyVolumeSummary }) {
  const top = Object.entries(summary.percentByMuscle).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="app-card">
      <p className="text-sm font-semibold text-fgMuted">Most trained this week</p>
      <div className="mt-4 grid grid-cols-[7rem_1fr] items-center gap-4">
        <div className="grid h-28 w-24 place-items-center rounded-full border border-border bg-surfaceAlt text-fg">
          <span className="text-sm font-medium uppercase">{top?.[0] ?? 'none'}</span>
        </div>
        <div className="space-y-2">
          {Object.entries(summary.percentByMuscle).map(([muscle, percent]) => (
            <div key={muscle}>
              <div className="flex justify-between text-sm">
                <span className="capitalize text-fg">{muscle}</span>
                <span className="tabular text-fgMuted">{percent}%</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-surfaceAlt">
                <div className="h-2 rounded-full bg-accent" style={{ width: `${percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
