/**
 * Đồng bộ biến từ .env lên Vercel (production + preview).
 * Chạy sau khi: vercel login && vercel link
 */
import { readFileSync, existsSync } from 'fs';
import { spawnSync } from 'child_process';

const ENV_FILE = '.env';
const TARGETS = ['production', 'preview'];

const KEYS = [
  'GEMINI_API_KEY',
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_API_BASE_URL',
];

// Production: API cùng domain — không dùng localhost
const PRODUCTION_OVERRIDES = {
  VITE_API_BASE_URL: '/api',
};

function parseEnv(content) {
  const map = new Map();
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    map.set(key, val);
  }
  return map;
}

function vercelEnvAdd(key, value, target) {
  const r = spawnSync(
    'vercel',
    ['env', 'add', key, target, '--force'],
    { input: value, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], shell: true },
  );
  if (r.status !== 0) {
    console.error(`[FAIL] ${key} (${target}):`, r.stderr || r.stdout);
    return false;
  }
  console.log(`[OK] ${key} → ${target}`);
  return true;
}

if (!existsSync(ENV_FILE)) {
  console.error('Không tìm thấy .env');
  process.exit(1);
}

const env = parseEnv(readFileSync(ENV_FILE, 'utf8'));
let ok = 0;
let fail = 0;

for (const key of KEYS) {
  let value = env.get(key);
  if (key in PRODUCTION_OVERRIDES) {
    value = PRODUCTION_OVERRIDES[key];
  }
  if (value == null || value === '') {
    console.log(`[SKIP] ${key} — trống trong .env`);
    continue;
  }
  for (const target of TARGETS) {
    if (vercelEnvAdd(key, value, target)) ok++;
    else fail++;
  }
}

console.log(`\nXong: ${ok} OK, ${fail} lỗi`);
process.exit(fail > 0 ? 1 : 0);
