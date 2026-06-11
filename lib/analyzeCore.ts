import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import https from 'https';
import http from 'http';
import { normalizeInfographics } from '../src/utils/infographicNormalizer';
import type { QuizData } from '../src/types';

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const MODELS = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite'];

const SUMMARY_PROMPT = `Bạn là trợ lý tóm tắt tin tức tiếng Việt. Chia nội dung thành NHIỀU MẢNH NHỎ (pieces) dễ lướt đọc, KHÔNG gom thành 1 bài dài.

Trả về JSON thuần (không markdown fence):

{
  "title": "Tiêu đề bài gốc (ngắn gọn)",
  "pieces": [
    {
      "label": "Nhãn mảnh (VD: Tóm lược, Bối cảnh, Số liệu, Thách thức...)",
      "content": "Mỗi mảnh CHỈ 25-55 từ. Một ý duy nhất. Liệt kê dùng '- '. Số liệu đặt riêng: dòng 'Tên số liệu: 852 tỷ USD'. So sánh dùng bảng |A|B|. Biểu đồ %: [Biểu đồ] Tên:45% | Tên2:30%"
    }
  ],
  "quizzes": [
    {
      "question": "Câu hỏi trắc nghiệm CHỈ về các mảnh đã covers",
      "coversPieceIndexes": [0, 1, 2],
      "options": [
        {"text": "Đáp án A", "isCorrect": false},
        {"text": "Đáp án B", "isCorrect": true},
        {"text": "Đáp án C", "isCorrect": false},
        {"text": "Đáp án D", "isCorrect": false}
      ],
      "explanation": "Giải thích ngắn"
    }
  ],
  "infographics": [
    {
      "kind": "stat",
      "label": "Nhãn nhóm số liệu",
      "stats": [{"label": "Tên chỉ số", "value": "852", "unit": "tỷ USD"}]
    },
    {
      "kind": "chart",
      "label": "Phân bổ",
      "chart": [{"label": "Mảng A", "value": 45, "unit": "%"}, {"label": "Mảng B", "value": 30, "unit": "%"}]
    },
    {
      "kind": "table",
      "label": "So sánh",
      "table": {"headers": ["Hạng mục", "Giá trị"], "rows": [["OpenAI", "42%"], ["Google", "28%"]]}
    },
    {
      "kind": "compare",
      "label": "Đối chiếu",
      "compare": [{"label": "OpenAI", "valueA": "42", "valueB": "28"}]
    }
  ]
}

Quy tắc:
- Tạo 5-8 pieces, mỗi piece độc lập, súc tích — pieces chỉ mô tả bằng chữ, KHÔNG lặp số/bảng/chart trong content
- Tạo 2-5 infographics nếu bài có số liệu: kind chỉ dùng stat | chart | table | compare
- Các chỉ số cùng nhóm/tổng (vd. 3 khoản chi phí Q1): gom vào MỘT infographic kind stat với stats[] 3+ phần tử (pie tỷ trọng)
- So sánh tiền: dùng CÙNG đơn vị (vd. cả hai "tỷ USD" hoặc "1750" + unit "tỷ USD" cho 1,75 nghìn tỷ). Không trộn triệu USD với số GPU trong một stats[]
- Phí + số lượng (GPU): tách 2 dòng stats hoặc dùng kind compare/chart — app sẽ tự tính chi phí/đơn vị
- Tạo 3-5 quizzes Active Recall — MỖI quiz BẮT BUỘC có coversPieceIndexes (mảng chỉ số piece 0-based)
- Quiz CHỈ hỏi nội dung đã có trong pieces[coversPieceIndexes] — CẤM hỏi phần chưa tóm tắt / chưa nằm trong các mảnh đó (kể cả có trong bài gốc)
- CẤM spoiler: không hỏi mảnh phía dưới feed mà user chưa scroll tới
- coversPieceIndexes tăng dần; mỗi quiz sau cửa sổ 1-3 mảnh vừa đọc
- Không lặp nội dung giữa các pieces
- JSON hợp lệ: xuống dòng trong chuỗi phải dùng \\n, không xuống dòng thật trong value

Nội dung cần phân tích:
`;

