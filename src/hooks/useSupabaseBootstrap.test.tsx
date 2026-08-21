import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { refreshSupabaseBootstrap } = vi.hoisted(() => ({
  refreshSupabaseBootstrap: vi.fn(),
}));

vi.mock('../lib/supabase-bootstrap-refresh', () => ({ refreshSupabaseBootstrap }));

import { useSupabaseBootstrap } from './useSupabaseBootstrap';

describe('useSupabaseBootstrap', () => {
  beforeEach(() => {
    refreshSupabaseBootstrap.mockReset();
  });

  it('guards concurrent refresh requests and reports the completed sync status', async () => {
    let running = false;
    let resolveRefresh: (value: { configured: boolean; reachable: boolean; drained: number; hydrated: boolean }) => void = () => {};
    
    refreshSupabaseBootstrap.mockImplementation(() => {
      if (running) {
        return Promise.resolve({ configured: false, reachable: false, drained: 0, hydrated: false });
      }
      running = true;
      return new Promise<{ configured: boolean; reachable: boolean; drained: number; hydrated: boolean }>((resolve) => {
        resolveRefresh = () => {
          running = false;
          resolve({ configured: true, reachable: true, drained: 2, hydrated: false });
        };
      });
    });

    const { result } = renderHook(() => useSupabaseBootstrap());

    await waitFor(() => expect(refreshSupabaseBootstrap).toHaveBeenCalled());
    expect(result.current.syncing).toBe(true);

    // Concurrent refresh calls while first is running
    act(() => {
      void result.current.refresh();
      void result.current.refresh();
    });

    // All calls go through, but the running guard prevents actual work
    expect(refreshSupabaseBootstrap).toHaveBeenCalledTimes(3);

    await act(async () => {
      resolveRefresh({ configured: true, reachable: true, drained: 2, hydrated: false });
    });

    await waitFor(() => expect(result.current.syncing).toBe(false));
    expect(result.current).toMatchObject({ configured: true, reachable: true, drained: 2, hydrated: false });
  });
});
