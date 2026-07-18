import { describe, expect, it } from 'vitest';
import {
  buildLiftProgress,
  formatImportedSessionNotes,
  isCleanExerciseLogShorthand,
  isProseOrAmbiguousExerciseLog,
  parseBrainDump,
  parseExerciseLog,
  parseLiftBrainDump,
} from './liftImport';

describe('parseLiftBrainDump', () => {
  it('parses one bare current weight per line', () => {
    expect(parseLiftBrainDump('Lat pulldown 175 lbs\nDumbbell preacher curl 42.5 lb')).toEqual([
      { exerciseName: 'Lat pulldown', weightLb: 175, reps: 1, raw: 'Lat pulldown 175 lbs' },
      { exerciseName: 'Dumbbell preacher curl', weightLb: 42.5, reps: 1, raw: 'Dumbbell preacher curl 42.5 lb' },
    ]);
  });

  it('parses multiple weight x reps sets from one line', () => {
    expect(parseLiftBrainDump('Bench 205 x 3 185 x 6')).toEqual([
      { exerciseName: 'Bench', weightLb: 205, reps: 3, raw: 'Bench 205 x 3 185 x 6' },
      { exerciseName: 'Bench', weightLb: 185, reps: 6, raw: 'Bench 205 x 3 185 x 6' },
    ]);
  });

  it('ignores lines without a lift weight', () => {
    expect(parseLiftBrainDump('become fully flexible\npractice handstand')).toEqual([]);
  });

  it('parses prose set notes with trailing weight', () => {
    const raw = 'preacher curl 3 sets first set was 8 reps second was 7 third was 7 and 115';
    expect(parseLiftBrainDump(raw)).toEqual([
      { exerciseName: 'preacher curl', weightLb: 115, reps: 8, raw },
      { exerciseName: 'preacher curl', weightLb: 115, reps: 7, raw },
      { exerciseName: 'preacher curl', weightLb: 115, reps: 7, raw },
    ]);
  });

  it('parses repeated reps with explicit lbs', () => {
    const raw = 'preacher curl 115 lbs 8 reps 7 reps 7 reps';
    expect(parseLiftBrainDump(raw)).toEqual([
      { exerciseName: 'preacher curl', weightLb: 115, reps: 8, raw },
      { exerciseName: 'preacher curl', weightLb: 115, reps: 7, raw },
      { exerciseName: 'preacher curl', weightLb: 115, reps: 7, raw },
    ]);
  });
});

describe('parseExerciseLog', () => {
  it('parses shorthand logs for a known exercise', () => {
    expect(parseExerciseLog('115 for 8 7 7', 'preacher curl')).toEqual({
      sets: [
        { weightLb: 115, reps: 8 },
        { weightLb: 115, reps: 7 },
        { weightLb: 115, reps: 7 },
      ],
      notes: [],
    });
  });

  it('parses weight for N sets with different reps (broken English)', () => {
    expect(parseExerciseLog('110 for 2 sets for 6 reps then 7 reps', 'curl')).toEqual({
      sets: [
        { weightLb: 110, reps: 6 },
        { weightLb: 110, reps: 7 },
      ],
      notes: [],
    });
  });

  it('parses messy variants of N-sets phrasing', () => {
    const cases: Array<{ text: string; sets: Array<{ weightLb: number; reps: number }> }> = [
      {
        text: '110 for 2 sets of 6 and 7',
        sets: [
          { weightLb: 110, reps: 6 },
          { weightLb: 110, reps: 7 },
        ],
      },
      {
        text: '110lbs for 2 sets 6 then 7',
        sets: [
          { weightLb: 110, reps: 6 },
          { weightLb: 110, reps: 7 },
        ],
      },
      {
        text: '110 for 3 sets for 8 reps',
        sets: [
          { weightLb: 110, reps: 8 },
          { weightLb: 110, reps: 8 },
          { weightLb: 110, reps: 8 },
        ],
      },
      {
        text: 'did 110 for like 2 sets for 6 reps then 7 reps',
        sets: [
          { weightLb: 110, reps: 6 },
          { weightLb: 110, reps: 7 },
        ],
      },
      {
        text: '110 for 2 sets first 6 second 7',
        sets: [
          { weightLb: 110, reps: 6 },
          { weightLb: 110, reps: 7 },
        ],
      },
      {
        text: 'basically 110 for 2 sets for 6 then 7',
        sets: [
          { weightLb: 110, reps: 6 },
          { weightLb: 110, reps: 7 },
        ],
      },
    ];

    for (const testCase of cases) {
      expect(parseExerciseLog(testCase.text, 'curl'), testCase.text).toEqual({
        sets: testCase.sets,
        notes: [],
      });
    }
  });

  it('still treats plain "110 for 2" as one set of 2 reps', () => {
    expect(parseExerciseLog('110 for 2', 'curl')).toEqual({
      sets: [{ weightLb: 110, reps: 2 }],
      notes: [],
    });
  });

  it('keeps side notes without sets', () => {
    expect(parseExerciseLog('last rep was helped by a friend', 'bench press')).toEqual({
      sets: [],
      notes: ['last rep was helped by a friend'],
    });
  });
});

