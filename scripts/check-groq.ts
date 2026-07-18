import { loadEnvLocal } from './load-env-local';

loadEnvLocal();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Add it to .env.local`);
  }

  return value;
}

async function main() {
  const apiKey = requireEnv('VITE_GROQ_API_KEY');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'Return JSON only. Parse messy gym logs into {"sets":[{"weightLb":number,"reps":number}],"notes":[]}. Example: "110 for 2 sets for 6 reps then 7 reps" → two sets.',
        },
        {
          role: 'user',
          content: 'Exercise: curl\nAthlete log: 110 for 2 sets for 6 reps then 7 reps',
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq request failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Groq returned an empty response');
  }

  const parsed = JSON.parse(content) as { sets?: Array<{ weightLb: number; reps: number }> };
  if (!parsed.sets?.length) {
    throw new Error(`Groq JSON missing sets: ${content}`);
  }

  console.log('ok groq llama-3.3-70b-versatile');
  console.log(
    `ok parsed ${parsed.sets.length} sets: ${parsed.sets.map((setItem) => `${setItem.weightLb}x${setItem.reps}`).join(', ')}`,
  );
  console.log(`remaining-requests ${response.headers.get('x-ratelimit-remaining-requests') ?? 'n/a'}`);
  console.log(`remaining-tokens ${response.headers.get('x-ratelimit-remaining-tokens') ?? 'n/a'}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
