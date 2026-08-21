# Lift MCP Server

Model Context Protocol (MCP) server for the Lift workout tracking app. Enables Claude to read and write gym session data, resolve exercises, and log workouts through natural language.

## Overview

**Endpoint**: `https://weighttrackerdv.vercel.app/api/lift-mcp` (proxied) or `https://svcjdtlmmrisrkjqdsjt.supabase.co/functions/v1/lift-mcp` (direct)

**Authentication**: Bearer token via `Authorization` header (proxied via Vercel) or OAuth2 (direct)

**Writes**: Gated by `LIFT_MCP_WRITES_ENABLED=true` environment variable

## Available Tools

### Read-Only Tools

#### `list_recent_sessions`

List recent gym sessions with summary stats (set count, PR count, volume, muscle groups).

**Parameters:**
- `limit` (optional, 1-100): Max sessions to return (default: 20)
- `days` (optional, 1-365): Only sessions in the last N days
- `includeEmpty` (optional, boolean): Include 0-set sessions (default: false, rest days have no session row)

**Response:**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "userId": "uuid",
      "startedAt": "2026-08-20T10:00:00Z",
      "endedAt": "2026-08-20T11:30:00Z",
      "localDate": "2026-08-20",
      "timezone": "America/Los_Angeles",
      "notes": "Great workout",
      "setCount": 12,
      "prCount": 2,
      "volumeLb": 8500.0,
      "muscleGroups": ["chest", "triceps"]
    }
  ]
}
```

**Example usage:**
```
User: "Show me my last 5 workouts"
Claude: [calls list_recent_sessions with limit=5]
```

#### `get_session_detail`

Fetch one session with all exercises and sets (lift + cardio fields).

**Parameters:**
- `sessionId` (required, UUID): Session UUID

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "userId": "uuid",
    "startedAt": "2026-08-20T10:00:00Z",
    "endedAt": "2026-08-20T11:30:00Z",
    "localDate": "2026-08-20",
    "timezone": "America/Los_Angeles",
    "notes": "Great chest day"
  },
  "summary": {
    "setCount": 12,
    "prCount": 2,
    "volumeLb": 8500.0,
    "muscleGroups": ["chest", "triceps"]
  },
  "exercises": [
    {
      "exerciseId": "uuid",
      "slug": "bench-press-barbell",
      "name": "Bench Press (Barbell)",
      "muscleGroup": "chest",
      "sets": [
        {
          "id": "uuid",
          "setNumber": 1,
          "weightLb": 135,
          "reps": 10,
          "rpe": 7.5,
          "isWarmup": true,
          "isPr": false,
          "createdAt": "2026-08-20T10:05:00Z",
          "level": null,
          "speed": null,
          "durationSec": null,
          "calories": null,
          "kind": "lift"
        }
      ]
    }
  ]
}
```

**Example usage:**
```
User: "What did I do in my workout yesterday?"
Claude: [calls list_recent_sessions with days=1, then get_session_detail with the session ID]
```

#### `get_exercise_history`

Get history and progress for a specific exercise.

**Parameters:**
- `exerciseNameOrSlug` (required): Exercise name or slug (fuzzy matched)
- `limit` (optional, 1-200): Max sets to return (default: 50)

**Response:**
```json
{
  "exercise": {
    "id": "uuid",
    "slug": "bench-press-barbell",
    "name": "Bench Press (Barbell)",
    "muscleGroup": "chest",
    "equipment": "barbell",
    "archived": false
  },
  "matchNote": "Auto-picked best match; 3 catalog hits for \"bench\". Prefer resolve_exercise when unsure.",
  "lastWorkingSet": {
    "date": "2026-08-20",
    "weightLb": 225,
    "reps": 5,
    "isPr": true,
    "estimatedOneRmLb": 253.5
  },
  "previousWorkingSets": [
    {
      "date": "2026-08-17",
      "weightLb": 220,
      "reps": 5,
      "estimatedOneRmLb": 247.5
    }
  ],
  "stats": {
    "loggedSetCount": 45,
    "bestEstimatedOneRmLb": 253.5
  },
  "sets": [...],
  "progressPoints": [...]
}
```

**Example usage:**
```
User: "How much can I bench press?"
Claude: [calls get_exercise_history with exerciseNameOrSlug="bench press"]
```

#### `list_recent_prs`

List recent personal records (non-warmup lift sets with `isPr=true`).

