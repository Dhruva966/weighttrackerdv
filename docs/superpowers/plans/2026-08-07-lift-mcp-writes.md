# Lift MCP Writes Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Ship `resolve_exercise` + `log_sets` on `lift-mcp`, with day-session ensure-on-first-log, tests, empty-session cleanup, deploy + E2E.

**Architecture:** Extend Edge Function tools; shared ranking helpers in `src/lib/lift-mcp-format.ts` (mirrored in Deno). Writes gated by `LIFT_MCP_WRITES_ENABLED`. Vercel proxy unchanged (still injects bearer).

**Tech Stack:** Supabase Edge (Deno), MCP SDK, Zod, Vitest, tsx scripts

---

## File map

| File | Change |
|------|--------|
| `src/lib/lift-mcp-format.ts` | `formatResolveCandidates`, `isExactResolveMatch`, day helpers |
| `src/lib/lift-mcp-format.test.ts` | Unit tests |
| `supabase/functions/lift-mcp/index.ts` | Tools: resolve + log_sets; drop stub |
| `scripts/cleanup-empty-sessions.ts` | List/delete 0-set sessions |
| `scripts/test-lift-mcp-e2e.ts` | New tools; write path when enabled |
| `HANDOFF.md`, `DEPLOYMENT.md`, specs | Contracts |

## Tasks

- [x] Task 1: Format helpers + Vitest
- [x] Task 2: MCP `resolve_exercise` + `log_sets` in Edge Function
- [x] Task 3: Cleanup script (dry-run default) + applied junk delete
- [x] Task 4: E2E script update (local PASS with writes)
- [ ] Task 5: Production secrets+deploy (`LIFT_MCP_WRITES_ENABLED=true`) — needs CLI in user terminal
- [x] SessionLauncher hydration + create-once guard
