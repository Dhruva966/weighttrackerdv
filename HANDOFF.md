# Handoff — Aloo (current)

Use this file when one agent hands work to another. Keep it short, contract-focused, and current.

## Current Product Shape
**Aloo** is a single-user PWA for owner Dhruva (`vutultadhruva@gmail.com`). Gym path uses hardcoded `USER_ID` + Supabase when configured. Diary (weight and walks/cardio) and UI prefs are local-first Zustand (`aloo-diary-v1`, `aloo-ui-v1`). Soft gold + white shell; pot of gold grows with `goldDays`. Food, meal, macro, and calorie UI is archived under `archive/food/` for a later pass.

## Nav & routes
**Move · Today · Grow · You** (tab order as of 2026-07-28 — Move is the app's home, not Today)
`/` → redirects to `/move` (Move is home) · `/move` · `/today` · `/grow` · `/you` · `/session/:id` · `/templates*` · `/exercises*` · `/goals`
Legacy redirects: `/log`→`/move`, `/history`→`/grow`, `/progress`→`/grow`, `/settings`→`/you`, `/onboarding`→`/`→`/move`, `/calendar`→`/grow`
**Move (`/move`, also `/`):** template-first workout home — exactly one resume action when today's session is open; otherwise templates (saved + Push/Pull/Leg examples) are the primary launch surface, with start-empty and exercise browse as secondary. It deliberately has no calendar, monthly stats, day panel, or walks/cardio UI. Session Done → `/move`. **`/` is a redirect to `/move`, not a duplicate route** — internal links should keep using `/move` (matches the Move nav tab's `NavLink` target) rather than `/`.
**Today (`/today`):** secondary dashboard — greeting, pot of gold, body weight card, training-log summary. Same component as before, just moved off the root route.
**Grow (`/grow`):** pot + device-local `InteractiveGymCalendar` (month stats and selected-day panel) + `LiftProgress` (`buildLiftProgress` on real `LoggedSet` rows) + gym-only recent feed. Board baseline seed lives in `starterSessions` / `starterSets` (`src/data/catalog.ts`); bump `BOARD_HISTORY_SEED_VERSION` in `workoutStore` to re-merge after a clear (currently **10**). No jagged synthetic UI series.
**Library (`/exercises*`):** `ExerciseCard` is editable — primary tap opens detail, pencil opens `/exercises/:slug/edit` (optional `state.from` for return). **Images policy (2026-08-02, v3):** stock/FEDB/CDN **people photographs** stay banned. Verified IMG_3417 **PDF diagram crops** (anatomical illustrations with muscle highlights — not photos) are allowlisted again: Supabase `exercise-images` + local `/exercise-icons/` via `isAllowedPersistedImageUrl` / `pdfIconUrl`. `BLOCK_PEOPLE_EXERCISE_IMAGES=false`; `EXERCISE_IMAGE_POLICY_VERSION=3`. Reseed with `pnpm apply:pdf-icons` (skips letter-tile placeholders). Never reintroduce arbitrary https hosts.

## Data contracts
### Templates (Supabase / templateStore)
`useTemplateStore` (`src/stores/templateStore.ts`), persisted key `weight-tracker-templates`. `templates` + `templateExercises` (ordered by `position`), synced the same UUID-gated way as workoutStore. `createTemplate/updateTemplateName/deleteTemplate/duplicateTemplate/setTemplateExercises` (one atomic reconcile: adds/removes/repositions — no separate add/remove/reorder calls). `startWorkoutFromTemplate(templateId)` and the standalone `startWorkoutWithExercises(exerciseIds)` both reuse **today's open session** via `findDaySession`/`calendarDayToStartedAt` (Move is day-centric) and merge into `plannedExerciseIds` rather than creating a second session or clobbering an existing plan. `saveSessionAsTemplate(sessionId, name)` builds a template from a session's logged sets in first-logged order, falling back to `plannedExerciseIds` if nothing's logged yet. Read-only `exampleTemplates` (`src/data/example-templates.ts`: Push / Pull / Leg / Chest & Back / Arms) resolve against the live catalog (via `canonicalExerciseSlug`) and start via `startWorkoutWithExercises` **without** creating a Template record — only "Save as template" or `/templates/new` materializes one. UI: one universal **Templates** list on Move / Session / Templates (non-empty saved + starters; empty shells hidden). `hydrateFromRemote` drops empty remote templates and deletes them server-side. Persist remaps exercise ids through `EXERCISE_MERGES`.
**Gotcha if you touch `TemplateCard.tsx` again:** the exercise-list line needs `min-w-0` at *every* nested flex/grid level down to the `truncate` `<p>` (card root, the flex row, the text wrapper) — Tailwind's `truncate` silently fails to clip and the card visibly overflows its column if any one level in that chain is missing `min-w-0`. This is the standard CSS grid/flexbox "min-content sizing" gotcha, not specific to this component.

