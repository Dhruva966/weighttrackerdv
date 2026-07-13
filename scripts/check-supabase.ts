import { createClient } from '@supabase/supabase-js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

async function main() {
  const url = requireEnv('VITE_SUPABASE_URL');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? requireEnv('VITE_SUPABASE_ANON_KEY');
  const supabase = createClient(url, key);

  const tables = ['exercises', 'sessions', 'sets', 'goals', 'body_weight_logs'] as const;
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }
    console.log(`ok ${table}`);
  }

  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) {
    throw new Error(`storage: ${bucketError.message}`);
  }

  const hasImagesBucket = buckets.some((bucket) => bucket.name === 'exercise-images');
  console.log(hasImagesBucket ? 'ok exercise-images bucket' : 'missing exercise-images bucket');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
