# ADR: Garden shell + universal voice command (Jul 2026)

## Context
Mom-first PWA must track body weight, food, and movement (walks + lifting) without siloed apps. User asked to stash onboarding, adopt greenery/leaf-growth metaphor, mimic Lose It! logging friction (not calorie scoreboard), and drive capture from one text+voice bar.

## Research summary
- **Lose It!**: Day diary unifies meals + exercise + weight; voice/photo are capture shortcuts; Dashboard is calorie-leftover scoreboard (avoid as hero); streaks are “showed up” not perfection.
- **Free STT**: Web Speech API when healthy (Chrome / Safari tab); iPhone installed PWA often fails → MediaRecorder + Groq Whisper edge (free tier) as fallback. MVP ships Web Speech + editable transcript; Groq Whisper edge is next.

## Decision
| Surface | Choice |
|---------|--------|
| Onboarding | **Stashed** (`onboardingComplete` forced true) |
| Theme | Soft greenery — leaf/sage paper, deep leaf accent |
| Progress metaphor | Garden leaf that grows with consistency (not calorie rings) |
| Bottom nav | **Today · Eat · Move · Grow · You** |
| Capture | Sticky **universal command bar** (type + mic) above content |
| Voice MVP | Web Speech API → editable text → local intent router → confirm/toast |
| Calories | Quiet macros on Today; never leftover-calorie as primary hero |

## Non-goals (this pass)
- Real meal persistence / USDA macros
- Groq Whisper edge function (queued)
- Sleep tracking
- Social / Discover tab

## Routes
`/` Today · `/eat` meal log · `/move` movement/workout · `/grow` history+garden · `/you` settings · legacy `/log` → `/eat`