### Exercise merges (`src/data/exercise-merges.ts`)
Canonical board→PDF slug collapses (`EXERCISE_MERGES` / `canonicalExerciseSlug` / `remapExerciseId`). Applied on catalog seed, example templates, Zustand persist rehydrate, and (when syncing) archive of retired slugs. Bump `BOARD_HISTORY_SEED_VERSION` when merge map or starter history slugs change so cleared browsers re-seed.

**Protected survivors (do not collapse into each other):**
- Shoulder Press: `shoulder-press-machine` + `shoulder-press-dumbell` (owner spelling)
- Lateral raises: `lateral-raise-machine` + `lateral-raise-dumbbell` + `slanted-lat-raise-dumbbell-seated` + `lateral-raise-cable`

**Round 5 (2026-08-02):** merges `wide-pull-up`→`pull-up`, `straight-bar-tricep-extension-machine`→`triceps-extension-machine`, `pendlay-row-barbell`→`bent-over-row-barbell`, `seated-leg-press-machine`→`leg-press`, `lat-pulldown-machine`→`lat-pulldown-cable`, seated OH presses→OH presses, `low-back-raise`→`back-extension`, `shrug-smith-machine`→`shrug-machine`. Hard deletes: both calf presses, `triceps-extension-cable` (keep rope + overhead rope), underhand bent-over row, both pullovers, all three Zorp test lifts. Apply via `scripts/apply-catalog-merges-round5.ts`. Client drops `EXERCISE_HARD_DELETES` + any `zorp-*` slug on catalog merge so localStorage cannot re-sync test lifts.

### Gym (Supabase / workoutStore)
| Contract | Notes |
|----------|-------|
| Exercise / Session / Goal | Client UUIDs for offline; exercises may be archived after merges. |
| Set | Lift: `weightLb` + `reps`. Cardio: optional `level` / `speed` / `durationSec` / `calories` (`CardioSetLogger`). Local `isCardioSet()` treats zero weight as cardio when any cardio field is set. |
| `createSession({ startedAt? })` | Optional ISO for calendar-day logging; default `now`. |
| `removeSet(setId)` | Deletes a logged set, renumbers `set_number` in that session+exercise, recalculates `isPr` for the exercise, syncs via `deleteSyncedSet` + sibling upserts. |
| `sessions.notes` | Session freeform notes (import + NL exercise notes). **No day_notes table** — day notes are just per-session notes on that calendar day. |
| PendingWrite | Dexie queue for Supabase writes (`upsert` + `delete`; drain handles both). |
| `hydrateFromRemote(remote)` | Pulls exercises/sessions/sets/goals down from Supabase on boot (`src/lib/supabase-hydrate.ts` fetch → `workoutStore.hydrateFromRemote` merge). Remote **only fills gaps** — union by id, local always wins on conflict, safe to call repeatedly. `useSupabaseBootstrap` runs it after queue drain at boot, on reconnect, and through Settings’ guarded Refresh sync control. |
| Cardio sync | `syncSet` maps cardio columns; if migration `0005_cardio_set_fields.sql` is **not** applied yet, cardio-only upserts stay queued (lift sync still works). Apply `0005` on the live project before expecting remote cardio rows. |

### Gym calendar day panel (`src/lib/calendar.ts`)
UI calendar uses **`getDayWorkoutBundle(date, sessions, sets, { timeZone })`** — gym-only, completed sessions (`endedAt`), volume/PR per session. Powers `DayWorkoutPanel` on Grow. Open (unended) sessions for the selected day are passed separately and link to `/session/:id`. Display times use `formatDateTimeInZone(value)`, default timezone is now device-local (see below), not a literal.

