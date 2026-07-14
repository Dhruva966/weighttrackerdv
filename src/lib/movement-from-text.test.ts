import { describe, expect, it } from 'vitest';
import { parseMovementText } from './movement-from-text';

describe('parseMovementText', () => {
  it('parses walking with minutes', () => {
    const parsed = parseMovementText('walking 30 min');
    expect(parsed?.kind).toBe('walk');
    expect(parsed?.durationMin).toBe(30);
    expect(parsed?.title).toBe('Walk');
  });

  it('parses ran with minutes', () => {
    const parsed = parseMovementText('ran 20 minutes');
    expect(parsed?.kind).toBe('run');
    expect(parsed?.durationMin).toBe(20);
  });

  it('returns null for non-movement text', () => {
    expect(parseMovementText('bench 135 for 5')).toBeNull();
  });
});
