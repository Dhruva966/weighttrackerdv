import type { LoggedSet } from '../types';
import { formatChartMonth } from './fmt';
import { estimateOneRepMax } from './pr';

export type ParsedLiftSet = {
  exerciseName: string;
  weightLb: number;
  reps: number;
  raw: string;
};

export type ParsedExerciseBlock = {
  exerciseName: string;
  sets: Array<{ weightLb: number; reps: number }>;
  notes: string[];
  raw: string;
};

export type ParsedBrainDump = {
  blocks: ParsedExerciseBlock[];
  sessionNotes: string[];
};

export type LiftProgressPoint = {
  /** Month + 2-digit year (e.g. Sep 22) for axis ticks. */
  label: string;
  /** ISO timestamp of the set — used for time-scale chart domain. */
  date: string;
  /** Epoch ms for Recharts numeric / time X axis. */
  t: number;
  weightLb: number;
  reps: number;
  oneRm: number;
};

const weightRepsPattern = /(\d+(?:\.\d+)?)\s*(?:lb|lbs)?\s*(?:x|×)\s*(\d+)/gi;
const bareWeightPattern = /(\d+(?:\.\d+)?)\s*(?:lb|lbs)\b/i;
const ordinalSetPattern =
  /(?:first|second|third|fourth|fifth|sixth)\s+(?:set\s+)?(?:was\s+)?(\d+)(?:\s*reps?)?/gi;
const bareRepsPattern = /(\d+)\s*reps?\b/gi;
const trailingWeightPattern = /(?:and|at|@|for)\s*(\d+(?:\.\d+)?)\s*(?:lb|lbs)?\s*$/i;
const repSequencePattern =
  /^(.+?)\s+((?:\d{1,2}\s*(?:,|and)?\s*)+)(?:at|@|for)\s*(\d+(?:\.\d+)?)\s*(?:lb|lbs)?\s*$/i;
/** Do not treat "for 2 sets" as "for 2 reps". */
const weightForRepsPattern = /(\d+(?:\.\d+)?)\s+for\s+(\d+)(?!\s*sets?\b)(?:\s*reps?)?/gi;
const weightForRepListPattern = /^(\d+(?:\.\d+)?)\s+for\s+((?:\d{1,2}\s*)+)$/;
/** "110 for 2 sets for 6 reps then 7 reps" / "110lbs for 2 sets of 6 and 7" */
const weightForSetsPattern =
  /^(\d+(?:\.\d+)?)\s*(?:lb|lbs)?\s+for\s+(\d+)\s*sets?\b(?:\s*(?:for|of|at|:))?\s*(.*)$/i;
const noteIndicatorPattern =
  /\b(helped|spotter|friend|assisted|assistance|failed|tired|sore|felt|felt like|maybe|remember|note|notes|grindy|slow|fast|easy|hard|pain|hurt|skipped|missed|almost|barely|struggled|good set|bad set|warmup|warm up|stretch|recover|recovery)\b/i;
/** Minimal cleanup only — messy English belongs to the LLM, not regex. */
const fillerWordPattern =
  /\b(like|literally|basically|just|only|about|around|roughly|maybe|kinda|kind of|sort of|did|got|hit|went|completed|finished)\b/gi;
/** Clean shorthand the on-device parser is trusted to handle without an LLM. */
const cleanShorthandPattern =
  /^(?:\d+(?:\.\d+)?\s*(?:lb|lbs)?\s*[x×]\s*\d+\s*)+$|^\d+(?:\.\d+)?\s+for\s+(?:\d{1,2}\s*)+$|^\d+(?:\.\d+)?\s+for\s+\d+(?:\s*reps?)?$/i;

function cleanExerciseName(value: string): string {
  return value
    .replace(/^[\s\-*•☐○]+/, '')
    .replace(/[:,-]+$/, '')
    .trim();
}

function hasLiftSignals(text: string): boolean {
  const probe = text.trim();
  if (!probe) {
    return false;
  }

  return (
    weightRepsPattern.test(probe) ||
    bareWeightPattern.test(probe) ||
    ordinalSetPattern.test(probe) ||
    bareRepsPattern.test(probe) ||
    repSequencePattern.test(probe) ||
    /\d+\s*sets?\b/i.test(probe) ||
    trailingWeightPattern.test(probe)
  );
}

