/**
 * Apply IMG_3417 Strong library hollow-model / mannequin diagram crops to Supabase.
 *
 * These crops are diagram-style figures (not real-person photos). A prior purge treated them
 * as people demos; they are restored as intended PDF exercise art.
 *
 * Flag name is historical — still required to acknowledge the restore:
 *   pnpm apply:pdf-icons -- --force-people-demos
 *   pnpm apply:pdf-icons -- --dry-run --force-people-demos
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { loadEnvLocal } from './load-env-local';

loadEnvLocal();

const STORAGE_BUCKET = 'exercise-images';

type IconPair = {
  slug: string;
  crop: string;
  matchRatio: number;
  ocrText: string;
  name: string;
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

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const forcePeopleDemos = process.argv.includes('--force-people-demos');
  if (!forcePeopleDemos) {
    console.error(
      [
        'Refusing without --force-people-demos (historical flag name).',
        'IMG_3417 crops are hollow/mannequin diagram figures restored as PDF exercise art.',
        'Pass --force-people-demos to acknowledge the bulk Storage + DB update.',
      ].join('\n'),
    );
    process.exit(1);
  }

  const url = requireEnv('VITE_SUPABASE_URL');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? requireEnv('VITE_SUPABASE_ANON_KEY');
  const supabase = createClient(url, key);

  /** Letter-tile placeholders — never upload or attach as exercise images. */
  const LETTER_TILE_SLUGS = new Set([
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

  const pairsPath = path.join(rootDir(), 'scripts', 'data', 'pdf-icon-pairs.json');
  const payload = JSON.parse(readFileSync(pairsPath, 'utf8')) as { pairs: IconPair[] };
  const pairs = (payload.pairs ?? []).filter((p) => !LETTER_TILE_SLUGS.has(p.slug));
  console.log(
    `Applying ${pairs.length} IMG_3417.pdf icon pairs (skipped ${LETTER_TILE_SLUGS.size} letter tiles)${dryRun ? ' (dry-run)' : ''}.`,
  );

  let uploaded = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const pair of pairs) {
    try {
      const iconPath = resolveIconFile(pair);
      if (!iconPath) {
        throw new Error(`missing crop file for ${pair.slug}`);
      }

      if (dryRun) {
        console.log(`[dry-run] ${pair.name} <- ${iconPath}`);
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
          image_style: 'silhouette',
          source: 'pdf-import',
        })
        .eq('slug', pair.slug);
      if (updateError) throw new Error(`update: ${updateError.message}`);
      updated++;
      console.log(`${pair.name} <- ${storagePath}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${pair.slug}: ${message}`);
      console.error(`Failed ${pair.slug}: ${message}`);
    }
  }

  console.log('---');
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Updated rows: ${updated}`);
  console.log(`Errors: ${errors.length}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