async function callGeminiWithFallback(prompt: string, imageData?: { mimeType: string; data: string }) {
  if (!genAI) throw new Error('GEMINI_API_KEY chưa được cấu hình');

  let lastError: Error | null = null;
  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' },
      });
      const parts: Array<string | { inlineData: { mimeType: string; data: string } }> = [prompt];
      if (imageData) parts.push({ inlineData: imageData });
      const result = await model.generateContent(parts);
      return result.response.text();
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message.toLowerCase();
      if (msg.includes('503') || msg.includes('unavailable') || msg.includes('overloaded')) continue;
      throw lastError;
    }
  }
  throw lastError || new Error('Tất cả model Gemini đều không khả dụng');
}

function sanitizeJsonControlChars(json: string): string {
  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const c = json[i];
    const code = c.charCodeAt(0);

    if (escaped) {
      result += c;
      escaped = false;
      continue;
    }
    if (c === '\\' && inString) {
      result += c;
      escaped = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      result += c;
      continue;
    }
    if (inString && code < 32) {
      if (c === '\n') result += '\\n';
      else if (c === '\r') result += '\\r';
      else if (c === '\t') result += '\\t';
      else result += `\\u${code.toString(16).padStart(4, '0')}`;
      continue;
    }
    result += c;
  }
  return result;
}

function removeTrailingCommas(json: string): string {
  return json.replace(/,(\s*[}\]])/g, '$1');
}

function extractJsonObject(text: string): string {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Không tìm thấy JSON trong phản hồi AI');
  return cleaned.slice(start, end + 1);
}

function parseGeminiJson(text: string) {
  const raw = extractJsonObject(text);
  const variants = [
    raw,
    sanitizeJsonControlChars(raw),
    removeTrailingCommas(sanitizeJsonControlChars(raw)),
  ];

  let lastErr: Error | null = null;
  for (const candidate of variants) {
    try {
      return normalizeAnalyzeResult(JSON.parse(candidate) as Record<string, unknown>);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
    }
  }
  console.error('[parseGeminiJson] Lỗi:', lastErr?.message, raw.slice(0, 200));
  throw new Error('Không đọc được kết quả AI — vui lòng thử lại');
}

function normalizeQuizzes(raw: unknown): QuizData[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((q) => {
    const o = (q && typeof q === 'object' ? q : {}) as Record<string, unknown>;
    const options = Array.isArray(o.options)
      ? o.options.map((opt) => {
          const x = (opt && typeof opt === 'object' ? opt : {}) as Record<string, unknown>;
          return { text: String(x.text || ''), isCorrect: Boolean(x.isCorrect) };
        })
      : [];
    const covers = Array.isArray(o.coversPieceIndexes)
      ? o.coversPieceIndexes.map(n => Number(n)).filter(n => Number.isFinite(n) && n >= 0)
      : undefined;
    return {
      question: String(o.question || ''),
      options,
      explanation: String(o.explanation || ''),
      coversPieceIndexes: covers?.length ? covers : undefined,
    };
  }).filter(q => q.question && q.options.length >= 2);
}

function normalizeAnalyzeResult(raw: Record<string, unknown>) {
  if (Array.isArray(raw.pieces) && raw.pieces.length > 0) {
    const pieces = (raw.pieces as Array<{ label?: string; content?: string }>).map((p, i) => ({
      label: String(p.label || `Mảnh ${i + 1}`),
      content: String(p.content || ''),
    }));
    return {
      title: String(raw.title || 'Không có tiêu đề'),
      pieces,
      quizzes: normalizeQuizzes(raw.quizzes),
      infographics: normalizeInfographics(raw.infographics),
    };
  }
  const summary = String(raw.summary || '');
  const chunks = summary.split(/\n\n+/).filter(Boolean);
  const pieces = chunks.length > 1
    ? chunks.map((c, i) => ({ label: `Mảnh ${i + 1}`, content: c }))
    : [{ label: 'Tóm lược', content: summary.slice(0, 200) }, { label: 'Chi tiết', content: summary.slice(200) || summary }].filter(p => p.content.trim());
  return {
    title: String(raw.title || 'Không có tiêu đề'),
    pieces,
    quizzes: normalizeQuizzes(raw.quiz ? [raw.quiz] : raw.quizzes),
    infographics: normalizeInfographics(raw.infographics),
  };
}

const FETCH_HEADERS: Record<string, string> = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
};

