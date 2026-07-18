import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUiStore } from '../stores/uiStore';
import { RestTimer } from './RestTimer';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

beforeEach(() => {
  useUiStore.setState({ restSeconds: 90 });
});

function advanceSeconds(seconds: number) {
  act(() => {
    vi.advanceTimersByTime(seconds * 1000);
  });
}

describe('RestTimer', () => {
  it('stays idle until Start is pressed', () => {
    vi.useFakeTimers();
    render(<RestTimer activeKey="set-1" />);

    expect(screen.getByText('90s')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pause/i })).not.toBeInTheDocument();

    advanceSeconds(5);
    expect(screen.getByText('90s')).toBeInTheDocument();
  });

  it('counts down only while running', () => {
    vi.useFakeTimers();
    render(<RestTimer activeKey="set-1" />);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();

    advanceSeconds(3);
    expect(screen.getByText('87s')).toBeInTheDocument();
  });

  it('pauses and resumes from remaining time', () => {
    vi.useFakeTimers();
    render(<RestTimer activeKey="set-1" />);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    advanceSeconds(10);
    expect(screen.getByText('80s')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    expect(screen.getByText(/paused/i)).toBeInTheDocument();

    advanceSeconds(5);
    expect(screen.getByText('80s')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /resume/i }));
    advanceSeconds(5);
    expect(screen.getByText('75s')).toBeInTheDocument();
  });

  it('reset returns to idle at full duration', () => {
    vi.useFakeTimers();
    render(<RestTimer activeKey="set-1" />);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    advanceSeconds(15);
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));

    expect(screen.getByText('90s')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();

    advanceSeconds(5);
    expect(screen.getByText('90s')).toBeInTheDocument();
  });

  it('new activeKey arms idle at full duration without auto-running', () => {
    vi.useFakeTimers();
    const { rerender } = render(<RestTimer activeKey="set-1" />);

    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    advanceSeconds(20);
    expect(screen.getByText('70s')).toBeInTheDocument();

    rerender(<RestTimer activeKey="set-2" />);
    expect(screen.getByText('90s')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();

    advanceSeconds(5);
    expect(screen.getByText('90s')).toBeInTheDocument();
  });
});
