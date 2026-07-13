import { z } from 'zod';
import { parseExerciseLog, type ParsedExerciseLog } from './liftImport';

const llmResponseSchema = z.object({
  sets: z.array(
    z.object({
      weightLb: z.number().positive(),
      reps: z.number().int().positive(),
    }),
  ),
  notes: z.array(z.string()).default([]),
});

const llmSystemPrompt = `You parse gym set logs into JSON only.
Return {"sets":[{"weightLb":number,"reps":number}],"notes":["optional side notes"]}.
Weights are in pounds. Ignore exercise name in output. Warmups still count as sets unless clearly marked as skipped.`;

function isGroqConfigured(): boolean {
  const key = import.meta.env.VITE_GROQ_API_KEY;
  return typeof key === 'string' && key.length > 0;
}

async function parseExerciseLogWithGroq(text: string, exerciseName: string): Promise<ParsedExerciseLog | null> {
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
      model: 'llama-3.1-8b-instant',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: llmSystemPrompt },
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
    const parsed = llmResponseSchema.parse(JSON.parse(content));
    return parsed;
  } catch {
    return null;
  }
}

export function isExerciseLogLlmConfigured(): boolean {
  return isGroqConfigured();
}

export async function parseExerciseLogSmart(text: string, exerciseName: string): Promise<ParsedExerciseLog> {
  const local = parseExerciseLog(text, exerciseName);
  if (local.sets.length > 0 || !isGroqConfigured()) {
    return local;
  }

  try {
    const llm = await parseExerciseLogWithGroq(text, exerciseName);
    if (llm?.sets.length) {
      return {
        sets: llm.sets,
        notes: [...local.notes, ...llm.notes],
      };
    }
  } catch {
    // Fall back to local notes-only result.
  }

  return local;
}
