# Handoff — Aloo (current)

Use this file when one agent hands work to another. Keep it short, contract-focused, and current.

## Current Product Shape
**Aloo** is a single-user PWA for owner Dhruva (`vutultadhruva@gmail.com`). Gym path uses hardcoded `USER_ID` + Supabase when configured. Diary (weight, meals, walks) and UI prefs are local-first Zustand (`aloo-diary-v1`, `aloo-ui-v1`). Soft gold + white shell; pot of gold grows with `goldDays`.

## Nav & routes
**Today · Eat · Move · Grow · You**  
`/` Today · `/eat` · `/move` · `/grow` · `/you` · `/session/:id` · `/exercises*` · `/goals`  
Legacy redirects: `/log`→`/eat`, `/history`→`/grow`, `/progress`→`/grow`, `/settings`→`/you`, `/onboarding`→`/`

## Data contracts
### Gym (Supabase / workoutStore)
| Contract | Notes |
|----------|-------|
| Exercise / Session / Set / Goal | Unchanged from init schema; client UUIDs for offline. |
| PendingWrite | Dexie queue for Supabase writes. |

### Diary (local `diaryStore` — not yet synced)
| Contract | Shape | Notes |
|----------|-------|-------|
| BodyWeightLog | `{ id, loggedAt, weightLb }` | Seeded ~169; NL “weighed N” upserts day |
| MealLog | `{ id, loggedAt, title, summary, calories, proteinG, carbsG, fatG, raw }` | From meal confirm |
| MovementLog | `{ id, loggedAt, kind, title, durationMin, summary, raw }` | “walking 30 min”, etc. |

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
| Theme | `tailwind.config.js`, `src/index.css` |
| ADRs | `decisions/2026-07-14-aloo-gold-diary.md`, `decisions/2026-07-14-context-save.md` |

## Open follow-ups
- Sync diary weight/meals/walks to Supabase when tables/policies ready
- Groq Whisper edge for iPhone installed-PWA STT
- Optional USDA/meal DB; photo meal capture
- Keep touch targets usable when slimming CTAs

## Verification
`pnpm test` · `pnpm build` · hard-refresh preview (or restart Cloudflare quick tunnel) after UI ships
