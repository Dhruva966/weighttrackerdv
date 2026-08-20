/**
 * Live E2E against deployed lift-mcp (or LIFT_MCP_URL override).
 *
 * Usage:
 *   LIFT_MCP_TOKEN=... pnpm exec tsx scripts/test-lift-mcp-e2e.ts
 *   LIFT_MCP_E2E_WRITE=1  # optional: actually call log_sets / log_weight when writes enabled
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
  const dataLine = raw
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith('data:'));
  const payload = dataLine ? dataLine.slice('data:'.length).trim() : raw.trim();
  return JSON.parse(payload);
}

function toolText(raw: string): { isError?: boolean; text: string } {
  const body = extractJsonRpcResult(raw) as {
    result?: { content?: Array<{ text?: string }>; isError?: boolean };
  };
  return {
    isError: body.result?.isError,
    text: body.result?.content?.[0]?.text ?? '',
  };
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
  const healthJson = (await health.json()) as { ok?: boolean; name?: string; writesEnabled?: boolean };
  assert(health.status === 200 && healthJson.ok === true, `health failed: ${health.status}`);
  console.log(`ok health (writesEnabled=${Boolean(healthJson.writesEnabled)})`);

  const unauth = await fetch(base, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
  });
  // Vercel proxy injects Bearer for Claude; unauthenticated calls still succeed there.
  // Raw Supabase Edge URL must 401 without a token.
  const viaProxy = /vercel\.app\/api\/lift-mcp/i.test(base) || base.includes('/api/lift-mcp');
  if (viaProxy) {
    assert(
      unauth.status >= 200 && unauth.status < 500,
      `proxy tools/list without client token HTTP ${unauth.status}`,
    );
    console.log('ok proxy allows unauthenticated client (injects bearer upstream)');
  } else {
    assert(unauth.status === 401, `expected 401 without token, got ${unauth.status}`);
    console.log('ok unauthorized without token');
  }

  const init = await mcpPost(base, token, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'lift-mcp-e2e', version: '0.0.2' },
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
    'resolve_exercise',
    'log_sets',
    'log_weight',
    'list_recent_weigh_ins',
  ]) {
    assert(names.has(required), `missing tool ${required}: ${[...names].join(',')}`);
  }
  assert(!names.has('log_set_draft'), 'log_set_draft stub should be removed');
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
  const sessionsParsed = toolText(sessionsCall.text);
  assert(!sessionsParsed.isError, `list_recent_sessions error: ${sessionsCall.text}`);
  const sessionsJson = JSON.parse(sessionsParsed.text) as {
    sessions: Array<{ id: string; setCount: number }>;
  };
  assert(Array.isArray(sessionsJson.sessions), 'sessions array missing');
  assert(
    sessionsJson.sessions.every((s) => s.setCount > 0),
    'list_recent_sessions should hide empty sessions by default',
  );
  console.log(`ok list_recent_sessions (${sessionsJson.sessions.length} non-empty)`);

  if (sessionsJson.sessions[0]?.id) {
    const detail = await mcpPost(base, token, {
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'get_session_detail', arguments: { sessionId: sessionsJson.sessions[0].id } },
    });
    assert(detail.status >= 200 && detail.status < 300, `get_session_detail HTTP ${detail.status}`);
    const detailParsed = toolText(detail.text);
    assert(!detailParsed.isError, `get_session_detail error: ${detail.text}`);
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
  const historyParsed = toolText(history.text);
  if (!historyParsed.isError) {
    const hist = JSON.parse(historyParsed.text) as { lastWorkingSet?: unknown };
    assert('lastWorkingSet' in hist, 'get_exercise_history should include lastWorkingSet');
  }
  console.log('ok get_exercise_history');

  const prs = await mcpPost(base, token, {
    jsonrpc: '2.0',
    id: 6,
    method: 'tools/call',
    params: { name: 'list_recent_prs', arguments: { limit: 5, days: 365 } },
  });
  assert(prs.status >= 200 && prs.status < 300, `list_recent_prs HTTP ${prs.status}`);
  console.log('ok list_recent_prs');

  const resolve = await mcpPost(base, token, {
    jsonrpc: '2.0',
    id: 7,
    method: 'tools/call',
    params: { name: 'resolve_exercise', arguments: { query: 'bench', limit: 5 } },
  });
  assert(resolve.status >= 200 && resolve.status < 300, `resolve_exercise HTTP ${resolve.status}`);
  const resolveParsed = toolText(resolve.text);
  assert(!resolveParsed.isError, `resolve_exercise error: ${resolve.text}`);
  const resolveJson = JSON.parse(resolveParsed.text) as {
    status: string;
    candidates: Array<{ n: number; id: string }>;
  };
  assert(
    resolveJson.status === 'exact' || resolveJson.status === 'ambiguous' || resolveJson.status === 'none',
    'bad resolve status',
  );
  if (resolveJson.candidates.length > 0) {
    assert(resolveJson.candidates[0]?.n === 1, 'candidates must be numbered from 1');
  }
  console.log(`ok resolve_exercise (status=${resolveJson.status}, n=${resolveJson.candidates.length})`);

  if (!healthJson.writesEnabled) {
    const writeGate = await mcpPost(base, token, {
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: {
        name: 'log_sets',
        arguments: {
          sets: [
            {
              exerciseId: resolveJson.candidates[0]?.id ?? '00000000-0000-4000-8000-000000000000',
              weightLb: 135,
              reps: 5,
            },
          ],
        },
      },
    });
    const writeParsed = toolText(writeGate.text);
    assert(writeParsed.isError === true, 'log_sets should error when writes disabled');
    const weightGate = await mcpPost(base, token, {
      jsonrpc: '2.0',
      id: 9,
      method: 'tools/call',
      params: { name: 'log_weight', arguments: { weightLb: 169 } },
    });
    const weightParsed = toolText(weightGate.text);
    assert(weightParsed.isError === true, 'log_weight should error when writes disabled');
    console.log('ok write gate (disabled)');
  } else if (process.env.LIFT_MCP_E2E_WRITE === '1' && resolveJson.candidates[0]?.id) {
    const writeCall = await mcpPost(base, token, {
      jsonrpc: '2.0',
      id: 8,
      method: 'tools/call',
      params: {
        name: 'log_sets',
        arguments: {
          sets: [
            {
              exerciseId: resolveJson.candidates[0].id,
              weightLb: 45,
              reps: 1,
              isWarmup: true,
            },
          ],
        },
      },
    });
    const writeParsed = toolText(writeCall.text);
    assert(!writeParsed.isError, `log_sets write failed: ${writeCall.text}`);
    const logged = JSON.parse(writeParsed.text) as { ok?: boolean; loggedSetCount?: number };
    assert(logged.ok === true && (logged.loggedSetCount ?? 0) >= 1, 'log_sets did not log');
    console.log('ok log_sets write');

    const weightCall = await mcpPost(base, token, {
      jsonrpc: '2.0',
      id: 9,
      method: 'tools/call',
      params: { name: 'log_weight', arguments: { weightLb: 169.2 } },
    });
    const weightParsed = toolText(weightCall.text);
    assert(!weightParsed.isError, `log_weight write failed: ${weightCall.text}`);
    const weighed = JSON.parse(weightParsed.text) as { ok?: boolean; weightLb?: number };
    assert(weighed.ok === true && weighed.weightLb === 169.2, 'log_weight did not upsert');
    console.log('ok log_weight write');
  } else {
    console.log('skip log_sets/log_weight insert (writes enabled; set LIFT_MCP_E2E_WRITE=1 to insert)');
  }

  const weighIns = await mcpPost(base, token, {
    jsonrpc: '2.0',
    id: 10,
    method: 'tools/call',
    params: { name: 'list_recent_weigh_ins', arguments: { limit: 5 } },
  });
  assert(weighIns.status >= 200 && weighIns.status < 300, `list_recent_weigh_ins HTTP ${weighIns.status}`);
  const weighParsed = toolText(weighIns.text);
  assert(!weighParsed.isError, `list_recent_weigh_ins error: ${weighIns.text}`);
  const weighJson = JSON.parse(weighParsed.text) as { logs?: unknown[] };
  assert(Array.isArray(weighJson.logs), 'weigh-in logs missing');
  console.log(`ok list_recent_weigh_ins (${weighJson.logs.length})`);

  console.log('PASS lift-mcp e2e');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
