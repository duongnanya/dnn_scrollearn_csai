import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzeImage } from '../lib/analyzeCore';
import { methodNotAllowed, serverError } from './_handler';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return methodNotAllowed(res);
  try {
    const { base64, mimeType } = req.body || {};
    const result = await analyzeImage(base64, mimeType);
    return res.status(200).json(result);
  } catch (err) {
    return serverError(res, err, 'image');
  }
}
