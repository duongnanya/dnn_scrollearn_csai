import { analyzeUrl, mapAnalyzeError } from '../lib/analyzeCore';

export const config = { maxDuration: 60 };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await analyzeUrl(body?.url);
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: mapAnalyzeError(err, 'url') }, { status: 500 });
  }
}
