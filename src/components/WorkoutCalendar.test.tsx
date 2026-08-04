import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CalendarCell } from '../lib/calendar';
import { WorkoutCalendar } from './WorkoutCalendar';

const julyCells: CalendarCell[] = [
  { date: null, day: null, isToday: false },
  { date: null, day: null, isToday: false },
  { date: null, day: null, isToday: false },
  {
    date: '2026-07-01',
    day: 1,
    isToday: false,
    activity: {
      date: '2026-07-01',
      sessionIds: ['s1'],
      setCount: 2,
      prCount: 1,
      hadGymVisit: true,
      hadProgressiveOverload: true,
    },
  },
  { date: '2026-07-02', day: 2, isToday: false },
  { date: '2026-08-03', day: 3, isToday: false },
];

describe('WorkoutCalendar', () => {
  afterEach(() => {
    cleanup();
  });

  it('wires month prev/next and day selection without shifting day keys', () => {
    const onSelectDate = vi.fn();
    const onPreviousMonth = vi.fn();
    const onNextMonth = vi.fn();

    render(
      <WorkoutCalendar
        monthLabel="July 2026"
        cells={julyCells}
        selectedDate="2026-08-03"
        onSelectDate={onSelectDate}
        onPreviousMonth={onPreviousMonth}
        onNextMonth={onNextMonth}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /previous month/i }));
    fireEvent.click(screen.getByRole('button', { name: /next month/i }));
    expect(onPreviousMonth).toHaveBeenCalledTimes(1);
    expect(onNextMonth).toHaveBeenCalledTimes(1);

    const aug3 = screen.getByRole('gridcell', { name: /monday, august 3/i });
    expect(aug3).toHaveAttribute('aria-pressed', 'true');
    expect(aug3).toHaveAttribute('aria-current', 'date');
    expect(screen.getByText('Selected Monday, August 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('gridcell', { name: /wednesday, july 1/i }));
    expect(onSelectDate).toHaveBeenCalledWith('2026-07-01');
  });

  it('marks gym / overload affordances on day cells', () => {
    render(
      <WorkoutCalendar
        monthLabel="July 2026"
        cells={julyCells}
        selectedDate={null}
        onSelectDate={vi.fn()}
        onPreviousMonth={vi.fn()}
        onNextMonth={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('gridcell', { name: /wednesday, july 1, gym day, progressive overload/i }),
    ).toBeInTheDocument();
  });
});
