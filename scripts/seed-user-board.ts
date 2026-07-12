import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const USER_ID = "de3c1f99-a64b-46c4-9f46-6afcc6d17f70";
const BASELINE_SESSION_NOTES = "Imported from prior board";

type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "biceps"
  | "triceps"
  | "legs"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core"
  | "forearms"
  | "full-body"
  | "cardio";

type BoardExercise = {
  name: string;
  last_weight_lb?: number | null;
  last_reps?: number | null;
};

type BoardColumn = {
  name: string;
  muscle_group: MuscleGroup;
  exercises: BoardExercise[];
};

type BoardGoal = {
  name: string;
  target_value?: number | null;
  target_unit?: string | null;
};

type UserBoard = {
  columns: BoardColumn[];
  goals: BoardGoal[];
};

type ExerciseRow = {
  id: string;
  slug: string;
  name: string;
};

type SessionRow = {
  id: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function inferEquipment(name: string): string {
  const normalized = name.toLowerCase();

  if (normalized.includes("dumbbell")) return "dumbbell";
  if (normalized.includes("cable") || normalized.includes("rope")) return "cable";
  if (normalized.includes("barbell") || normalized.includes("bar ")) return "barbell";
  if (normalized.includes("machine") || normalized.includes("press") || normalized.includes("extension")) {
    return "machine";
  }
  if (normalized.includes("bodyweight") || normalized.includes("push-up") || normalized.includes("pull-up")) {
    return "bodyweight";
  }

  return "other";
}

function hasBaselineSet(exercise: BoardExercise): exercise is BoardExercise & {
  last_weight_lb: number;
  last_reps: number;
} {
  return (
    typeof exercise.last_weight_lb === "number" &&
    Number.isFinite(exercise.last_weight_lb) &&
    typeof exercise.last_reps === "number" &&
    Number.isInteger(exercise.last_reps) &&
    exercise.last_reps > 0
  );
}

async function readBoard(): Promise<UserBoard> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const boardPath = path.join(scriptDir, "data", "user-board.json");
  const raw = await readFile(boardPath, "utf8");
  return JSON.parse(raw) as UserBoard;
}

async function main(): Promise<void> {
  const supabase = createClient(requireEnv("VITE_SUPABASE_URL"), requireEnv("VITE_SUPABASE_ANON_KEY"));
  const board = await readBoard();

  const exerciseBySlug = new Map<string, ExerciseRow>();
  const baselineExercises: Array<BoardExercise & { slug: string }> = [];

  for (const column of board.columns) {
    for (const exercise of column.exercises) {
      const slug = slugify(exercise.name);
      const payload = {
        slug,
        name: exercise.name,
        muscle_group: column.muscle_group,
        equipment: inferEquipment(exercise.name),
        image_url: null,
        image_style: "name-only",
        source: "user-board",
        archived: false,
      };

      const { data, error } = await supabase
        .from("exercises")
        .upsert(payload, { onConflict: "slug" })
        .select("id, slug, name")
        .single();

      if (error) throw new Error(`Failed to upsert exercise "${exercise.name}": ${error.message}`);
      exerciseBySlug.set(slug, data as ExerciseRow);

      if (hasBaselineSet(exercise)) {
        baselineExercises.push({ ...exercise, slug });
      }
    }
  }

  for (const goal of board.goals) {
    const { data: existingGoal, error: findError } = await supabase
      .from("goals")
      .select("id")
      .eq("user_id", USER_ID)
      .eq("name", goal.name)
      .maybeSingle();

    if (findError) throw new Error(`Failed to find goal "${goal.name}": ${findError.message}`);

    const payload = {
      user_id: USER_ID,
      name: goal.name,
      target_value: goal.target_value ?? null,
      target_unit: goal.target_unit ?? null,
    };

    const result = existingGoal
      ? await supabase.from("goals").update(payload).eq("id", existingGoal.id)
      : await supabase.from("goals").insert(payload);

    if (result.error) throw new Error(`Failed to upsert goal "${goal.name}": ${result.error.message}`);
  }

  const { data: existingSession, error: sessionFindError } = await supabase
    .from("sessions")
    .select("id")
    .eq("user_id", USER_ID)
    .eq("notes", BASELINE_SESSION_NOTES)
    .maybeSingle();

  if (sessionFindError) {
    throw new Error(`Failed to find baseline session: ${sessionFindError.message}`);
  }

  let session = existingSession as SessionRow | null;

  if (!session) {
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        user_id: USER_ID,
        started_at: new Date().toISOString(),
        notes: BASELINE_SESSION_NOTES,
      })
      .select("id")
      .single();

    if (error) throw new Error(`Failed to create baseline session: ${error.message}`);
    session = data as SessionRow;
  }

  for (const [index, exercise] of baselineExercises.entries()) {
    const row = exerciseBySlug.get(exercise.slug);
    if (!row || !session) continue;

    const { data: existingSet, error: setFindError } = await supabase
      .from("sets")
      .select("id")
      .eq("session_id", session.id)
      .eq("exercise_id", row.id)
      .eq("set_number", 1)
      .maybeSingle();

    if (setFindError) {
      throw new Error(`Failed to find baseline set for "${exercise.name}": ${setFindError.message}`);
    }

    if (existingSet) continue;

    const { error } = await supabase.from("sets").insert({
      session_id: session.id,
      exercise_id: row.id,
      set_number: 1,
      weight_lb: exercise.last_weight_lb,
      reps: exercise.last_reps,
      created_at: new Date(Date.now() + index).toISOString(),
    });

    if (error) throw new Error(`Failed to insert baseline set for "${exercise.name}": ${error.message}`);
  }

  console.log(
    `Seed complete: ${exerciseBySlug.size} exercises, ${board.goals.length} goals, ${baselineExercises.length} baseline sets.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
