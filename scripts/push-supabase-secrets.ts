import { execSync } from 'node:child_process';
import { loadEnvLocal } from './load-env-local';

loadEnvLocal();

function requireValue(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

function projectRefFromEnv(): string | undefined {
  if (process.env.SUPABASE_PROJECT_REF) {
    return process.env.SUPABASE_PROJECT_REF;
  }

  const url = process.env.VITE_SUPABASE_URL;
  if (!url) {
    return undefined;
  }

  return url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
}

function quote(value: string): string {
  return value.replaceAll('"', '\\"');
}

async function main() {
  const projectRef = requireValue('SUPABASE_PROJECT_REF or VITE_SUPABASE_URL', projectRefFromEnv());
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const groqKey = process.env.GROQ_API_KEY ?? process.env.VITE_GROQ_API_KEY;

  if (!anthropicKey && !groqKey) {
    throw new Error('Set ANTHROPIC_API_KEY (preferred) and/or GROQ_API_KEY in .env.local');
  }

  const pairs: string[] = [];
  if (anthropicKey) {
    pairs.push(`ANTHROPIC_API_KEY="${quote(anthropicKey)}"`);
  }
  if (groqKey) {
    pairs.push(`GROQ_API_KEY="${quote(groqKey)}"`);
  }

  const command = `npx --yes supabase@latest secrets set ${pairs.join(' ')} --project-ref "${projectRef}"`;
  execSync(command, { stdio: 'inherit' });

  if (anthropicKey) {
    console.log('ok pushed ANTHROPIC_API_KEY to Supabase Edge Function secrets');
  }
  if (groqKey) {
    console.log('ok pushed GROQ_API_KEY to Supabase Edge Function secrets (fallback)');
  }
  console.log('next: deploy the function with `pnpm supabase:deploy-functions`');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
