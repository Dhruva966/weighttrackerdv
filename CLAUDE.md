# Aloo (Weight Tracker PWA)

## What This Is
**Aloo** is a single-user, mobile-first PWA for owner Dhruva: body weight, food, walks/cardio, and gym logging. Soft gold + white chrome; a pot of gold grows with consistency (`goldDays`). Lose It–inspired diary + universal text/voice bar. Supabase backs gym data; weight/meals/walks are local-first Zustand until synced. Works from iPhone Safari / PWA; Capacitor later.

## Tech Stack
| Layer | Technology |
|-------|------------|
| Runtime | Node 20+, pnpm 9+ |
| App | Vite 5, React 18, TypeScript |
| Routing | react-router-dom v6 |
| Server state | TanStack React Query v5 |
| UI state | Zustand |
| Styling | Tailwind CSS, shadcn/ui, 21st.dev components, Inter Variable |
| Forms | react-hook-form, Zod |
| Database | Supabase Postgres |
| Storage | Supabase Storage bucket `exercise-images` |
| Offline | Dexie IndexedDB, vite-plugin-pwa Workbox precache/runtime cache |
| Charts | Recharts |
| Motion | framer-motion, canvas-confetti, react-countup |
| Search | Fuse.js |
| Deploy | Vercel auto-deploy from `main` |

## Directory Structure
```text
.
|-- src/                         # Web app source. Current scaffold is Vite; planned React PWA lives here.
|   |-- main.tsx                 # Planned React entry point and providers.
|   |-- App.tsx                  # Planned router, QueryClientProvider, toast, PR confetti mount.
|   |-- lib/                     # Supabase client, USER_ID, Dexie, offline queue, PR, streak, volume, formatting.
|   |-- hooks/                   # React Query and app state hooks.
|   |-- stores/                  # Zustand stores for PR events and UI preferences.
|   |-- components/              # App shell, exercise cards, set logger, rest timer, charts, badges.
|   `-- pages/                   # Today, Eat/Move (Log), Session, Library, Grow/History, Goals, You/Settings.
|-- public/                      # PWA manifest, icons, body-map SVG, static assets.
|-- supabase/migrations/         # Planned database migrations. Do not hand-edit applied migrations.
|-- scripts/                     # Planned seed, image backfill, and board import utilities.
|-- web/CLAUDE.md                # Web subsystem agent rules.
|-- db/CLAUDE.md                 # Database subsystem agent rules.
|-- wiki/README.md               # Long-form shared project notes.
|-- decisions/README.md          # Architecture and product decision records.
|-- docs/superpowers/plans/      # Plan artifacts. Keep `.gitkeep` so agents can create plans later.
|-- HANDOFF.md                   # Cross-agent contracts and integration checklist.
|-- DEPLOYMENT.md                # Vercel and Supabase deployment runbook.
|-- CLAUDE.md                    # Claude-oriented root instructions.
`-- AGENTS.md                    # Codex-oriented mirror of these instructions.
```

## Agent Model Routing
| Task Type | Model |
|-----------|-------|
| Isolated edits, boilerplate, narrow transforms in 1 to 2 files | Haiku |
| Feature implementation, multi-file integration, refactors | Sonnet |
| Architecture decisions, root-cause analysis, security review | Opus |

Escalate only when the lower tier fails with a concrete reasoning gap. Keep the task text, touched files, and verification output in the handoff when escalating.

## Key Entry Points
| What | Where |
|------|-------|
| React entry | `src/main.tsx` |
| App shell and router | `src/App.tsx` |
| Universal NL + mic bar | `src/components/UniversalCommandBar.tsx` |
| Pot of gold | `src/components/PotOfGold.tsx` |
| Diary (weight/meals/walks) | `src/stores/diaryStore.ts` |
| UI prefs / intentions / goldDays | `src/stores/uiStore.ts` |
| Supabase client | `src/lib/supabase.ts` |
| Single-user constant | `src/lib/user.ts` |
| Offline database | `src/lib/db.ts` |
| Offline queue | `src/lib/offline-queue.ts` |
| Session state | `src/stores/workoutStore.ts` |
| Set logging UI | `src/components/NaturalLanguageSetLogger.tsx` |
| Active session page | `src/pages/Session.tsx` |
| Exercise library | `src/pages/ExerciseLibrary.tsx` |
| Grow / history | `src/pages/History.tsx` (also `/grow`) |
| DB migration | `supabase/migrations/0001_init.sql` |
| Seed script | `scripts/seed-user-board.ts` |
| Image backfill script | `scripts/backfill-images.ts` |
| PWA assets | `public/manifest.webmanifest`, `public/icons/`, `public/body-map.svg` |
| Web subsystem rules | `web/CLAUDE.md` |
| DB subsystem rules | `db/CLAUDE.md` |

