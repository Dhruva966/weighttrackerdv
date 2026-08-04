/**
 * Minimal single-user OAuth 2.1 for Claude custom connectors.
 * Password gate = LIFT_MCP_TOKEN. Stateless codes/tokens via HMAC.
 */

const textEncoder = new TextEncoder();

export function publicBaseUrl(req: Request): string {
  const envBase = Deno.env.get('LIFT_MCP_PUBLIC_URL');
  if (envBase) return envBase.replace(/\/$/, '');

  const url = new URL(req.url);
  // Supabase invokes as /lift-mcp/... ; public URL includes /functions/v1/lift-mcp
  if (url.hostname.endsWith('.supabase.co')) {
    return `https://${url.hostname}/functions/v1/lift-mcp`;
  }
  // Local: prefer bare origin when LIFT_MCP_LOCAL=1
  if (Deno.env.get('LIFT_MCP_LOCAL') === '1') {
    return `${url.protocol}//${url.host}`;
  }
  return `${url.protocol}//${url.host}/lift-mcp`;
}

function mcpToken(): string {
  const token = Deno.env.get('LIFT_MCP_TOKEN');
  if (!token) throw new Error('LIFT_MCP_TOKEN is not configured');
  return token;
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    textEncoder.encode(mcpToken()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of u8) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64urlJson(obj: unknown): string {
  return b64url(textEncoder.encode(JSON.stringify(obj)));
}

function fromB64url(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function signPayload(payload: Record<string, unknown>): Promise<string> {
  const body = b64urlJson(payload);
  const key = await hmacKey();
  const sig = await crypto.subtle.sign('HMAC', key, textEncoder.encode(body));
  return `${body}.${b64url(sig)}`;
}

async function verifySigned(token: string): Promise<Record<string, unknown> | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const key = await hmacKey();
  const ok = await crypto.subtle.verify('HMAC', key, fromB64url(sig), textEncoder.encode(body));
  if (!ok) return null;
  try {
    const json = JSON.parse(new TextDecoder().decode(fromB64url(body))) as Record<string, unknown>;
    if (typeof json.exp === 'number' && Date.now() / 1000 > json.exp) return null;
    return json;
  } catch {
    return null;
  }
}

async function sha256B64Url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(input));
  return b64url(digest);
}

export function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers':
      'authorization, x-api-key, x-auth-token, content-type, accept, mcp-protocol-version, mcp-session-id, last-event-id',
    'Access-Control-Expose-Headers': 'mcp-session-id, www-authenticate',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
  };
}

export function unauthorizedMcp(req: Request): Response {
  const base = publicBaseUrl(req);
  const resourceMetadata = `${base}/.well-known/oauth-protected-resource`;
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json',
      'WWW-Authenticate': `Bearer FAKESECRET_g3h4i5j6k7l8m9n0o1p2="${resourceMetadata}", scope="lift"`,
    },
  });
}

/** Accept static LIFT_MCP_TOKEN or OAuth access tokens issued by this server. */
export async function isAuthorized(req: Request): Promise<boolean> {
  const expected = Deno.env.get('LIFT_MCP_TOKEN');
  if (!expected) return false;

  const header = req.headers.get('authorization') ?? req.headers.get('Authorization') ?? '';
  const alt = req.headers.get('x-api-key') ?? req.headers.get('x-auth-token') ?? '';

  if (
    header === `Bearer ${expected}` ||
    header === expected ||
    alt === expected ||
    alt === `Bearer ${expected}`
  ) {
    return true;
  }

  const bearer = header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!bearer) return false;
  const payload = await verifySigned(bearer);
  return payload?.typ === 'access';
}

