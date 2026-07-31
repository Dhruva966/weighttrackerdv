/**
 * Purge ALL non-PDF stock/human/FEDB exercise images from Supabase, then
 * reseed verified IMG_3417.pdf icon crops (skipping letter-tile placeholders).
 *
 *   pnpm exec tsx scripts/purge-stock-reseed-pdf-icons.ts
 *   pnpm exec tsx scripts/purge-stock-reseed-pdf-icons.ts --dry-run
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadEnvLocal } from './load-env-local';

loadEnvLocal();

const STORAGE_BUCKET = 'exercise-images';

/** Letter-tile placeholders previously stripped — never restore these. */
const LETTER_TILE_SLUGS = new Set<string>([
  'aerobics',
  'climbing',
  'cycling',
  'floor-press-barbell',
  'glute-ham-raise',
  'glute-kickback-machine',
  'hiking',
  'jump-shrug-barbell',
  'kipping-pull-up',
  'press-under-barbell',
  'pullover-machine',
  'seated-calf-raise-machine',
  'skating',
  'skiing',
  'snowboarding',
  'strict-military-press-barbell',
  'swimming',
  'thruster-barbell',
  'torso-rotation-machine',
  'tricep-extension-machine-w-pad',
  'walking',
  'yoga',
]);

type IconPair = {
  slug: string;
  crop: string;
  matchRatio: number;
  ocrText: string;
  name: string;
};

