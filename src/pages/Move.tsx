import { LayoutList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MovementLogger } from '../components/MovementLogger';
import { InteractiveGymCalendar } from '../components/InteractiveGymCalendar';

export function Move() {
  return (
    <div className="grid animate-rise gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="page-title">Move</h1>
          <p className="page-lead mt-3">
            Pick a day, see what you logged, and keep training on the calendar.
          </p>
        </div>
        <Link className="button-secondary min-h-11 shrink-0 gap-1.5 px-3 text-sm" to="/templates">
          <LayoutList size={16} strokeWidth={1.75} />
          Templates
        </Link>
      </div>

      <InteractiveGymCalendar showMonthStats />

      <section className="grid gap-3 border-t border-border/70 pt-5">
        <div>
          <h2 className="text-lg font-medium text-fg">Walks & cardio</h2>
          <p className="mt-1 text-sm leading-relaxed text-fgMuted">
            Secondary to lifts — log in plain English when you need it.
          </p>
        </div>
        <MovementLogger compact />
        <Link className="text-link min-h-11 inline-flex items-center" to="/exercises">
          Browse exercises
        </Link>
      </section>
    </div>
  );
}
