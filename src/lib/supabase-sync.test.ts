import { describe, expect, it } from 'vitest';
import { mealLogRowSchema } from './diary-sync-schemas';
import { exerciseToRow, goalToRow, mealToRow, rowToMeal, sessionToRow, setToRow } from './supabase-mappers';
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

  it('maps diary meals to validated rows', () => {
    const meal = {
      id: 'de3c1f99-a64b-46c4-9f46-6afcc6d17f80',
      loggedAt: '2026-07-17T06:30:00.000Z',
      title: 'Fish and chapati',
      summary: 'Fish and chapati',
      raw: 'fish and chapati 900 calories',
      calories: 900,
      proteinG: 60,
      carbsG: 70,
      fatG: 30,
    };
    const row = mealLogRowSchema.parse(mealToRow(meal, 'text'));
    expect(row.day_key).toBe('2026-07-16');
    expect(row.calories).toBe(900);
    expect(rowToMeal({
      id: row.id,
      logged_at: row.logged_at,
      title: row.title,
      summary: row.summary,
      raw: row.raw,
      calories: row.calories,
      protein_g: row.protein_g,
      carbs_g: row.carbs_g,
      fat_g: row.fat_g,
    }).proteinG).toBe(60);
  });
});
