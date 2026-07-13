import type { LucideIcon } from 'lucide-react';

export function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="app-card">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="label">{label}</p>
          <p className="tabular mt-2 text-2xl font-medium text-fg">{value}</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-md border border-border bg-surfaceAlt text-fg">
          <Icon size={20} strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
}