**Parameters:**
- `limit` (optional, 1-100): Max PRs to return (default: 20)
- `days` (optional, 1-730): Only PRs in the last N days

**Response:**
```json
{
  "prs": [
    {
      "setId": "uuid",
      "sessionId": "uuid",
      "sessionLocalDate": "2026-08-20",
      "exerciseId": "uuid",
      "exerciseSlug": "bench-press-barbell",
      "exerciseName": "Bench Press (Barbell)",
      "weightLb": 225,
      "reps": 5,
      "isWarmup": false,
      "createdAt": "2026-08-20T10:30:00Z"
    }
  ]
}
```

**Example usage:**
```
User: "What are my recent PRs?"
Claude: [calls list_recent_prs with limit=10]
```

#### `list_recent_weigh_ins`

List recent body weight logs (calendar days, newest first).

**Parameters:**
- `limit` (optional, 1-90): Max rows to return (default: 14)

**Response:**
```json
{
  "count": 14,
  "latest": {
    "id": "uuid",
    "loggedAt": "2026-08-20",
    "weightLb": 185.5
  },
  "logs": [...]
}
```

**Example usage:**
```
User: "What's my current weight?"
Claude: [calls list_recent_weigh_ins with limit=1]
```

### Write Tools (require `LIFT_MCP_WRITES_ENABLED=true`)

#### `resolve_exercise`

Resolve ambiguous exercise names to catalog entries. Returns numbered candidates for user disambiguation.

**Parameters:**
- `query` (required): Messy exercise name from user
- `limit` (optional, 1-25): Max candidates (default: 8)

**Response:**
```json
{
  "query": "bench",
  "status": "ambiguous",
  "candidates": [
    {
      "n": 1,
      "id": "uuid",
      "slug": "bench-press-barbell",
      "name": "Bench Press (Barbell)",
      "muscleGroup": "chest",
      "equipment": "barbell",
      "archived": false,
      "score": 90
    },
    {
      "n": 2,
      "id": "uuid",
      "slug": "bench-press-dumbbell",
      "name": "Bench Press (Dumbbell)",
      "muscleGroup": "chest",
      "equipment": "dumbbell",
      "archived": false,
      "score": 85
    }
  ],
  "hint": "Present the numbered list to the user and wait for a pick (e.g. \"1\") before calling log_sets."
}
```

**Status values:**
- `exact`: Single clear match, safe to log
- `ambiguous`: Multiple matches, ask user to pick
- `none`: No catalog match, ask user to rephrase

**Example usage:**
```
User: "Log 3 sets of bench at 135 for 10 reps"
Claude: [calls resolve_exercise with query="bench"]
  → Returns ambiguous with 2 candidates
Claude: "I found 2 exercises: 1) Bench Press (Barbell), 2) Bench Press (Dumbbell). Which one?"
User: "1"
Claude: [calls log_sets with exerciseId from candidate 1]
```

#### `log_sets`

Log lift sets for a calendar day. Creates day session if missing (no daily empty sessions).

**Parameters:**
- `localDate` (optional, YYYY-MM-DD): Calendar day (default: today in timezone)
- `timezone` (optional): IANA timezone (default: `America/Los_Angeles`)
- `sets` (required, 1-40): Sets to append
  - `exerciseId` (UUID): Confirmed exercise UUID from `resolve_exercise`
  - `weightLb` (number, positive): Weight in pounds
  - `reps` (number, int, positive): Reps
  - `isWarmup` (optional, boolean): Warmup set (default: false)

**Response:**
```json
{
  "ok": true,
  "createdSession": false,
  "session": {
    "id": "uuid",
    "localDate": "2026-08-20",
    "timezone": "America/Los_Angeles",
    "startedAt": "2026-08-20T10:00:00Z",
    "endedAt": null
  },
  "loggedSetCount": 3,
  "sets": [
    {
      "id": "uuid",
      "exerciseId": "uuid",
      "exerciseName": "Bench Press (Barbell)",
      "exerciseSlug": "bench-press-barbell",
      "setNumber": 1,
      "weightLb": 135,
      "reps": 10,
      "isWarmup": false,
      "isPr": false,
      "createdAt": "2026-08-20T10:05:00Z"
    }
  ]
}
```

**Example usage:**
```
User: "Log 3 sets of bench press at 225 for 5 reps"
Claude: [calls resolve_exercise, gets exerciseId, then calls log_sets]
```

