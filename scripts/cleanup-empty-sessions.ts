/**
 * Inspect (and optionally delete) empty gym sessions (0 sets) for the owner USER_ID.
 *
 *   pnpm cleanup:empty-sessions
 *   pnpm cleanup:empty-sessions -- --date=2026-08-07
 *   pnpm cleanup:empty-sessions -- --apply
 *   pnpm cleanup:empty-sessions -- --apply --date=2026-08-07
 */
import { createClient } from '@supabase/supabase-js';
import { loadEnvLocal } from './load-env-local';

loadEnvLocal();

const USER_ID = 'de3c1f99-a64b-46c4-9f46-6afcc6d17f70';
const SAMPLE_LIMIT = 20;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function parseArgs(argv: string[]): { apply: boolean; date: string | null } {
  let apply = false;
  let date: string | null = null;
  for (const arg of argv) {
    if (arg === '--apply') apply = true;
    else if (arg.startsWith('--date=')) {
      date = arg.slice('--date='.length);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error(`Invalid --date=${date}; expected YYYY-MM-DD`);
      }
    }
  }
  return { apply, date };
}

async function main(): Promise<void> {
  const { apply, date } = parseArgs(process.argv.slice(2));
  const url = requireEnv('VITE_SUPABASE_URL');
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(url, key);

  let sessionsQuery = supabase
    .from('sessions')
    .select('id, local_date, timezone, started_at')
    .eq('user_id', USER_ID)
    .order('started_at', { ascending: false });

  if (date) {
    sessionsQuery = sessionsQuery.eq('local_date', date);
  }

  const { data: sessions, error: sessionsError } = await sessionsQuery;
  if (sessionsError) throw new Error(`fetch sessions: ${sessionsError.message}`);

  const allSessions = sessions ?? [];
  if (allSessions.length === 0) {
    console.log(date ? `No sessions for local_date=${date}` : 'No sessions for USER_ID');
    return;
  }

  const sessionIds = allSessions.map((s) => s.id);
  const sessionsWithSets = new Set<string>();
  const chunkSize = 100;
  for (let i = 0; i < sessionIds.length; i += chunkSize) {
    const chunk = sessionIds.slice(i, i + chunkSize);
    const { data: setRows, error: setsError } = await supabase
      .from('sets')
      .select('session_id')
      .in('session_id', chunk);
    if (setsError) throw new Error(`fetch sets: ${setsError.message}`);
    for (const r of setRows ?? []) {
      sessionsWithSets.add(r.session_id as string);
    }
  }

  const empty = allSessions.filter((s) => !sessionsWithSets.has(s.id));

  const scope = date ? `local_date=${date}` : 'all dates';
  console.log(`Empty sessions (${scope}): ${empty.length} of ${allSessions.length}`);

  const sample = empty.slice(0, SAMPLE_LIMIT);
  for (const s of sample) {
    console.log(`  ${s.id}  local_date=${s.local_date}  tz=${s.timezone}  started_at=${s.started_at}`);
  }
  if (empty.length > SAMPLE_LIMIT) {
    console.log(`  … and ${empty.length - SAMPLE_LIMIT} more`);
  }

  if (!apply) {
    console.log('Dry-run only. Pass --apply to delete these empty sessions.');
    return;
  }

  if (empty.length === 0) {
    console.log('Nothing to delete.');
    return;
  }

  const emptyIds = empty.map((s) => s.id);
  const { error: deleteError, count } = await supabase
    .from('sessions')
    .delete({ count: 'exact' })
    .in('id', emptyIds)
    .eq('user_id', USER_ID);
  if (deleteError) throw new Error(`delete sessions: ${deleteError.message}`);

  console.log(`Deleted ${count ?? emptyIds.length} empty session(s).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
