import { useEffect, useState } from 'react';
import { fetchRemoteSnapshot, fetchTemplateSnapshot } from '../lib/supabase-hydrate';
import { bootstrapSupabaseSync } from '../lib/supabase-sync';
import { useTemplateStore } from '../stores/templateStore';
import { useWorkoutStore } from '../stores/workoutStore';

export function useSupabaseBootstrap() {
  const [status, setStatus] = useState({ configured: false, reachable: false, drained: 0, hydrated: false });

  useEffect(() => {
    let active = true;

    const run = async () => {
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
      if (active) {
        setStatus({ ...result, hydrated });
      }
    };

    void run();

    const onOnline = () => {
      void run();
    };

    window.addEventListener('online', onOnline);
    return () => {
      active = false;
      window.removeEventListener('online', onOnline);
    };
  }, []);

  return status;
}
