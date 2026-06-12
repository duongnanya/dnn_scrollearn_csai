import type { VercelRequest, VercelResponse } from '@vercel/node';
import { dispatchApi } from '../lib/apiDispatch';

export const config = { maxDuration: 60 };

export default function handler(req: VercelRequest, res: VercelResponse) {
  return dispatchApi(req, res, 'analyze-url');
}
