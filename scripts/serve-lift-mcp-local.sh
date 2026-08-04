#!/usr/bin/env bash
# Local Deno serve of lift-mcp against live Supabase (for E2E / Claude tunnel).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

: "${LIFT_MCP_TOKEN:?Set LIFT_MCP_TOKEN in .env.local}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Set SUPABASE_SERVICE_ROLE_KEY in .env.local}"

export SUPABASE_URL="${SUPABASE_URL:-${VITE_SUPABASE_URL:?Set VITE_SUPABASE_URL}}"
export LIFT_MCP_WRITES_ENABLED="${LIFT_MCP_WRITES_ENABLED:-false}"
export LIFT_MCP_LOCAL=1
export PORT="${PORT:-8787}"

DENO_BIN="${DENO_BIN:-$HOME/.deno/bin/deno}"
if [[ ! -x "$DENO_BIN" ]]; then
  echo "Deno not found at $DENO_BIN — install from https://deno.land" >&2
  exit 1
fi

echo "serving lift-mcp on http://127.0.0.1:${PORT} (health: /health)"
exec "$DENO_BIN" run --allow-net --allow-env --allow-sys \
  supabase/functions/lift-mcp/index.ts
