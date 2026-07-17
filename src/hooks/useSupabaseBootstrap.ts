import { useEffect, useState } from 'react';
import { bootstrapSupabaseSync } from '../lib/supabase-sync';

export function useSupabaseBootstrap() {
  const [status, setStatus] = useState({
    configured: false,
    reachable: false,
    drained: 0,
    hydrated: false,
  });

  useEffect(() => {
    let active = true;

    const run = async () => {
      const result = await bootstrapSupabaseSync();
      if (active) {
        setStatus(result);
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
