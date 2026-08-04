import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

export function Nav({ items }: { items: NavItem[] }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-bg/90 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-md">
      <div
        className="mx-auto grid max-w-md gap-1"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[12px] font-medium transition ${
                isActive ? 'bg-accentSoft text-fg' : 'text-fgMuted hover:bg-mist/80 hover:text-fg'
              }`
            }
          >
            <item.icon size={20} strokeWidth={1.5} aria-hidden />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
