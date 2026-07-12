import type { LucideIcon } from 'lucide-react';

export function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="app-card">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-fgMuted">{label}</p>
          <p className="tabular mt-2 text-2xl font-extrabold text-fg">{value}</p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-accentSoft text-accent">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}
