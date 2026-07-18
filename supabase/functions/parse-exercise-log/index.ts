import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Keep in sync with src/lib/exercise-log-parse.ts EXERCISE_LOG_LLM_SYSTEM_PROMPT */
const llmSystemPrompt = `You interpret messy gym set logs into a JSON draft only.
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

const anthropicModel = "claude-haiku-4-5";
const groqModel = "llama-3.3-70b-versatile";

type Draft = {
  weightLb?: number;
  setCount?: number;
  repsPerSet?: number[];
  sets?: Array<{ weightLb: number; reps: number }>;
  notes?: string[];
  confidence?: number;
};

type ParsedExerciseLog = {
  sets: Array<{ weightLb: number; reps: number }>;
  notes: string[];
};

function parseJsonObject(content: string): unknown | null {
  try {
    return JSON.parse(content);
  } catch {
    // Claude sometimes wraps JSON in fences.
    const fence = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence?.[1]) {
      try {
        return JSON.parse(fence[1].trim());
      } catch {
        return null;
      }
    }
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(content.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/** Deterministic stage-2 commit (mirrors src/lib/exercise-log-parse.ts). */
function commitDraft(raw: unknown): ParsedExerciseLog | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const draft = raw as Draft;
  const notes = Array.isArray(draft.notes) ? draft.notes.map(String) : [];

  if (Array.isArray(draft.sets) && draft.sets.length > 0) {
    const sets = draft.sets.filter(
      (setItem) =>
        typeof setItem?.weightLb === "number" &&
        setItem.weightLb > 0 &&
        typeof setItem?.reps === "number" &&
        setItem.reps > 0,
    );
    if (sets.length > 0) {
      return { sets, notes };
    }
  }

  const weightLb = typeof draft.weightLb === "number" ? draft.weightLb : undefined;
  let reps = Array.isArray(draft.repsPerSet)
    ? draft.repsPerSet.filter((value) => typeof value === "number" && value > 0)
    : [];
  const setCount = typeof draft.setCount === "number" ? draft.setCount : undefined;

  if (!weightLb || weightLb <= 0 || reps.length === 0) {
    return notes.length > 0 ? { sets: [], notes } : null;
  }

  if (setCount && setCount > 1 && reps.length === 1) {
    reps = Array.from({ length: setCount }, () => reps[0]!);
  }

  return {
    sets: reps.map((repCount) => ({ weightLb, reps: repCount })),
    notes,
  };
}

async function callAnthropic(apiKey: string, text: string, exerciseName: string): Promise<unknown | null> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: anthropicModel,
      max_tokens: 1024,
      temperature: 0,
      system: llmSystemPrompt,
      messages: [
        {
          role: "user",
          content: `Exercise: ${exerciseName}\nAthlete log:\n${text}\n\nRespond with JSON only.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error("Anthropic request failed", response.status, await response.text());
    return null;
  }

  const payload = await response.json();
  const content = payload?.content?.find((block: { type?: string }) => block.type === "text")?.text
    ?? payload?.content?.[0]?.text;
  if (!content || typeof content !== "string") {
    return null;
  }

  return parseJsonObject(content);
}

async function callGroq(apiKey: string, text: string, exerciseName: string): Promise<unknown | null> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: groqModel,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: llmSystemPrompt },
        {
          role: "user",
          content: `Exercise: ${exerciseName}\nAthlete log:\n${text}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error("Groq request failed", response.status, await response.text());
    return null;
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    return null;
  }

  return parseJsonObject(content);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (!anthropicKey && !groqKey) {
    return new Response(
      JSON.stringify({
        error: "ANTHROPIC_API_KEY (preferred) or GROQ_API_KEY must be set in Supabase secrets",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  let body: { text?: string; exerciseName?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const text = body.text?.trim();
  const exerciseName = body.exerciseName?.trim();
  if (!text || !exerciseName) {
    return new Response(JSON.stringify({ error: "text and exerciseName are required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let draft: unknown | null = null;
  let provider: "anthropic" | "groq" | null = null;

  if (anthropicKey) {
    draft = await callAnthropic(anthropicKey, text, exerciseName);
    if (draft) {
      provider = "anthropic";
    }
  }

  if (!draft && groqKey) {
    draft = await callGroq(groqKey, text, exerciseName);
    if (draft) {
      provider = "groq";
    }
  }

  if (!draft) {
    return new Response(JSON.stringify({ error: "LLM returned no usable JSON" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const committed = commitDraft(draft);
  if (!committed) {
    return new Response(JSON.stringify({ error: "Could not commit draft to sets" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      ...committed,
      // Draft echoed for debugging / client-side re-commit if needed.
      draft,
      provider,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