function resetRegex(pattern: RegExp): void {
  pattern.lastIndex = 0;
}

function extractEmbeddedNotes(text: string): { cleaned: string; notes: string[] } {
  const notes: string[] = [];
  let cleaned = text;

  cleaned = cleaned.replace(/\(([^)]+)\)/g, (_, note: string) => {
    notes.push(note.trim());
    return ' ';
  });

  cleaned = cleaned.replace(/["“”']([^"“”']+)["“”']/g, (_, note: string) => {
    notes.push(note.trim());
    return ' ';
  });

  cleaned = cleaned
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .trim();

  return { cleaned, notes };
}

function splitIntoParagraphs(text: string): string[][] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => {
      const segments: string[] = [];

      for (const line of paragraph.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }

        if (trimmed.includes('. ') && /[.!?]\s+[A-Za-z"“']/.test(trimmed)) {
          segments.push(
            ...trimmed
              .split(/(?<=[.!?])\s+/)
              .map((part) => part.trim())
              .filter(Boolean),
          );
          continue;
        }

        segments.push(trimmed);
      }

      return segments;
    })
    .filter((paragraph) => paragraph.length > 0);
}

function isNoteSegment(segment: string): boolean {
  const trimmed = segment.trim();
  if (!trimmed) {
    return false;
  }

  resetRegex(weightRepsPattern);
  resetRegex(ordinalSetPattern);
  resetRegex(bareRepsPattern);

  if (hasLiftSignals(trimmed)) {
    return false;
  }

  if (!/[A-Za-z]{3,}/.test(trimmed)) {
    return false;
  }

  return noteIndicatorPattern.test(trimmed) || !/\d/.test(trimmed);
}

function extractProseReps(raw: string): number[] {
  resetRegex(ordinalSetPattern);
  const ordinalMatches = [...raw.matchAll(ordinalSetPattern)];
  if (ordinalMatches.length > 0) {
    return ordinalMatches.map((match) => Number(match[1]));
  }

  resetRegex(bareRepsPattern);
  return [...raw.matchAll(bareRepsPattern)].map((match) => Number(match[1]));
}

function extractProseWeight(raw: string, reps: number[]): number | null {
  const trailingMatch = raw.match(trailingWeightPattern);
  if (trailingMatch) {
    return Number(trailingMatch[1]);
  }

  const lbsMatch = raw.match(bareWeightPattern);
  if (lbsMatch) {
    return Number(lbsMatch[1]);
  }

  const repValues = new Set(reps);
  const numbers = [...raw.matchAll(/(\d+(?:\.\d+)?)/g)].map((match) => Number(match[1]));
  for (let index = numbers.length - 1; index >= 0; index -= 1) {
    const value = numbers[index];
    if (!repValues.has(value) && value > 0) {
      return value;
    }
  }

  return null;
}

function proseExerciseNameEnd(raw: string, firstRepIndex: number): number {
  let end = firstRepIndex > 0 ? firstRepIndex : raw.length;

  const setsMatch = raw.match(/\d+\s*sets?\b/i);
  if (setsMatch?.index !== undefined && setsMatch.index > 0) {
    end = Math.min(end, setsMatch.index);
  }

  const firstSetMatch = raw.match(/\bfirst\s+set\b/i);
  if (firstSetMatch?.index !== undefined && firstSetMatch.index > 0) {
    end = Math.min(end, firstSetMatch.index);
  }

  const weightMatch = raw.match(bareWeightPattern);
  if (weightMatch?.index !== undefined && weightMatch.index > 0) {
    end = Math.min(end, weightMatch.index);
  }

  return end;
}

function parseProseLiftLine(raw: string): ParsedLiftSet[] | null {
  const reps = extractProseReps(raw);
  if (reps.length === 0) {
    return null;
  }

  const weightLb = extractProseWeight(raw, reps);
  if (!weightLb || weightLb <= 0) {
    return null;
  }

  const firstRepMatch = raw.match(
    /(?:first|second|third|fourth|fifth|sixth)\s+(?:set\s+)?(?:was\s+)?\d+|\d+\s*reps?\b/i,
  );
  const firstRepIndex = firstRepMatch?.index ?? raw.length;
  const exerciseName = cleanExerciseName(raw.slice(0, proseExerciseNameEnd(raw, firstRepIndex)).trim());
  if (!exerciseName) {
    return null;
  }

  return reps.map((repCount) => ({
    exerciseName,
    weightLb,
    reps: repCount,
    raw,
  }));
}

