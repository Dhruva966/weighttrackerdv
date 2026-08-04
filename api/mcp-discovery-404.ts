import type { VercelRequest, VercelResponse } from '@vercel/node';

/** Claude probes /.well-known/* on the connector host. 404 = no OAuth here. */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(404).setHeader('Content-Type', 'text/plain').send('Not Found');
}
