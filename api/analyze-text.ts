import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzeText } from '../lib/analyzeCore';
import { methodNotAllowed, serverError } from './_handler';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  try {
    const { text } = req.body || {};
    const result = await analyzeText(text);
    return res.status(200).json(result);
  } catch (err) {
    return serverError(res, err, 'text');
  }
}