function parseRepSequenceLine(raw: string): ParsedLiftSet[] | null {
  const match = raw.match(repSequencePattern);
  if (!match) {
    return null;
  }

  const exerciseName = cleanExerciseName(match[1]);
  const reps = [...match[2].matchAll(/(\d{1,2})/g)].map((part) => Number(part[1])).filter((value) => value > 0);
  const weightLb = Number(match[3]);

  if (!exerciseName || reps.length === 0 || !Number.isFinite(weightLb) || weightLb <= 0) {
    return null;
  }

  return reps.map((repCount) => ({
    exerciseName,
    weightLb,
    reps: repCount,
    raw,
  }));
}

function parseWeightForRepList(raw: string, exerciseName: string): ParsedLiftSet[] | null {
  const match = raw.trim().match(weightForRepListPattern);
  if (!match) {
    return null;
  }

  const weightLb = Number(match[1]);
  const reps = [...match[2].matchAll(/(\d{1,2})/g)].map((part) => Number(part[1])).filter((value) => value > 0);
  if (!Number.isFinite(weightLb) || weightLb <= 0 || reps.length === 0) {
    return null;
  }

  return reps.map((repCount) => ({
    exerciseName,
    weightLb,
    reps: repCount,
    raw,
  }));
}

function extractRepSequenceFromTail(tail: string): number[] {
  const cleaned = tail.replace(/^(?:for|of|at|:)\s*/i, '').trim();
  if (!cleaned) {
    return [];
  }

  resetRegex(bareRepsPattern);
  const labeled = [...cleaned.matchAll(bareRepsPattern)].map((match) => Number(match[1]));
  if (labeled.length > 0) {
    return labeled.filter((value) => value > 0);
  }

  resetRegex(ordinalSetPattern);
  const ordinals = [...cleaned.matchAll(ordinalSetPattern)].map((match) => Number(match[1]));
  if (ordinals.length > 0) {
    return ordinals.filter((value) => value > 0);
  }

  return [...cleaned.matchAll(/\d{1,2}/g)]
    .map((match) => Number(match[0]))
    .filter((value) => value > 0 && value <= 50);
}

function parseWeightForSetsWithReps(raw: string, exerciseName: string): ParsedLiftSet[] | null {
  const match = raw.trim().match(weightForSetsPattern);
  if (!match) {
    return null;
  }

  const weightLb = Number(match[1]);
  const setCount = Number(match[2]);
  let reps = extractRepSequenceFromTail(match[3] ?? '');

  if (!Number.isFinite(weightLb) || weightLb <= 0 || !Number.isFinite(setCount) || setCount <= 0) {
    return null;
  }

  if (reps.length === 0) {
    return null;
  }

  if (reps.length === 1 && setCount > 1) {
    reps = Array.from({ length: setCount }, () => reps[0]!);
  }

  return reps.map((repCount) => ({
    exerciseName,
    weightLb,
    reps: repCount,
    raw,
  }));
}