## Database Schema
Use Supabase Postgres. Generate client-side UUIDs for offline writes and let Postgres defaults fill IDs when online-only scripts insert rows.

| Table | Key columns | Purpose | Required policies and indexes |
|-------|-------------|---------|-------------------------------|
| `exercises` | `id uuid`, `slug text unique`, `name text`, `muscle_group muscle_group`, `secondary_muscles text[]`, `equipment equipment_kind`, `instructions text[]`, `setup_notes text[]`, `image_url text`, `image_style image_style`, `source text`, `archived boolean`, `created_at`, `updated_at` | Shared exercise catalog seeded from the owner's board, Free Exercise DB matches, user-created exercises, and machine setup notes like seat level/pin/setting. | Index `muscle_group`, `archived`, and GIN full-text search on `name`. Touch `updated_at` on update. |
| `sessions` | `id uuid`, `user_id uuid`, `started_at`, `ended_at`, `notes text` | One workout session. | Index `(user_id, started_at desc)`. Client uses the single hardcoded owner `USER_ID`. |
| `sets` | `id uuid`, `session_id uuid`, `exercise_id uuid`, `set_number int`, `weight_lb numeric(6,2)`, `reps int`, `rpe numeric(3,1)`, `is_warmup boolean`, `is_pr boolean`, `created_at` | Logged lift sets. | Foreign key to `sessions` with cascade delete. Foreign key to `exercises`. Index `session_id` and `(exercise_id, created_at desc)`. Trigger marks PRs before insert. |
| `body_weight_logs` | `id uuid`, `user_id uuid`, `logged_at date`, `weight_lb numeric(5,2)` | Body weight tracking for progress charts. | Unique `(user_id, logged_at)`. |
| `goals` | `id uuid`, `user_id uuid`, `name text`, `target_value numeric`, `target_unit text`, `achieved boolean`, `achieved_at date`, `created_at` | Goal checklist imported from the board's Goals column. | Keep user scoped by `user_id`. |

Enums:

```sql
create type muscle_group as enum (
  'chest','back','shoulders','arms','biceps','triceps',
  'legs','quads','hamstrings','glutes','calves',
  'core','forearms','full-body','cardio'
);

create type equipment_kind as enum (
  'barbell','dumbbell','machine','cable','bodyweight','kettlebell','other'
);

create type image_style as enum ('photo','silhouette','name-only');
```

PR rule: a non-warmup set is a PR when no previous non-warmup set for that exercise has a heavier weight, or the same weight with at least as many reps.

RLS pattern: locked MVP decision is single-user with no login and RLS disabled. Do not add multi-user auth, shared accounts, or public write paths until RLS is enabled on every user-owned table and policies require `user_id = auth.uid()`.

Storage: create public-read bucket `exercise-images`. Store exercise images at `exercise-images/<slug>.jpg`. Upload only validated image files from the create-exercise form or trusted seed scripts.

## Security Non-Negotiables
1. Keep secrets out of code. Read Supabase URL and anon key from environment variables and validate them at startup.
2. Validate every API and persistence boundary with Zod. Validate create-exercise, set logging, body weight logs, goals, and offline queue payloads.
3. Preserve the single-user boundary. Use the hardcoded `USER_ID` only for this owner. Do not add a second user while RLS is disabled.
4. Encrypt or avoid sensitive data at rest. Do not store credentials, tokens, private health notes, or raw camera metadata in IndexedDB or Supabase.
5. Protect uploads. Accept images only, cap file size, normalize filenames to slugs, and never trust client-provided storage paths.
6. Treat service-role keys as server-only. Never expose `SUPABASE_SERVICE_ROLE_KEY` to Vite, browser code, logs, or screenshots.

## Testing Standard
- Add regression coverage for every touched domain: session logging, PR detection, offline queue, exercise search, image upload, body weight, goals, and charts.
- Assert edge cases explicitly: zero reps rejected, decimal weights accepted, warmups excluded from PRs, duplicate body weight dates upserted, offline writes replayed once.
- Test integration boundaries: Supabase query wrappers, Dexie queue drain, route loaders/actions, and form validation.
- Mock external integrations at the HTTP boundary: Supabase client, Free Exercise DB fetches, and browser online/offline events.
- Keep log-path tests fast. Weight input, reps stepper, and save-set behavior must not depend on animation timing.

## Agent-Driven Development Workflow
Every non-trivial task:

