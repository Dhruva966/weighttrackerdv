import { describe, expect, it } from 'vitest';
import { extractWeightLb } from './weight-from-text';

describe('extractWeightLb', () => {
  it('reads weigh-in numbers', () => {
    expect(extractWeightLb('weighed 169.2 lb')).toBe(169.2);
  });

  it('rejects values outside the body-weight range', () => {
    expect(extractWeightLb('weighed 12 lb')).toBeNull();
    expect(extractWeightLb('weighed 900 lb')).toBeNull();
  });
});
