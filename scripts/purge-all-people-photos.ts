/**
 * Nuclear purge: remove EVERY exercise image that depicts people (Strong/FEDB anatomical
 * demos and real gym stock). Clears DB image_url → name-only and deletes Storage objects.
 *
 * The previous "PDF crop" reseed uploaded Strong library thumbnails that are still people
 * photos — those must not be re-attached.
 *
 *   pnpm exec tsx scripts/purge-all-people-photos.ts
 *   pnpm exec tsx scripts/purge-all-people-photos.ts --dry-run
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnvLocal } from './load-env-local';

loadEnvLocal();

const STORAGE_BUCKET = 'exercise-images';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function listAllStorageObjects(
  supabase: ReturnType<typeof createClient>,
): Promise<string[]> {
  const names: string[] = [];
  let offset = 0;
  const limit = 100;
  for (;;) {
    const { data, error } = await supabase.storage.from(STORAGE_BUCKET).list('', {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(`storage list: ${error.message}`);
    if (!data?.length) break;
    for (const item of data) {
      if (item.name && !item.name.endsWith('/')) names.push(item.name);
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return names;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const url = requireEnv('VITE_SUPABASE_URL');
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(url, key);

  console.log(dryRun ? 'DRY RUN — no writes' : 'LIVE — purging all people photos from DB + Storage');

  const { data: rows, error } = await supabase
    .from('exercises')
    .select('id,slug,name,image_url,image_style,source,archived');
  if (error) throw new Error(`fetch exercises: ${error.message}`);
  const exercises = rows ?? [];

  const withUrl = exercises.filter((r) => r.image_url);
  const activeWithUrl = withUrl.filter((r) => !r.archived);
  console.log('BEFORE', {
    total: exercises.length,
    withUrl: withUrl.length,
    activeWithUrl: activeWithUrl.length,
    photoStyle: exercises.filter((r) => r.image_style === 'photo').length,
  });

  // Spot-check targets the user called out
  for (const slug of [
    'triceps-pushdown-cable-straight-bar',
    'leg-press',
    'hack-squat-barbell',
    'bench-press-barbell',
  ]) {
    const row = exercises.find((r) => r.slug === slug);
    console.log('SPOT', slug, {
      image_url: row?.image_url ? 'SET' : null,
      image_style: row?.image_style,
    });
  }

  let clearedDb = 0;
  if (!dryRun) {
    // Clear ALL image URLs — Strong "PDF crops" are people demos.
    const { error: clearErr, count } = await supabase
      .from('exercises')
      .update({ image_url: null, image_style: 'name-only' }, { count: 'exact' })
      .not('id', 'is', null);
    if (clearErr) throw new Error(`clear image_url: ${clearErr.message}`);
    clearedDb = count ?? exercises.length;
  } else {
    clearedDb = withUrl.length;
  }

  let storageListed = 0;
  let storageDeleted = 0;
  const storageNames = await listAllStorageObjects(supabase);
  storageListed = storageNames.length;
  console.log(`Storage objects listed: ${storageListed}`);

  if (!dryRun && storageNames.length > 0) {
    const chunkSize = 50;
    for (let i = 0; i < storageNames.length; i += chunkSize) {
      const chunk = storageNames.slice(i, i + chunkSize);
      const { error: delErr } = await supabase.storage.from(STORAGE_BUCKET).remove(chunk);
      if (delErr) {
        console.warn(`storage delete chunk failed: ${delErr.message}`);
      } else {
        storageDeleted += chunk.length;
      }
    }
  } else if (dryRun) {
    storageDeleted = storageNames.length;
  }

  // Verify
  const { data: afterRows, error: afterErr } = await supabase
    .from('exercises')
    .select('slug,image_url,image_style,archived');
  if (afterErr) throw new Error(`after fetch: ${afterErr.message}`);
  const after = afterRows ?? [];
  const afterWithUrl = after.filter((r) => r.image_url);
  const afterActiveWithUrl = afterWithUrl.filter((r) => !r.archived);
  const afterStorage = dryRun ? storageNames.length : (await listAllStorageObjects(supabase)).length;

  const spotAfter: Record<string, unknown> = {};
  for (const slug of [
    'triceps-pushdown-cable-straight-bar',
    'leg-press',
    'hack-squat-barbell',
    'bench-press-barbell',
  ]) {
    const row = after.find((r) => r.slug === slug);
    spotAfter[slug] = { image_url: row?.image_url, image_style: row?.image_style };
  }

  const report = {
    dryRun,
    clearedDb,
    storageListed,
    storageDeleted,
    after: {
      withAnyUrl: afterWithUrl.length,
      activeWithUrl: afterActiveWithUrl.length,
      nameOnly: after.filter((r) => r.image_style === 'name-only').length,
      storageObjectsRemaining: afterStorage,
      peoplePhotosRemaining: afterActiveWithUrl.length, // must be 0
    },
    spotAfter,
    note:
      'Did NOT reseed public/exercise-icons — those Strong crops are anatomical people demos, not silhouettes.',
  };

  console.log('---');
  console.log(JSON.stringify(report, null, 2));

  if (!dryRun && (afterActiveWithUrl.length > 0 || afterStorage > 0)) {
    console.error('FAILED: people photos or storage objects still remain');
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