1. Decompose into 15-minute units with one dominant risk and a verifiable done condition.
2. Dispatch only independent units in parallel. Use separate files or clearly non-overlapping ownership.
3. Give each implementer the full task text, relevant plan excerpt, allowed files, forbidden files, and verification command.
4. Run spec review after implementation. Read the code and compare it to requirements. Do not trust the implementer's report.
5. Run quality review after spec review. Check naming, tests, maintainability, accessibility, mobile ergonomics, and offline behavior.
6. Commit per task, not per feature, when the workspace policy asks for commits.
7. Update `HANDOFF.md` when a task changes contracts, routes, schema, queue payloads, event names, or deployment assumptions.

Parallel dispatch: use only for independent files with no shared state. Sequential dispatch: use when tasks touch schema, shared hooks, offline queue, app shell, routing, or package configuration.

## Common Task Patterns
### Adding a route
1. Add the page under `src/pages/`.
2. Register the route in `src/App.tsx`.
3. Add navigation only if it belongs in the five-tab shell: **Today, Eat, Move, Grow, You**.
4. Use route params for detail pages: `/session/:id`, `/exercises/:slug`, `/history/:sessionId`.
5. Prefer routing legacy paths (`/log`, `/progress`, `/history`, `/settings`) to the current IA rather than resurrecting old tabs.
6. Add route tests for redirect behavior and empty states.

### Logging a set
1. Validate `weight_lb`, `reps`, optional `rpe`, `is_warmup`, `session_id`, and `exercise_id`.
2. Write with a client-generated UUID so offline replay is idempotent.
3. Save to Supabase when online and enqueue to Dexie when offline or failed.
4. Update React Query cache and Zustand PR state only after the write result is known.
5. Keep the input path motion-free.

### Extending the DB schema
1. Add a new migration under `supabase/migrations/`.
2. Include indexes, constraints, triggers, and rollback notes in the migration comment.
3. Update `db/CLAUDE.md`, `HANDOFF.md`, and the schema table in this file when contracts change.
4. Add tests for query wrappers and offline payload compatibility.
5. Never mutate an already-applied migration. Add a follow-up migration.

### Adding an exercise image source
1. Keep unmatched exercises as `image_style='name-only'`.
2. Fetch external exercise metadata in a script or trusted server-side process.
3. Upload images to Supabase Storage using slugged filenames.
4. Update `source`, `image_url`, and `image_style` together.
5. Log unmatched names without failing the whole backfill.

### Updating charts or progress calculations
1. Put math in `src/lib/volume.ts`, `src/lib/pr.ts`, or `src/lib/streak.ts`.
2. Keep components presentational.
3. Use tabular numbers for weights, reps, and volume.
4. Add tests for empty data, single-session data, and multi-week data.

## gstack + Superpowers Workflow
The exact `gstack` and `using-superpowers` skills are not installed in this session. Follow the equivalent workflow below and do not block on missing skill commands. If an agent does not recognize a referenced skill, check the inactive skills folder plus `.agents/skills/` and `.codex/skills/` before replacing the workflow.

| Phase | Equivalent workflow guidance |
|-------|------------------------------|
| 1 IDEATION | Use office-hours style product framing. Restate the user, problem, value, and non-goals. |
| 2 PLANNING | Use autoplan, writing-plans, and blueprint style outputs: scoped units, risks, dependencies, and verification. |
| 3 IMPLEMENT | Use subagent-driven-development and git-worktree discipline when tasks are independent. |
| 4 REVIEW | Run code review, QA, security review, and health checks before release. |
| 5 RELEASE | Ship through PR, Vercel deploy, Supabase migration check, and post-deploy smoke tests. |
| 6 REFLECT | Record durable decisions in `decisions/` and update handoff notes before pausing. |

## Environment Setup
| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_SUPABASE_URL` | Yes | Browser-safe Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Yes | Browser-safe anon key for Supabase client. |
| `SUPABASE_SERVICE_ROLE_KEY` | Scripts only | Server-side seed/backfill/admin scripts. Never expose to Vite. |
| `SUPABASE_PROJECT_REF` | Deploy/admin only | Identifies the Supabase project for CLI or CI tasks. |
| `VERCEL_PROJECT_ID` | CI only | Links Vercel project deployments when needed. |
| `VERCEL_ORG_ID` | CI only | Links Vercel team/account deployments when needed. |
| `CONDUCTOR_PORT` | Local optional | Allows Conductor workspaces to run Vite on unique ports. |

Local commands:

```bash
pnpm install
pnpm dev
pnpm build
pnpm preview
```
