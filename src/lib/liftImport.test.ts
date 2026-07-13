import { describe, expect, it } from 'vitest';
import { buildLiftProgress, formatImportedSessionNotes, parseBrainDump, parseLiftBrainDump } from './liftImport';

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
  it('sorts sets and calculates one rep max points for one exercise', () => {
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
      ]),
    ).toEqual([
      { label: 'Jul 11', weightLb: 205, reps: 3, oneRm: 225.5 },
      { label: 'Jul 12', weightLb: 185, reps: 6, oneRm: 222 },
    ]);
  });
});