describe('isCleanExerciseLogShorthand', () => {
  it('accepts compact gym shorthand only', () => {
    expect(isCleanExerciseLogShorthand('205 x 3')).toBe(true);
    expect(isCleanExerciseLogShorthand('205 x 3 185 x 6')).toBe(true);
    expect(isCleanExerciseLogShorthand('115 for 8 7 7')).toBe(true);
    expect(isCleanExerciseLogShorthand('110 for 2')).toBe(true);
    expect(isCleanExerciseLogShorthand('110 for 2 sets for 6 reps then 7 reps')).toBe(false);
    expect(isCleanExerciseLogShorthand('first set was 8 second was 7 at 115')).toBe(false);
  });
});

describe('isProseOrAmbiguousExerciseLog', () => {
  it('is the inverse of clean shorthand', () => {
    expect(isProseOrAmbiguousExerciseLog('110 for 2 sets for 6 reps then 7 reps')).toBe(true);
    expect(isProseOrAmbiguousExerciseLog('115 for 8 7 7')).toBe(false);
    expect(isProseOrAmbiguousExerciseLog('205 x 3')).toBe(false);
  });
});

describe('parseBrainDump', () => {
  it('keeps narrative notes with the lift block', () => {
    const text = [
      'preacher curl 3 sets first set was 8 reps second was 7 third was 7 and 115',
      'last rep was helped by a friend',
    ].join('\n');

    expect(parseBrainDump(text)).toEqual({
      blocks: [
        {
          exerciseName: 'preacher curl',
          sets: [
            { weightLb: 115, reps: 8 },
            { weightLb: 115, reps: 7 },
            { weightLb: 115, reps: 7 },
          ],
          notes: ['last rep was helped by a friend'],
          raw: 'preacher curl 3 sets first set was 8 reps second was 7 third was 7 and 115',
        },
      ],
      sessionNotes: [],
    });
  });

  it('extracts quoted and parenthetical notes from lift lines', () => {
    const text = 'bench 205 x 3 (last rep was helped by a friend) "felt grindy"';

    expect(parseBrainDump(text)).toEqual({
      blocks: [
        {
          exerciseName: 'bench',
          sets: [{ weightLb: 205, reps: 3 }],
          notes: [],
          raw: 'bench 205 x 3',
        },
      ],
      sessionNotes: ['last rep was helped by a friend', 'felt grindy'],
    });
  });

  it('parses mixed workout paragraphs with multiple exercises', () => {
    const text = [
      'preacher curl 8 7 7 at 115',
      'last rep was helped by a friend',
      '',
      'lat pulldown 175 lbs',
      'felt strong today',
    ].join('\n');

    expect(parseBrainDump(text)).toEqual({
      blocks: [
        {
          exerciseName: 'preacher curl',
          sets: [
            { weightLb: 115, reps: 8 },
            { weightLb: 115, reps: 7 },
            { weightLb: 115, reps: 7 },
          ],
          notes: ['last rep was helped by a friend'],
          raw: 'preacher curl 8 7 7 at 115',
        },
        {
          exerciseName: 'lat pulldown',
          sets: [{ weightLb: 175, reps: 1 }],
          notes: ['felt strong today'],
          raw: 'lat pulldown 175 lbs',
        },
      ],
      sessionNotes: [],
    });
  });

  it('stores note-only text as session notes', () => {
    expect(parseBrainDump('stretch and recover\nlegs still sore from yesterday')).toEqual({
      blocks: [],
      sessionNotes: ['stretch and recover', 'legs still sore from yesterday'],
    });
  });
});

describe('formatImportedSessionNotes', () => {
  it('formats exercise notes and freeform notes for history', () => {
    const parsed = parseBrainDump(
      ['preacher curl 115 lbs 8 reps', 'last rep was helped by a friend', '', 'good gym day overall'].join('\n'),
    );

    expect(formatImportedSessionNotes(parsed)).toBe(
      'preacher curl: last rep was helped by a friend\n\ngood gym day overall',
    );
  });
});

