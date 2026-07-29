import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchRemoteSnapshot, fetchTemplateSnapshot } from '../lib/supabase-hydrate';
import { bootstrapSupabaseSync } from '../lib/supabase-sync';
import { useTemplateStore } from '../stores/templateStore';
import { useWorkoutStore } from '../stores/workoutStore';

export function useSupabaseBootstrap() {
  const [status, setStatus] = useState({
    configured: false,
    reachable: false,
    drained: 0,
    hydrated: false,
    syncing: false,
  });
  const activeRef = useRef(false);
  const runningRef = useRef(false);

  const refresh = useCallback(async () => {
    if (runningRef.current) return;

    runningRef.current = true;
    if (activeRef.current) {
      setStatus((current) => ({ ...current, syncing: true }));
    }

    try {
      const result = await bootstrapSupabaseSync();
      // Drain (push local writes up) happens inside bootstrapSupabaseSync above; hydrate
      // (pull remote down) only after, so a fresh device sees this device's own just-drained writes too.
      let hydrated = false;
      if (result.reachable) {
        const [remote, remoteTemplates] = await Promise.all([fetchRemoteSnapshot(), fetchTemplateSnapshot()]);
        if (remote) {
          useWorkoutStore.getState().hydrateFromRemote(remote);
          hydrated = true;
        }
        if (remoteTemplates) {
          useTemplateStore.getState().hydrateFromRemote(remoteTemplates);
        }
      }
      if (activeRef.current) {
        setStatus({ ...result, hydrated, syncing: false });
      }
    } catch {
      if (activeRef.current) {
        setStatus((current) => ({ ...current, reachable: false, syncing: false }));
      }
    } finally {
      runningRef.current = false;
    }
  }, []);

  useEffect(() => {
    activeRef.current = true;
    void refresh();

    const onOnline = () => {
      void refresh();
    };

    window.addEventListener('online', onOnline);
    return () => {
      activeRef.current = false;
      window.removeEventListener('online', onOnline);
    };
  }, [refresh]);

  return { ...status, refresh };
}
