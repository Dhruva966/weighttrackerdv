import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const llmSystemPrompt = `You parse gym set logs into JSON only.
Return {"sets":[{"weightLb":number,"reps":number}],"notes":["optional side notes"]}.
Weights are in pounds. Ignore exercise name in output. Warmups still count as sets unless clearly marked as skipped.`;

type ParsedExerciseLog = {
  sets: Array<{ weightLb: number; reps: number }>;
  notes: string[];
};

function parseResponse(content: string): ParsedExerciseLog | null {
  try {
    const parsed = JSON.parse(content) as ParsedExerciseLog;
    if (!Array.isArray(parsed.sets)) {
      return null;
    }

    return {
      sets: parsed.sets.filter(
        (setItem) =>
          typeof setItem.weightLb === "number" &&
          setItem.weightLb > 0 &&
          typeof setItem.reps === "number" &&
          setItem.reps > 0,
      ),
      notes: Array.isArray(parsed.notes) ? parsed.notes.map(String) : [],
    };
  } catch {
    return null;
  }
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

  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (!groqKey) {
    return new Response(JSON.stringify({ error: "GROQ_API_KEY is not set in Supabase secrets" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
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
    const detail = await response.text();
    return new Response(JSON.stringify({ error: "Groq request failed", detail }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) {
    return new Response(JSON.stringify({ error: "Groq returned an empty response" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = parseResponse(content);
  if (!parsed) {
    return new Response(JSON.stringify({ error: "Could not parse Groq JSON" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(parsed), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