/** Light cleanup so offline fallback can still hit structured patterns. */
export function normalizeExerciseLogText(text: string): string {
  return text
    .replace(fillerWordPattern, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * True for compact gym shorthand the local parser should handle without an LLM
 * (`205 x 3`, `115 for 8 7 7`, `110 for 2`). Everything else is LLM-first when configured.
 */
export function isCleanExerciseLogShorthand(text: string): boolean {
  return cleanShorthandPattern.test(text.trim());
}

/** Inverse of isCleanExerciseLogShorthand — anything that should go LLM-first when configured. */
export function isProseOrAmbiguousExerciseLog(text: string): boolean {
  const probe = text.trim();
  if (!probe) {
    return false;
  }
  return !isCleanExerciseLogShorthand(probe);
}

function parseWeightForRepsLine(raw: string, defaultExerciseName?: string): ParsedLiftSet[] | null {
  resetRegex(weightForRepsPattern);
  const matches = [...raw.matchAll(weightForRepsPattern)];
  if (matches.length === 0) {
    return null;
  }

  const firstIndex = matches[0].index ?? 0;
  const exerciseName = cleanExerciseName(
    defaultExerciseName ?? raw.slice(0, firstIndex).trim(),
  );
  if (!exerciseName) {
    return null;
  }

  return matches.map((match) => ({
    exerciseName,
    weightLb: Number(match[1]),
    reps: Number(match[2]),
    raw,
  }));
}

function parseStructuredLiftSegment(
  candidate: string,
  raw: string,
  defaultExerciseName?: string,
): ParsedLiftSet[] | null {
  if (defaultExerciseName) {
    const setList = parseWeightForSetsWithReps(candidate, defaultExerciseName);
    if (setList) {
      return setList;
    }

    const repList = parseWeightForRepList(candidate, defaultExerciseName);
    if (repList) {
      return repList;
    }
  }

  resetRegex(weightRepsPattern);
  const multiMatches = [...candidate.matchAll(weightRepsPattern)];
  if (multiMatches.length > 0) {
    const exerciseName = cleanExerciseName(
      defaultExerciseName ?? candidate.slice(0, multiMatches[0].index).trim(),
    );
    if (exerciseName) {
      return multiMatches.map((match) => ({
        exerciseName,
        weightLb: Number(match[1]),
        reps: Number(match[2]),
        raw,
      }));
    }
  }

  const weightForReps = parseWeightForRepsLine(candidate, defaultExerciseName);
  if (weightForReps) {
    return weightForReps;
  }

  const repSequenceSets = parseRepSequenceLine(candidate);
  if (repSequenceSets) {
    return repSequenceSets;
  }

  return null;
}

function parseLiftSegment(raw: string, defaultExerciseName?: string): ParsedLiftSet[] {
  const trimmed = raw.trim();
  const normalized = normalizeExerciseLogText(trimmed);
  // Prefer normalized first so filler words do not unlock a wrong prose parse.
  const candidates = normalized === trimmed ? [trimmed] : [normalized, trimmed];

  for (const candidate of candidates) {
    const structured = parseStructuredLiftSegment(candidate, raw, defaultExerciseName);
    if (structured) {
      return structured;
    }
  }

  // Prose heuristics only after structured patterns fail (brain-dump / offline).
  for (const candidate of candidates) {
    const proseSets = parseProseLiftLine(candidate);
    if (proseSets) {
      return proseSets;
    }
  }

  const bareMatch = trimmed.match(bareWeightPattern);
  if (!bareMatch || bareMatch.index === undefined) {
    return [];
  }

  const exerciseName = cleanExerciseName(
    defaultExerciseName ?? trimmed.slice(0, bareMatch.index).trim(),
  );
  if (!exerciseName) {
    return [];
  }

  return [
    {
      exerciseName,
      weightLb: Number(bareMatch[1]),
      reps: 1,
      raw,
    },
  ];
}

function mergeBlock(existing: ParsedExerciseBlock, incoming: ParsedExerciseBlock): ParsedExerciseBlock {
  return {
    exerciseName: existing.exerciseName,
    sets: [...existing.sets, ...incoming.sets],
    notes: [...existing.notes, ...incoming.notes],
    raw: `${existing.raw}\n${incoming.raw}`,
  };
}

function toBlock(lifts: ParsedLiftSet[], notes: string[]): ParsedExerciseBlock {
  return {
    exerciseName: lifts[0].exerciseName,
    sets: lifts.map((lift) => ({ weightLb: lift.weightLb, reps: lift.reps })),
    notes,
    raw: lifts[0].raw,
  };
}

export function parseBrainDump(text: string): ParsedBrainDump {
  const { cleaned, notes: embeddedNotes } = extractEmbeddedNotes(text);
  const sessionNotes = [...embeddedNotes];
  const blocks: ParsedExerciseBlock[] = [];

  for (const paragraph of splitIntoParagraphs(cleaned)) {
    const paragraphBlocks: ParsedExerciseBlock[] = [];
    let paragraphNotes: string[] = [];

    for (const segment of paragraph) {
      if (isNoteSegment(segment)) {
        if (paragraphBlocks.length > 0) {
          const last = paragraphBlocks[paragraphBlocks.length - 1];
          paragraphBlocks[paragraphBlocks.length - 1] = {
            ...last,
            notes: [...last.notes, segment],
          };
        } else {
          paragraphNotes.push(segment);
        }
        continue;
      }

      const lifts = parseLiftSegment(segment);
      if (lifts.length === 0) {
        continue;
      }

      const block = toBlock(lifts, []);
      const previous = paragraphBlocks.at(-1);
      if (previous && previous.exerciseName.toLowerCase() === block.exerciseName.toLowerCase()) {
        paragraphBlocks[paragraphBlocks.length - 1] = mergeBlock(previous, block);
        continue;
      }

      paragraphBlocks.push(block);
    }

    if (paragraphBlocks.length === 0) {
      sessionNotes.push(...paragraphNotes);
      continue;
    }

    if (paragraphNotes.length > 0) {
      sessionNotes.push(...paragraphNotes);
    }

    for (const block of paragraphBlocks) {
      const previous = blocks.at(-1);
      if (previous && previous.exerciseName.toLowerCase() === block.exerciseName.toLowerCase()) {
        blocks[blocks.length - 1] = mergeBlock(previous, block);
        continue;
      }

      blocks.push(block);
    }
  }

  return { blocks, sessionNotes };
}

export function parseLiftBrainDump(text: string): ParsedLiftSet[] {
  return parseBrainDump(text).blocks.flatMap((block) =>
    block.sets.map((setItem) => ({
      exerciseName: block.exerciseName,
      weightLb: setItem.weightLb,
      reps: setItem.reps,
      raw: block.raw,
    })),
  );
}

function exerciseNamesMatch(left: string, right: string): boolean {
  const leftSlug = left.toLowerCase().trim();
  const rightSlug = right.toLowerCase().trim();
  return leftSlug === rightSlug || leftSlug.includes(rightSlug) || rightSlug.includes(leftSlug);
}

/** One parsed set — lift (weight+reps) and/or cardio/duration fields. */
export type ParsedExerciseSet = {
  weightLb: number;
  reps: number;
  level?: number;
  speed?: number;
  durationSec?: number;
  calories?: number;
};

export type ParsedExerciseLog = {
  sets: ParsedExerciseSet[];
  notes: string[];
};

export function parseExerciseLog(text: string, exerciseName: string): ParsedExerciseLog {
  const trimmed = text.trim();
  if (!trimmed) {
    return { sets: [], notes: [] };
  }

  const directSets = parseLiftSegment(trimmed, exerciseName);
  if (directSets.length > 0) {
    return {
      sets: directSets.map((setItem) => ({ weightLb: setItem.weightLb, reps: setItem.reps })),
      notes: [],
    };
  }

  const candidates = [trimmed, `${exerciseName} ${trimmed}`];
  for (const candidate of candidates) {
    const parsed = parseBrainDump(candidate);
    const block =
      parsed.blocks.find((item) => exerciseNamesMatch(item.exerciseName, exerciseName)) ??
      (parsed.blocks.length === 1 ? parsed.blocks[0] : undefined);

    if (block?.sets.length) {
      return {
        sets: block.sets,
        notes: [...block.notes, ...parsed.sessionNotes],
      };
    }
  }

  const noteOnly = parseBrainDump(trimmed);
  return {
    sets: [],
    notes: [...noteOnly.blocks.flatMap((block) => block.notes), ...noteOnly.sessionNotes],
  };
}

export function formatImportedSessionNotes(parsed: ParsedBrainDump): string | undefined {
  const sections: string[] = [];

  for (const block of parsed.blocks) {
    if (block.notes.length === 0) {
      continue;
    }

    sections.push(`${block.exerciseName}: ${block.notes.join(' ')}`);
  }

  if (parsed.sessionNotes.length > 0) {
    sections.push(parsed.sessionNotes.join('\n'));
  }

  return sections.length > 0 ? sections.join('\n\n') : undefined;
}

export function buildLiftProgress(exerciseId: string, sets: LoggedSet[]): LiftProgressPoint[] {
  return sets
    .filter((setItem) => setItem.exerciseId === exerciseId && !setItem.isWarmup)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((setItem) => {
      const t = new Date(setItem.createdAt).getTime();
      return {
        label: formatChartMonth(setItem.createdAt),
        date: setItem.createdAt,
        t,
        weightLb: setItem.weightLb,
        reps: setItem.reps,
        oneRm: estimateOneRepMax(setItem.weightLb, setItem.reps),
      };
    });
}
