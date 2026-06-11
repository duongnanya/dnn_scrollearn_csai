import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzeUrl } from '../lib/analyzeCore';
import { methodNotAllowed, serverError } from './_handler';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  try {
    const { url } = req.body || {};
    const result = await analyzeUrl(url);
    return res.status(200).json(result);
  } catch (err) {
    return serverError(res, err, 'url');
  }
}
