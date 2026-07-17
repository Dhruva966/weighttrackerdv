# Handoff — Aloo (current)

Use this file when one agent hands work to another. Keep it short, contract-focused, and current.

## Current Product Shape
**Aloo** is a single-user PWA for owner Dhruva (`vutultadhruva@gmail.com`). Gym path uses hardcoded `USER_ID` + Supabase when configured. Diary (weight, meals, walks) and UI prefs are local-first Zustand (`aloo-diary-v1`, `aloo-ui-v1`) with **schema ready** in `0003_diary_profile_enrichment.sql` for sync. Soft gold + white shell; pot of gold grows with `goldDays`.

## Nav & routes
**Today · Eat · Move · Grow · You**  
`/` Today · `/eat` · `/move` · `/grow` · `/you` · `/session/:id` · `/exercises*` · `/goals`  
Legacy redirects: `/log`→`/eat`, `/history`→`/grow`, `/progress`→`/grow`, `/settings`→`/you`, `/onboarding`→`/`

## Data contracts
### Gym (Supabase / workoutStore)
| Contract | Notes |
|----------|-------|
| Exercise / Session / Set / Goal | Init schema + `0003` enrichment (session title/plan/rest, set notes, goal sort/archive). |
| PendingWrite | Dexie queue for Supabase writes. |

### Diary (local `diaryStore` — schema in Supabase, client sync TBD)
| Contract | Shape | Notes |
|----------|-------|-------|
| BodyWeightLog | `{ id, loggedAt, weightLb }` | Day = `America/Los_Angeles`; `mealsForDay` uses `dayKeyFromLoggedAt` |
| MealLog | `{ id, loggedAt, title, summary, calories, proteinG, carbsG, fatG, raw }` | NL macros inferred when only calories given |
| MovementLog | `{ id, loggedAt, kind, title, durationMin, summary, raw }` | “walking 30 min”, etc. |

### Supabase diary tables (`0003`)
| Table | Purpose |
|-------|---------|
| `user_profiles` | preferred_name, timezone, units, calorie/protein targets, gold_days, focus |
| `meal_logs` + `meal_items` | Diary meals with macros + parsed line items |
| `movement_logs` | Walks/cardio with duration, optional distance/calories |
| `intentions` + `intention_completions` | Daily checklist template + per-day done state |
| `consistency_events` | Pot-of-gold / show-up audit trail |

### UI (`uiStore`)
Intentions `{ id, name, done }` — add/remove/toggle. `goldDays` / `tendGold`. Onboarding stashed.

## Key files
| What | Where |
|------|-------|
| Shell / routes / bar | `src/App.tsx`, `UniversalCommandBar.tsx` |
| Pot of gold | `src/components/PotOfGold.tsx` |
| Diary | `src/stores/diaryStore.ts` |
| NL parsers | `src/lib/meal-from-text.ts`, `src/lib/movement-from-text.ts`, `src/lib/universal-command.ts` |
| Session + search | `src/pages/Session.tsx`, `ExercisePicker.tsx`, `MovementLogger.tsx` |
| DB migration | `supabase/migrations/0003_diary_profile_enrichment.sql` |
| Theme | `tailwind.config.js`, `src/index.css` |
| ADRs | `decisions/2026-07-14-aloo-gold-diary.md`, `decisions/2026-07-14-context-save.md` |

## Open follow-ups
- Wire diary + profile + intentions sync to Supabase `0003` tables
- Groq Whisper edge for iPhone installed-PWA STT
- Optional USDA/meal DB; photo meal capture
- Keep touch targets usable when slimming CTAs

## Verification
`pnpm test` · `pnpm build` · hard-refresh preview (or restart Cloudflare quick tunnel) after UI ships
