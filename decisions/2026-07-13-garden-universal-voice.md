# ADR: Garden shell + universal voice command (Jul 2026)

## Status
**Partially superseded (Jul 14, 2026).** Voice + Lose It logging decisions still stand. Visual metaphor, brand, and diary persistence were updated in `2026-07-14-aloo-gold-diary.md` (Aloo, gold/white, pot of gold, local diary).

## Context
Mom-first PWA must track body weight, food, and movement (walks + lifting) without siloed apps. User asked to stash onboarding, adopt greenery/leaf-growth metaphor, mimic Lose It! logging friction (not calorie scoreboard), and drive capture from one text+voice bar.

## Research summary
- **Lose It!**: Day diary unifies meals + exercise + weight; voice/photo are capture shortcuts; Dashboard is calorie-leftover scoreboard (avoid as hero); streaks are “showed up” not perfection.
- **Free STT**: Web Speech API when healthy (Chrome / Safari tab); iPhone installed PWA often fails → MediaRecorder + Groq Whisper edge (free tier) as fallback. MVP ships Web Speech + editable transcript; Groq Whisper edge is next.

## Decision (original Jul 13)
| Surface | Choice |
|---------|--------|
| Onboarding | **Stashed** (`onboardingComplete` forced true) — still true |
| Theme | Soft greenery → **superseded by soft gold + white** |
| Progress metaphor | Garden leaf → **superseded by pot of gold** |
| Bottom nav | **Today · Eat · Move · Grow · You** — still true |
| Capture | Sticky **universal command bar** (type + mic) — still true |
| Voice MVP | Web Speech API → editable text → local intent router — still true |
| Calories | Quiet macros; never leftover-calorie hero — still true |

## Non-goals (this pass)
- Real meal persistence / USDA macros (meals now local diary only)
- Groq Whisper edge function (queued)
- Sleep tracking
- Social / Discover tab

## Routes
`/` Today · `/eat` meal log · `/move` movement/workout · `/grow` history+garden · `/you` settings · legacy `/log` → `/eat`
