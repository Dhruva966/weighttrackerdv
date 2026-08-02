/**
 * Apply round-5 catalog merges + hard deletes in Supabase, then delete empty templates.
 *
 *   pnpm exec tsx scripts/apply-catalog-merges-round5.ts
 *   pnpm exec tsx scripts/apply-catalog-merges-round5.ts --dry-run
 */
import { createClient } from '@supabase/supabase-js';
import { EXERCISE_HARD_DELETES, EXERCISE_MERGES } from '../src/data/exercise-merges';
import { loadEnvLocal } from './load-env-local';

loadEnvLocal();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

type QueryClient = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

async function remapExerciseFk(
  supabase: QueryClient,
  table: 'sets' | 'template_exercises',
  fromId: string,
  toId: string,
  dryRun: boolean,
): Promise<number> {
  const { data, error } = await supabase.from(table).select('id').eq('exercise_id', fromId);
  if (error) throw new Error(`${table} select: ${error.message}`);
  const rows = (data as { id: string }[] | null) ?? [];
  if (!rows.length) return 0;
  if (dryRun) return rows.length;
  const { error: updateError } = await supabase
    .from(table)
    .update({ exercise_id: toId })
    .eq('exercise_id', fromId);
  if (updateError) throw new Error(`${table} remap: ${updateError.message}`);
  return rows.length;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const url = requireEnv('VITE_SUPABASE_URL');
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(url, key);

  console.log(dryRun ? 'DRY RUN' : 'LIVE');

  const round5From = new Set([
    'wide-pull-up',
    'straight-bar-tricep-extension-machine',
    'pendlay-row-barbell',
    'seated-leg-press-machine',
    'lat-pulldown-machine',
    'seated-overhead-press-barbell',
    'seated-overhead-press-dumbbell',
    'low-back-raise',
    'shrug-smith-machine',
  ]);
  const merges = EXERCISE_MERGES.filter((row) => round5From.has(row.from));
  const deletes = [...EXERCISE_HARD_DELETES];

  const allSlugs = [
    ...merges.flatMap((row) => [row.from, row.to]),
    ...deletes,
    // protected survivors to prove still active
    'shoulder-press-machine',
    'shoulder-press-dumbell',
    'lateral-raise-machine',
    'lateral-raise-dumbbell',
    'slanted-lat-raise-dumbbell-seated',
    'lateral-raise-cable',
    'rope-tricep-extension',
    'tricep-rope-overhead-extension',
  ];

  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id,slug,name,archived')
    .in('slug', allSlugs);
  if (error) throw new Error(`fetch: ${error.message}`);
  const bySlug = new Map((exercises ?? []).map((row) => [row.slug, row]));

  const report: Array<Record<string, unknown>> = [];

  for (const { from, to } of merges) {
    const loser = bySlug.get(from);
    const winner = bySlug.get(to);
    if (!loser) {
      report.push({ action: 'MERGE', from, to, status: 'loser-absent (ok)' });
      continue;
    }
    if (!winner) {
      report.push({ action: 'MERGE', from, to, status: 'WINNER MISSING', loserId: loser.id });
      continue;
    }

    const setsMoved = await remapExerciseFk(supabase, 'sets', loser.id, winner.id, dryRun);
    const templatesMoved = await remapExerciseFk(
      supabase,
      'template_exercises',
      loser.id,
      winner.id,
      dryRun,
    );

    if (!dryRun) {
      const { error: archiveError } = await supabase
        .from('exercises')
        .update({ archived: true })
        .eq('id', loser.id);
      if (archiveError) {
        // Try hard delete if archive fails
        const { error: deleteError } = await supabase.from('exercises').delete().eq('id', loser.id);
        if (deleteError) throw new Error(`archive/delete ${from}: ${deleteError.message}`);
        report.push({
          action: 'MERGE',
          from,
          to,
          status: 'hard-deleted loser',
          setsMoved,
          templatesMoved,
        });
        continue;
      }
    }

    report.push({
      action: 'MERGE',
      from,
      to,
      status: dryRun ? 'would-archive' : 'archived',
      setsMoved,
      templatesMoved,
      winnerId: winner.id,
      loserId: loser.id,
    });
  }

  for (const slug of deletes) {
    const row = bySlug.get(slug);
    if (!row) {
      report.push({ action: 'DELETE', slug, status: 'already-absent' });
      continue;
    }
    // Remap any leftover FKs away isn't needed — delete sets/templates first if present.
    if (!dryRun) {
      await supabase.from('sets').delete().eq('exercise_id', row.id);
      await supabase.from('template_exercises').delete().eq('exercise_id', row.id);
      const { error: deleteError } = await supabase.from('exercises').delete().eq('id', row.id);
      if (deleteError) {
        const { error: archiveError } = await supabase
          .from('exercises')
          .update({ archived: true })
          .eq('id', row.id);
        if (archiveError) throw new Error(`delete ${slug}: ${deleteError.message}`);
        report.push({ action: 'DELETE', slug, status: 'archived-fallback', id: row.id });
        continue;
      }
    }
    report.push({ action: 'DELETE', slug, status: dryRun ? 'would-hard-delete' : 'hard-deleted', id: row.id });
  }

  // Empty templates
  const { data: templates, error: templatesError } = await supabase
    .from('templates')
    .select('id,name');
  if (templatesError) throw new Error(`templates: ${templatesError.message}`);
  const { data: teRows, error: teError } = await supabase
    .from('template_exercises')
    .select('template_id');
  if (teError) throw new Error(`template_exercises: ${teError.message}`);
  const withExercises = new Set((teRows ?? []).map((row) => row.template_id));
  const emptyTemplates = (templates ?? []).filter((row) => !withExercises.has(row.id));
  for (const empty of emptyTemplates) {
    if (!dryRun) {
      const { error: delErr } = await supabase.from('templates').delete().eq('id', empty.id);
      if (delErr) throw new Error(`delete template ${empty.id}: ${delErr.message}`);
    }
    report.push({
      action: 'DELETE_TEMPLATE',
      id: empty.id,
      name: empty.name,
      status: dryRun ? 'would-delete' : 'deleted',
    });
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
