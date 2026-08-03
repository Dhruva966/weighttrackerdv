import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./supabase', () => ({
  getSupabase: () => null,
}));

import {
  commitExerciseLogDraft,
  looksLikeDurationAttempt,
  looksLikeSetAttempt,
  parseDurationOnlyLog,
  parseExerciseLogSmart,
} from './exercise-log-parse';

const userExample = '110 for 2 sets for 6 reps then 7 reps';
const userExampleSets = [
  { weightLb: 110, reps: 6 },
  { weightLb: 110, reps: 7 },
];

const wordNumberPhrase = 'I did a hundred forty four two sets, seven reps.';
const wordNumberSets = [
  { weightLb: 144, reps: 7 },
  { weightLb: 144, reps: 7 },
];

describe('commitExerciseLogDraft', () => {
  it('expands weightLb + setCount + single repsPerSet', () => {
    expect(
      commitExerciseLogDraft({
        weightLb: 144,
        setCount: 2,
        repsPerSet: [7],
        notes: [],
        confidence: 1,
      }),
    ).toEqual({ sets: wordNumberSets, notes: [] });
  });

  it('passes through explicit sets[]', () => {
    expect(
      commitExerciseLogDraft({
        sets: wordNumberSets,
        notes: ['felt easy'],
      }),
    ).toEqual({ sets: wordNumberSets, notes: ['felt easy'] });
  });

  it('accepts legacy committed {sets, notes}', () => {
    expect(commitExerciseLogDraft({ sets: wordNumberSets, notes: [] })).toEqual({
      sets: wordNumberSets,
      notes: [],
    });
  });
});

describe('looksLikeSetAttempt', () => {
  it('detects number-word set logs vs pure notes', () => {
    expect(looksLikeSetAttempt(wordNumberPhrase)).toBe(true);
    expect(looksLikeSetAttempt('seven reps at one thirty five')).toBe(true);
    expect(looksLikeSetAttempt('last rep helped by a friend')).toBe(false);
    expect(looksLikeSetAttempt('felt grindy today')).toBe(false);
  });
});

describe('parseDurationOnlyLog', () => {
  it('parses minutes, min, m, hour, and seconds', () => {
    expect(parseDurationOnlyLog('15 minutes')).toEqual({ durationSec: 900 });
    expect(parseDurationOnlyLog('15 min')).toEqual({ durationSec: 900 });
    expect(parseDurationOnlyLog('10m')).toEqual({ durationSec: 600 });
    expect(parseDurationOnlyLog('1 hour')).toEqual({ durationSec: 3600 });
    expect(parseDurationOnlyLog('90 sec')).toEqual({ durationSec: 90 });
    expect(parseDurationOnlyLog('2.5 hours')).toEqual({ durationSec: 9000 });
  });

  it('parses a single embedded duration with filler words', () => {
    expect(parseDurationOnlyLog('around 15 minutes or so')).toEqual({ durationSec: 900 });
    expect(parseDurationOnlyLog('did about 10m')).toEqual({ durationSec: 600 });
  });

  it('rejects lift shorthand, multi-duration, and empty input', () => {
    expect(parseDurationOnlyLog('144 for 2 sets of 7')).toBeNull();
    expect(parseDurationOnlyLog('205 x 3')).toBeNull();
    expect(parseDurationOnlyLog('15 min then 10 min')).toBeNull();
    expect(parseDurationOnlyLog('')).toBeNull();
    expect(parseDurationOnlyLog('minutes')).toBeNull();
  });
});

describe('looksLikeDurationAttempt', () => {
  it('detects duration phrases for error hints', () => {
    expect(looksLikeDurationAttempt('15 minutes')).toBe(true);
    expect(looksLikeDurationAttempt('did about 10m')).toBe(true);
    expect(looksLikeDurationAttempt('144 for 2 sets of 7')).toBe(false);
  });
});