function asMetadata(base: string) {
  return {
    issuer: base,
    authorization_endpoint: `${base}/authorize`,
    token_endpoint: `${base}/token`,
    registration_endpoint: `${base}/register`,
    jwks_uri: `${base}/.well-known/jwks.json`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
    scopes_supported: ['lift', 'offline_access'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['HS256'],
    service_documentation: `${base}/health`,
  };
}

function authorizeHtml(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string;
  error?: string;
}): string {
  const err = params.error
    ? `<p style="color:#b45309;margin:0 0 1rem">${escapeHtml(params.error)}</p>`
    : '';
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Connect Lift</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;background:#111;color:#f5f5f5;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
  form{background:#1c1c1c;border:1px solid #333;border-radius:12px;padding:1.5rem;width:min(420px,92vw)}
  h1{font-size:1.25rem;margin:0 0 .5rem}
  p{color:#a3a3a3;font-size:.9rem;line-height:1.4}
  label{display:block;font-size:.8rem;margin:1rem 0 .35rem;color:#d4d4d4}
  input{width:100%;box-sizing:border-box;padding:.65rem .75rem;border-radius:8px;border:1px solid #404040;background:#0a0a0a;color:#fff}
  button{margin-top:1rem;width:100%;padding:.75rem;border:0;border-radius:8px;background:#f5f5f5;color:#111;font-weight:600;cursor:pointer}
</style></head><body>
<form method="POST" action="authorize">
  <h1>Connect Lift to Claude</h1>
  <p>Enter your Lift MCP token to allow Claude to read your gym history.</p>
  ${err}
  <input type="hidden" name="client_id" value="${escapeHtml(params.clientId)}"/>
  <input type="hidden" name="redirect_uri" value="${escapeHtml(params.redirectUri)}"/>
  <input type="hidden" name="state" value="${escapeHtml(params.state)}"/>
  <input type="hidden" name="code_challenge" value="${escapeHtml(params.codeChallenge)}"/>
  <input type="hidden" name="code_challenge_method" value="${escapeHtml(params.codeChallengeMethod)}"/>
  <input type="hidden" name="scope" value="${escapeHtml(params.scope)}"/>
  <label for="password">Lift MCP token</label>
  <input id="password" name="password" type="password" autocomplete="current-password" required/>
  <button type="submit">Allow access</button>
</form>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function allowedRedirect(uri: string): boolean {
  if (uri === 'https://claude.ai/api/mcp/auth_callback') return true;
  if (uri.startsWith('http://127.0.0.1:') || uri.startsWith('http://localhost:')) return true;
  return false;
}

export function mountOauthRoutes(app: {
  get: (path: string, handler: (c: any) => Response | Promise<Response>) => unknown;
  post: (path: string, handler: (c: any) => Response | Promise<Response>) => unknown;
  all: (path: string, handler: (c: any) => Response | Promise<Response>) => unknown;
}) {
  const sendJson = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    });

  app.get('/.well-known/oauth-protected-resource', (c) => {
    const base = publicBaseUrl(c.req.raw);
    return sendJson({
      resource: base,
      authorization_servers: [base],
      scopes_supported: ['lift', 'offline_access'],
      bearer_methods_supported: ['header'],
      resource_documentation: `${base}/health`,
    });
  });

  // Path-aware variants some clients probe under the function
  app.get('/.well-known/oauth-protected-resource/*', (c) => {
    const base = publicBaseUrl(c.req.raw);
    return sendJson({
      resource: base,
      authorization_servers: [base],
      scopes_supported: ['lift', 'offline_access'],
      bearer_methods_supported: ['header'],
    });
  });

  const metadataHandler = (c: any) => sendJson(asMetadata(publicBaseUrl(c.req.raw)));
  app.get('/.well-known/oauth-authorization-server', metadataHandler);
  app.get('/.well-known/openid-configuration', metadataHandler);
  app.get('/.well-known/oauth-authorization-server/*', metadataHandler);
  app.get('/.well-known/openid-configuration/*', metadataHandler);

  app.get('/.well-known/jwks.json', () => sendJson({ keys: [] }));

  app.post('/register', async (c) => {
    let body: Record<string, unknown> = {};
    try {
      body = (await c.req.raw.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }
    const clientId = crypto.randomUUID();
    const redirectUris = Array.isArray(body.redirect_uris)
      ? (body.redirect_uris as string[])
      : ['https://claude.ai/api/mcp/auth_callback'];

    return sendJson(
      {
        client_id: clientId,
        client_id_issued_at: Math.floor(Date.now() / 1000),
        client_secret_expires_at: 0,
        redirect_uris: redirectUris,
        token_endpoint_auth_method: 'none',
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        client_name: typeof body.client_name === 'string' ? body.client_name : 'Claude',
      },
      201,
    );
  });

  app.get('/authorize', (c) => {
    const url = new URL(c.req.raw.url);
    const clientId = url.searchParams.get('client_id') ?? '';
    const redirectUri = url.searchParams.get('redirect_uri') ?? '';
    const state = url.searchParams.get('state') ?? '';
    const codeChallenge = url.searchParams.get('code_challenge') ?? '';
    const codeChallengeMethod = url.searchParams.get('code_challenge_method') ?? 'S256';
    const scope = url.searchParams.get('scope') ?? 'lift';

    if (!clientId || !redirectUri || !codeChallenge) {
      return new Response('Missing client_id, redirect_uri, or code_challenge', { status: 400 });
    }
    if (!allowedRedirect(redirectUri)) {
      return new Response('redirect_uri not allowed', { status: 400 });
    }
    if (codeChallengeMethod !== 'S256') {
      return new Response('Only S256 PKCE is supported', { status: 400 });
    }

    return new Response(
      authorizeHtml({ clientId, redirectUri, state, codeChallenge, codeChallengeMethod, scope }),
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  });

  app.post('/authorize', async (c) => {
    const form = await c.req.raw.formData();
    const password = String(form.get('password') ?? '');
    const clientId = String(form.get('client_id') ?? '');
    const redirectUri = String(form.get('redirect_uri') ?? '');
    const state = String(form.get('state') ?? '');
    const codeChallenge = String(form.get('code_challenge') ?? '');
    const codeChallengeMethod = String(form.get('code_challenge_method') ?? 'S256');
    const scope = String(form.get('scope') ?? 'lift');

    if (!allowedRedirect(redirectUri)) {
      return new Response('redirect_uri not allowed', { status: 400 });
    }

    if (password !== mcpToken()) {
      return new Response(
        authorizeHtml({
          clientId,
          redirectUri,
          state,
          codeChallenge,
          codeChallengeMethod,
          scope,
          error: 'Wrong token. Use LIFT_MCP_TOKEN from .env.local.',
        }),
        { status: 401, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      );
    }

    const code = await signPayload({
      typ: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      scope,
      exp: Math.floor(Date.now() / 1000) + 10 * 60,
    });

    const dest = new URL(redirectUri);
    dest.searchParams.set('code', code);
    if (state) dest.searchParams.set('state', state);
    return Response.redirect(dest.toString(), 302);
  });

  app.post('/token', async (c) => {
    const contentType = c.req.raw.headers.get('content-type') ?? '';
    let params: URLSearchParams;
    if (contentType.includes('application/x-www-form-urlencoded')) {
      params = new URLSearchParams(await c.req.raw.text());
    } else if (contentType.includes('application/json')) {
      const json = (await c.req.raw.json()) as Record<string, string>;
      params = new URLSearchParams(json);
    } else {
      params = new URLSearchParams(await c.req.raw.text());
    }

    const grantType = params.get('grant_type');
    if (grantType === 'refresh_token') {
      const refresh = params.get('refresh_token') ?? '';
      const payload = await verifySigned(refresh);
      if (!payload || payload.typ !== 'refresh') {
        return sendJson({ error: 'invalid_grant' }, 400);
      }
      const accessToken = await signPayload({
        typ: 'access',
        sub: 'lift-owner',
        scope: payload.scope ?? 'lift',
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      });
      const newRefresh = await signPayload({
        typ: 'refresh',
        sub: 'lift-owner',
        scope: payload.scope ?? 'lift',
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      });
      return sendJson({
        access_token: accessToken,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: newRefresh,
        scope: payload.scope ?? 'lift',
      });
    }

    if (grantType !== 'authorization_code') {
      return sendJson({ error: 'unsupported_grant_type' }, 400);
    }

    const code = params.get('code') ?? '';
    const redirectUri = params.get('redirect_uri') ?? '';
    const codeVerifier = params.get('code_verifier') ?? '';
    const payload = await verifySigned(code);
    if (!payload || payload.typ !== 'code') {
      return sendJson({ error: 'invalid_grant' }, 400);
    }
    if (payload.redirect_uri !== redirectUri) {
      return sendJson({ error: 'invalid_grant', error_description: 'redirect_uri mismatch' }, 400);
    }

    const expected = String(payload.code_challenge ?? '');
    const method = String(payload.code_challenge_method ?? 'S256');
    if (method !== 'S256') {
      return sendJson({ error: 'invalid_grant' }, 400);
    }
    const actual = await sha256B64Url(codeVerifier);
    if (actual !== expected) {
      return sendJson({ error: 'invalid_grant', error_description: 'pkce failed' }, 400);
    }

    const accessToken = await signPayload({
      typ: 'access',
      sub: 'lift-owner',
      scope: payload.scope ?? 'lift',
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    });
    const refreshToken = await signPayload({
      typ: 'refresh',
      sub: 'lift-owner',
      scope: payload.scope ?? 'lift',
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
    });

    return sendJson({
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: refreshToken,
      scope: payload.scope ?? 'lift',
    });
  });
}
