# Handoff — Aloo (current)

Use this file when one agent hands work to another. Keep it short, contract-focused, and current.

## Current Product Shape
**Aloo** is a single-user PWA for owner Dhruva (`vutultadhruva@gmail.com`). Gym path uses hardcoded `USER_ID` + Supabase when configured. Diary (weight, meals, walks) and UI prefs are local-first Zustand (`aloo-diary-v1`, `aloo-ui-v1`). Soft gold + white shell; pot of gold grows with `goldDays`.

## Nav & routes
**Today · Move · Grow · Eat · You**  
`/` Today · `/move` · `/grow` · `/eat` · `/you` · `/session/:id` · `/exercises*` · `/goals`  
Legacy redirects: `/log`→`/eat`, `/history`→`/grow`, `/progress`→`/grow`, `/settings`→`/you`, `/onboarding`→`/`

## Data contracts
### Gym (Supabase / workoutStore)
| Contract | Notes |
|----------|-------|
| Exercise / Session / Set / Goal | Unchanged from init schema; client UUIDs for offline. |
| `sessions.notes` | Session freeform notes (import + NL exercise notes). **No day_notes table** — day notes are just per-session notes on that calendar day. |
| PendingWrite | Dexie queue for Supabase writes. |

### Move day reconstruction (derived — no day spine)
Days are **derived** from events keyed by `YYYY-MM-DD` in `America/Los_Angeles`. Empty days stay blank (helper returns `null`); do not insert placeholder rows per date.

`DayWorkoutBundle` via `getDayWorkoutBundle(date, { sessions, sets, exercises, movements?, bodyWeightLb? })` in `src/lib/day-workout-bundle.ts`:

```ts
DayWorkoutBundle = {
  date, // YYYY-MM-DD (LA)
  sessions: [{
    id, startedAt, endedAt?, notes?,
    setCount, prCount, volumeLb, // volume = sum weight×reps of non-warmup sets
    exercises: [{
      exerciseId, name, setCount,
      sets: [{ id, setNumber, weightLb, reps, isWarmup, isPr, createdAt }]
    }]
  }],
  movements: [{
    id, kind, title, durationMin, summary, raw, loggedAt,
    estimatedCalories // cardio MET estimate only; null if missing duration/weight
  }],
  cardioCalories, // sum of movement estimates (never from gym lifts)
  flags: { hadGym, hadPr, hadCardio }
}
```

Rules: only **completed** sessions (`endedAt` set); open sessions excluded. Cardio calories use Compendium-style METs in `src/lib/cardio-calories.ts` × body weight × duration — **not** per-lift burn.

### Diary (local `diaryStore` — not yet synced)
| Contract | Shape | Notes |
|----------|-------|-------|
| BodyWeightLog | `{ id, loggedAt, weightLb }` | Seeded ~169; NL “weighed N” upserts day; feeds cardio calorie estimates |
| MealLog | `{ id, loggedAt, title, summary, calories, proteinG, carbsG, fatG, raw }` | From meal confirm — Eat path; do not mix into Move day bundle |
| MovementLog | `{ id, loggedAt, kind, title, durationMin, summary, raw }` | Kinds: `walk \| incline_walk \| hike \| run \| stairmaster \| bike \| cardio \| other` |

### UI (`uiStore`)
Intentions `{ id, name, done }` — add/remove/toggle. `goldDays` / `tendGold`. Onboarding stashed.

## Key files
| What | Where |
|------|-------|
| Shell / routes / bar | `src/App.tsx`, `UniversalCommandBar.tsx` |
| Pot of gold | `src/components/PotOfGold.tsx` |
| Diary | `src/stores/diaryStore.ts` |
| Day workout bundle | `src/lib/day-workout-bundle.ts`, `src/lib/cardio-calories.ts` |
| Gym calendar map | `src/lib/calendar.ts` (`DayActivity` — gym markers only) |
| NL parsers | `src/lib/meal-from-text.ts`, `src/lib/movement-from-text.ts`, `src/lib/universal-command.ts` |
| Session + search | `src/pages/Session.tsx`, `ExercisePicker.tsx`, `MovementLogger.tsx` |
| Theme | `tailwind.config.js`, `src/index.css` |
| ADRs | `decisions/2026-07-14-aloo-gold-diary.md`, `decisions/2026-07-14-context-save.md` |

## Open follow-ups
- Sync diary weight/meals/movements to Supabase when tables/policies ready
- Wire Grow/Move UI to `getDayWorkoutBundle` (contract is ready; no UI redesign in this pass)
- Optional freeform custom movement categories beyond the fixed kind list
- Groq Whisper edge for iPhone installed-PWA STT
- Optional USDA/meal DB; photo meal capture
- Keep touch targets usable when slimming CTAs

## Verification
`pnpm test` · `pnpm build` · hard-refresh preview (or restart Cloudflare quick tunnel) after UI ships