describe('buildLiftProgress', () => {
  it('returns empty when there are no matching sets', () => {
    expect(buildLiftProgress('bench', [])).toEqual([]);
  });

  it('returns a single point for a one-session lift', () => {
    expect(
      buildLiftProgress('bench', [
        {
          id: '1',
          sessionId: 's',
          exerciseId: 'bench',
          setNumber: 1,
          weightLb: 135,
          reps: 8,
          isWarmup: false,
          isPr: true,
          createdAt: '2026-07-01T12:00:00Z',
        },
        {
          id: 'warmup',
          sessionId: 's',
          exerciseId: 'bench',
          setNumber: 0,
          weightLb: 95,
          reps: 10,
          isWarmup: true,
          isPr: false,
          createdAt: '2026-07-01T11:55:00Z',
        },
      ]),
    ).toEqual([
      {
        label: 'Jul 26',
        date: '2026-07-01T12:00:00Z',
        t: new Date('2026-07-01T12:00:00Z').getTime(),
        weightLb: 135,
        reps: 8,
        oneRm: 171,
      },
    ]);
  });

  it('sorts multi-week sets and calculates one rep max points for one exercise', () => {
    expect(
      buildLiftProgress('bench', [
        {
          id: '2',
          sessionId: 's',
          exerciseId: 'bench',
          setNumber: 2,
          weightLb: 185,
          reps: 6,
          isWarmup: false,
          isPr: false,
          createdAt: '2026-07-12T12:00:00Z',
        },
        {
          id: '1',
          sessionId: 's',
          exerciseId: 'bench',
          setNumber: 1,
          weightLb: 205,
          reps: 3,
          isWarmup: false,
          isPr: true,
          createdAt: '2026-07-11T12:00:00Z',
        },
        {
          id: '3',
          sessionId: 's2',
          exerciseId: 'bench',
          setNumber: 1,
          weightLb: 215,
          reps: 2,
          isWarmup: false,
          isPr: true,
          createdAt: '2026-07-25T12:00:00Z',
        },
        {
          id: 'other',
          sessionId: 's3',
          exerciseId: 'squat',
          setNumber: 1,
          weightLb: 315,
          reps: 5,
          isWarmup: false,
          isPr: false,
          createdAt: '2026-07-20T12:00:00Z',
        },
      ]),
    ).toEqual([
      {
        label: 'Jul 26',
        date: '2026-07-11T12:00:00Z',
        t: new Date('2026-07-11T12:00:00Z').getTime(),
        weightLb: 205,
        reps: 3,
        oneRm: 225.5,
      },
      {
        label: 'Jul 26',
        date: '2026-07-12T12:00:00Z',
        t: new Date('2026-07-12T12:00:00Z').getTime(),
        weightLb: 185,
        reps: 6,
        oneRm: 222,
      },
      {
        label: 'Jul 26',
        date: '2026-07-25T12:00:00Z',
        t: new Date('2026-07-25T12:00:00Z').getTime(),
        weightLb: 215,
        reps: 2,
        oneRm: 229.3,
      },
    ]);
  });

  it('labels multi-year baselines with distinct years so the chart span is visible', () => {
    const points = buildLiftProgress('ex-bench', [
      {
        id: '9th',
        sessionId: 'session-synthetic-9th',
        exerciseId: 'ex-bench',
        setNumber: 1,
        weightLb: 95,
        reps: 1,
        isWarmup: false,
        isPr: false,
        createdAt: '2022-09-01T12:00:00-07:00',
      },
      {
        id: '10th',
        sessionId: 'session-synthetic-10th',
        exerciseId: 'ex-bench',
        setNumber: 1,
        weightLb: 135,
        reps: 1,
        isWarmup: false,
        isPr: false,
        createdAt: '2023-09-01T12:00:00-07:00',
      },
      {
        id: 'current',
        sessionId: 'session-current-board-import',
        exerciseId: 'ex-bench',
        setNumber: 1,
        weightLb: 205,
        reps: 3,
        isWarmup: false,
        isPr: true,
        createdAt: '2026-07-11T12:00:00-07:00',
      },
    ]);

    expect(points.map((point) => point.label)).toEqual(['Sep 22', 'Sep 23', 'Jul 26']);
    expect(points[0].t).toBeLessThan(points[1].t);
    expect(points[1].t).toBeLessThan(points[2].t);
  });
});
