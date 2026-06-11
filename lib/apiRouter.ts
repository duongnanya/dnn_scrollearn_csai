import type { VercelRequest, VercelResponse } from '@vercel/node';
import { analyzeUrl, analyzeText, analyzeImage, mapAnalyzeError } from './analyzeCore';

export const config = {
  maxDuration: 60,
};

function getRoute(req: VercelRequest): string {
  const fromQuery = req.query.path;
  if (Array.isArray(fromQuery)) return fromQuery.join('/');
  if (typeof fromQuery === 'string' && fromQuery) return fromQuery;

  const pathname = (req.url || '').split('?')[0];
  return pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
}

function methodNotAllowed(res: VercelResponse) {
  return res.status(405).json({ error: 'Method not allowed' });
}

async function handler(req: VercelRequest, res: VercelResponse) {
  const route = getRoute(req);

  try {
    if (route === 'health') {
      if (req.method !== 'GET') return methodNotAllowed(res);
      const key = (process.env.GEMINI_API_KEY || '').trim();
      return res.status(200).json({ ok: true, gemini: !!key });
    }

    if (route === 'analyze-url') {
      if (req.method !== 'POST') return methodNotAllowed(res);
      try {
        const result = await analyzeUrl(req.body?.url);
        return res.status(200).json(result);
      } catch (err) {
        return res.status(500).json({ error: mapAnalyzeError(err, 'url') });
      }
    }

    if (route === 'analyze-text') {
      if (req.method !== 'POST') return methodNotAllowed(res);
      try {
        const result = await analyzeText(req.body?.text);
        return res.status(200).json(result);
      } catch (err) {
        return res.status(500).json({ error: mapAnalyzeError(err, 'text') });
      }
    }

    if (route === 'analyze-image') {
      if (req.method !== 'POST') return methodNotAllowed(res);
      try {
        const { base64, mimeType } = req.body || {};
        const result = await analyzeImage(base64, mimeType);
        return res.status(200).json(result);
      } catch (err) {
        return res.status(500).json({ error: mapAnalyzeError(err, 'image') });
      }
    }

    return res.status(404).json({ error: `API route không tồn tại: ${route || '(empty)'}` });
  } catch (err) {
    console.error('[api]', route, err);
    const msg = err instanceof Error ? err.message : 'Lỗi server';
    return res.status(500).json({ error: msg });
  }
}

export default handler;
