import { z } from 'zod';
import { getSupabase } from './supabase';
import {
  isCleanExerciseLogShorthand,
  parseExerciseLog,
  type ParsedExerciseLog,
  type ParsedExerciseSet,
} from './liftImport';

/** Stage 1 draft from Claude (or Groq fallback). Stage 2 commits this to sets. */
export const exerciseLogDraftSchema = z.object({
  weightLb: z.number().positive().optional(),
  setCount: z.number().int().positive().optional(),
  repsPerSet: z.array(z.number().int().positive()).optional(),
  sets: z
    .array(
      z.object({
        weightLb: z.number().positive(),
        reps: z.number().int().positive(),
      }),
    )
    .optional(),
  notes: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).optional(),
});

export type ExerciseLogDraft = z.infer<typeof exerciseLogDraftSchema>;

const committedLogSchema = z.object({
  sets: z.array(
    z.object({
      weightLb: z.number().positive(),
      reps: z.number().int().positive(),
    }),
  ),
  notes: z.array(z.string()).default([]),
});

/**
 * Duration-only session logs: "15 minutes", "15 min", "10m", "1 hour", "90 sec".
 * Bare "m" means minutes (gym convention). Does not match lift shorthand.
 */
const durationUnitPattern = /(\d+(?:\.\d+)?)\s*(m|mins?|minutes?|h|hrs?|hours?|s|secs?|seconds?)\b/gi;
const durationOnlyPattern =
  /^\s*(\d+(?:\.\d+)?)\s*(m|mins?|minutes?|h|hrs?|hours?|s|secs?|seconds?)\s*$/i;

function durationSecFromMatch(valueRaw: string, unitRaw: string): number | null {
  const value = Number(valueRaw);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  const unit = unitRaw.toLowerCase();
  let durationSec: number;
  if (/^(h|hrs?|hours?)$/.test(unit)) {
    durationSec = Math.round(value * 3600);
  } else if (/^(s|secs?|seconds?)$/.test(unit)) {
    durationSec = Math.round(value);
  } else {
    durationSec = Math.round(value * 60);
  }

  return durationSec > 0 ? durationSec : null;
}

/** True when the text looks like a duration attempt (for error hints / LLM skip). */
export function looksLikeDurationAttempt(text: string): boolean {
  durationUnitPattern.lastIndex = 0;
  return durationUnitPattern.test(text.trim());
}

function looksLikeLiftLog(text: string): boolean {
  const probe = text.trim();
  if (!probe) {
    return false;
  }
  if (/\d+\s*(?:lb|lbs)?\s*[x×]\s*\d+/i.test(probe)) {
    return true;
  }
  if (/\b\d+(?:\.\d+)?\s*(?:lb|lbs)\b/i.test(probe) && /\b\d+\s*reps?\b/i.test(probe)) {
    return true;
  }
  if (/\d+\s+for\s+\d+/i.test(probe) && /\b(sets?|reps?)\b/i.test(probe)) {
    return true;
  }
  if (/\b\d+\s*sets?\b/i.test(probe) && /\b\d+\s*reps?\b/i.test(probe)) {
    return true;
  }
  return false;
}

/**
 * Parse a duration log into seconds.
 * Accepts whole-string shorthand (`15 minutes`, `10m`) and single embedded
 * durations with filler (`around 15 minutes or so`) when the text is not a lift.
 */
export function parseDurationOnlyLog(text: string): { durationSec: number } | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const only = trimmed.match(durationOnlyPattern);
  if (only) {
    const durationSec = durationSecFromMatch(only[1]!, only[2]!);
    return durationSec != null ? { durationSec } : null;
  }

  if (looksLikeLiftLog(trimmed)) {
    return null;
  }

  durationUnitPattern.lastIndex = 0;
  const matches = [...trimmed.matchAll(durationUnitPattern)];
  if (matches.length !== 1) {
    return null;
  }

  const durationSec = durationSecFromMatch(matches[0]![1]!, matches[0]![2]!);
  return durationSec != null ? { durationSec } : null;
}

export function isCleanDurationShorthand(text: string): boolean {
  return durationOnlyPattern.test(text.trim());
}

function durationSet(durationSec: number): ParsedExerciseSet {
  return { weightLb: 0, reps: 0, durationSec };
}

