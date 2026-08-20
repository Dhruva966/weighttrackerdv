import { markRemoteHydrateSettled } from './remote-hydrate-gate';
import { fetchBodyWeightLogs, fetchRemoteSnapshot, fetchTemplateSnapshot } from './supabase-hydrate';
import { bootstrapSupabaseSync } from './supabase-sync';
import { useDiaryStore } from '../stores/diaryStore';
import { useTemplateStore } from '../stores/templateStore';
import { useWorkoutStore } from '../stores/workoutStore';

export type BootstrapRefreshResult = {
  configured: boolean;
  reachable: boolean;
  drained: number;
  hydrated: boolean;
};

let running = false;

async function waitForPersistHydration(): Promise<void> {
  const stores = [useWorkoutStore, useTemplateStore, useDiaryStore] as const;
  await Promise.all(
    stores.map(
      (store) =>
        new Promise<void>((resolve) => {
          const unsub = store.persist.onFinishHydration(() => {
            unsub();
            resolve();
          });
          if (store.persist.hasHydrated()) {
            unsub();
            resolve();
            return;
          }
          setTimeout(() => {
            unsub();
            resolve();
          }, 2000);
        }),
    ),
  );
}

/** Drain local queue then pull remote gym data into Zustand. Safe to call from UI buttons. */
export async function refreshSupabaseBootstrap(): Promise<BootstrapRefreshResult> {
  if (running) {
    return { configured: false, reachable: false, drained: 0, hydrated: false };
  }

  running = true;
  try {
    await waitForPersistHydration();
    const result = await bootstrapSupabaseSync();
    let hydrated = false;
    if (result.reachable) {
      const [remote, remoteTemplates, remoteWeights] = await Promise.all([
        fetchRemoteSnapshot(),
        fetchTemplateSnapshot(),
        fetchBodyWeightLogs(),
      ]);
      if (remote) {
        useWorkoutStore.getState().hydrateFromRemote(remote);
        hydrated = true;
      }
      if (remoteTemplates) {
        useTemplateStore.getState().hydrateFromRemote(remoteTemplates);
      }
      if (remoteWeights && remoteWeights.length > 0) {
        useDiaryStore.getState().hydrateBodyWeightFromRemote(remoteWeights);
        hydrated = true;
      }
    }
    return { ...result, hydrated };
  } finally {
    markRemoteHydrateSettled();
    running = false;
  }
}
