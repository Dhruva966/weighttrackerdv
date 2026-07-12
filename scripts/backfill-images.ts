import { createClient } from "@supabase/supabase-js";
import Fuse from "fuse.js";

const FREE_EXERCISE_DB_URL =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const FREE_EXERCISE_DB_IMAGE_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";
const STORAGE_BUCKET = "exercise-images";
const MIN_SCORE = 0.35;

type ExerciseRow = {
  id: string;
  slug: string;
  name: string;
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

function imageContentType(path: string): string {
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function imageUrlFor(match: FreeExercise): string | null {
  const imagePath = match.images?.[0];
  if (!imagePath) return null;

  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return imagePath;
  }

  return `${FREE_EXERCISE_DB_IMAGE_BASE}/${imagePath.replace(/^\/+/, "")}`;
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

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const supabase = createClient(requireEnv("VITE_SUPABASE_URL"), requireEnv("VITE_SUPABASE_ANON_KEY"));

  const freeExercises = await fetchJson<FreeExercise[]>(FREE_EXERCISE_DB_URL);
  const fuse = new Fuse(freeExercises, {
    keys: ["name"],
    includeScore: true,
    threshold: MIN_SCORE,
    ignoreLocation: true,
  });

  const { data: appExercises, error } = await supabase
    .from("exercises")
    .select("id, slug, name")
    .eq("image_style", "name-only")
    .is("image_url", null);

  if (error) throw new Error(`Failed to fetch app exercises: ${error.message}`);

  const unmatched: string[] = [];
  const matched: Array<{ app: string; freeDb: string; score: number | null; imageUrl: string }> = [];

  for (const appExercise of (appExercises ?? []) as ExerciseRow[]) {
    const result = fuse.search(appExercise.name)[0];
    const score = result?.score ?? null;
    const imageUrl = result ? imageUrlFor(result.item) : null;

    if (!result || score === null || score > MIN_SCORE || !imageUrl) {
      unmatched.push(appExercise.name);
      continue;
    }

    matched.push({
      app: appExercise.name,
      freeDb: result.item.name,
      score,
      imageUrl,
    });

    console.log(
      `${dryRun ? "[dry-run] " : ""}${appExercise.name} -> ${result.item.name} ` +
        `(score ${score.toFixed(3)})`,
    );

    if (dryRun) continue;

    const blob = await fetchImage(imageUrl);
    const extension = imageUrl.split(".").pop()?.split("?")[0] ?? "jpg";
    const storagePath = `${appExercise.slug}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, blob, {
        cacheControl: "31536000",
        contentType: imageContentType(imageUrl),
        upsert: true,
      });

    if (uploadError) {
      throw new Error(
        `Failed to upload "${appExercise.name}" to ${STORAGE_BUCKET}/${storagePath}: ${uploadError.message}`,
      );
    }

    const { data: publicUrlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    const { error: updateError } = await supabase
      .from("exercises")
      .update({
        image_url: publicUrlData.publicUrl,
        image_style: "photo",
        source: "free-exercise-db",
      })
      .eq("id", appExercise.id);

    if (updateError) {
      throw new Error(`Failed to update exercise "${appExercise.name}": ${updateError.message}`);
    }
  }

  console.log(`Matched ${matched.length} exercises.`);

  if (unmatched.length > 0) {
    console.log("Unmatched exercises:");
    for (const name of unmatched) {
      console.log(`- ${name}`);
    }
  }

  if (dryRun) {
    console.log(
      "Dry run only. Re-run without --dry-run after confirming Supabase Storage bucket and write policy.",
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
