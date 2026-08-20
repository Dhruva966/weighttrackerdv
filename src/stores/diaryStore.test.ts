import { describe, expect, it } from 'vitest';
import {
  mergeBodyWeightLogs,
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
    expect(log.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
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

  it('lets remote weigh-ins win the same calendar day', () => {
    const merged = mergeBodyWeightLogs(
      [{ id: 'local-1', loggedAt: '2026-08-13', weightLb: 170 }],
      [{ id: '11111111-1111-4111-8111-111111111111', loggedAt: '2026-08-13', weightLb: 168.5 }],
    );
    expect(merged).toEqual([
      { id: '11111111-1111-4111-8111-111111111111', loggedAt: '2026-08-13', weightLb: 168.5 },
    ]);
  });

  it('hydrates remote body weight into the diary store', () => {
    useDiaryStore.setState({
      bodyWeightLogs: [{ id: 'bw-seed-dhruva', loggedAt: '2026-08-01', weightLb: 169 }],
      movements: [],
    });
    useDiaryStore.getState().hydrateBodyWeightFromRemote([
      { id: '22222222-2222-4222-8222-222222222222', loggedAt: '2026-08-13', weightLb: 167.4 },
    ]);
    expect(useDiaryStore.getState().bodyWeightLogs.map((log) => log.loggedAt)).toEqual([
      '2026-08-13',
      '2026-08-01',
    ]);
  });
});
