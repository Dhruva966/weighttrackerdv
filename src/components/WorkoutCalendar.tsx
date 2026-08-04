import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarCell } from '../lib/calendar';
import { formatDayKeyLabel } from '../lib/local-day';

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type WorkoutCalendarProps = {
  monthLabel: string;
  cells: CalendarCell[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
};

export function WorkoutCalendar({
  monthLabel,
  cells,
  selectedDate,
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
}: WorkoutCalendarProps) {
  return (
    <section className="app-card grid gap-4" aria-label="Workout calendar">
      <div className="flex items-center justify-between gap-3">
        <button className="icon-button" type="button" onClick={onPreviousMonth} aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-lg font-medium text-fg">{monthLabel}</h2>
        <button className="icon-button" type="button" onClick={onNextMonth} aria-label="Next month">
          <ChevronRight size={18} />
        </button>
      </div>

      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {selectedDate ? `Selected ${formatDayKeyLabel(selectedDate)}` : 'No day selected'}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-fgMuted">
        {weekdayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1" role="grid" aria-label={`${monthLabel} workout days`}>
        {cells.map((cell, index) => {
          if (!cell.date || cell.day === null) {
            return <div key={`empty-${index}`} className="aspect-square" aria-hidden="true" />;
          }

          const isSelected = selectedDate === cell.date;
          const hadGym = cell.activity?.hadGymVisit;
          const hadOverload = cell.activity?.hadProgressiveOverload;
          const dayLabel = formatDayKeyLabel(cell.date);

          return (
            <button
              key={cell.date}
              type="button"
              role="gridcell"
              onClick={() => onSelectDate(cell.date!)}
              aria-pressed={isSelected}
              aria-current={isSelected ? 'date' : undefined}
              className={`relative aspect-square rounded-md border text-sm transition ${
                isSelected
                  ? 'border-accent bg-accentSoft font-medium text-fg ring-2 ring-accent/35'
                  : hadGym
                    ? 'border-accent/30 bg-accentSoft text-fg hover:border-accent/50'
                    : 'border-border bg-bg text-fgMuted hover:border-fg/20 hover:bg-surface'
              } ${cell.isToday && !isSelected ? 'ring-1 ring-accent/40' : ''}`}
              aria-label={`${dayLabel}${hadGym ? ', gym day' : ''}${hadOverload ? ', progressive overload' : ''}${isSelected ? ', selected' : ''}`}
            >
              <span className="tabular font-medium">{cell.day}</span>
              {hadGym ? (
                <span
                  className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                    isSelected ? 'bg-accent' : 'bg-fg/70'
                  }`}
                />
              ) : null}
              {hadOverload ? (
                <span
                  className={`absolute right-1 top-1 text-[10px] font-bold leading-none ${
                    isSelected ? 'text-accent' : 'text-accent'
                  }`}
                >
                  +
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-fgMuted">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-fg/70" />
          Gym day
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="text-[10px] font-bold text-accent">+</span>
          Progressive overload (PR)
        </span>
      </div>
    </section>
  );
}
