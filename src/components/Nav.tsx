import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

export function Nav({ items }: { items: NavItem[] }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 px-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-sm">
      <div
        className="mx-auto grid max-w-lg gap-0.5"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[10px] font-medium transition sm:text-[11px] ${
                isActive ? 'bg-accentSoft text-fg' : 'text-fgMuted hover:bg-surface hover:text-fg'
              }`
            }
          >
            <item.icon size={18} strokeWidth={1.75} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
