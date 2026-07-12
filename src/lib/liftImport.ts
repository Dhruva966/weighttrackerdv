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

function cleanExerciseName(value: string): string {
  return value
    .replace(/^[\s\-*•☐○]+/, '')
    .replace(/[:,-]+$/, '')
    .trim();
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
