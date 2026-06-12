# Thiết lập Vercel qua terminal (chạy trong thư mục dự án)

## 1. Đăng nhập (một lần)

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"
npx vercel login
```

Mở link hiện ra, nhập mã xác thực.

## 2. Liên kết project GitHub

```powershell
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"
npx vercel link --yes
```

Chọn team → project `dnn_scrollearn_csai` (hoặc tạo mới).

## 3. Đồng bộ biến môi trường từ `.env`

```powershell
npm run vercel:env
```

## 4. Deploy production

```powershell
npm run vercel:deploy
```

## 5. Kiểm tra API

```
GET https://<domain>/api/health
POST https://<domain>/api/analyze-text  {"text":"..."}
```
