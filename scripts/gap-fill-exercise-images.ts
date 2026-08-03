/**
 * Gap-fill exercise images for canonical slugs whose crop lives under a sibling/merged-from slug.
 *
 * 1. Copies the source Storage/local crop to `exercise-images/<canonical>.jpg`
 * 2. Sets live `exercises.image_url` / `image_style` / `source`
 * 3. Hard-deletes leftover junk/test rows (0 sets preferred)
 *
 *   pnpm exec tsx scripts/gap-fill-exercise-images.ts
 *   pnpm exec tsx scripts/gap-fill-exercise-images.ts --dry-run
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { loadEnvLocal } from './load-env-local';

loadEnvLocal();

const STORAGE_BUCKET = 'exercise-images';

/** Canonical live slug → existing crop slug (must be a real hollow-model crop, not a letter tile). */
const GAP_ALIASES: ReadonlyArray<{ slug: string; cropSlug: string }> = [
  { slug: 'close-grip-pulldown', cropSlug: 'lat-pulldown-underhand-cable' },
  { slug: 'squat-curved-stand', cropSlug: 'squat-machine' },
  { slug: 'seated-calf-raise-machine', cropSlug: 'seated-calf-raise-plate-loaded' },
  { slug: 'shoulder-press-dumbell', cropSlug: 'overhead-press-dumbbell' },
  { slug: 'lateral-raise-machine', cropSlug: 'lateral-raise-dumbbell' },
  { slug: 'slanted-lat-raise-dumbbell-seated', cropSlug: 'lateral-raise-dumbbell' },
  { slug: 'reverse-bar-cable-curl', cropSlug: 'reverse-curl-barbell' },
  { slug: 'reverse-forearm-curl', cropSlug: 'reverse-curl-dumbbell' },
  { slug: 'glute-ham-raise', cropSlug: 'back-extension' },
  { slug: 'glute-kickback-machine', cropSlug: 'cable-kickback' },
  { slug: 'press-under-barbell', cropSlug: 'push-press' },
  { slug: 'torso-rotation-machine', cropSlug: 'cable-twist' },
  { slug: 'walking', cropSlug: 'running' },
  { slug: 'hiking', cropSlug: 'running' },
  { slug: 'yoga', cropSlug: 'stretching' },
];

/** Test / junk rows that should not appear in the live library. */
const JUNK_SLUGS = ['mis-tagged-row', 'photo-keep', 'zorp-mis-tagged-lift', 'zorp-picker-create', 'zorp-library-create'] as const;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function rootDir(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function resolveLocalCrop(cropSlug: string): string | null {
  const root = rootDir();
  const candidates = [
    path.join(root, 'public', 'exercise-icons', `${cropSlug}.jpg`),
    path.join(root, 'tmp', 'pdfs', 'aloo-exercises', 'cropped-icons', `${cropSlug}.jpg`),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const url = requireEnv('VITE_SUPABASE_URL');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? requireEnv('VITE_SUPABASE_ANON_KEY');
  const supabase = createClient(url, key);

  let uploaded = 0;
  let updated = 0;
  let deleted = 0;
  const errors: string[] = [];

  for (const { slug, cropSlug } of GAP_ALIASES) {
    try {
      const localPath = resolveLocalCrop(cropSlug);
      let bytes: Buffer | null = localPath ? readFileSync(localPath) : null;

      if (!bytes) {
        const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(`${cropSlug}.jpg`);
        if (error || !data) throw new Error(`missing crop for ${cropSlug}: ${error?.message ?? 'no data'}`);
        bytes = Buffer.from(await data.arrayBuffer());
      }

      const storagePath = `${slug}.jpg`;
      if (dryRun) {
        console.log(`[dry-run] ${slug} <- ${cropSlug} (${bytes.length} bytes)`);
        uploaded++;
        updated++;
        continue;
      }

      const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, bytes, {
        cacheControl: '31536000',
        contentType: 'image/jpeg',
        upsert: true,
      });
      if (uploadError) throw new Error(`upload: ${uploadError.message}`);
      uploaded++;

      const { data: publicUrlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
      const { error: updateError, count } = await supabase
        .from('exercises')
        .update(
          {
            image_url: publicUrlData.publicUrl,
            image_style: 'silhouette',
            source: 'pdf-import',
          },
          { count: 'exact' },
        )
        .eq('slug', slug)
        .eq('archived', false);
      if (updateError) throw new Error(`update: ${updateError.message}`);
      if ((count ?? 0) > 0) updated++;
      console.log(`${slug} <- ${cropSlug} (${count ?? 0} row)`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${slug}: ${message}`);
      console.error(`Failed ${slug}: ${message}`);
    }
  }

  for (const slug of JUNK_SLUGS) {
    try {
      const { data: row, error: fetchError } = await supabase
        .from('exercises')
        .select('id,slug')
        .eq('slug', slug)
        .maybeSingle();
      if (fetchError) throw new Error(fetchError.message);
      if (!row) {
        console.log(`junk ${slug}: already absent`);
        continue;
      }

      const { count: setCount } = await supabase
        .from('sets')
        .select('*', { count: 'exact', head: true })
        .eq('exercise_id', row.id);
      const { count: teCount } = await supabase
        .from('template_exercises')
        .select('*', { count: 'exact', head: true })
        .eq('exercise_id', row.id);

      if ((setCount ?? 0) > 0 || (teCount ?? 0) > 0) {
        console.log(`junk ${slug}: skip delete (sets=${setCount} templates=${teCount}) — archive instead`);
        if (!dryRun) {
          await supabase.from('exercises').update({ archived: true }).eq('id', row.id);
        }
        continue;
      }

      if (dryRun) {
        console.log(`[dry-run] hard-delete ${slug}`);
        deleted++;
        continue;
      }

      const { error: delError } = await supabase.from('exercises').delete().eq('id', row.id);
      if (delError) throw new Error(delError.message);
      deleted++;
      console.log(`hard-deleted ${slug}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`junk ${slug}: ${message}`);
      console.error(`Failed junk ${slug}: ${message}`);
    }
  }

  console.log('---');
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Updated rows: ${updated}`);
  console.log(`Deleted junk: ${deleted}`);
  console.log(`Errors: ${errors.length}`);
  if (errors.length) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
