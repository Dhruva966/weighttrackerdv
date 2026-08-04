# Lift MCP Connector Implementation Plan

> **For agentic workers:** Implement task-by-task. Checkboxes track progress.

**Goal:** Ship a read-only Supabase Edge MCP server so Claude custom connectors can query gym sessions/sets/PRs.

**Architecture:** Stateless Streamable HTTP on `lift-mcp` Edge Function; Bearer `LIFT_MCP_TOKEN`; service-role Supabase client scoped to `USER_ID`; writes gated by env flag.

**Tech Stack:** Deno Edge Functions, `@modelcontextprotocol/sdk@1.25.3`, Hono, Zod, Supabase JS.

---

## File map

| File | Role |
|------|------|
| `supabase/functions/lift-mcp/index.ts` | MCP server + tools + auth |
| `supabase/config.toml` | `verify_jwt = false` for `lift-mcp` |
| `scripts/push-supabase-secrets.ts` | Push `LIFT_MCP_TOKEN` (+ keep Anthropic) |
| `scripts/deploy-supabase-functions.ts` | Deploy `lift-mcp` too |
| `scripts/test-lift-mcp-e2e.ts` | Live E2E against deployed URL |
| `src/lib/lift-mcp-format.test.ts` | Pure helper tests (volume / e1RM / slug) |
| `src/lib/lift-mcp-format.ts` | Shared formatting helpers (mirrored in edge for Deno) |
| `docs/superpowers/specs/2026-08-04-lift-mcp-connector-design.md` | Design |
| `HANDOFF.md` / `DEPLOYMENT.md` | Connect + secrets runbook |

## Tasks

- [x] Design approved (approach A)
- [x] Implement format helpers + unit tests
- [x] Implement Edge Function
- [x] Wire config + deploy/secrets scripts
- [x] Local Deno E2E (+ ngrok) against live DB
- [ ] Production deploy (needs `supabase login` / `SUPABASE_ACCESS_TOKEN`)
- [x] Update docs
- [ ] Ship via myship
