# Handoff — Aloo (current)

Use this file when one agent hands work to another. Keep it short, contract-focused, and current.

## Current Product Shape
**Aloo** is a single-user PWA for owner Dhruva (`vutultadhruva@gmail.com`). Gym path uses hardcoded `USER_ID` + Supabase when configured. Diary (weight and walks/cardio) and UI prefs are local-first Zustand (`aloo-diary-v1`, `aloo-ui-v1`). Soft gold + white shell; pot of gold grows with `goldDays`. Food, meal, macro, and calorie UI is archived under `archive/food/` for a later pass.

## Nav & routes
**Today · Move · Grow · You**
`/` Today · `/move` · `/grow` · `/you` · `/session/:id` · `/exercises*` · `/goals`
Legacy redirects: `/log`→`/move`, `/history`→`/grow`, `/progress`→`/grow`, `/settings`→`/you`, `/onboarding`→`/`, `/calendar`→`/move`
**Move (`/move`):** primary gym home — `InteractiveGymCalendar` + day panel (LA datetimes) + walks secondary. Empty day → `/session/new?date=YYYY-MM-DD` (backdates `startedAt` via `calendarDayToStartedAt`). Session Done → `/move`.  
**Grow (`/grow`):** pot + `LiftProgress` (`buildLiftProgress` on real `LoggedSet` rows) + gym-only recent feed. Board baseline seed lives in `starterSessions` / `starterSets` (`src/data/catalog.ts`); bump `BOARD_HISTORY_SEED_VERSION` in `workoutStore` to re-merge after a clear. No jagged synthetic UI series.

## Data contracts
### Gym (Supabase / workoutStore)
| Contract | Notes |
|----------|-------|
| Exercise / Session / Set / Goal | Unchanged from init schema; client UUIDs for offline. |
| `createSession({ startedAt? })` | Optional ISO for calendar-day logging; default `now`. |
| `removeSet(setId)` | Deletes a logged set, renumbers `set_number` in that session+exercise, recalculates `isPr` for the exercise, syncs via `deleteSyncedSet` + sibling upserts. |
| `sessions.notes` | Session freeform notes (import + NL exercise notes). **No day_notes table** — day notes are just per-session notes on that calendar day. |
| PendingWrite | Dexie queue for Supabase writes (`upsert` + `delete`; drain handles both). |
| `hydrateFromRemote(remote)` | Pulls exercises/sessions/sets/goals down from Supabase on boot (`src/lib/supabase-hydrate.ts` fetch → `workoutStore.hydrateFromRemote` merge). Remote **only fills gaps** — union by id, local always wins on conflict, safe to call repeatedly. Runs in `useSupabaseBootstrap` after queue drain. Closes the old one-way-up sync gap (new device / cleared storage now recovers real history). |

### Gym calendar day panel (`src/lib/calendar.ts`)
UI calendar uses **`getDayWorkoutBundle(date, sessions, sets, { timeZone })`** — gym-only, completed sessions (`endedAt`), volume/PR per session. Powers `DayWorkoutPanel` on Move. Open (unended) sessions for the selected day are passed separately and link to `/session/:id`. Display times use `formatDateTimeInZone(..., 'America/Los_Angeles')`.

### Move day reconstruction (`src/lib/day-workout-bundle.ts`) — separate helper
Richer Move-day shape (sessions + movements). **Not** what the calendar panel imports today. Empty days return `null`; LA day keys. Do not mix archived food code into either bundle.

### Diary (local `diaryStore` — not yet synced)
| Contract | Shape | Notes |
|----------|-------|-------|
| BodyWeightLog | `{ id, loggedAt, weightLb }` | Seeded ~169; NL “weighed N” upserts day |
| MovementLog | `{ id, loggedAt, kind, title, durationMin, summary, raw }` | Kinds: `walk \| incline_walk \| hike \| run \| stairmaster \| bike \| cardio \| other` |

### UI (`uiStore`)
Intentions `{ id, name, done }` — add/remove/toggle. Onboarding stashed.

### Pot of gold (`goldDays`)
| Rule | Detail |
|------|--------|
| Sources | Weigh-ins (`diaryStore.bodyWeightLogs`), walks/cardio (`movements`), gym days (sessions that have ≥1 set). |
| Math | `src/lib/gold.ts` — consecutive LA calendar days; streak stays alive through an empty “today” if yesterday counts; capped at 21. |
| Sync | `syncPotOfGold()` in `src/lib/sync-gold.ts` — recomputes and writes `uiStore.goldDays`. Runs on app mount and on diary/workout store changes. |
| Visual | `PotOfGold` — fill, coin heap, glow, and scale track `goldDays` (0 = empty pot). |

Removed: blind `tendGold()` +1.

