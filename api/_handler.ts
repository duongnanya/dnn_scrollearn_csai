import type { VercelRequest, VercelResponse } from '@vercel/node';
import { mapAnalyzeError } from '../lib/analyzeCore';

export function methodNotAllowed(res: VercelResponse) {
  return res.status(405).json({ error: 'Method not allowed' });
}

export function serverError(res: VercelResponse, err: unknown, context: 'url' | 'text' | 'image' = 'text') {
  const msg = mapAnalyzeError(err, context);
  return res.status(500).json({ error: msg });
}