**Important notes:**
- Always call `resolve_exercise` first to get confirmed `exerciseId`
- Never auto-pick when status is `ambiguous` — ask the user
- Sets append to existing day session or create a new one
- PR detection happens server-side

#### `log_weight`

Log body weight for a calendar day (upserts by day).

**Parameters:**
- `weightLb` (required, 50-500): Body weight in pounds
- `localDate` (optional, YYYY-MM-DD): Calendar day (default: today in timezone)
- `timezone` (optional): IANA timezone (default: `America/Los_Angeles`)

**Response:**
```json
{
  "ok": true,
  "created": false,
  "id": "uuid",
  "loggedAt": "2026-08-20",
  "weightLb": 185.5,
  "previousWeightLb": 184.8
}
```

**Example usage:**
```
User: "I weighed 185.5 pounds this morning"
Claude: [calls log_weight with weightLb=185.5]
```

## Error Handling

All errors return structured JSON with `error`, `code`, and optional `details`:

```json
{
  "error": "Database error during list_recent_sessions query: connection timeout",
  "code": "DATABASE_ERROR",
  "details": {
    "operation": "list_recent_sessions query",
    "originalMessage": "connection timeout"
  }
}
```

**Error codes:**
- `AUTH_REQUIRED`: Missing or invalid authentication
- `WRITES_DISABLED`: Write tool called but `LIFT_MCP_WRITES_ENABLED!=true`
- `VALIDATION_ERROR`: Invalid parameters (with field details)
- `NOT_FOUND`: Resource not found (session, exercise, etc.)
- `DATABASE_ERROR`: Database query or connection error
- `UNKNOWN_ERROR`: Unexpected error

## Workflow Patterns

### Basic logging workflow
1. User: "Log bench press 225 for 5 reps"
2. Claude calls `resolve_exercise` with query="bench press"
3. If `status="ambiguous"`, Claude asks user to pick from numbered list
4. User picks a number, Claude extracts `exerciseId`
5. Claude calls `log_sets` with confirmed `exerciseId`, weight, reps
6. Claude confirms: "Logged 1 set of Bench Press (Barbell): 225 lb × 5 reps"

### Multi-set logging
1. User: "Log 3 sets of squats: 135×10, 225×8, 315×5"
2. Claude resolves exercise once
3. Claude calls `log_sets` with 3 sets in one call
4. Claude confirms all sets logged

### Progress check workflow
1. User: "How's my bench press progress?"
2. Claude calls `get_exercise_history` with exerciseNameOrSlug="bench press"
3. Claude summarizes: last working set, best estimated 1RM, recent progress
4. Optionally shows progress chart data from `progressPoints`

### Session review workflow
1. User: "What did I do last workout?"
2. Claude calls `list_recent_sessions` with limit=1
3. Claude calls `get_session_detail` with the session ID
4. Claude summarizes: date, duration, exercises, volume, PRs

## Development

### Local testing
```bash
# Set environment variables
export VITE_SUPABASE_URL=https://svcjdtlmmrisrkjqdsjt.supabase.co
export VITE_SUPABASE_ANON_KEY=...
export LIFT_MCP_TOKEN=...
export LIFT_MCP_WRITES_ENABLED=true

# Run local Deno server
cd supabase/functions/lift-mcp
deno run --allow-net --allow-env --allow-read index.ts
```

### E2E testing
```bash
pnpm test:lift-mcp
```

### Deployment
```bash
# Push secrets to Supabase
pnpm supabase:secrets

# Deploy Edge Function
pnpm supabase:deploy-functions
```

## Type Safety

All tool responses conform to Zod schemas defined in `schemas.ts`:
- Runtime validation ready
- TypeScript type inference
- Consistent response shapes
- Self-documenting API

See `schemas.ts` for complete type definitions.

## Architecture

- **Edge Function**: Stateless Deno runtime on Supabase
- **Auth**: OAuth2 + bearer token (Vercel proxy injects token)
- **Database**: Direct Supabase service-role client
- **Protocol**: MCP over HTTP with SSE for streaming
- **Rate limiting**: None currently (single-user app)

## Roadmap

- [ ] Add cardio set logging support in `log_sets`
- [ ] Support template creation via MCP
- [ ] Add session notes editing
- [ ] Multi-user support (requires RLS)
- [ ] Rate limiting per user
- [ ] Webhook notifications for PRs
