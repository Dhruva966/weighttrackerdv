# Implementation plan: workout surface and image pairing

## Goal

Focus Move on workout actions, relocate calendar history to Grow, remove resume duplication, show verified Supabase images at the left of exercise names, and expose an active Supabase refresh control in Settings.

## Structure

| Area | Files | Responsibility |
|---|---|---|
| Exercise image rows | `src/components/ExerciseCard.tsx`, `ExerciseImage.tsx`, `ExerciseLibrary.tsx`, new component test | Present accurate image-left rows and robust no-photo fallback. |
| Move surface | `src/pages/Move.tsx`, `src/pages/Move.test.tsx` | One resume/start action and templates, without calendar or cardio UI. |
| Grow integration | `src/App.tsx`, route/UI test | Place the calendar with month stats and day panel on Grow. |
| Active sync | `src/hooks/useSupabaseBootstrap.ts`, `src/pages/Settings.tsx`, hook/page tests | Reuse drain-then-hydrate bootstrap for a guarded manual refresh and status. |
| Documentation | `HANDOFF.md` | Keep navigation and Supabase-sync contracts accurate. |

## Constraints

- Do not modify Supabase records, schemas, storage, RLS, or the current verified image URLs.
- The current 150 verified image URLs remain the only image matches; name-only rows must remain visibly intentional.
- Preserve automatic boot/reconnect synchronization.
- Preserve the existing dirty user changes in `AGENTS.md`, `CLAUDE.md`, `HANDOFF.md`, `src/App.tsx`, and `src/test/flows.integration.test.tsx` unless a planned integration necessarily touches the same concern.

## Tasks

### 1. Exercise-library image-left row

**Files:** `src/components/ExerciseCard.tsx`, `src/components/ExerciseImage.tsx`, `src/pages/ExerciseLibrary.tsx`, new `src/components/ExerciseCard.test.tsx`.

1. Write tests that assert a photo row exposes an image before its name and an accessible no-photo state is shown for no `imageUrl` and image-load failure.
2. Run the new test and observe its expected failure.
3. Change the reusable card/image components to a mobile-first left-thumbnail row; retain metadata, setup note truncation, and the exercise detail link.
4. Change the library to a single-column list so the row pairing remains unambiguous at all screen widths.
5. Re-run the component test.

**Verification:** `pnpm vitest run src/components/ExerciseCard.test.tsx`

### 2. Focus the Move page

**Files:** `src/pages/Move.tsx`, `src/pages/Move.test.tsx`.

1. Replace the existing Move expectations with tests for one current-workout action, an empty-workout action when no session is open, and no calendar/cardio text.
2. Run the test and observe its expected failure.
3. Remove the calendar, monthly stat path, day panel, walks/cardio section, and duplicated banner path from Move.
4. Keep templates, conditionally expose one resume link or one start-empty link, and retain exercise browsing.
5. Re-run Move tests.

**Verification:** `pnpm vitest run src/pages/Move.test.tsx`

### 3. Relocate calendar history to Grow

**Files:** `src/App.tsx`, new `src/App.test.tsx` or an existing route-level test file.

1. Write a route-level test proving Grow renders the gym calendar and Move does not.
2. Run the test and observe its expected failure.
3. Add `InteractiveGymCalendar` with month statistics to Grow while preserving the pot, lift progress, and feed.
4. Re-run the route-level test.

**Verification:** `pnpm vitest run src/App.test.tsx`

### 4. Active Supabase refresh in Settings

**Files:** `src/hooks/useSupabaseBootstrap.ts`, `src/pages/Settings.tsx`, new hook/page test.

1. Write a test that a requested refresh invokes bootstrap, drains before hydrate, disables a second request in flight, and displays the result.
2. Run it and observe the expected failure.
3. Extract/reuse the existing run routine as a guarded refresh function while retaining boot and reconnect behavior.
4. Add a labelled Settings action and accessible status text for configured, connected, offline, and sync-in-progress states.
5. Re-run targeted tests.

**Verification:** targeted hook/page test plus `pnpm vitest run src/lib/supabase-sync.test.ts src/lib/supabase-hydrate.test.ts`

### 5. Integration, review, and ship

1. Review every diff against the approved spec and preserve existing user changes.
2. Update `HANDOFF.md` with Move/Grow ownership and active Supabase-refresh behavior.
3. Run TypeScript, targeted tests, full tests, and production build.
4. Run the `myship` workflow: classify scope, document the test plan, commit only this change, open/update a PR only if GitHub access/configuration permits, and verify the detected deployment target.

## Risks and decisions

- “Active sync” means boot/reconnect automatic sync plus a guarded user-triggered refresh; no polling loop is introduced.
- Existing locally created camera-object URLs remain displayable for the active session but are not a new upload implementation; this plan does not broaden storage behavior.
- No record archival occurs; it would conflict with keeping the current catalog visible.
