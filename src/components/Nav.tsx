import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

export function Nav({ items }: { items: NavItem[] }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition ${
                isActive ? 'bg-accentSoft text-accent shadow-glow-soft' : 'text-fgMuted hover:bg-surface hover:text-fg'
              }`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
