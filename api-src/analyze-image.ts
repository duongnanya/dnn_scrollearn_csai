import { analyzeImage, mapAnalyzeError } from '../lib/analyzeCore';

export const config = { maxDuration: 60 };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await analyzeImage(body?.base64, body?.mimeType);
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: mapAnalyzeError(err, 'image') }, { status: 500 });
  }
}
