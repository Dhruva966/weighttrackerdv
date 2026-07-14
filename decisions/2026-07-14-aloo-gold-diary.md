# ADR: Aloo gold shell + diary + pot of gold (Jul 2026)

## Status
Accepted. Supersedes visual metaphor in `2026-07-13-garden-universal-voice.md` (leaf/greenery → pot of gold / soft gold-white). Voice + Lose It logging lessons from that ADR still apply.

## Context
Owner (Dhruva) wanted the product named **Aloo**, a soft golden/white look, a pot of gold that grows with consistency instead of a leaf, no synthetic mom/demo stats, walk NL like “walking 30 min”, malleable daily intentions, and leaner chrome. Onboarding stays stashed.

## Decision
| Surface | Choice |
|---------|--------|
| Brand | **Aloo** |
| Display name | **Dhruva** |
| Theme | Soft gold (`#C4A35A`) on white/cream paper |
| Metaphor | Pot of gold (`goldDays`, `tendGold`) |
| Nav | Today · Eat · Move · Grow · You |
| Capture | Sticky universal text + mic bar |
| Diary | Local Zustand `diaryStore`: weight, meals, movements |
| Intentions | Add / toggle / remove on Goals |
| Walks | `parseMovementText` + persist; Session/Move have `MovementLogger` |
| Charts | Real `buildLiftProgress` only in UI |
| Search UI | Flex sibling icon+input (not absolute over `.field`) |
| Voice | Web Speech MVP; Groq Whisper still queued |

## Consequences
- Brand/docs must say Aloo, not Lift/Weight Tracker as the product name (repo may keep historical package name).
- Local diary is not yet mirrored to `body_weight_logs` / meal tables — sync is a follow-up.
- Cloudflare quick tunnels are ephemeral for agent previews; Vercel remains deploy path from `main`.
