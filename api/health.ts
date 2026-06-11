import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getHealth } from '../lib/analyzeCore';
import { methodNotAllowed } from './_handler';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return methodNotAllowed(res);
  return res.status(200).json(getHealth());
}
