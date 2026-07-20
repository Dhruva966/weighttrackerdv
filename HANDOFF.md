# Handoff — Aloo (current)

Use this file when one agent hands work to another. Keep it short, contract-focused, and current.

## Current Product Shape
**Aloo** is a single-user PWA for owner Dhruva (`vutultadhruva@gmail.com`). Gym path uses hardcoded `USER_ID` + Supabase when configured. Diary (weight, meals, walks) and UI prefs are local-first Zustand (`aloo-diary-v1`, `aloo-ui-v1`). Soft gold + white shell; pot of gold grows with `goldDays`.

## Nav & routes
**Today · Move · Grow · Eat · You**  
`/` Today · `/move` · `/grow` · `/eat` · `/you` · `/session/:id` · `/exercises*` · `/goals`  
Legacy redirects: `/log`→`/eat`, `/history`→`/grow`, `/progress`→`/grow`, `/settings`→`/you`, `/onboarding`→`/`, `/calendar`→`/move`  
**Move (`/move`):** primary gym home — `InteractiveGymCalendar` + day panel (LA datetimes) + walks secondary. Empty day → `/session/new?date=YYYY-MM-DD` (backdates `startedAt` via `calendarDayToStartedAt`). Session Done → `/move`.  
**Grow (`/grow`):** pot + `LiftProgress` (`buildLiftProgress` on real `LoggedSet` rows) + gym-only recent feed (no calendar, meals tucked). Board baseline seed lives in `starterSessions` / `starterSets` (`src/data/catalog.ts`); bump `BOARD_HISTORY_SEED_VERSION` in `workoutStore` to re-merge after a clear. No jagged synthetic UI series.

## Data contracts
### Gym (Supabase / workoutStore)
| Contract | Notes |
|----------|-------|
| Exercise / Session / Set / Goal | Unchanged from init schema; client UUIDs for offline. |
| `createSession({ startedAt? })` | Optional ISO for calendar-day logging; default `now`. |
| `removeSet(setId)` | Deletes a logged set, renumbers `set_number` in that session+exercise, recalculates `isPr` for the exercise, syncs via `deleteSyncedSet` + sibling upserts. |
| `sessions.notes` | Session freeform notes (import + NL exercise notes). **No day_notes table** — day notes are just per-session notes on that calendar day. |
| PendingWrite | Dexie queue for Supabase writes (`upsert` + `delete`; drain handles both). |

### Gym calendar day panel (`src/lib/calendar.ts`)
UI calendar uses **`getDayWorkoutBundle(date, sessions, sets, { timeZone })`** — gym-only, completed sessions (`endedAt`), volume/PR per session. Powers `DayWorkoutPanel` on Move. Open (unended) sessions for the selected day are passed separately and link to `/session/:id`. Display times use `formatDateTimeInZone(..., 'America/Los_Angeles')`.

### Move day reconstruction (`src/lib/day-workout-bundle.ts`) — separate helper
Richer Move-day shape (sessions + movements + cardio MET calories). **Not** what the calendar panel imports today. Empty days return `null`; LA day keys. Do not mix Eat/meals into either bundle.

### Diary (local `diaryStore` — not yet synced)
| Contract | Shape | Notes |
|----------|-------|-------|
| BodyWeightLog | `{ id, loggedAt, weightLb }` | Seeded ~169; NL “weighed N” upserts day; feeds cardio calorie estimates |
| MealLog | `{ id, loggedAt, title, summary, calories, proteinG, carbsG, fatG, raw }` | From meal confirm — Eat path; do not mix into Move day bundle |
| MovementLog | `{ id, loggedAt, kind, title, durationMin, summary, raw }` | Kinds: `walk \| incline_walk \| hike \| run \| stairmaster \| bike \| cardio \| other` |

### UI (`uiStore`)
Intentions `{ id, name, done }` — add/remove/toggle. Onboarding stashed.

### Pot of gold (`goldDays`)
| Rule | Detail |
|------|--------|
| Sources | Weigh-ins (`diaryStore.bodyWeightLogs`), walks/cardio (`movements`), gym days (sessions that have ≥1 set). **Not meals.** |
| Math | `src/lib/gold.ts` — consecutive LA calendar days; streak stays alive through an empty “today” if yesterday counts; capped at 21. |
| Sync | `syncPotOfGold()` in `src/lib/sync-gold.ts` — recomputes and writes `uiStore.goldDays`. Runs on app mount and on diary/workout store changes. |
| Visual | `PotOfGold` — fill, coin heap, glow, and scale track `goldDays` (0 = empty pot). |

Removed: blind `tendGold()` +1 (also fired on meal draft / “open Move”).

## Key files
| What | Where |
|------|-------|
| Shell / routes / bar | `src/App.tsx`, `UniversalCommandBar.tsx` |
| Move home | `src/pages/Move.tsx` |
| Lift progress (Grow) | `src/components/LiftProgress.tsx` |
| Pot of gold | `src/components/PotOfGold.tsx` |
| Gold math / sync | `src/lib/gold.ts`, `src/lib/sync-gold.ts` |
| Diary | `src/stores/diaryStore.ts` |
| Day workout bundle | `src/lib/day-workout-bundle.ts`, `src/lib/cardio-calories.ts` |
| Gym calendar map | `src/lib/calendar.ts` (`DayActivity`, `getDayWorkoutBundle`, `calendarDayToStartedAt`) |
| Interactive gym calendar UI | `src/components/InteractiveGymCalendar.tsx` + `WorkoutCalendar` + `DayWorkoutPanel` |
| NL parsers | `src/lib/meal-from-text.ts`, `src/lib/movement-from-text.ts`, `src/lib/universal-command.ts` |
| Exercise NL sets | Two-stage LLM-to-UI pattern: Supabase `parse-exercise-log` (Anthropic `claude-haiku-4-5` first, Groq fallback) → constrained draft JSON → deterministic `commitExerciseLogDraft` in `src/lib/exercise-log-parse.ts` → UI-ready sets/notes. Key: `ANTHROPIC_API_KEY` in Supabase secrets only (not `VITE_*`). Clean shorthand stays on-device. |
| Session + search | `src/pages/Session.tsx`, `ExercisePicker.tsx`, `MovementLogger.tsx` |
| Theme | `tailwind.config.js`, `src/index.css` |
| ADRs | `decisions/2026-07-14-aloo-gold-diary.md`, `decisions/2026-07-14-context-save.md` |

## Open follow-ups
- Catalog exercise ids (`ex-${slug}`) never sync to Supabase — sets stay local until UUID migration
- Sync diary weight/meals/movements to Supabase when tables/policies ready
- Optional freeform custom movement categories beyond the fixed kind list
- Groq Whisper edge for iPhone installed-PWA STT
- Optional USDA/meal DB; photo meal capture

## Verification
`pnpm test` · `pnpm build` · smoke: Today → Move → day Log workout → session → Done → Move · Grow lift chart