function isSslError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  const cause = err instanceof Error && err.cause instanceof Error ? err.cause.message.toLowerCase() : '';
  return msg.includes('fetch failed') && (
    cause.includes('certificate') || cause.includes('ssl') || cause.includes('tls')
  );
}

function fetchHtmlNative(url: string, rejectUnauthorized: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const req = mod.get(url, { headers: FETCH_HEADERS, rejectUnauthorized, timeout: 20000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = new URL(res.headers.location, url).href;
        fetchHtmlNative(next, rejectUnauthorized).then(resolve).catch(reject);
        return;
      }
      if (!res.statusCode || res.statusCode >= 400) {
        reject(new Error(`Không tải được URL: ${res.statusCode}`));
        return;
      }
      let html = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { html += chunk; });
      res.on('end', () => resolve(html));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Tải URL quá thời gian chờ')); });
  });
}

async function fetchHtml(url: string): Promise<string> {
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`Không tải được URL: ${res.status}`);
    return await res.text();
  } catch (err) {
    if (isSslError(err)) {
      console.warn('[scrape] SSL fallback cho:', url);
      return fetchHtmlNative(url, false);
    }
    throw err instanceof Error ? err : new Error(String(err));
  }
}

function extractArticleText(html: string, url: string): string {
  const $ = cheerio.load(html);
  $('script, style, nav, footer, header, aside, iframe, noscript, .menu, .breadcrumb, .comment, .ads, .advertisement').remove();

  const title =
    $('h1.title-detail, h1.title, article h1, .detail-content h1, h1').first().text().trim()
    || $('meta[property="og:title"]').attr('content')?.trim()
    || $('title').text().trim();

  const selectors = [
    '.detail-content p',
    '.content-detail p',
    '.ArticleDetail p',
    'article .content p',
    'article p',
    '.main-content p',
    'main p',
  ];

  let paragraphs: string[] = [];
  for (const sel of selectors) {
    paragraphs = $(sel).map((_, el) => $(el).text().trim()).get().filter(t => t.length > 30);
    if (paragraphs.length >= 2) break;
  }
  if (paragraphs.length === 0) {
    paragraphs = $('p').map((_, el) => $(el).text().trim()).get().filter(t => t.length > 30);
  }

  const body = paragraphs.slice(0, 40).join('\n\n')
    || $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000);

  if (body.length < 80) {
    throw new Error(
      'Không trích xuất được nội dung từ URL. Hãy copy bài viết và dán vào ô văn bản bên dưới.'
    );
  }

  return `Nguồn: ${url}\nTiêu đề: ${title}\n\n${body}`;
}

async function scrapeUrl(url: string): Promise<string> {
  const html = await fetchHtml(url);
  return extractArticleText(html, url);
}

export function getHealth() {
  return { ok: true, gemini: !!GEMINI_API_KEY };
}

export async function analyzeUrl(url: string) {
  if (!url) throw new Error('Thiếu URL');
  const content = await scrapeUrl(url);
  const raw = await callGeminiWithFallback(SUMMARY_PROMPT + content);
  const parsed = parseGeminiJson(raw);
  return { ...parsed, sourceUrl: url };
}

export async function analyzeText(text: string) {
  if (!text?.trim()) throw new Error('Thiếu nội dung văn bản');
  const raw = await callGeminiWithFallback(SUMMARY_PROMPT + text.slice(0, 12000));
  return parseGeminiJson(raw);
}

export async function analyzeImage(base64: string, mimeType: string) {
  if (!base64 || !mimeType) throw new Error('Thiếu dữ liệu ảnh');
  const prompt = SUMMARY_PROMPT + '\n[Hình ảnh chứa văn bản — hãy OCR và tóm tắt nội dung]';
  const raw = await callGeminiWithFallback(prompt, { mimeType, data: base64 });
  return parseGeminiJson(raw);
}

export function mapAnalyzeError(err: unknown, context: 'url' | 'text' | 'image' = 'text'): string {
  let msg = err instanceof Error ? err.message : 'Lỗi không xác định';
  if (context === 'url' && msg === 'fetch failed') {
    msg = 'Không kết nối được tới URL. Hãy copy nội dung bài viết và dán vào ô văn bản bên dưới.';
  }
  return msg;
}