describe('parseExerciseLogSmart', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('parses duration shorthand on-device without an API call', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(parseExerciseLogSmart('15 minutes', 'Stretching')).resolves.toEqual({
      sets: [{ weightLb: 0, reps: 0, durationSec: 900 }],
      notes: [],
    });
    await expect(parseExerciseLogSmart('15 min', 'Stretching')).resolves.toEqual({
      sets: [{ weightLb: 0, reps: 0, durationSec: 900 }],
      notes: [],
    });
    await expect(parseExerciseLogSmart('10m', 'plank')).resolves.toEqual({
      sets: [{ weightLb: 0, reps: 0, durationSec: 600 }],
      notes: [],
    });
    await expect(parseExerciseLogSmart('1 hour', 'yoga')).resolves.toEqual({
      sets: [{ weightLb: 0, reps: 0, durationSec: 3600 }],
      notes: [],
    });
    await expect(parseExerciseLogSmart('around 15 minutes or so', 'Stretching')).resolves.toEqual({
      sets: [{ weightLb: 0, reps: 0, durationSec: 900 }],
      notes: [],
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not call the LLM for unparseable duration attempts', async () => {
    vi.stubEnv('VITE_GROQ_API_KEY', 'test-key');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(parseExerciseLogSmart('15 min then 10 min', 'Stretching')).resolves.toEqual({
      sets: [],
      notes: [],
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('uses the free local parser for clean shorthand without an API key', async () => {
    await expect(parseExerciseLogSmart('205 x 3 185 x 6', 'bench press')).resolves.toEqual({
      sets: [
        { weightLb: 205, reps: 3 },
        { weightLb: 185, reps: 6 },
      ],
      notes: [],
    });
  });

  it('parses the user N-sets example on-device when LLM is not configured', async () => {
    await expect(parseExerciseLogSmart(userExample, 'curl')).resolves.toEqual({
      sets: userExampleSets,
      notes: [],
    });
  });

  it('does not call the LLM for clean shorthand when Groq browser fallback is configured', async () => {
    vi.stubEnv('VITE_GROQ_API_KEY', 'test-key');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(parseExerciseLogSmart('115 for 8 7 7', 'preacher curl')).resolves.toEqual({
      sets: [
        { weightLb: 115, reps: 8 },
        { weightLb: 115, reps: 7 },
        { weightLb: 115, reps: 7 },
      ],
      notes: [],
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('commits Anthropic-style draft for number-word phrase via browser Groq fallback mock', async () => {
    vi.stubEnv('VITE_GROQ_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  weightLb: 144,
                  setCount: 2,
                  repsPerSet: [7],
                  notes: [],
                  confidence: 1,
                }),
              },
            },
          ],
        }),
      }),
    );

    await expect(parseExerciseLogSmart(wordNumberPhrase, 'Rope Tricep Extension')).resolves.toEqual({
      sets: wordNumberSets,
      notes: [],
    });

    expect(fetch).toHaveBeenCalled();
  });

  it('commits draft for one thirty five / ninety five variants', async () => {
    vi.stubEnv('VITE_GROQ_API_KEY', 'test-key');

    const drafts = [
      {
        text: 'one thirty five for five',
        draft: { weightLb: 135, repsPerSet: [5], notes: [], confidence: 1 },
        sets: [{ weightLb: 135, reps: 5 }],
      },
      {
        text: 'ninety five x 8',
        draft: { weightLb: 95, repsPerSet: [8], notes: [], confidence: 1 },
        sets: [{ weightLb: 95, reps: 8 }],
      },
    ];

    for (const testCase of drafts) {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            choices: [{ message: { content: JSON.stringify(testCase.draft) } }],
          }),
        }),
      );

      await expect(parseExerciseLogSmart(testCase.text, 'curl')).resolves.toEqual({
        sets: testCase.sets,
        notes: [],
      });
    }
  });

  it('prefers LLM for the user N-sets example when Groq is configured', async () => {
    vi.stubEnv('VITE_GROQ_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  weightLb: 110,
                  setCount: 2,
                  repsPerSet: [6, 7],
                  notes: [],
                }),
              },
            },
          ],
        }),
      }),
    );

    await expect(parseExerciseLogSmart(userExample, 'curl')).resolves.toEqual({
      sets: userExampleSets,
      notes: [],
    });

    expect(fetch).toHaveBeenCalled();
  });

  it('prefers LLM for ambiguous prose when Groq is configured', async () => {
    vi.stubEnv('VITE_GROQ_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  sets: userExampleSets,
                  notes: ['felt hard'],
                }),
              },
            },
          ],
        }),
      }),
    );

    await expect(
      parseExerciseLogSmart('i did like 110 for basically 2 sets got 6 then somehow 7', 'curl'),
    ).resolves.toEqual({
      sets: userExampleSets,
      notes: ['felt hard'],
    });

    expect(fetch).toHaveBeenCalled();
  });

  it('falls back to local when LLM fails on the user example', async () => {
    vi.stubEnv('VITE_GROQ_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({}),
      }),
    );

    await expect(parseExerciseLogSmart(userExample, 'curl')).resolves.toEqual({
      sets: userExampleSets,
      notes: [],
    });
  });

  it('does not save number-word phrase as notes-only when LLM returns a draft', async () => {
    vi.stubEnv('VITE_GROQ_API_KEY', 'test-key');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                // Simulates edge/Anthropic draft shape committed client-side.
                content: JSON.stringify({
                  weightLb: 144,
                  setCount: 2,
                  repsPerSet: [7],
                }),
              },
            },
          ],
        }),
      }),
    );

    const result = await parseExerciseLogSmart(wordNumberPhrase, 'Rope Tricep Extension');
    expect(result.sets).toEqual(wordNumberSets);
    expect(result.notes).toEqual([]);
  });
});
