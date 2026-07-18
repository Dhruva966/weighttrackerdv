import { describe, expect, it } from 'vitest';
import {
  mealsForDay,
  movementsForDay,
  useDiaryStore,
  type MealLog,
  type MovementLog,
} from './diaryStore';

describe('diary day helpers', () => {
  it('normalizes explicit body-weight timestamps to LA day keys', () => {
    useDiaryStore.setState({
      bodyWeightLogs: [],
      meals: [],
      movements: [],
      calorieTarget: 2400,
    });

    const log = useDiaryStore.getState().upsertBodyWeight(170, '2026-07-19T06:30:00.000Z');

    expect(log.loggedAt).toBe('2026-07-18');
    expect(useDiaryStore.getState().bodyWeightLogs).toEqual([log]);
  });

  it('groups meals by America/Los_Angeles day instead of raw UTC date', () => {
    const lateLaMeal: MealLog = {
      id: 'meal-1',
      loggedAt: '2026-07-19T06:30:00.000Z',
      title: 'Late snack',
      summary: 'Late snack',
      calories: 300,
      proteinG: 20,
      carbsG: 25,
      fatG: 10,
      raw: 'late snack',
    };

    expect(mealsForDay([lateLaMeal], '2026-07-18')).toEqual([lateLaMeal]);
    expect(mealsForDay([lateLaMeal], '2026-07-19')).toEqual([]);
  });

  it('groups movements by America/Los_Angeles day instead of raw UTC date', () => {
    const lateLaMovement: MovementLog = {
      id: 'move-1',
      loggedAt: '2026-07-19T06:30:00.000Z',
      kind: 'walk',
      title: 'Walk',
      durationMin: 30,
      summary: 'Walk · 30 min',
      raw: 'walking 30 min',
    };

    expect(movementsForDay([lateLaMovement], '2026-07-18')).toEqual([lateLaMovement]);
    expect(movementsForDay([lateLaMovement], '2026-07-19')).toEqual([]);
  });
});
