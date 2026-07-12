import Dexie, { type Table } from 'dexie';

export type PendingWrite = {
  id?: number;
  table: string;
  op: 'insert' | 'upsert' | 'update' | 'delete';
  payload: unknown;
  ts: number;
};

export class WeightTrackerDb extends Dexie {
  pending!: Table<PendingWrite, number>;

  constructor() {
    super('weight-tracker');
    this.version(1).stores({
      pending: '++id, table, op, ts',
    });
  }
}

export const db = new WeightTrackerDb();
