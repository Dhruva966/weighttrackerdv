/**
 * Lets SessionLauncher wait until the first Supabase pull finishes (or times out)
 * so /session/new does not mint an empty local day session that races Claude MCP writes.
 */

type Listener = () => void;

let settled = false;
const listeners = new Set<Listener>();

export function markRemoteHydrateSettled(): void {
  if (settled) return;
  settled = true;
  for (const listener of listeners) {
    listener();
  }
  listeners.clear();
}

/** Test-only: reset between Vitest cases. */
export function resetRemoteHydrateGateForTests(): void {
  settled = false;
  listeners.clear();
}

export function waitForRemoteHydrateSettled(timeoutMs = 8000): Promise<void> {
  if (settled) return Promise.resolve();
  return new Promise((resolve) => {
    const onDone = () => {
      globalThis.clearTimeout(timer);
      listeners.delete(onDone);
      resolve();
    };
    const timer = globalThis.setTimeout(onDone, timeoutMs);
    listeners.add(onDone);
  });
}
