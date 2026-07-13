import { describe, expect, it } from 'vitest';
import { exerciseToRow, goalToRow, sessionToRow, setToRow } from './supabase-mappers';
import { isUuid } from './supabase-sync';

describe('isUuid', () => {
  it('accepts RFC4122 ids and rejects starter catalog ids', () => {
    expect(isUuid('de3c1f99-a64b-46c4-9f46-6afcc6d17f70')).toBe(true);
    expect(isUuid('ex-lat-pulldown')).toBe(false);
  });
});

describe('supabase mappers', () => {
  it('maps exercise fields to snake_case rows', () => {
    expect(
      exerciseToRow({
        id: 'de3c1f99-a64b-46c4-9f46-6afcc6d17f70',
        slug: 'lat-pulldown',
        name: 'Lat Pulldown',
        muscleGroup: 'back',
        secondaryMuscles: ['biceps'],
        equipment: 'cable',
        instructions: [],
        setupNotes: ['Seat 5'],
        imageStyle: 'name-only',
        source: 'user-created',
      }),
    ).toMatchObject({
      muscle_group: 'back',
      setup_notes: ['Seat 5'],
      image_style: 'name-only',
    });
  });

  it('maps sessions, sets, and goals', () => {
    expect(
      sessionToRow({
        id: 'de3c1f99-a64b-46c4-9f46-6afcc6d17f70',
        userId: 'de3c1f99-a64b-46c4-9f46-6afcc6d17f71',
        startedAt: '2026-07-13T00:00:00.000Z',
        endedAt: '2026-07-13T01:00:00.000Z',
      }),
    ).toMatchObject({ user_id: 'de3c1f99-a64b-46c4-9f46-6afcc6d17f71', started_at: '2026-07-13T00:00:00.000Z' });

    expect(
      setToRow({
        id: 'de3c1f99-a64b-46c4-9f46-6afcc6d17f72',
        sessionId: 'de3c1f99-a64b-46c4-9f46-6afcc6d17f70',
        exerciseId: 'de3c1f99-a64b-46c4-9f46-6afcc6d17f73',
        setNumber: 2,
        weightLb: 95,
        reps: 8,
        isWarmup: false,
        isPr: true,
        createdAt: '2026-07-13T00:10:00.000Z',
      }),
    ).toMatchObject({ weight_lb: 95, is_pr: true });

    expect(
      goalToRow({
        id: 'de3c1f99-a64b-46c4-9f46-6afcc6d17f74',
        userId: 'de3c1f99-a64b-46c4-9f46-6afcc6d17f71',
        name: 'Bench 225 lb',
        targetValue: 225,
        targetUnit: 'lb',
        achieved: false,
        createdAt: '2026-07-13T00:00:00.000Z',
      }),
    ).toMatchObject({ target_value: 225, target_unit: 'lb' });
  });
});
