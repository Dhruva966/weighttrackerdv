import { describe, expect, it } from 'vitest';
import {
  movementsForDay,
  useDiaryStore,
  type MovementLog,
} from './diaryStore';

describe('diary day helpers', () => {
  it('normalizes explicit body-weight timestamps to LA day keys (explicit America/Los_Angeles)', () => {
    useDiaryStore.setState({
      bodyWeightLogs: [],
      movements: [],
    });

    const log = useDiaryStore
      .getState()
      .upsertBodyWeight(170, '2026-07-19T06:30:00.000Z', 'America/Los_Angeles');

    expect(log.loggedAt).toBe('2026-07-18');
    expect(useDiaryStore.getState().bodyWeightLogs).toEqual([log]);
  });

  it('normalizes the same timestamp to a different day key for a non-LA device timezone', () => {
    useDiaryStore.setState({
      bodyWeightLogs: [],
      movements: [],
    });

    // 2026-07-19 06:30 UTC is still Jul 18 in LA (UTC-7) but already Jul 19 in Kolkata (UTC+5:30).
    const log = useDiaryStore
      .getState()
      .upsertBodyWeight(170, '2026-07-19T06:30:00.000Z', 'Asia/Kolkata');

    expect(log.loggedAt).toBe('2026-07-19');
  });

  it('groups movements by America/Los_Angeles day instead of raw UTC date (explicit timezone)', () => {
    const lateLaMovement: MovementLog = {
      id: 'move-1',
      loggedAt: '2026-07-19T06:30:00.000Z',
      kind: 'walk',
      title: 'Walk',
      durationMin: 30,
      summary: 'Walk · 30 min',
      raw: 'walking 30 min',
    };

    expect(movementsForDay([lateLaMovement], '2026-07-18', 'America/Los_Angeles')).toEqual([
      lateLaMovement,
    ]);
    expect(movementsForDay([lateLaMovement], '2026-07-19', 'America/Los_Angeles')).toEqual([]);
  });

  it('groups the same movement into a different day for a non-LA device timezone', () => {
    const lateLaMovement: MovementLog = {
      id: 'move-1',
      loggedAt: '2026-07-19T06:30:00.000Z',
      kind: 'walk',
      title: 'Walk',
      durationMin: 30,
      summary: 'Walk · 30 min',
      raw: 'walking 30 min',
    };

    expect(movementsForDay([lateLaMovement], '2026-07-19', 'Asia/Kolkata')).toEqual([
      lateLaMovement,
    ]);
    expect(movementsForDay([lateLaMovement], '2026-07-18', 'Asia/Kolkata')).toEqual([]);
  });
});
