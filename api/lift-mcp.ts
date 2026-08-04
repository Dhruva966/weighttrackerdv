/**
 * Public Claude connector front-door for Lift MCP.
 *
 * Supabase gateway 401s Claude's path-inserted OAuth discovery, so Connect fails
 * against the raw Edge URL. This proxy accepts unauthenticated MCP calls, injects
 * LIFT_MCP_TOKEN, and forwards to Supabase. vercel.json 404s /.well-known probes.
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

  // /api/lift-mcp/health → ?path=health via vercel rewrite
  const pathParam = req.query.path;
  const extra =
    typeof pathParam === 'string'
      ? pathParam
      : Array.isArray(pathParam)
        ? pathParam.filter(Boolean).join('/')
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
  for (const name of ['content-type', 'mcp-session-id', 'cache-control'] as const) {
    const value = upstream.headers.get(name);
    if (value) res.setHeader(name, value);
  }

  res.send(Buffer.from(await upstream.arrayBuffer()));
}