### Timezone (`src/lib/local-day.ts`) — device-local, no longer hardcoded LA
`getDeviceTimeZone()` (`Intl.DateTimeFormat().resolvedOptions().timeZone`, falls back to `'America/Los_Angeles'` only if that throws) is now the default `timeZone` param everywhere that used to hardcode `'America/Los_Angeles'`: `calendar.ts`, `day-workout-bundle.ts`, `gold.ts`, `streak.ts`, `fmt.ts`, `diaryStore.ts` (which gained a `timeZone` param it never had before), `InteractiveGymCalendar.tsx`'s `MOVE_TIMEZONE`, `SessionLauncher.tsx`, `StreakBadge.tsx`, `Today.tsx`, and `templateStore.ts`'s `MOVE_TIMEZONE`. Sessions now stamp `localDate`/`timezone` on `createSession` (and `reopenSession` preserves them — easy to drop by accident if you ever rewrite either). Tests intentionally still pin `'America/Los_Angeles'` explicitly where they're testing that specific case, alongside new non-LA + DST-transition (2026-03-08 / 2026-11-01) coverage.
**Known residual limitation, not a regression:** `calendarDayToStartedAt`'s UTC-anchor-hour heuristic was tuned around a US-Pacific-ish offset and is verified for LA/NY/Kolkata but not exhaustively for extreme offsets (e.g. UTC+14). It was equally untested for non-LA zones before this change since the app only ever ran in LA — flag if the owner ever travels somewhere extreme and day-bucketing looks off by one.

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
| Session + search | `src/pages/Session.tsx`, `ExercisePicker.tsx`, `MovementLogger.tsx`, `CardioSetLogger.tsx` |
| Exercise merges | `src/data/exercise-merges.ts` (+ tests) |
| Theme | `tailwind.config.js`, `src/index.css` |
| ADRs | `decisions/2026-07-14-aloo-gold-diary.md`, `decisions/2026-07-14-context-save.md` |
| Supabase hydration | `src/lib/supabase-hydrate.ts` (fetch + row mappers), `src/lib/supabase-mappers.ts` (`rowToExercise/Session/Set/Goal`), wired in `src/hooks/useSupabaseBootstrap.ts` |

## Supabase project state (2026-07-31)
- Live project is **`weighttracker`** (`svcjdtlmmrisrkjqdsjt`, ap-southeast-2) — matches `VITE_SUPABASE_URL`. A same-named-ish sibling **`weighttrackerdv`** (`stvyokgukswcebpyqcnb`) also exists in the same org and is unused; don't confuse the two when linking the Supabase CLI.
- Migrations **0001–0004** are applied on the live project. **`0005_cardio_set_fields.sql` is in-repo** (nullable `weight_lb`/`reps`, adds `level`/`speed`/`duration_sec`/`calories`, lift-or-cardio check, PR trigger skip for null weight/reps) — **confirm with `supabase db push` / dashboard before assuming remote cardio sync works**; client already tolerates missing columns by queueing cardio-only rows.
- `0003_templates_and_local_day.sql`: `templates`/`template_exercises` are live with store + UI; `sessions.local_date`/`sessions.timezone` are written from the device timezone on `createSession`.
- `0004_equipment_band.sql` added `'band'` to `equipment_kind`.
- Supabase CLI is authenticated locally (`npx supabase projects list` works). Prefer CLI / project-scoped MCP over generic `claude.ai Supabase` tools for this project.

## Open follow-ups
- Catalog exercise ids (`ex-${slug}`) never sync to Supabase — sets stay local until UUID migration
- Sync diary weight/movements to Supabase when tables/policies ready
- Optional freeform custom movement categories beyond the fixed kind list
- Groq Whisper edge for iPhone installed-PWA STT
- Rebuild food/meal logging from `archive/food/` when ready
- Templates has no explicit "delete session" UI path — cleaning up a stray test session during this work required a direct Supabase delete + localStorage patch; fine for now since sessions are meant to be day-scoped and reopenable, not deleted, but flag if that assumption changes
- Phase 8 (generalize synthetic history past the seeded catalog lifts) deliberately not done: the 42 `baselineRows` already cover 100% of the 39 static `starterExercises`, and `buildSyntheticProgressRows` is already fully generic — no seed-value gap there. Of the 250 PDF-imported exercises, only 9 have a non-null `visibleWeightLb` in the manifest (most Strong-library rows don't show a personal weight, since this was the app's generic exercise catalog, not the owner's personal lift history) — small enough that it's a minor future nice-to-have, not worth chasing now. If revisited, seed only those 9 from their real `visibleWeightLb`/`visibleReps`; never invent a number for the rest.

### PDF exercise import — done (2026-07-28); images corrected (2026-07-31)
`scripts/data/pdf-exercise-manifest.json` (250 entries) → `scripts/import-exercise-manifest.ts` (`pnpm import:pdf-exercises`) upserts catalog rows. **Do not use FEDB or Strong people demos.** Early import + PR #24 reseed attached anatomical people thumbnails; those were nuclear-purged (`pnpm purge:people-photos`). Icon upload scripts are disabled until true silhouettes replace `public/exercise-icons/`.

## Verification
`pnpm test` · `pnpm build` · smoke: Today → Move → day Log workout → session → Done → Move · Grow lift chart
