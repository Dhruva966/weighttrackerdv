import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { loadEnvLocal } from './load-env-local';

loadEnvLocal();

/**
 * Import PDF exercise manifest into Supabase.
 *
 * Images: verified OCR-cropped icons from IMG_3417.pdf only (see pdf-icon-pairs.json).
 * Free Exercise DB stock photos are intentionally NOT used — the earlier product decision
 * skipped Strong screenshot artwork; the user now wants those PDF icons instead of FEDB.
 */
const STORAGE_BUCKET = 'exercise-images';
const SOURCE_TAG = 'pdf-import';

type ManifestEntry = {
  name: string;
  slug: string;
  muscleGroup: string;
  equipment: string;
  secondaryMuscles: string[];
  setupNotes: string[];
  aliases: string[];
  visibleWeightLb: number | null;
  visibleReps: number | null;
  sourcePage: number;
  needsReview: boolean;
  needsReviewReason?: string;
};

type IconPair = {
  slug: string;
  crop: string;
  matchRatio: number;
  ocrText: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

function scriptDir(): string {
  return path.dirname(fileURLToPath(import.meta.url));
}

function repoRoot(): string {
  return path.resolve(scriptDir(), '..');
}

async function readManifest(): Promise<ManifestEntry[]> {
  const manifestPath = path.join(scriptDir(), 'data', 'pdf-exercise-manifest.json');
  const raw = readFileSync(manifestPath, 'utf8');
  return JSON.parse(raw) as ManifestEntry[];
}

function readIconPairs(): Map<string, IconPair> {
  const pairsPath = path.join(scriptDir(), 'data', 'pdf-icon-pairs.json');
  if (!existsSync(pairsPath)) {
    return new Map();
  }
  const raw = JSON.parse(readFileSync(pairsPath, 'utf8')) as { pairs?: IconPair[] };
  return new Map((raw.pairs ?? []).map((pair) => [pair.slug, pair]));
}

function resolveIconFile(pair: IconPair): string | null {
  const root = repoRoot();
  const candidates = [
    path.join(root, 'public', 'exercise-icons', `${pair.slug}.jpg`),
    path.join(root, pair.crop),
    path.join(root, 'tmp', 'pdfs', 'aloo-exercises', 'cropped-icons', `${pair.slug}.jpg`),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const url = requireEnv('VITE_SUPABASE_URL');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? requireEnv('VITE_SUPABASE_ANON_KEY');
  const supabase = createClient(url, key);

  const manifest = await readManifest();
  const iconPairs = readIconPairs();
  console.log(`Loaded ${manifest.length} manifest entries from scripts/data/pdf-exercise-manifest.json.`);
  console.log(`Loaded ${iconPairs.size} verified IMG_3417.pdf icon pairs (FEDB stock is not used).`);

  let upsertedCount = 0;
  let pdfIconCount = 0;
  let nameOnlyCount = 0;
  const unmatchedNames: string[] = [];
  const errors: string[] = [];

  for (const entry of manifest) {
    try {
      const pair = iconPairs.get(entry.slug);
      const iconPath = pair ? resolveIconFile(pair) : null;

      let dbImageUrl: string | null = null;
      let imageStyle: 'photo' | 'name-only' = 'name-only';

      if (pair && iconPath) {
        if (dryRun) {
          console.log(
            `[dry-run] ${entry.name} -> IMG_3417 crop (${pair.ocrText}, ratio ${pair.matchRatio})`,
          );
        } else {
          const bytes = readFileSync(iconPath);
          const storagePath = `${entry.slug}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, bytes, {
              cacheControl: '31536000',
              contentType: 'image/jpeg',
              upsert: true,
            });

          if (uploadError) {
            throw new Error(`upload "${storagePath}": ${uploadError.message}`);
          }

          const { data: publicUrlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
          dbImageUrl = publicUrlData.publicUrl;
          imageStyle = 'photo';
          console.log(`${entry.name} -> IMG_3417 crop, uploaded ${storagePath}`);
        }
        pdfIconCount++;
      } else {
        nameOnlyCount++;
        unmatchedNames.push(entry.name);
        if (dryRun) {
          console.log(`[dry-run] ${entry.name} -> name-only (no verified PDF icon)`);
        }
      }

      if (dryRun) {
        continue;
      }

      const payload = {
        slug: entry.slug,
        name: entry.name,
        muscle_group: entry.muscleGroup,
        secondary_muscles: entry.secondaryMuscles,
        equipment: entry.equipment,
        instructions: [],
        setup_notes: entry.setupNotes,
        image_url: dbImageUrl,
        image_style: imageStyle,
        source: SOURCE_TAG,
        archived: false,
      };

      const { error: upsertError } = await supabase
        .from('exercises')
        .upsert(payload, { onConflict: 'slug' });

      if (upsertError) {
        throw new Error(`upsert: ${upsertError.message}`);
      }

      upsertedCount++;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${entry.name}: ${message}`);
      console.error(`Failed "${entry.name}": ${message}`);
    }
  }

  console.log('---');
  console.log(`${dryRun ? '[dry-run] ' : ''}Manifest entries processed: ${manifest.length}`);
  console.log(
    `${dryRun ? '[dry-run] would upsert' : 'Upserted'}: ${dryRun ? manifest.length - errors.length : upsertedCount}`,
  );
  console.log(`IMG_3417.pdf icons: ${pdfIconCount}`);
  console.log(`Name-only (no verified PDF icon): ${nameOnlyCount}`);
  console.log(`Errors: ${errors.length}`);

  if (unmatchedNames.length > 0) {
    console.log('Unmatched exercises (image_style=name-only):');
    for (const name of unmatchedNames) {
      console.log(`- ${name}`);
    }
  }

  if (errors.length > 0) {
    console.log('Errors:');
    for (const e of errors) {
      console.log(`- ${e}`);
    }
  }

  if (dryRun) {
    console.log('Dry run only. Re-run without --dry-run after confirming results above.');
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
