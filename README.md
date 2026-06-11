# ScrollRecall

Ứng dụng đọc tin tức dạng feed vô hạn kết hợp tóm tắt AI và ôn tập Active Recall.

## Cấu trúc thư mục

```
dnn_scrollearn/
├── .env.example          # Mẫu biến môi trường
├── .env                  # Cấu hình thực (không commit)
├── server.ts             # Backend Express + Gemini AI
├── firestore.rules       # Quy tắc bảo mật Firebase
├── src/
│   ├── config/env.ts     # Đọc biến môi trường client
│   ├── types.ts          # Kiểu dữ liệu dùng chung
│   ├── firebase.ts       # Auth + Firestore sync
│   ├── utils/            # Tiện ích (render tóm tắt)
│   └── components/       # UI components
└── package.json
```

## Cài đặt

1. Copy `.env.example` → `.env` và điền:
   - `GEMINI_API_KEY` — lấy tại [Google AI Studio](https://aistudio.google.com/apikey)
   - Các biến `VITE_FIREBASE_*` — từ Firebase Console

2. Cài dependencies và chạy:

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Tính năng

- Feed scroll vô hạn với tóm tắt ngắn gọn (bullet, bảng, biểu đồ)
- Ôn tập xen kẽ (Active Recall quiz)
- Dán URL / clipboard / file / ảnh OCR
- Yêu thích + cá nhân hóa tần suất quiz
- Đồng bộ Firebase (Google, Email, Guest)
- Nút lên/xuống chuyển đúng 1 thẻ

## Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

## Build production

```bash
npm run build
NODE_ENV=production npm start
```

## Deploy Vercel

- Frontend: Vite build → `dist/`
- API: Serverless Functions trong thư mục `api/` (`/api/analyze-url`, `/api/analyze-text`, `/api/analyze-image`, `/api/health`)
- **Bắt buộc** thêm biến môi trường trên Vercel:
  - `GEMINI_API_KEY` (runtime — cho API)
  - `VITE_FIREBASE_*` (build time — cho client)
- Kiểm tra: `GET https://your-app.vercel.app/api/health` → `{ "ok": true, "gemini": true }`
