# Workout surface and image pairing

## Goal

Make the Move tab a focused workout-launching surface, put calendar history on Grow, remove duplicated workout-resume calls to action, and make the exercise library show only accurate Supabase-backed images directly beside their exercise names.

## Scope

### Move

- Show only workout actions and the current workout state.
- If today's workout is open, render one resume entry, not multiple resume calls to action.
- Keep access to workout templates and an empty-workout start action.
- Remove the calendar, monthly statistics, selected-day panel, and walks/cardio logging from Move.

### Grow

- Add the gym calendar, month statistics, and selected-day workout panel to Grow.
- Keep existing pot-of-gold, lift progress, and recent gym activity content.

### Exercise library

- Render an image-left row for each exercise: thumbnail, name, muscle group/equipment, and navigation affordance.
- Use the existing `imageUrl` when present; it is hydrated from the `exercises.image_url` Supabase column.
- For the 100 current exercises without a verified match, use a labeled no-photo placeholder. Do not add approximate images.
- New exercises use the same row component; a provided image appears immediately, otherwise the no-photo state appears.

### Supabase sync

- Keep automatic boot and reconnect synchronization.
- In Settings, display live configuration/reachability status and provide a manual refresh control that runs the same drain-then-hydrate flow.
- The refresh control must prevent duplicate concurrent sync requests and report its latest result.

## Non-goals

- Do not archive or delete the 250 PDF-imported exercise rows.
- Do not replace the verified external images, add approximate image matches, or extract artwork from the PDF screenshots.
- Do not change database schema, authentication, or RLS.
- Do not add a background polling loop; synchronization remains boot, reconnect, and user-requested refresh.

## Data and error behavior

- Supabase image URLs remain the source of truth; image load failure uses the same no-photo fallback instead of a broken image.
- A manually requested sync remains safe when offline or unconfigured: the UI reports status and preserves local data.
- The app keeps one open-workout resume path at a time, based on today's active session.

## Verification

- Unit/UI tests prove the image-left layout, no-photo fallback, and failed image fallback.
- Move tests prove exactly one open-workout resume action and absence of calendar/cardio UI.
- Grow tests prove the calendar is present there.
- Supabase sync tests prove a manual refresh runs the same bootstrap/hydration sequence and handles an unavailable connection.
- Run TypeScript, the targeted tests, then the full test suite and production build before shipping.
