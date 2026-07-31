import { cleanup, render, screen, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUiStore } from '../stores/uiStore';
import { usePrStore } from '../stores/prStore';
import { Toaster } from './Toaster';

describe('Toaster', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useUiStore.setState({ previewNotice: null });
    usePrStore.setState({ lastPr: null });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('shows a slim status notice and auto-dismisses after 30 seconds', () => {
    useUiStore.setState({ previewNotice: 'Added Bench Press' });
    render(<Toaster />);

    expect(screen.getByRole('status')).toHaveTextContent('Added Bench Press');
    expect(screen.getByLabelText(/dismiss notice/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(29_999);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
