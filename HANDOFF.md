# Weight Tracker Handoff

Use this file when one agent hands work to another. Keep it short, contract-focused, and current.

## Current Product Shape
Weight Tracker is a single-user gym PWA for owner `vutukurydhruva@gmail.com`. The MVP has no login, uses one hardcoded `USER_ID`, stores data in Supabase Postgres, stores exercise images in Supabase Storage, and keeps offline writes in Dexie until they replay.

## Subsystems
| Subsystem | Owner doc | Responsibilities |
|-----------|-----------|------------------|
| Web PWA | `web/CLAUDE.md` | Routes, pages, components, React Query, Zustand, Dexie, PWA shell, animation discipline. |
| Database | `db/CLAUDE.md` | Supabase schema, migrations, storage bucket, seed data, image backfill, offline payload contracts. |

## Data Contracts
| Contract | Shape | Notes |
|----------|-------|-------|
| Exercise | `{ id, slug, name, muscle_group, secondary_muscles, equipment, instructions, image_url, image_style, source, archived }` | `slug` is stable. `image_style='name-only'` is valid and must render. |
| Session | `{ id, user_id, started_at, ended_at, notes }` | `/session/new` creates a session and redirects to `/session/:id`. |
| Set | `{ id, session_id, exercise_id, set_number, weight_lb, reps, rpe, is_warmup, is_pr, created_at }` | `weight_lb` accepts decimals. `reps > 0`. Client-generated `id` supports offline replay. |
| BodyWeightLog | `{ id, user_id, logged_at, weight_lb }` | Unique per user/date. Use upsert for edits. |
| Goal | `{ id, user_id, name, target_value, target_unit, achieved, achieved_at, created_at }` | Imported from board goals and editable later. |
| PendingWrite | `{ id, table, op, payload, ts }` | Dexie queue drains in insertion order on `online` and `visibilitychange`. |

## Event Types
| Event | Producer | Consumer | Payload |
|-------|----------|----------|---------|
| `set.saved` | `SetLogger` or set hook | React Query cache, rest timer | `{ setId, sessionId, exerciseId }` |
| `set.pr` | Supabase insert response or PR wrapper | `prStore`, toast, confetti | `{ setId, exerciseId, weight_lb, reps }` |
| `session.completed` | Session page | Session summary, Today page | `{ sessionId, totalVolume, setCount, prCount }` |
| `offline.queued` | Offline queue | Toast/status UI | `{ table, op, id }` |
| `offline.synced` | Offline queue drain | Toast/status UI, React Query invalidation | `{ count }` |
| `exercise.image_backfilled` | Backfill script | Logs only | `{ slug, sourceUrl, storagePath }` |

## Integration Checklist
- Route map matches root `CLAUDE.md`: `/`, `/session/new`, `/session/:id`, `/exercises`, `/exercises/new`, `/exercises/:slug`, `/progress`, `/history`, `/history/:sessionId`, `/goals`, `/settings`.
- Supabase migration exists before hooks or seed scripts depend on tables.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present locally and in Vercel.
- Storage bucket `exercise-images` exists with public read.
- Seed JSON is user-verified before first seed run.
- Offline queue writes use client-generated UUIDs.
- PR badge, toast, and confetti depend on persisted `is_pr`, not a client guess alone.
- Log path has no motion on weight input, reps buttons, or save-set tap.
- All changed contracts are reflected in `CLAUDE.md`, `AGENTS.md`, subsystem docs, and this file.

## Actions Needing Endpoints or Shared Hooks
| Action | Required implementation |
|--------|-------------------------|
| Start workout | Create `sessions` row, then redirect to `/session/:id`. |
| Save set | Validate payload, insert `sets`, queue offline on failure, update cache. |
| Finish workout | Patch `sessions.ended_at`, calculate summary, navigate to recap. |
| Create exercise | Validate form, upload optional image, insert `exercises`. |
| Backfill image | Fetch Free Exercise DB, upload to Storage, update exercise image fields. |
| Log body weight | Upsert `body_weight_logs` by `(user_id, logged_at)`. |
| Toggle goal | Patch `goals.achieved` and `achieved_at`. |
| Export data | Read all owner-scoped rows and download JSON or CSV. |

## Open Handoff Notes
- **Aloo shell (Jul 2026):** Brand is **Aloo**. Soft gold + white. Pot of gold grows with consistency (`goldDays`). User display name **Dhruva**. Bottom nav: Today · Eat · Move · Grow · You. Sticky universal command bar (Web Speech). Onboarding stashed.
- Real data: body weight + meals via `diaryStore` (seeded with Dhruva ~169 lb, empty meals). Lift charts use `buildLiftProgress` on real sets — no synthetic series in UI. Calendar/history built from workout + diary logs.
- See `decisions/2026-07-13-garden-universal-voice.md` (superseded metaphor: pot of gold, not leaf).
- Gym session logging remains real via workout store + Supabase when configured.