function normalizeCommittedSets(
  sets: Array<{ weightLb?: number; reps?: number }> | undefined,
): ParsedExerciseLog['sets'] {
  return (sets ?? [])
    .filter(
      (setItem): setItem is { weightLb: number; reps: number } =>
        typeof setItem.weightLb === 'number' &&
        typeof setItem.reps === 'number',
    )
    .map((setItem) => ({ weightLb: setItem.weightLb, reps: setItem.reps }));
}

/**
 * Shared with the Supabase edge function — keep in sync.
 * Stage 1 only: interpret messy NL into a draft. Stage 2 is deterministic code.
 */
export const EXERCISE_LOG_LLM_SYSTEM_PROMPT = `You interpret messy gym set logs into a JSON draft only.
Return one JSON object with any of:
{"weightLb":number,"setCount":number,"repsPerSet":number[],"sets":[{"weightLb":number,"reps":number}],"notes":string[],"confidence":0-1}

Rules:
- Convert number WORDS to digits (a hundred forty four → 144, seven → 7, one thirty five → 135).
- Weights are pounds unless clearly kg (convert kg → lb × 2.2046, round to nearest 0.5).
- Prefer compact draft fields when possible: weightLb + setCount + repsPerSet.
- "N sets" of the same reps → setCount N and repsPerSet [reps]. Different reps → list them in repsPerSet (or emit full sets[]).
- You may emit sets[] directly when clearer; omit unused fields.
- Broken English, filler ("like","basically","did","got"), and missing punctuation are OK.
- Put narrative (spotter, felt grindy, form cues) in notes, not sets.
- If you cannot find any sets, return {"sets":[],"notes":["..."],"confidence":0}.

Examples:
- "205 x 3" → {"sets":[{"weightLb":205,"reps":3}],"notes":[],"confidence":1}
- "115 for 8 7 7" → {"weightLb":115,"repsPerSet":[8,7,7],"notes":[],"confidence":1}
- "110 for 3 sets for 8 reps" → {"weightLb":110,"setCount":3,"repsPerSet":[8],"notes":[],"confidence":1}
- "110 for 2 sets for 6 reps then 7 reps" → {"weightLb":110,"setCount":2,"repsPerSet":[6,7],"notes":[],"confidence":1}
- "I did a hundred forty four two sets, seven reps." → {"weightLb":144,"setCount":2,"repsPerSet":[7],"notes":[],"confidence":1}
- "one thirty five for five" → {"weightLb":135,"repsPerSet":[5],"notes":[],"confidence":1}
- "ninety five x 8" → {"weightLb":95,"repsPerSet":[8],"notes":[],"confidence":1}
- "last rep helped by a friend" → {"sets":[],"notes":["last rep helped by a friend"],"confidence":0.9}`;

/** Anthropic model used by the edge function (documented for client copy). */
export const EXERCISE_LOG_ANTHROPIC_MODEL = 'claude-haiku-4-5';

/** Legacy browser Groq model if edge is unavailable. */
export const EXERCISE_LOG_GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * Stage 2 — deterministic commit: expand draft → ParsedExerciseLog.
 * Prefer code over a second LLM call.
 */
export function commitExerciseLogDraft(raw: unknown): ParsedExerciseLog | null {
  const parsed = exerciseLogDraftSchema.safeParse(raw);
  if (!parsed.success) {
    // Accept already-committed {sets, notes} from older edge responses.
    const legacy = committedLogSchema.safeParse(raw);
    if (!legacy.success) {
      return null;
    }
    return {
      sets: normalizeCommittedSets(legacy.data.sets),
      notes: legacy.data.notes,
    };
  }

  const draft = parsed.data;
  const notes = draft.notes ?? [];

  if (draft.sets && draft.sets.length > 0) {
    return { sets: normalizeCommittedSets(draft.sets), notes };
  }

  const weightLb = draft.weightLb;
  const repsPerSet = draft.repsPerSet ?? [];
  const setCount = draft.setCount;

  if (!weightLb || weightLb <= 0) {
    return notes.length > 0 ? { sets: [], notes } : null;
  }

  let reps = repsPerSet.filter((value) => value > 0);
  if (reps.length === 0) {
    return notes.length > 0 ? { sets: [], notes } : null;
  }

  if (setCount && setCount > 1 && reps.length === 1) {
    reps = Array.from({ length: setCount }, () => reps[0]!);
  } else if (setCount && setCount > reps.length && reps.length > 1) {
    // Ambiguous partial list — use listed reps only (do not invent).
  } else if (setCount && setCount === reps.length) {
    // already aligned
  }

  return {
    sets: reps.map((repCount) => ({ weightLb, reps: repCount })),
    notes,
  };
}

