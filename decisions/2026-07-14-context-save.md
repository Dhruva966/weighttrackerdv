# Context Save — Aloo (Jul 14, 2026)

## Session identity
- **Product:** Aloo (was Weight Tracker / Lift)
- **Owner:** Dhruva Vutukury (`vutultadhruva@gmail.com`)
- **Branch:** `cursor/mom-first-ui-e6b2`
- **PR:** https://github.com/dhruva966/weighttrackerdv/pull/6
- **Preview:** https://pulse-robots-coastal-ireland.trycloudflare.com (ephemeral Cloudflare quick tunnel; restart if dead)

## Locked product choices
| Surface | Choice |
|--------|--------|
| Brand | **Aloo** (header, title, manifest) |
| User name | **Dhruva** (not “Aloo” as person name) |
| Theme | Soft gold + white |
| Growth metaphor | **Pot of gold** (`goldDays`), not garden leaf |
| Onboarding | Stashed |
| Bottom nav | Today · Eat · Move · Grow · You |
| Capture | Sticky universal text + mic bar |
| Voice MVP | Web Speech API; Groq Whisper still queued |
| Calories | Quiet macros; not leftover-calorie hero |

## What is wired for real (local persistence)
- **Body weight:** `diaryStore` — seed ~169 lb; NL “weighed 169” upserts
- **Meals:** NL → confirm → `addMeal` persists to diary
- **Movements / walks:** NL “walking 30 min” → `addMovement` (universal bar, Move, Session)
- **Intentions:** add / toggle / remove on Goals; Today links “Add / edit”
- **Gym sets/sessions:** `workoutStore` (real); charts use `buildLiftProgress` (no synthetic UI series)

## Key files
- Shell: `src/App.tsx`, `src/components/UniversalCommandBar.tsx`, `src/components/PotOfGold.tsx`
- Diary: `src/stores/diaryStore.ts`, `src/lib/meal-from-text.ts`, `src/lib/movement-from-text.ts`
- Session: `src/pages/Session.tsx`, `src/components/ExercisePicker.tsx`, `src/components/MovementLogger.tsx`
- Theme: `tailwind.config.js`, `src/index.css`
- Persist keys: `aloo-ui-v1`, `aloo-diary-v1`

## Open / known issues (must resume)
1. **Exercise search icon overlap (ACTIVE):** User still reports “Search exercises to add” overlapping the magnifying glass on Session. Fix attempted via `.field-with-leading-icon { padding-left: 2.75rem }` after `.field`. Served CSS/JS on tunnel includes the class, but UI still appears broken in Cursor preview — **do not trust cascade; rewrite search input without sharing `.field` padding**, use inline `paddingLeft` or a self-contained input style, then visually verify. Same bug likely in `ExerciseLibrary.tsx`.
2. **Mic optical centering:** User previously said mic was high relative to the text box; last pass used shared grid row height — re-check after search fix.
3. **Leaner buttons:** Partially done (Open Eat/Move + globals ~2rem). Session exercise rows still use `min-h-14` and feel fat.
4. **Meals/macros:** Local-only estimates; no USDA / Supabase meals table yet.
5. **Body weight / movements:** Not synced to Supabase `body_weight_logs` yet.
6. **Groq Whisper edge:** Still “next” for iPhone installed PWA STT.
7. **Context-save skill / gstack skills:** Not installed in this cloud environment; use `HANDOFF.md` + `decisions/` + this file as the substitute.

## Latest commits on branch (high level)
- Aloo gold rebrand + pot of gold + real diary seed
- Slimmer command bar / buttons; remove header compounding label and Today lead copy
- Editable intentions
- Walk persistence + Session movement logger
- Search padding class (may still need hard rewrite — see open issue #1)

## Next agent actions (priority)
1. Hard-fix ExercisePicker/Library search input so placeholder never intersects icon (avoid relying on `.field` + override).
2. Slim Session exercise pick rows + End button.
3. Optionally wire diary weight/meals/movements to Supabase when ready.
4. Restart Cloudflare tunnel after ship; hard-refresh / clear SW cache when verifying UI.
