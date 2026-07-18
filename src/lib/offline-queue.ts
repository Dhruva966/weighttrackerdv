import { db, type PendingWrite } from './db';
import { getSupabase } from './supabase';

export async function enqueueWrite(write: Omit<PendingWrite, 'ts'>): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    return;
  }

  await db.pending.add({ ...write, ts: Date.now() });
}

export async function drainQueue(): Promise<number> {
  const supabase = getSupabase();
  if (!supabase || !navigator.onLine || typeof indexedDB === 'undefined') {
    return 0;
  }

  const writes = await db.pending.orderBy('ts').toArray();
  let drained = 0;

  for (const write of writes) {
    let error: { message: string } | null = null;

    if (write.op === 'delete') {
      const payload = write.payload as { id?: string };
      if (!payload.id) {
        continue;
      }
      ({ error } = await supabase.from(write.table).delete().eq('id', payload.id));
    } else if (write.op === 'insert' || write.op === 'upsert') {
      ({ error } = await supabase.from(write.table).upsert(write.payload as Record<string, unknown>));
    } else {
      continue;
    }

    if (error) {
      continue;
    }

    if (write.id !== undefined) {
      await db.pending.delete(write.id);
      drained += 1;
    }
  }

  return drained;
}