## Key files
| What | Where |
|------|-------|
| Shell / routes / bar | `src/App.tsx`, `UniversalCommandBar.tsx` |
| Move home | `src/pages/Move.tsx` |
| Lift progress (Grow) | `src/components/LiftProgress.tsx` |
| Pot of gold | `src/components/PotOfGold.tsx` |
| Gold math / sync | `src/lib/gold.ts`, `src/lib/sync-gold.ts` |
| Diary | `src/stores/diaryStore.ts` |
| Day workout bundle | `src/lib/day-workout-bundle.ts` |
| Gym calendar map | `src/lib/calendar.ts` (`DayActivity`, `getDayWorkoutBundle`, `calendarDayToStartedAt`) |
| Interactive gym calendar UI | `src/components/InteractiveGymCalendar.tsx` + `WorkoutCalendar` + `DayWorkoutPanel` |
| NL parsers | `src/lib/weight-from-text.ts`, `src/lib/movement-from-text.ts`, `src/lib/universal-command.ts` |
| Archived food UI | `archive/food/` |
| Exercise NL sets | Two-stage LLM-to-UI pattern: Supabase `parse-exercise-log` (Anthropic `claude-haiku-4-5` first, Groq fallback) → constrained draft JSON → deterministic `commitExerciseLogDraft` in `src/lib/exercise-log-parse.ts` → UI-ready sets/notes. Key: `ANTHROPIC_API_KEY` in Supabase secrets only (not `VITE_*`). Clean shorthand stays on-device. |
| Session + search | `src/pages/Session.tsx`, `ExercisePicker.tsx`, `MovementLogger.tsx` |
| Theme | `tailwind.config.js`, `src/index.css` |
| ADRs | `decisions/2026-07-14-aloo-gold-diary.md`, `decisions/2026-07-14-context-save.md` |
| Supabase hydration | `src/lib/supabase-hydrate.ts` (fetch + row mappers), `src/lib/supabase-mappers.ts` (`rowToExercise/Session/Set/Goal`), wired in `src/hooks/useSupabaseBootstrap.ts` |

## Supabase project state (2026-07-27)
- Live project is **`weighttracker`** (`svcjdtlmmrisrkjqdsjt`, ap-southeast-2) — matches `VITE_SUPABASE_URL`. A same-named-ish sibling **`weighttrackerdv`** (`stvyokgukswcebpyqcnb`) also exists in the same org and is unused; don't confuse the two when linking the Supabase CLI.
- This project had **zero tables** until today — `0001_init.sql`/`0002_storage_bucket.sql` existed in the repo but were never pushed to this project. All 4 migrations (0001–0004) are now applied and verified (`pnpm check:supabase` + anon-key REST read both pass).
- `supabase/config.toml` used the pre-rename `name` key, which current CLI (2.109.1) rejects (`config.config' has invalid keys: name`). Fixed to `project_id`. If `supabase db push`/`link` ever fails with that config error again, it's this same schema drift, not a real project problem.
- `0003_templates_and_local_day.sql` added `templates`/`template_exercises` (empty, no store/UI yet — see follow-ups) and `sessions.local_date`/`sessions.timezone` (columns exist, backfilled to America/Los_Angeles, but nothing writes device-local values yet — see follow-ups).
- `0004_equipment_band.sql` added `'band'` to `equipment_kind`.
- Supabase CLI is authenticated locally (`npx supabase projects list` works) independent of the `claude.ai Supabase` MCP connection, which is tied to a different Supabase account and cannot see this project — use the CLI (or a project-scoped `claude mcp add --transport http supabase ...`, already registered in `.mcp.json`) for this project, not the generic `claude.ai Supabase` MCP tools.

## Open follow-ups
- Catalog exercise ids (`ex-${slug}`) never sync to Supabase — sets stay local until UUID migration
- Sync diary weight/movements to Supabase when tables/policies ready
- Optional freeform custom movement categories beyond the fixed kind list
- Groq Whisper edge for iPhone installed-PWA STT
- Rebuild food/meal logging from `archive/food/` when ready
- `templates`/`template_exercises` tables exist but have no store or UI — CRUD, start-from-template, save-session-as-template still to build
- `sessions.local_date`/`timezone` columns exist but the app still hardcodes `America/Los_Angeles` in ~10 files — device-local tz swap still to do
- Exercise PDF/manifest import (Free Exercise DB match, `image_style: 'name-only'` fallback, never Strong's proprietary icons) not yet run — extracted page images sit in `tmp/pdfs/aloo-exercises/extracted-images/` (gitignored, local only)

## Verification
`pnpm test` · `pnpm build` · smoke: Today → Move → day Log workout → session → Done → Move · Grow lift chart
