/**
 * Stub 404 handler for OAuth discovery paths.
 * Supabase Edge Function gateway blocks these paths, so we 404 them
 * at the Vercel proxy level to prevent Claude from attempting OAuth.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(404).json({
    error: 'Not Found',
    message: 'OAuth discovery is not supported. Use bearer token authentication.',
  });
}
