# Thiết lập Vercel qua terminal

## Đã cấu hình

- **CLI:** `npm install -g vercel` (hoặc dùng `npx vercel`)
- **Project:** `duongnanyas-projects/dnn-scrollearn-csai`
- **URL:** https://dnn-scrollearn-csai.vercel.app
- **Đăng nhập:** `vercel login` (device code)

## Lệnh thường dùng

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"   # Nếu lỗi SSL trên Windows

vercel whoami
vercel env ls
npm run vercel:env          # Đồng bộ .env → Vercel (GEMINI_API_KEY, VITE_*)
npm run vercel:deploy       # Deploy production
vercel logs dnn-scrollearn-csai.vercel.app --since 10m
```

## Kiểm tra API

```
GET  https://dnn-scrollearn-csai.vercel.app/api/health
POST https://dnn-scrollearn-csai.vercel.app/api/analyze-text
     Body: {"text":"..."}
```

## Kiến trúc deploy

| Route | File | Ghi chú |
|-------|------|---------|
| `/api/health` | `api/health.ts` | Native Vercel handler |
| `/api/analyze-*` | `api/*.mjs` | esbuild bundle lúc `npm run build` |

**Quan trọng:** `VITE_API_BASE_URL=/api` trên Vercel (không dùng `localhost`).
