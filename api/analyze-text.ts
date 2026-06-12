import { analyzeText, mapAnalyzeError } from '../lib/analyzeCore';

export const config = { maxDuration: 60 };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await analyzeText(body?.text);
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: mapAnalyzeError(err, 'text') }, { status: 500 });
  }
}
