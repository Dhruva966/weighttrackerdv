import { db, type PendingWrite } from './db';
import { getSupabase } from './supabase';

export async function enqueueWrite(write: Omit<PendingWrite, 'ts'>): Promise<void> {
  await db.pending.add({ ...write, ts: Date.now() });
}

export async function drainQueue(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase || !navigator.onLine) {
    return 0;
  }

  const writes = await db.pending.orderBy('ts').toArray();
  let drained = 0;

  for (const write of writes) {
    if (write.op !== 'insert' && write.op !== 'upsert') {
      continue;
    }

    const { error } = await supabase.from(write.table).upsert(write.payload as Record<string, unknown>);
    if (error) {
      break;
    }

    if (write.id !== undefined) {
      await db.pending.delete(write.id);
      drained += 1;
    }
  }

  return drained;
}
