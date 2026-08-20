# Lift MCP writes + exercise resolve

**Status:** Approved in chat (2026-08-07)  
**Owner:** Dhruva (single-user)

## Goal

Claude chat (built-in mic/text) can resolve messy exercise names, confirm numbered candidates, log sets into the **calendar day** session, and query last-time history for progressive overload. No in-app dictation. No daily empty sessions.

## Session rule

- Rest day = **no** session row (“no workout recorded”).
- Do **not** pre-create empty sessions each day.
- `log_sets` finds the owner’s session for `localDate` (prefer open / earliest). If none, **create one** then append sets.
- No notes field on writes.

## Tools

| Tool | Auth / gate | Purpose |
|------|-------------|---------|
| `resolve_exercise` | read | Search catalog; return exact match **or** numbered candidates (1…N) for Claude to ask the user |
| `log_sets` | `LIFT_MCP_WRITES_ENABLED===true` | Append lift sets by **exerciseId** to that day’s session |
| Existing reads | — | Sessions, detail, history, PRs |

Remove the unused `log_set_draft` stub (replaced by `log_sets`).

### `resolve_exercise`

Input: `query` (messy name), optional `limit` (default 8).

Output shape:

```json
{
  "query": "reverse bar curl",
  "status": "exact" | "ambiguous" | "none",
  "candidates": [
    { "n": 1, "id": "…", "slug": "…", "name": "…", "muscleGroup": "…", "equipment": "…", "archived": false }
  ]
}
```

- `exact`: single clear top match (score ≥ 90 or sole match).
- `ambiguous`: multiple; Claude presents numbered list; user says “1”.
- `none`: empty candidates.

### `log_sets`

Input:

- `localDate` optional YYYY-MM-DD (default: today in `timezone` or UTC date)
- `timezone` optional IANA (default `America/Los_Angeles` for this owner unless provided)
- `sets`: array of `{ exerciseId, weightLb, reps, isWarmup? }` (1–40)

Behavior:

1. Gate on writes flag.
2. Validate each set (positive weight + reps).
3. Verify each `exerciseId` exists.
4. Ensure day session (find or create).
5. Insert sets with client UUIDs; `set_number` = next per exercise in that session.
6. PR marking via existing DB trigger.
7. Return session id + logged sets summary.

### Chat routine (Claude-side)

1. Parse dump → candidate names + numbers.
2. `resolve_exercise` per name → confirm numbers with user.
3. User confirms list → `log_sets`.
4. Optional `get_exercise_history` for last-time / overload questions.
5. Brief summary.

## Cleanup

One-shot / scripted delete of **0-set** sessions that are clear junk (e.g. Aug 4 same-second duplicates). Keep any session with sets. Do not create daily empties going forward.

## Non-goals

- Diary tools
- In-app voice
- Cardio write fields in this pass (lift only)
- Auto-pick ambiguous exercises without user confirmation
