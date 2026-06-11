import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeUrl, analyzeText, analyzeImage, getHealth, mapAnalyzeError } from './lib/analyzeCore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

// Một số mạng Windows/antivirus chặn SSL của Node — bật ALLOW_INSECURE_SSL=true trong .env (chỉ dev)
if (process.env.ALLOW_INSECURE_SSL === 'true') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.warn('[SSL] ALLOW_INSECURE_SSL=true — bỏ qua xác minh certificate (chỉ dùng local/dev)');
}

const PORT = Number(process.env.PORT) || 3001;
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/analyze-url', async (req, res) => {
  try {
    const result = await analyzeUrl(req.body?.url);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: mapAnalyzeError(err, 'url') });
  }
});

app.post('/api/analyze-text', async (req, res) => {
  try {
    const result = await analyzeText(req.body?.text);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: mapAnalyzeError(err, 'text') });
  }
});

app.post('/api/analyze-image', async (req, res) => {
  try {
    const { base64, mimeType } = req.body || {};
    const result = await analyzeImage(base64, mimeType);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: mapAnalyzeError(err, 'image') });
  }
});

app.get('/api/health', (_req, res) => {
  res.json(getHealth());
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`ScrollRecall server chạy tại http://localhost:${PORT}`);
  console.log(`Gemini API: ${GEMINI_API_KEY ? 'đã cấu hình' : 'CHƯA cấu hình — tạo file .env từ .env.example'}`);
});
