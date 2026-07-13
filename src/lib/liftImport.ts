import type { LoggedSet } from '../types';
import { formatDate } from './fmt';
import { estimateOneRepMax } from './pr';

export type ParsedLiftSet = {
  exerciseName: string;
  weightLb: number;
  reps: number;
  raw: string;
};

export type LiftProgressPoint = {
  label: string;
  weightLb: number;
  reps: number;
  oneRm: number;
};

const weightRepsPattern = /(\d+(?:\.\d+)?)\s*(?:lb|lbs)?\s*(?:x|×)\s*(\d+)/gi;
const bareWeightPattern = /(\d+(?:\.\d+)?)\s*(?:lb|lbs)\b/i;
const ordinalSetPattern =
  /(?:first|second|third|fourth|fifth|sixth)\s+(?:set\s+)?(?:was\s+)?(\d+)(?:\s*reps?)?/gi;
const bareRepsPattern = /(\d+)\s*reps?\b/gi;
const trailingWeightPattern = /(?:and|at|@)\s*(\d+(?:\.\d+)?)\s*(?:lb|lbs)?\s*$/i;

function cleanExerciseName(value: string): string {
  return value
    .replace(/^[\s\-*•☐○]+/, '')
    .replace(/[:,-]+$/, '')
    .trim();
}

function extractProseReps(raw: string): number[] {
  const ordinalMatches = [...raw.matchAll(ordinalSetPattern)];
  if (ordinalMatches.length > 0) {
    return ordinalMatches.map((match) => Number(match[1]));
  }

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

  const firstRepMatch = raw.match(/(?:first|second|third|fourth|fifth|sixth)\s+(?:set\s+)?(?:was\s+)?\d+|\d+\s*reps?\b/i);
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

export function parseLiftBrainDump(text: string): ParsedLiftSet[] {
  const parsed: ParsedLiftSet[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const raw = rawLine.trim();
    if (!raw) {
      continue;
    }

    const multiMatches = [...raw.matchAll(weightRepsPattern)];
    if (multiMatches.length > 0) {
      const exerciseName = cleanExerciseName(raw.slice(0, multiMatches[0].index).trim());
      if (!exerciseName) {
        continue;
      }

      for (const match of multiMatches) {
        parsed.push({
          exerciseName,
          weightLb: Number(match[1]),
          reps: Number(match[2]),
          raw,
        });
      }
      continue;
    }

    const proseSets = parseProseLiftLine(raw);
    if (proseSets) {
      parsed.push(...proseSets);
      continue;
    }

    const bareMatch = raw.match(bareWeightPattern);
    if (!bareMatch || bareMatch.index === undefined) {
      continue;
    }

    const exerciseName = cleanExerciseName(raw.slice(0, bareMatch.index).trim());
    if (!exerciseName) {
      continue;
    }

    parsed.push({
      exerciseName,
      weightLb: Number(bareMatch[1]),
      reps: 1,
      raw,
    });
  }

  return parsed;
}

export function buildLiftProgress(exerciseId: string, sets: LoggedSet[]): LiftProgressPoint[] {
  return sets
    .filter((setItem) => setItem.exerciseId === exerciseId && !setItem.isWarmup)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((setItem) => ({
      label: formatDate(setItem.createdAt),
      weightLb: setItem.weightLb,
      reps: setItem.reps,
      oneRm: estimateOneRepMax(setItem.weightLb, setItem.reps),
    }));
}
