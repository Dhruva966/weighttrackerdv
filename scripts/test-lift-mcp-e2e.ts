/**
 * Live E2E against deployed lift-mcp (or LIFT_MCP_URL override).
 *
 * Usage:
 *   LIFT_MCP_TOKEN=... pnpm exec tsx scripts/test-lift-mcp-e2e.ts
 *
 * Reads VITE_SUPABASE_URL / SUPABASE_PROJECT_REF / LIFT_MCP_TOKEN from .env.local.
 */
import { loadEnvLocal } from './load-env-local';

loadEnvLocal();

function projectRefFromEnv(): string | undefined {
  if (process.env.SUPABASE_PROJECT_REF) return process.env.SUPABASE_PROJECT_REF;
  const url = process.env.VITE_SUPABASE_URL;
  return url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
}

function mcpBaseUrl(): string {
  if (process.env.LIFT_MCP_URL) return process.env.LIFT_MCP_URL.replace(/\/$/, '');
  const ref = projectRefFromEnv();
  if (!ref) throw new Error('Missing SUPABASE_PROJECT_REF / VITE_SUPABASE_URL / LIFT_MCP_URL');
  return `https://${ref}.supabase.co/functions/v1/lift-mcp`;
}

async function mcpPost(url: string, token: string, body: unknown): Promise<{ status: number; text: string }> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, text };
}

function extractJsonRpcResult(raw: string): unknown {
  // SSE: event: message\ndata: {...}
  const dataLine = raw
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith('data:'));
  const payload = dataLine ? dataLine.slice('data:'.length).trim() : raw.trim();
  return JSON.parse(payload);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const token = process.env.LIFT_MCP_TOKEN;
  assert(token, 'Set LIFT_MCP_TOKEN in .env.local');

  const base = mcpBaseUrl();
  console.log(`testing ${base}`);

  const health = await fetch(`${base}/health`);
  const healthJson = (await health.json()) as { ok?: boolean; name?: string };
  assert(health.status === 200 && healthJson.ok === true, `health failed: ${health.status}`);
  console.log('ok health');

  const unauth = await fetch(base, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
  });
  assert(unauth.status === 401, `expected 401 without token, got ${unauth.status}`);
  console.log('ok unauthorized without token');

  const init = await mcpPost(base, token, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'lift-mcp-e2e', version: '0.0.1' },
    },
  });
  assert(init.status >= 200 && init.status < 300, `initialize HTTP ${init.status}: ${init.text}`);
  const initBody = extractJsonRpcResult(init.text) as { result?: { serverInfo?: { name?: string } } };
  assert(initBody.result?.serverInfo?.name === 'lift-mcp', `unexpected initialize: ${init.text}`);
  console.log('ok initialize');

  const list = await mcpPost(base, token, {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {},
  });
  assert(list.status >= 200 && list.status < 300, `tools/list HTTP ${list.status}: ${list.text}`);
  const listBody = extractJsonRpcResult(list.text) as { result?: { tools?: Array<{ name: string }> } };
  const names = new Set((listBody.result?.tools ?? []).map((t) => t.name));
  for (const required of [
    'list_recent_sessions',
    'get_session_detail',
    'get_exercise_history',
    'list_recent_prs',
    'log_set_draft',
  ]) {
    assert(names.has(required), `missing tool ${required}: ${[...names].join(',')}`);
  }
  console.log('ok tools/list');

  const sessionsCall = await mcpPost(base, token, {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: { name: 'list_recent_sessions', arguments: { limit: 5, days: 365 } },
  });
  assert(
    sessionsCall.status >= 200 && sessionsCall.status < 300,
    `list_recent_sessions HTTP ${sessionsCall.status}: ${sessionsCall.text}`,
  );
  const sessionsBody = extractJsonRpcResult(sessionsCall.text) as {
    result?: { content?: Array<{ type: string; text?: string }>; isError?: boolean };
  };
  assert(!sessionsBody.result?.isError, `list_recent_sessions error: ${sessionsCall.text}`);
  const sessionsText = sessionsBody.result?.content?.[0]?.text ?? '';
  const sessionsJson = JSON.parse(sessionsText) as { sessions: Array<{ id: string }> };
  assert(Array.isArray(sessionsJson.sessions), 'sessions array missing');
  console.log(`ok list_recent_sessions (${sessionsJson.sessions.length} sessions)`);

  if (sessionsJson.sessions[0]?.id) {
    const detail = await mcpPost(base, token, {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'get_session_detail', arguments: { sessionId: sessionsJson.sessions[0].id } },
    });
    assert(detail.status >= 200 && detail.status < 300, `get_session_detail HTTP ${detail.status}`);
    const detailBody = extractJsonRpcResult(detail.text) as {
      result?: { content?: Array<{ text?: string }>; isError?: boolean };
    };
    assert(!detailBody.result?.isError, `get_session_detail error: ${detail.text}`);
    console.log('ok get_session_detail');
  } else {
    console.log('skip get_session_detail (no sessions in range)');
  }

  const history = await mcpPost(base, token, {
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: { name: 'get_exercise_history', arguments: { exerciseNameOrSlug: 'bench', limit: 10 } },
  });
  assert(history.status >= 200 && history.status < 300, `get_exercise_history HTTP ${history.status}`);
  console.log('ok get_exercise_history');

  const prs = await mcpPost(base, token, {
    jsonrpc: '2.0',
    id: 6,
    method: 'tools/call',
    params: { name: 'list_recent_prs', arguments: { limit: 5, days: 365 } },
  });
  assert(prs.status >= 200 && prs.status < 300, `list_recent_prs HTTP ${prs.status}`);
  console.log('ok list_recent_prs');

  const writeGate = await mcpPost(base, token, {
    jsonrpc: '2.0',
    id: 7,
    method: 'tools/call',
    params: { name: 'log_set_draft', arguments: {} },
  });
  const writeBody = extractJsonRpcResult(writeGate.text) as {
    result?: { isError?: boolean; content?: Array<{ text?: string }> };
  };
  assert(writeBody.result?.isError === true, 'log_set_draft should be gated off');
  console.log('ok write gate');

  console.log('PASS lift-mcp e2e');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
