import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { TodayWorkoutBanner } from './TodayWorkoutBanner';

function renderBanner(openSession: { id: string; setCount: number } | null) {
  return render(
    <MemoryRouter>
      <TodayWorkoutBanner openSession={openSession} />
    </MemoryRouter>,
  );
}

describe('TodayWorkoutBanner', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows a one-tap start button linking to /session/new when there is no open session', () => {
    renderBanner(null);

    const link = screen.getByRole('link', { name: /start empty workout/i });
    expect(link).toHaveAttribute('href', '/session/new');
    expect(screen.getByText(/no workout logged yet today/i)).toBeInTheDocument();
    expect(screen.queryByText(/continue today’s workout/i)).not.toBeInTheDocument();
  });

  it('shows a resume banner linking to the open session when one exists', () => {
    renderBanner({ id: 'session-123', setCount: 4 });

    const link = screen.getByRole('link', { name: /continue today’s workout/i });
    expect(link).toHaveAttribute('href', '/session/session-123');
    expect(screen.getByText(/in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/4 sets logged so far/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /start empty workout/i })).not.toBeInTheDocument();
  });

  it('uses singular "set" copy for exactly one logged set', () => {
    renderBanner({ id: 'session-1', setCount: 1 });

    expect(screen.getByText(/1 set logged so far/i)).toBeInTheDocument();
  });

  it('shows zero-sets copy when the open session has no sets yet', () => {
    renderBanner({ id: 'session-empty', setCount: 0 });

    const link = screen.getByRole('link', { name: /continue today’s workout/i });
    expect(link).toHaveAttribute('href', '/session/session-empty');
    expect(screen.getByText(/no sets logged yet — tap to keep going/i)).toBeInTheDocument();
  });
});
