# Context Save — Aloo (Jul 14, 2026)

## Session identity
- **Product:** Aloo (was Weight Tracker / Lift)
- **Owner:** Dhruva Vutukury (`vutultadhruva@gmail.com`)
- **Branch:** `cursor/mom-first-ui-e6b2`
- **PR:** https://github.com/dhruva966/weighttrackerdv/pull/6
- **Preview:** Cloudflare quick tunnels are ephemeral; restart `pnpm preview` + `cloudflared tunnel --protocol http2 --url http://127.0.0.1:4173` as needed

## Locked product choices
| Surface | Choice |
|--------|--------|
| Brand | **Aloo** |
| User name | **Dhruva** |
| Theme | Soft gold + white |
| Growth metaphor | Pot of gold (`goldDays`) |
| Onboarding | Stashed |
| Bottom nav | Today · Eat · Move · Grow · You |
| Capture | Sticky universal text + mic bar |
| Voice MVP | Web Speech; Groq Whisper queued |
| Calories | Quiet macros |

## Wired for real (local diary + gym store)
- Body weight (~169 seed), meals, movements/walks → `diaryStore`
- Intentions add/toggle/remove
- Gym sessions/sets → `workoutStore` (+ Supabase when configured)
- Charts → `buildLiftProgress` (no synthetic UI series)
- Exercise search → flex sibling icon+input (overlap fixed)

## Authoritative docs after this chat
- `README.md`, `HANDOFF.md`, `CLAUDE.md`, `AGENTS.md`, `web/CLAUDE.md`
- `decisions/2026-07-14-aloo-gold-diary.md` (current ADR)
- `decisions/2026-07-13-garden-universal-voice.md` (voice/Lose It; greenery superseded)

## Follow-ups
- Sync diary to Supabase; Groq Whisper edge; USDA/photo meals; keep verifying preview with hard refresh / cleared SW
