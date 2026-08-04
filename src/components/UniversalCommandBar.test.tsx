import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDiaryStore } from '../stores/diaryStore';
import { useUiStore } from '../stores/uiStore';
import { UniversalCommandBar } from './UniversalCommandBar';

vi.mock('../lib/speech/web-speech', () => ({
  isWebSpeechAvailable: () => false,
  listenOnce: vi.fn(),
}));

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderBar(path = '/move') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <UniversalCommandBar />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('UniversalCommandBar', () => {
  beforeEach(() => {
    localStorage.clear();
    useUiStore.setState({ previewNotice: null });
    useDiaryStore.setState({ bodyWeightLogs: [], movements: [] });
  });

  afterEach(() => {
    cleanup();
  });

  it('submits a weigh-in and routes to Today', () => {
    renderBar('/move');

    fireEvent.change(screen.getByLabelText(/log anything/i), {
      target: { value: 'weighed 168' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit log/i }));

    expect(useDiaryStore.getState().bodyWeightLogs[0]?.weightLb).toBe(168);
    expect(screen.getByTestId('location')).toHaveTextContent('/today');
    expect(useUiStore.getState().previewNotice).toMatch(/logged 168 lb/i);
  });

  it('does not submit an empty command', () => {
    renderBar();
    fireEvent.click(screen.getByRole('button', { name: /submit log/i }));
    expect(useUiStore.getState().previewNotice).toBeNull();
    expect(screen.getByTestId('location')).toHaveTextContent('/move');
  });

  it('exposes a labeled mic control', () => {
    renderBar();
    expect(screen.getByRole('button', { name: /speak to log/i })).toBeInTheDocument();
  });
});
