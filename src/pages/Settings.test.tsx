import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUiStore } from '../stores/uiStore';

const { refresh, useSupabaseBootstrap } = vi.hoisted(() => ({
  refresh: vi.fn(),
  useSupabaseBootstrap: vi.fn(),
}));

vi.mock('../hooks/useSupabaseBootstrap', () => ({ useSupabaseBootstrap }));

const downloadWorkoutExport = vi.fn();
vi.mock('../lib/export', () => ({
  downloadWorkoutExport: () => downloadWorkoutExport(),
}));

import { SettingsPage } from './Settings';

function renderSettings() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  );
}

describe('SettingsPage', () => {
  beforeEach(() => {
    refresh.mockReset();
    downloadWorkoutExport.mockReset();
    useSupabaseBootstrap.mockReturnValue({
      configured: true,
      reachable: true,
      drained: 0,
      hydrated: true,
      syncing: false,
      refresh,
    });
    useUiStore.setState({ unit: 'lb', restSeconds: 90, preferredName: 'Dhruva' });
  });

  it('offers an active refresh control with the latest sync status', () => {
    renderSettings();

    expect(screen.getByRole('status')).toHaveTextContent('Latest data is synced.');
    fireEvent.click(screen.getByRole('button', { name: /refresh sync/i }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('links to intentions from You', () => {
    renderSettings();
    const link = screen.getByRole('link', { name: /open intentions/i });
    expect(link).toHaveAttribute('href', '/goals');
  });

  it('toggles units with pressed state', () => {
    renderSettings();
    const kg = screen.getByRole('button', { name: /^kg$/i });
    expect(screen.getByRole('button', { name: /^lb$/i })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(kg);
    expect(useUiStore.getState().unit).toBe('kg');
    expect(kg).toHaveAttribute('aria-pressed', 'true');
  });

  it('labels the rest timer control and commits changes', () => {
    renderSettings();
    const slider = screen.getByLabelText(/rest timer/i);
    fireEvent.change(slider, { target: { value: '120' } });
    expect(useUiStore.getState().restSeconds).toBe(120);
  });

  it('exports data on click', () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: /export data/i }));
    expect(downloadWorkoutExport).toHaveBeenCalledTimes(1);
  });
});
