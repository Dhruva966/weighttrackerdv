import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { bootstrapSupabaseSync, fetchRemoteSnapshot, fetchTemplateSnapshot } = vi.hoisted(() => ({
  bootstrapSupabaseSync: vi.fn(),
  fetchRemoteSnapshot: vi.fn(),
  fetchTemplateSnapshot: vi.fn(),
}));

vi.mock('../lib/supabase-sync', () => ({ bootstrapSupabaseSync }));
vi.mock('../lib/supabase-hydrate', () => ({ fetchRemoteSnapshot, fetchTemplateSnapshot }));

import { useSupabaseBootstrap } from './useSupabaseBootstrap';

describe('useSupabaseBootstrap', () => {
  beforeEach(() => {
    bootstrapSupabaseSync.mockReset();
    fetchRemoteSnapshot.mockReset();
    fetchTemplateSnapshot.mockReset();
    fetchRemoteSnapshot.mockResolvedValue(null);
    fetchTemplateSnapshot.mockResolvedValue(null);
  });

  it('guards concurrent refresh requests and reports the completed sync status', async () => {
    let resolveBootstrap: (value: { configured: boolean; reachable: boolean; drained: number }) => void = () => {};
    bootstrapSupabaseSync.mockImplementation(
      () =>
        new Promise<{ configured: boolean; reachable: boolean; drained: number }>((resolve) => {
          resolveBootstrap = resolve;
        }),
    );

    const { result } = renderHook(() => useSupabaseBootstrap());

    expect(result.current.syncing).toBe(true);
    expect(bootstrapSupabaseSync).toHaveBeenCalledTimes(1);

    act(() => {
      void result.current.refresh();
      void result.current.refresh();
    });

    expect(bootstrapSupabaseSync).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveBootstrap({ configured: true, reachable: true, drained: 2 });
    });

    await waitFor(() => expect(result.current.syncing).toBe(false));
    expect(result.current).toMatchObject({ configured: true, reachable: true, drained: 2, hydrated: false });
  });
});
