# Deployment

Deploy the Weight Tracker PWA with Vercel for the web app and Supabase for database, storage, and seed data.

## Environment Variables
| Variable | Required | Where | Purpose |
|----------|----------|-------|---------|
| `VITE_SUPABASE_URL` | Yes | Local `.env.local`, Vercel | Browser-safe Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Yes | Local `.env.local`, Vercel | Browser-safe anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Scripts only | Local shell or secure CI secret | Seed and backfill scripts only. Never expose to browser code. |
| `SUPABASE_PROJECT_REF` | Admin only | Local shell or CI | Supabase CLI/project targeting. |
| `VERCEL_PROJECT_ID` | CI optional | Vercel/GitHub secrets | Links CLI deploys to the project. |
| `VERCEL_ORG_ID` | CI optional | Vercel/GitHub secrets | Links CLI deploys to the team/account. |

## Infrastructure
```mermaid
flowchart LR
  User[iPhone Safari PWA] --> Vercel[Vercel static app]
  Vercel --> Browser[React app in browser]
  Browser --> Query[React Query cache]
  Browser --> Dexie[Dexie IndexedDB pending queue]
  Query --> Supabase[(Supabase Postgres)]
  Browser --> Storage[Supabase Storage exercise-images]
  Dexie --> Supabase
  Scripts[Seed and backfill scripts] --> Supabase
  Scripts --> Storage
```

## Quick Start
1. Install dependencies.

   ```bash
   pnpm install
   ```

2. Create `.env.local` with browser-safe Supabase values.

   ```bash
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-key>
   ```

3. Run the app locally.

   ```bash
   pnpm dev
   ```

4. Build before deploying.

   ```bash
   pnpm build
   ```

5. Deploy from `main` through Vercel auto-deploy.

## Supabase Setup
1. Create a Supabase project.
2. Apply `supabase/migrations/0001_init.sql` when it exists.
3. Create public-read Storage bucket `exercise-images`.
4. Set local script-only secrets in the shell when running seed or backfill.
5. Verify `exercises`, `sessions`, `sets`, `body_weight_logs`, and `goals` exist before running the app.

## Vercel Setup
1. Import the GitHub repo into Vercel.
2. Set framework preset to Vite.
3. Set build command to `pnpm build`.
4. Set output directory to `dist`.
5. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
6. Enable auto-deploy from `main`.

## Runbook
| Symptom | Check | Fix |
|---------|-------|-----|
| Blank app after deploy | Browser console and Vercel build output | Confirm `pnpm build` passes and entry file matches Vite config. |
| Supabase requests fail | Network tab and env vars | Verify Vercel has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. |
| Images do not load | Storage bucket and `image_url` values | Confirm bucket is public-read and paths use `exercise-images/<slug>.jpg`. |
| Offline writes do not sync | Dexie pending table and online events | Confirm queued payloads have UUIDs and drain on `online` or `visibilitychange`. |
| PR badges missing | `sets.is_pr` value after insert | Verify trigger exists and warmup sets are excluded. |
| PWA install prompt missing | Manifest and icons | Confirm `public/manifest.webmanifest`, icons, and theme-color metadata exist. |

## Debugging Guide
- Reproduce locally with `pnpm dev` before changing deployment settings.
- Build locally with `pnpm build` before pushing release fixes.
- Inspect Supabase table rows directly when UI state and persisted state disagree.
- Clear IndexedDB only after exporting pending writes or confirming the queue is empty.
- Treat service-role key exposure as a release blocker. Rotate the key if it appears in logs, client code, screenshots, or committed files.
