import { useCallback, useEffect, useRef, useState } from 'react';
import {
  refreshSupabaseBootstrap,
  type BootstrapRefreshResult,
} from '../lib/supabase-bootstrap-refresh';

export function useSupabaseBootstrap() {
  const [status, setStatus] = useState({
    configured: false,
    reachable: false,
    drained: 0,
    hydrated: false,
    syncing: false,
  });
  const activeRef = useRef(false);

  const refresh = useCallback(async () => {
    if (activeRef.current) {
      setStatus((current) => ({ ...current, syncing: true }));
    }

    try {
      const result: BootstrapRefreshResult = await refreshSupabaseBootstrap();
      if (activeRef.current) {
        setStatus({ ...result, syncing: false });
      }
    } catch {
      if (activeRef.current) {
        setStatus((current) => ({ ...current, reachable: false, syncing: false }));
      }
    }
  }, []);

  useEffect(() => {
    activeRef.current = true;
    void refresh();

    const onOnline = () => {
      void refresh();
    };
    // Claude MCP writes land in Supabase only; pull again when returning to the PWA.
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      activeRef.current = false;
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  return { ...status, refresh };
}
