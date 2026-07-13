import { execSync } from 'node:child_process';
import { loadEnvLocal } from './load-env-local';

loadEnvLocal();

function projectRefFromEnv(): string | undefined {
  if (process.env.SUPABASE_PROJECT_REF) {
    return process.env.SUPABASE_PROJECT_REF;
  }

  const url = process.env.VITE_SUPABASE_URL;
  return url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
}

async function main() {
  const projectRef = projectRefFromEnv();
  if (!projectRef) {
    throw new Error('Missing SUPABASE_PROJECT_REF or VITE_SUPABASE_URL in .env.local');
  }

  execSync(`npx --yes supabase@latest functions deploy parse-exercise-log --project-ref "${projectRef}"`, {
    stdio: 'inherit',
  });

  console.log('ok deployed parse-exercise-log');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
