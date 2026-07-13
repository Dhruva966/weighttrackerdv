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

async function main() {
  const groqKey = requireValue(
    'GROQ_API_KEY or VITE_GROQ_API_KEY',
    process.env.GROQ_API_KEY ?? process.env.VITE_GROQ_API_KEY,
  );
  const projectRef = requireValue('SUPABASE_PROJECT_REF or VITE_SUPABASE_URL', projectRefFromEnv());

  const command = `npx --yes supabase@latest secrets set GROQ_API_KEY="${groqKey.replaceAll('"', '\\"')}" --project-ref "${projectRef}"`;
  execSync(command, { stdio: 'inherit' });

  console.log('ok pushed GROQ_API_KEY to Supabase Edge Function secrets');
  console.log('next: deploy the function with `pnpm supabase:deploy-functions`');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
