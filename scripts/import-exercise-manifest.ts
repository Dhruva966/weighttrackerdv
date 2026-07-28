import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import Fuse from 'fuse.js';
import { loadEnvLocal } from './load-env-local';

loadEnvLocal();

// Verified live 2026-07-27 (GitHub API: default branch `main`, `dist/exercises.json` and
// `exercises/<id>/0.jpg` both resolve) — see backfill-images.ts for the same constants.
const FREE_EXERCISE_DB_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const FREE_EXERCISE_DB_IMAGE_BASE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';
const STORAGE_BUCKET = 'exercise-images';
const MIN_SCORE = 0.35;
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

type FreeExercise = {
  id?: string;
  name: string;
  images?: string[];
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  equipment?: string;
  instructions?: string[];
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

/** Strip a trailing "(Equipment)" / "- Variant (Equipment)" tag so fuzzy matching against
 * Free Exercise DB names (usually "Equipment Base Name", no parens) has a fair shot too. */
function bareName(name: string): string {
  return name
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+-\s+[A-Za-z' ]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function imageUrlFor(match: FreeExercise): string | null {
  const imagePath = match.images?.[0];
  if (!imagePath) return null;

  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  return `${FREE_EXERCISE_DB_IMAGE_BASE}/${imagePath.replace(/^\/+/, '')}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

async function fetchImage(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image ${url}: ${response.status} ${response.statusText}`);
  }

  return await response.blob();
}

async function readManifest(): Promise<ManifestEntry[]> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const manifestPath = path.join(scriptDir, 'data', 'pdf-exercise-manifest.json');
  const raw = readFileSync(manifestPath, 'utf8');
  return JSON.parse(raw) as ManifestEntry[];
}

// Free Exercise DB's own `equipment` vocabulary, mapped down to this repo's coarser
// EquipmentKind so a fuzzy name hit can be rejected when it's clearly the wrong
// implement (e.g. a name-only "Squat" search matching "Barbell Squat" when the PDF
// row is actually the *bodyweight* squat variant).
const FREE_EXERCISE_DB_EQUIPMENT_TO_KIND: Record<string, string> = {
  barbell: 'barbell',
  dumbbell: 'dumbbell',
  cable: 'cable',
  machine: 'machine',
  kettlebells: 'kettlebell',
  bands: 'band',
  'body only': 'bodyweight',
  'e-z curl bar': 'barbell',
  other: 'other',
  'medicine ball': 'other',
  'exercise ball': 'other',
  'foam roll': 'other',
};

type EquipmentCompatibility = 'compatible' | 'incompatible' | 'unknown';

// Below this score, a name hit is trusted even when equipment can't be confirmed on
// either side (both this repo's manifest or Free Exercise DB allow an 'other'/null
// equipment bucket that isn't informative). Above it, an unconfirmed pairing is too
// likely to be a coincidental single-word match (e.g. "Reverse Plank" fuzzy-hitting
// "Reverse Plate Curls", or "Skiing" hitting "Hamstring-SMR") to trust blindly.
const STRICT_SCORE_FOR_UNKNOWN_EQUIPMENT = 0.15;

function equipmentCompatibility(mine: string, theirsRaw: string | undefined): EquipmentCompatibility {
  if (!theirsRaw) return 'unknown';
  const theirs = FREE_EXERCISE_DB_EQUIPMENT_TO_KIND[theirsRaw.toLowerCase()] ?? 'other';
  if (mine === 'other' || theirs === 'other') return 'unknown';
  return mine === theirs ? 'compatible' : 'incompatible';
}

/** Best fuzzy hit for an entry. Tries both the full transcribed name and the
 * equipment-parenthetical-stripped name, scans each candidate's top few results
 * (not just rank 1), and only accepts a hit whose equipment doesn't contradict
 * this entry's own equipment mapping — otherwise a bare "Squat" search can match
 * "Barbell Squat" even when the PDF row is the bodyweight variant. */
function bestMatch(
  fuse: Fuse<FreeExercise>,
  entry: ManifestEntry,
): { item: FreeExercise; score: number } | null {
  const candidates = [entry.name];
  const stripped = bareName(entry.name);
  if (stripped && stripped.toLowerCase() !== entry.name.toLowerCase()) {
    candidates.push(stripped);
  }

  let best: { item: FreeExercise; score: number } | null = null;
  for (const candidate of candidates) {
    const hits = fuse.search(candidate, { limit: 5 });
    for (const hit of hits) {
      if (hit.score === undefined || hit.score > MIN_SCORE) continue;

      const compatibility = equipmentCompatibility(entry.equipment, hit.item.equipment);
      if (compatibility === 'incompatible') continue;
      if (compatibility === 'unknown' && hit.score > STRICT_SCORE_FOR_UNKNOWN_EQUIPMENT) continue;

      if (!best || hit.score < best.score) {
        best = { item: hit.item, score: hit.score };
      }
    }
  }

  return best;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const url = requireEnv('VITE_SUPABASE_URL');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? requireEnv('VITE_SUPABASE_ANON_KEY');
  const supabase = createClient(url, key);

  const manifest = await readManifest();
  console.log(`Loaded ${manifest.length} manifest entries from scripts/data/pdf-exercise-manifest.json.`);

  const freeExercises = await fetchJson<FreeExercise[]>(FREE_EXERCISE_DB_URL);
  console.log(`Fetched ${freeExercises.length} Free Exercise DB entries.`);

  const fuse = new Fuse(freeExercises, {
    keys: ['name'],
    includeScore: true,
    threshold: MIN_SCORE,
    ignoreLocation: true,
  });

  let upsertedCount = 0;
  let matchedCount = 0;
  let nameOnlyCount = 0;
  const unmatchedNames: string[] = [];
  const errors: string[] = [];

  for (const entry of manifest) {
    try {
      const match = bestMatch(fuse, entry);
      const imageUrl = match ? imageUrlFor(match.item) : null;

      let dbImageUrl: string | null = null;
      let imageStyle: 'photo' | 'name-only' = 'name-only';

      if (match && imageUrl) {
        if (dryRun) {
          console.log(
            `[dry-run] ${entry.name} -> "${match.item.name}" (score ${match.score.toFixed(3)})`,
          );
        } else {
          const blob = await fetchImage(imageUrl);
          const storagePath = `${entry.slug}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(storagePath, blob, {
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
          console.log(
            `${entry.name} -> "${match.item.name}" (score ${match.score.toFixed(3)}), uploaded ${storagePath}`,
          );
        }
        matchedCount++;
      } else {
        nameOnlyCount++;
        unmatchedNames.push(entry.name);
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
  console.log(`${dryRun ? '[dry-run] would upsert' : 'Upserted'}: ${dryRun ? manifest.length - errors.length : upsertedCount}`);
  console.log(`Matched to Free Exercise DB (photo): ${matchedCount}`);
  console.log(`Name-only (no confident match): ${nameOnlyCount}`);
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
