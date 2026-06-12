export const config = { maxDuration: 10 };

export function GET() {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  return Response.json({ ok: true, gemini: !!key });
}