/** True when the text looks like a set attempt (not pure narrative notes). */
export function looksLikeSetAttempt(text: string): boolean {
  const probe = text.trim();
  if (!probe) {
    return false;
  }
  if (/\d/.test(probe)) {
    return true;
  }
  if (/\b(lb|lbs|pounds?|kilos?|kg)\b/i.test(probe) || /\bsets?\b/i.test(probe)) {
    return true;
  }
  // Spoken weights / counts without digits ("a hundred forty four", "seven reps").
  return /\b(hundred|thousand|ninety|eighty|seventy|sixty|fifty|forty|thirty|twenty)\b/i.test(probe)
    || (/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen)\b/i.test(probe)
      && /\breps?\b/i.test(probe));
}

function isBrowserGroqConfigured(): boolean {
  const key = import.meta.env.VITE_GROQ_API_KEY;
  return typeof key === 'string' && key.length > 0;
}

async function interpretWithBrowserGroq(text: string, exerciseName: string): Promise<unknown | null> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: EXERCISE_LOG_GROQ_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: EXERCISE_LOG_LLM_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Exercise: ${exerciseName}\nAthlete log:\n${text}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    return null;
  }

  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

async function interpretWithSupabase(text: string, exerciseName: string): Promise<unknown | null> {
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.functions.invoke('parse-exercise-log', {
    body: { text, exerciseName },
  });

  if (error || !data) {
    return null;
  }

  return data as unknown;
}

export function isExerciseLogLlmConfigured(): boolean {
  return Boolean(getSupabase()) || isBrowserGroqConfigured();
}

export function isSupabaseLlmConfigured(): boolean {
  return Boolean(getSupabase());
}

/**
 * Stage 1 remote interpret → Stage 2 local commit.
 * Edge prefers Anthropic; browser Groq is a last-resort local-dev fallback.
 */
async function tryRemoteParse(text: string, exerciseName: string): Promise<ParsedExerciseLog | null> {
  try {
    const remote = await interpretWithSupabase(text, exerciseName);
    const committed = commitExerciseLogDraft(remote);
    if (committed?.sets.length) {
      return committed;
    }
  } catch {
    // Fall through to browser Groq.
  }

  if (!isBrowserGroqConfigured()) {
    return null;
  }

  try {
    const draft = await interpretWithBrowserGroq(text, exerciseName);
    const committed = commitExerciseLogDraft(draft);
    if (committed?.sets.length) {
      return committed;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Two-stage set log parse when an LLM path is configured:
 * 1) Claude (via Supabase edge) interprets messy NL → draft JSON
 * 2) Deterministic Zod commit expands to {sets, notes}
 *
 * Clean shorthand (`205 x 3`, `115 for 8 7 7`, `15 minutes`) stays on-device with no API call.
 */
export async function parseExerciseLogSmart(text: string, exerciseName: string): Promise<ParsedExerciseLog> {
  const duration = parseDurationOnlyLog(text);
  if (duration) {
    return { sets: [durationSet(duration.durationSec)], notes: [] };
  }

  const local = parseExerciseLog(text, exerciseName);

  if (isCleanExerciseLogShorthand(text) && local.sets.length > 0) {
    return local;
  }

  // Duration attempts are on-device only — do not send them to the weight/reps LLM.
  if (looksLikeDurationAttempt(text) && local.sets.length === 0) {
    return local;
  }

  // Prose / number-words / ambiguous: prefer LLM when configured (do not keep notes-only locally).
  if (isExerciseLogLlmConfigured()) {
    const remote = await tryRemoteParse(text, exerciseName);
    if (remote?.sets.length) {
      return {
        sets: remote.sets,
        notes: remote.notes,
      };
    }
  }

  return local;
}
