import { describe, expect, it } from 'vitest';
import { parseUniversalCommand } from './universal-command';

describe('parseUniversalCommand', () => {
  it('routes meals', () => {
    expect(parseUniversalCommand('I ate bhagara rice with sarakha kura').intent).toBe('meal');
  });

  it('routes walks and cardio machines', () => {
    expect(parseUniversalCommand('walked 20 minutes').intent).toBe('walk');
    expect(parseUniversalCommand('walking 30 min').intent).toBe('walk');
    expect(parseUniversalCommand('stairmaster level 10 for 10 min').intent).toBe('walk');
    expect(parseUniversalCommand('incline walk 20 min').intent).toBe('walk');
  });

  it('routes lifts', () => {
    expect(parseUniversalCommand('biceps 3 sets 8 reps 110 pounds').intent).toBe('workout');
  });

  it('routes weigh-ins', () => {
    expect(parseUniversalCommand('weighed 142.4 lb').intent).toBe('weight');
  });
});
