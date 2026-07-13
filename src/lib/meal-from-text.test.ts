import { describe, expect, it } from 'vitest';
import { estimateMealFromText, extractWeightLb } from './meal-from-text';

describe('estimateMealFromText', () => {
  it('parses calories and protein from natural language', () => {
    const [item] = estimateMealFromText('I ate a sandwich about 600 calories, 40 grams of protein');
    expect(item?.name.toLowerCase()).toContain('sandwich');
    expect(item?.calories).toBe(600);
    expect(item?.proteinG).toBe(40);
  });
});

describe('extractWeightLb', () => {
  it('reads weigh-in numbers', () => {
    expect(extractWeightLb('weighed 169.2 lb')).toBe(169.2);
  });
});
