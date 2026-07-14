# Aloo PWA

Mobile-first personal health PWA for **Dhruva** — body weight, food logging, walks/cardio, and gym sessions in one app. Built with Vite + React + TypeScript, Supabase-backed where wired, local-first Zustand for diary/UI, installable from iPhone Safari.

**Brand:** Aloo · **Theme:** soft gold + white · **Progress metaphor:** pot of gold that fills with consistency

## Product Flow
```mermaid
flowchart TD
  Bar[Universal text + mic bar] --> Intent{Intent}
  Intent -->|meal| Confirm[Meal confirm]
  Intent -->|weight| BW[Body weight diary]
  Intent -->|walk| MoveLog[Movement diary]
  Intent -->|lift cue| Move[Move tab / Session]
  Today[Today] --> Eat[Eat]
  Today --> Move
  Today --> Grow[Grow / history + pot]
  Today --> You[You / settings]
  Move --> Session[Active session]
  Session --> Pick[Add exercises / NL walk]
  Session --> Sets[NL set log]
  Grow --> Recap[Workout recaps]
```

## Stack
| Layer | Technology |
|-------|------------|
| App | Vite 5, React 18, TypeScript |
| Data | Supabase Postgres/Storage (gym path) + local diary Zustand |
| Cache/state | TanStack React Query, Zustand |
| Offline | Dexie queue for Supabase writes, vite-plugin-pwa |
| UI | Tailwind, EB Garamond, DM Mono |
| Charts / motion | Recharts, framer-motion |
| Voice | Web Speech API (Groq Whisper queued for iPhone PWA) |

## Routes
| Route | Purpose |
|-------|---------|
| `/` | Today — weight, meal diary, intentions, pot of gold |
| `/eat` | Meal logging (also via universal bar) |
| `/move` | Walks + start gym session |
| `/grow` | Pot of gold + real history calendar |
| `/you` | Settings / export |
| `/session/new`, `/session/:id` | Active workout; NL walks + set logging |
| `/exercises`, `/exercises/new`, `/exercises/:slug` | Library |
| `/goals` | Editable daily intentions |
| `/log` | Redirect → `/eat` |
| `/history` | Redirect → `/grow` |
| `/progress`, `/calendar`, `/settings`, `/onboarding` | Redirects into current IA |

## Local-first diary (not yet Supabase tables)
Persisted under `aloo-diary-v1` / `aloo-ui-v1`:
- Body weight logs (seeded ~169 lb for Dhruva)
- Meals from NL confirm
- Movements from “walking 30 min”, etc.
- Intentions (add / toggle / remove)
- `goldDays` for pot-of-gold growth

## Scripts
| Command | Purpose |
|---------|---------|
| `pnpm dev` | Local Vite |
| `pnpm test` | Vitest |
| `pnpm build` | Typecheck + production build |
| `pnpm preview` | Preview `dist/` |
| `pnpm seed` | Seed Supabase from board JSON |
| `pnpm backfill:images` | Image backfill |

## Environment
| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | Yes (gym sync) | Browser Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Yes (gym sync) | Browser anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Scripts only | Seed/backfill |

## Documentation
| File | Purpose |
|------|---------|
| `CLAUDE.md` / `AGENTS.md` | Agent workflow + contracts |
| `web/CLAUDE.md` | Web subsystem |
| `db/CLAUDE.md` | Schema / storage |
| `HANDOFF.md` | Cross-agent handoff (current) |
| `DEPLOYMENT.md` | Vercel + Supabase |
| `decisions/` | ADRs (garden→Aloo gold, voice, context saves) |
| `wiki/README.md` | Long-form notes index |

## Current Status (Jul 2026)
Shipped on branch `cursor/mom-first-ui-e6b2` (PR #6): Aloo gold shell, pot of gold, universal NL/voice bar, walks/meals/weight local diary, editable intentions, real lift charts (no synthetic UI series), exercise search flex-row fix. Onboarding stashed. Meals/macros and walks are local; gym sessions sync to Supabase when configured.
