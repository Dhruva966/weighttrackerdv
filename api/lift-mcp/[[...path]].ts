/**
 * Public Claude connector front-door for Lift MCP.
 *
 * Why this exists: Supabase's API gateway returns 401 (missing apikey) for
 * `/.well-known/oauth-protected-resource/functions/v1/lift-mcp`, which makes
 * Claude attempt OAuth discovery that never reaches our Edge Function.
 *
 * This Vercel proxy:
 * 1. Accepts Claude's unauthenticated MCP requests
 * 2. Injects Authorization: Bearer <LIFT_MCP_TOKEN>
 * 3. Forwards to the Supabase Edge Function
 *
 * Pair with vercel.json rewrites that 404 well-known discovery paths so Claude
 * treats this URL as a public (no-OAuth) connector.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const UPSTREAM =
  process.env.LIFT_MCP_UPSTREAM ??
  'https://svcjdtlmmrisrkjqdsjt.supabase.co/functions/v1/lift-mcp';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = process.env.LIFT_MCP_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'LIFT_MCP_TOKEN is not configured on Vercel' });
    return;
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'authorization, content-type, accept, mcp-protocol-version, mcp-session-id, last-event-id',
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.status(204).end();
    return;
  }

  // Optional path segments: /api/lift-mcp/health → upstream /health
  const pathParam = req.query.path;
  const extra =
    typeof pathParam === 'string'
      ? pathParam
      : Array.isArray(pathParam)
        ? pathParam.join('/')
        : '';
  const upstreamUrl = extra ? `${UPSTREAM.replace(/\/$/, '')}/${extra}` : UPSTREAM;

  const headers = new Headers();
  const accept = req.headers.accept;
  const contentType = req.headers['content-type'];
  const mcpProtocol = req.headers['mcp-protocol-version'];
  const mcpSession = req.headers['mcp-session-id'];
  const lastEventId = req.headers['last-event-id'];

  if (typeof accept === 'string') headers.set('Accept', accept);
  else headers.set('Accept', 'application/json, text/event-stream');
  if (typeof contentType === 'string') headers.set('Content-Type', contentType);
  if (typeof mcpProtocol === 'string') headers.set('MCP-Protocol-Version', mcpProtocol);
  if (typeof mcpSession === 'string') headers.set('Mcp-Session-Id', mcpSession);
  if (typeof lastEventId === 'string') headers.set('Last-Event-ID', lastEventId);
  headers.set('Authorization', `Bearer ${token}`);

  let body: Buffer | undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    body = await readRawBody(req);
  }

  const upstream = await fetch(upstreamUrl, {
    method: req.method,
    headers,
    body: body && body.length > 0 ? body : undefined,
  });

  res.status(upstream.status);
  res.setHeader('Access-Control-Allow-Origin', '*');
  const passHeaders = [
    'content-type',
    'mcp-session-id',
    'cache-control',
  ] as const;
  for (const name of passHeaders) {
    const value = upstream.headers.get(name);
    if (value) res.setHeader(name, value);
  }

  const buf = Buffer.from(await upstream.arrayBuffer());
  res.send(buf);
}
