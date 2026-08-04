import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import type { DayWorkoutSummary } from '../lib/calendar';
import { DayWorkoutPanel } from './DayWorkoutPanel';

const completedSummary: DayWorkoutSummary = {
  date: '2026-07-10',
  primarySessionId: 's1',
  startedAt: '2026-07-10T18:00:00-07:00',
  notes: 'Heavy bench day',
  inProgress: false,
  muscleGroups: ['chest', 'triceps'],
};

const inProgressSummary: DayWorkoutSummary = {
  date: '2026-07-11',
  primarySessionId: 'open-1',
  startedAt: '2026-07-11T17:00:00-07:00',
  notes: 'Still going',
  inProgress: true,
  muscleGroups: ['back'],
};

function renderPanel(selectedDate: string | null, summary: DayWorkoutSummary | null) {
  return render(
    <MemoryRouter>
      <DayWorkoutPanel selectedDate={selectedDate} summary={summary} />
    </MemoryRouter>,
  );
}

describe('DayWorkoutPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows Log workout for the selected day when empty', () => {
    renderPanel('2026-07-11', null);

    expect(screen.getByRole('link', { name: /log workout/i })).toHaveAttribute(
      'href',
      '/session/new?date=2026-07-11',
    );
    expect(screen.getByText(/nothing logged on this day yet/i)).toBeInTheDocument();
  });

  it('shows one day card with muscle groups and no Sets/Volume/PRs', () => {
    renderPanel('2026-07-10', completedSummary);

    expect(screen.getByRole('link', { name: /heavy bench day/i })).toHaveAttribute(
      'href',
      '/session/s1',
    );
    expect(screen.getByText('Heavy bench day')).toBeInTheDocument();
    expect(screen.getByLabelText(/muscle groups worked/i)).toBeInTheDocument();
    expect(screen.getByText('Chest')).toBeInTheDocument();
    expect(screen.getByText('Triceps')).toBeInTheDocument();
    expect(screen.queryByText(/open this day’s workout/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/open workout to continue logging/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Sets')).not.toBeInTheDocument();
    expect(screen.queryByText('Volume')).not.toBeInTheDocument();
    expect(screen.queryByText('PRs')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /log another workout/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^log workout$/i })).not.toBeInTheDocument();
  });

  it('links in-progress day workout as the single entry point', () => {
    renderPanel('2026-07-11', inProgressSummary);

    expect(screen.getByRole('link', { name: /still going/i })).toHaveAttribute(
      'href',
      '/session/open-1',
    );
    expect(screen.getByText(/in progress/i)).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
    expect(screen.queryByText(/open this day’s workout/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /log another workout/i })).not.toBeInTheDocument();
  });

  it('does not render multiple workout cards for one day', () => {
    renderPanel('2026-07-10', completedSummary);

    const links = screen.getAllByRole('link').filter((link) => {
      const href = link.getAttribute('href') ?? '';
      return href.startsWith('/session/') || href.startsWith('/history/');
    });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/session/s1');
  });

  it('shows the selected calendar day label without timezone shift', () => {
    renderPanel('2026-08-03', null);

    expect(screen.getByRole('heading', { name: 'Monday, August 3' })).toBeInTheDocument();
  });

  it('shows empty pick-a-day state when nothing is selected', () => {
    renderPanel(null, null);

    expect(screen.getByRole('heading', { name: /pick a day/i })).toBeInTheDocument();
    expect(screen.getByText(/select a day on the calendar/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /log workout/i })).not.toBeInTheDocument();
  });

  it('passes the selected day key through Log workout unchanged', () => {
    renderPanel('2026-08-03', null);

    expect(screen.getByRole('link', { name: /log workout/i })).toHaveAttribute(
      'href',
      '/session/new?date=2026-08-03',
    );
  });
});
