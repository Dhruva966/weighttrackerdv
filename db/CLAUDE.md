# Database Subsystem

Purpose: Own Supabase schema, storage, seed data, offline write contracts, and database-side rules for the **Lift** PWA (gym path). Body weight / walks currently also exist as **local** diary state in `src/stores/diaryStore.ts` — do not assume they are synced until a migration and client sync land. Food/meal UI is archived under `archive/food/`.

Return to the root instructions before changing shared contracts: [../CLAUDE.md](../CLAUDE.md).

## Key Files
| What | Where |
|------|-------|
| Migrations | `../supabase/migrations/0001_init.sql` through `0004_equipment_band.sql` |
| Supabase client | `../src/lib/supabase.ts` |
| Single-user constant | `../src/lib/user.ts` |
| Dexie schema | `../src/lib/db.ts` |
| Offline queue | `../src/lib/offline-queue.ts` |
| Remote hydration (pull-down) | `../src/lib/supabase-hydrate.ts` |
| Local diary (not synced) | `../src/stores/diaryStore.ts` |
| Seed script | `../scripts/seed-user-board.ts` |
| Image backfill | `../scripts/backfill-images.ts` |
| Board data | `../scripts/data/user-board.json` |
| PDF exercise manifest + import | `../scripts/data/pdf-exercise-manifest.json`, `../scripts/import-exercise-manifest.ts` |
| Cross-agent contracts | `../HANDOFF.md` |
| Deployment runbook | `../DEPLOYMENT.md` |

## Allowed Patterns
### Add migrations forward
Create a new migration for every schema change after `0001_init.sql` is applied.

```sql
-- supabase/migrations/0002_add_rest_timer_default.sql
alter table sessions
  add column rest_timer_seconds int not null default 90
  check (rest_timer_seconds between 15 and 600);
```

### Keep PR logic deterministic
Calculate PR status with database rules or a shared library rule that matches the trigger.

```sql
create trigger sets_mark_pr before insert on sets
  for each row execute function mark_pr();
```

### Use idempotent seed scripts
Seed by stable slugs and upsert where repeat runs are expected.

```ts
await supabase.from('exercises').upsert({
  slug,
  name,
  muscle_group,
  image_style: 'name-only',
  source: 'user-board',
}, { onConflict: 'slug' })
```

### Keep offline payloads replayable
Use client-generated UUIDs for queued writes.

```ts
const pendingSet = {
  id: crypto.randomUUID(),
  session_id: sessionId,
  exercise_id: exerciseId,
  set_number: nextSetNumber,
  weight_lb: 135,
  reps: 8,
}
```

## Forbidden Patterns
### Do not mutate applied migrations
Applied migrations are append-only. Fix mistakes with a new migration.

```sql
-- Forbidden after deployment: editing 0001_init.sql to change an existing column.
alter table sets alter column weight_lb type int;
```

### Do not introduce multi-user access with RLS disabled
The locked MVP is single-user. Multi-user requires RLS first.

```sql
-- Forbidden for multi-user
alter table sessions disable row level security;
```

### Do not expose service-role keys to browser code
Only server-side scripts may use service-role credentials.

```ts
// Forbidden in src/
createClient(import.meta.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
```

### Do not delete user data for reseeding
Seed scripts must be additive or explicit about destructive cleanup.

```ts
// Forbidden
await supabase.from('sets').delete().neq('id', '')
```

## What NOT to Do
- Do not add tables without documenting ownership, indexes, offline payload impact, and handoff contracts.
- Do not change enum values without checking every form, filter, seed record, and chart grouping.
- Do not make image backfill fail the whole run when Free Exercise DB has no match.
- Do not store private notes, credentials, or raw upload metadata in public-readable tables or buckets.
- Do not claim RLS protection exists in MVP until policies are enabled and verified.
- Do not add a `day_spine` / blank-date table for calendar reconstruction — Move days are derived from `sessions` (+ local movements). Session narrative stays on `sessions.notes`; no `day_notes` or set-notes columns unless a later migration explicitly adds them.
- Do not invent per-lift or movement calorie burn in schema or sync payloads while calorie tracking is archived.
