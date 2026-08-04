# Lift remote MCP connector (Claude custom connector)

**Status:** Approved approach A (2026-08-04)  
**Owner:** Dhruva (single-user)

## Goal

Expose gym data in Supabase to Claude.ai / Desktop / mobile via a **custom remote MCP connector**. Lift remains the app; Claude is the chat surface for questions about progression.

## Non-goals (v1)

- In-app chatbot UI
- Diary (weight / walks) — still local-first
- Write tools (log sets) — gated off; add later behind `LIFT_MCP_WRITES_ENABLED`
- Anthropic directory verification / public listing
- OAuth polish (bearer first; OAuth only if headers UI unavailable)

## Architecture

```
Claude (custom connector)
  → HTTPS POST Streamable HTTP
  → Supabase Edge Function `lift-mcp`
  → Bearer check (LIFT_MCP_TOKEN)
  → service role → Postgres (sessions / sets / exercises)
  → scoped to USER_ID
```

- Deploy with `verify_jwt = false` (Claude’s Bearer is not a Supabase JWT).
- Stateless transport: `sessionIdGenerator: undefined`.
- Hono `basePath('/lift-mcp')`.

## Auth

1. Prefer Claude connector **Request headers**: `authorization` = `Bearer <LIFT_MCP_TOKEN>` (include the `Bearer ` prefix).
2. If the UI lacks request headers (beta), document OAuth fallback; do not block v1.

## v1 tools (read-only)

| Tool | Purpose |
|------|---------|
| `list_recent_sessions` | Recent workouts + set/PR/volume summary |
| `get_session_detail` | One session with exercises and sets |
| `get_exercise_history` | Resolve by name/slug; recent working sets + e1RM |
| `list_recent_prs` | Recent `is_pr` lift sets |

Write tools must check `LIFT_MCP_WRITES_ENABLED === 'true'` and return a clear error when false.

## Success criteria

1. Deployed URL answers `initialize` / `tools/list` / each tool with valid Bearer.
2. 401 without Bearer or with wrong token.
3. Claude (or curl E2E script) can answer “what did I lift last week?” from live data.
4. Docs in HANDOFF + DEPLOYMENT explain connect steps.

## Risks

- Request-header auth beta on some Claude accounts
- Edge cold start vs Claude’s ~30s tool timeout
- Stateful MCP sessions break on serverless if not disabled
- Service role + public URL = token leak = full DB read (and later write)
