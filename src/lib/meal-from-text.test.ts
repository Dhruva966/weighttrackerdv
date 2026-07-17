import { describe, expect, it } from 'vitest';
import { dayKeyFromLoggedAt } from '../lib/diary-day';
import { mealsForDay, type MealLog } from '../stores/diaryStore';
import { estimateMealFromText, extractWeightLb } from './meal-from-text';

describe('estimateMealFromText', () => {
  it('parses calories and protein from natural language', () => {
    const [item] = estimateMealFromText('I ate a sandwich about 600 calories, 40 grams of protein');
    expect(item?.name.toLowerCase()).toContain('sandwich');
    expect(item?.calories).toBe(600);
    expect(item?.proteinG).toBe(40);
  });

  it('infers macros from food keywords when only calories are given', () => {
    const [item] = estimateMealFromText(
      'fish and mutton 3 servings each and 1.5x chapati probably around 900 calories total',
    );
    expect(item?.calories).toBe(900);
    expect(item?.proteinG).toBeGreaterThan(0);
    expect(item?.carbsG).toBeGreaterThan(0);
    expect(item?.fatG).toBeGreaterThan(0);
  });

  it('fills macros from calorie split when no food keywords match', () => {
    const [item] = estimateMealFromText('lunch about 500 calories');
    expect(item?.calories).toBe(500);
    expect(item?.proteinG).toBeGreaterThan(0);
    expect(item?.carbsG).toBeGreaterThan(0);
    expect(item?.fatG).toBeGreaterThan(0);
  });
});

describe('extractWeightLb', () => {
  it('reads weigh-in numbers', () => {
    expect(extractWeightLb('weighed 169.2 lb')).toBe(169.2);
  });
});

describe('mealsForDay timezone', () => {
  it('groups meals by America/Los_Angeles day, not UTC slice', () => {
    const meals: MealLog[] = [
      {
        id: 'meal-1',
        loggedAt: '2026-07-17T06:30:00.000Z',
        title: 'Dinner',
        summary: 'Fish and chapati',
        calories: 900,
        proteinG: 60,
        carbsG: 70,
        fatG: 30,
        raw: 'fish dinner',
      },
    ];

    expect(dayKeyFromLoggedAt(meals[0]!.loggedAt)).toBe('2026-07-16');
    expect(mealsForDay(meals, '2026-07-16')).toHaveLength(1);
    expect(mealsForDay(meals, '2026-07-17')).toHaveLength(0);
  });
});
