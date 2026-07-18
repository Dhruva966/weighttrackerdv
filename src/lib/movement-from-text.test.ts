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

  it('parses stairmaster with level and duration', () => {
    const parsed = parseMovementText('stairmaster level 10 for 10 min');
    expect(parsed?.kind).toBe('stairmaster');
    expect(parsed?.title).toBe('Stairmaster');
    expect(parsed?.durationMin).toBe(10);
    expect(parsed?.summary).toBe('level 10 · 10 min');
  });

  it('parses incline walk separately from flat walk', () => {
    const parsed = parseMovementText('incline walk 20 minutes');
    expect(parsed?.kind).toBe('incline_walk');
    expect(parsed?.title).toBe('Incline walk');
    expect(parsed?.durationMin).toBe(20);
  });

  it('returns null for non-movement text', () => {
    expect(parseMovementText('bench 135 for 5')).toBeNull();
  });
});
