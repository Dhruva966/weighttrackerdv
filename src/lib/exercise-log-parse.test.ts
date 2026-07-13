import { describe, expect, it } from 'vitest';
import { parseExerciseLogSmart } from './exercise-log-parse';

describe('parseExerciseLogSmart', () => {
  it('uses the free local parser without an API key', async () => {
    await expect(parseExerciseLogSmart('205 x 3 185 x 6', 'bench press')).resolves.toEqual({
      sets: [
        { weightLb: 205, reps: 3 },
        { weightLb: 185, reps: 6 },
      ],
      notes: [],
    });
  });
});