type ExerciseRow = {
  id: string;
  slug: string;
  name: string;
  image_url: string | null;
  image_style: string | null;
  source: string | null;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function rootDir(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function resolveIconFile(pair: IconPair): string | null {
  const root = rootDir();
  const candidates = [
    path.join(root, 'public', 'exercise-icons', `${pair.slug}.jpg`),
    path.join(root, pair.crop),
    path.join(root, 'tmp', 'pdfs', 'aloo-exercises', 'cropped-icons', `${pair.slug}.jpg`),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function storageObjectName(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  try {
    const u = new URL(imageUrl);
    const marker = `/object/public/${STORAGE_BUCKET}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx >= 0) return decodeURIComponent(u.pathname.slice(idx + marker.length));
    // Also handle signed or alternate paths
    const alt = `/object/sign/${STORAGE_BUCKET}/`;
    const idx2 = u.pathname.indexOf(alt);
    if (idx2 >= 0) {
      const rest = u.pathname.slice(idx2 + alt.length);
      return decodeURIComponent(rest.split('?')[0] ?? rest);
    }
  } catch {
    /* ignore */
  }
  return null;
}

function isPdfCropCandidate(slug: string, verifiedPdfSlugs: Set<string>): boolean {
  return verifiedPdfSlugs.has(slug) && !LETTER_TILE_SLUGS.has(slug);
}

async function listAllStorageObjects(supabase: SupabaseClient): Promise<string[]> {
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

  const pairsPath = path.join(rootDir(), 'scripts', 'data', 'pdf-icon-pairs.json');
  const payload = JSON.parse(readFileSync(pairsPath, 'utf8')) as { pairs: IconPair[] };
  const allPairs = payload.pairs ?? [];
  const restorePairs = allPairs.filter((p) => !LETTER_TILE_SLUGS.has(p.slug));
  const verifiedPdfSlugs = new Set(restorePairs.map((p) => p.slug));

  console.log(`Verified PDF crops to restore: ${restorePairs.length}`);
  console.log(`Letter-tile slugs to keep name-only: ${LETTER_TILE_SLUGS.size}`);
  console.log(dryRun ? 'DRY RUN — no writes' : 'LIVE — writing to Supabase');

  const { data: rows, error } = await supabase
    .from('exercises')
    .select('id,slug,name,image_url,image_style,source');
  if (error) throw new Error(`fetch exercises: ${error.message}`);
  const exercises = (rows ?? []) as ExerciseRow[];

  const before = {
    total: exercises.length,
    withUrl: exercises.filter((r) => r.image_url).length,
    nameOnly: exercises.filter((r) => !r.image_url || r.image_style === 'name-only').length,
    bySource: {} as Record<string, number>,
    byStyle: {} as Record<string, number>,
  };
  for (const r of exercises) {
    before.bySource[r.source ?? 'null'] = (before.bySource[r.source ?? 'null'] ?? 0) + 1;
    before.byStyle[r.image_style ?? 'null'] = (before.byStyle[r.image_style ?? 'null'] ?? 0) + 1;
  }
  console.log('BEFORE', JSON.stringify(before, null, 2));

  // --- Phase 1: purge non-PDF images from DB ---
  const toPurge = exercises.filter((r) => {
    if (!r.image_url) return r.image_style !== 'name-only'; // normalize style if needed
    return !isPdfCropCandidate(r.slug, verifiedPdfSlugs);
  });

  // Also force letter tiles + anything without verified crop to name-only
  const purgeIds = toPurge.map((r) => r.id);
  let purgedDb = 0;
  let skippedLetterAlreadyClean = 0;

  for (const r of exercises) {
    if (LETTER_TILE_SLUGS.has(r.slug) && !r.image_url && r.image_style === 'name-only') {
      skippedLetterAlreadyClean++;
    }
  }

  console.log(`Rows to purge/clear to name-only: ${toPurge.length}`);

  if (!dryRun && purgeIds.length > 0) {
    // Batch updates — supabase .in has limits; chunk
    const chunkSize = 50;
    for (let i = 0; i < purgeIds.length; i += chunkSize) {
      const chunk = purgeIds.slice(i, i + chunkSize);
      const { error: updErr, count } = await supabase
        .from('exercises')
        .update({ image_url: null, image_style: 'name-only' }, { count: 'exact' })
        .in('id', chunk);
      if (updErr) throw new Error(`purge update: ${updErr.message}`);
      purgedDb += count ?? chunk.length;
    }
  } else if (dryRun) {
    purgedDb = toPurge.length;
  }

  // --- Phase 2: delete stock/human storage objects (keep only verified PDF crop files) ---
  let storageListed = 0;
  let storageDeleted = 0;
  let storageKept = 0;
  const keepStorageNames = new Set(restorePairs.map((p) => `${p.slug}.jpg`));

  let storageNames: string[] = [];
  try {
    storageNames = await listAllStorageObjects(supabase);
    storageListed = storageNames.length;
  } catch (e) {
    console.warn('Storage list failed (will still try delete by URL):', e);
  }

  const toDeleteFromList = storageNames.filter((name) => !keepStorageNames.has(name));
  // Also collect objects referenced by purged rows that aren't keepers
  const referencedStock = new Set<string>();
  for (const r of toPurge) {
    const obj = storageObjectName(r.image_url);
    if (obj && !keepStorageNames.has(obj)) referencedStock.add(obj);
  }
  const deleteSet = new Set([...toDeleteFromList, ...referencedStock]);

  console.log(`Storage objects listed: ${storageListed}`);
  console.log(`Storage objects to delete: ${deleteSet.size}`);
  storageKept = keepStorageNames.size;

  if (!dryRun && deleteSet.size > 0) {
    const delArr = [...deleteSet];
    const chunkSize = 50;
    for (let i = 0; i < delArr.length; i += chunkSize) {
      const chunk = delArr.slice(i, i + chunkSize);
      const { error: delErr } = await supabase.storage.from(STORAGE_BUCKET).remove(chunk);
      if (delErr) {
        console.warn(`storage delete chunk failed: ${delErr.message}`);
      } else {
        storageDeleted += chunk.length;
      }
    }
  } else if (dryRun) {
    storageDeleted = deleteSet.size;
  }

  // --- Phase 3: reseed PDF crops ---
  let uploaded = 0;
  let updated = 0;
  let missingFile = 0;
  let missingExercise = 0;
  const errors: string[] = [];

  // Refresh exercise slug set
  const slugToId = new Map(exercises.map((r) => [r.slug, r.id]));

  for (const pair of restorePairs) {
    try {
      if (!slugToId.has(pair.slug)) {
        missingExercise++;
        continue;
      }
      const iconPath = resolveIconFile(pair);
      if (!iconPath) {
        missingFile++;
        errors.push(`${pair.slug}: missing crop file`);
        continue;
      }

      if (dryRun) {
        uploaded++;
        updated++;
        continue;
      }

      const bytes = readFileSync(iconPath);
      const storagePath = `${pair.slug}.jpg`;
      const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, bytes, {
        cacheControl: '31536000',
        contentType: 'image/jpeg',
        upsert: true,
      });
      if (uploadError) throw new Error(`upload: ${uploadError.message}`);
      uploaded++;

      const { data: publicUrlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
      const { error: updateError } = await supabase
        .from('exercises')
        .update({
          image_url: publicUrlData.publicUrl,
          image_style: 'photo',
          source: 'pdf-import',
        })
        .eq('slug', pair.slug);
      if (updateError) throw new Error(`update: ${updateError.message}`);
      updated++;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${pair.slug}: ${message}`);
      console.error(`Failed ${pair.slug}: ${message}`);
    }
  }

  // Ensure letter tiles stay name-only (belt and suspenders)
  if (!dryRun) {
    const letterArr = [...LETTER_TILE_SLUGS];
    const { error: letterErr } = await supabase
      .from('exercises')
      .update({ image_url: null, image_style: 'name-only' })
      .in('slug', letterArr);
    if (letterErr) console.warn(`letter-tile enforce failed: ${letterErr.message}`);
  }

  // --- AFTER stats ---
  const { data: afterRows, error: afterErr } = await supabase
    .from('exercises')
    .select('slug,image_url,image_style,source');
  if (afterErr) throw new Error(`after fetch: ${afterErr.message}`);
  const after = afterRows ?? [];
  const afterWithPdf = after.filter(
    (r) => r.image_url && verifiedPdfSlugs.has(r.slug) && !LETTER_TILE_SLUGS.has(r.slug),
  );
  const afterWithAnyUrl = after.filter((r) => r.image_url);
  const afterLetterClean = after.filter(
    (r) => LETTER_TILE_SLUGS.has(r.slug) && !r.image_url && r.image_style === 'name-only',
  );
  const afterStockRemaining = afterWithAnyUrl.filter((r) => !verifiedPdfSlugs.has(r.slug));

  console.log('---');
  console.log(
    JSON.stringify(
      {
        purgedDb,
        skippedLetterAlreadyClean,
        letterTilesEnforced: LETTER_TILE_SLUGS.size,
        storageDeleted,
        storageKeptTarget: storageKept,
        pdfUploaded: uploaded,
        pdfUpdated: updated,
        pdfMissingFile: missingFile,
        pdfMissingExercise: missingExercise,
        pdfErrors: errors.length,
        after: {
          withAnyUrl: afterWithAnyUrl.length,
          withVerifiedPdf: afterWithPdf.length,
          letterTilesNameOnly: afterLetterClean.length,
          stockRemaining: afterStockRemaining.length,
          stockRemainingSample: afterStockRemaining.slice(0, 10).map((r) => r.slug),
        },
        errors: errors.slice(0, 20),
      },
      null,
      2,
    ),
  );

  if (afterStockRemaining.length > 0 && !dryRun) {
    console.error('WARNING: stock images still remain after purge');
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
