import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUiStore } from '../stores/uiStore';

const { refresh, useSupabaseBootstrap } = vi.hoisted(() => ({
  refresh: vi.fn(),
  useSupabaseBootstrap: vi.fn(),
}));

vi.mock('../hooks/useSupabaseBootstrap', () => ({ useSupabaseBootstrap }));

import { SettingsPage } from './Settings';

describe('SettingsPage Supabase sync', () => {
  beforeEach(() => {
    refresh.mockReset();
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
    render(<SettingsPage />);

    expect(screen.getByRole('status')).toHaveTextContent('Latest data is synced.');
    fireEvent.click(screen.getByRole('button', { name: /refresh sync/i }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
