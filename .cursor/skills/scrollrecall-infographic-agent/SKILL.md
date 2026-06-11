---
name: scrollrecall-infographic-agent
description: >-
  Xây dựng và chỉnh sửa infographic ScrollRecall: số liệu, so sánh, bảng, biểu đồ
  hybrid SVG + HTML/CSS (không ảnh, không thư viện chart nặng). Dùng khi user yêu cầu
  infographic, số liệu, biểu đồ, tab Số liệu, InfographicCard, infographicExtractor,
  statParse, hoặc cải thiện render trong feed.
---

# ScrollRecall Infographic Agent

Agent chuyên **tách, chuẩn hóa, render và cải thiện** nội dung dạng số/bảng/biểu đồ cho app ScrollRecall.

## Nguyên tắc bắt buộc

1. **Hybrid SVG + HTML/CSS** — không thay toàn bộ SVG bằng HTML, cũng không SVG thuần khi HTML tiện hơn (xem bảng dưới).
2. **Không ảnh, không chart lib nặng** — cấm `<img>`, canvas export, Chart.js/Recharts trừ khi user yêu cầu rõ.
3. **Biểu đồ trước, số sau** — mỗi thẻ có hình biểu đồ; không chỉ số trong vòng tròn decorative / text trần.
4. **Text luôn đầy đủ** — cấm `slice()` + `'…'`. Ưu tiên **HTML** (`<p>`, `leading-snug`) cho label dài; SVG chỉ khi cần `<tspan>`.
5. **Pipeline** — AI → `InfographicData` → `InfographicCard` (tab Số liệu); piece inline dùng `summaryRenderer` (HTML bar).
6. **Giữ diff nhỏ** — sửa đúng file liên quan.

## Chiến lược render (SVG vs HTML)

| Thành phần | Nên dùng | Lý do |
|------------|----------|--------|
| Pie / donut | **SVG** `<path>` | Hình học chính xác, tỷ trọng |
| Bar chart đơn giản | **HTML/CSS** `.chart-bar` | Wrap text tự nhiên, transition dễ |
| Bar trong `InfographicCard` | SVG *hoặc* HTML — ưu tiên **HTML** khi refactor label dài | Giảm `<tspan>` phức tạp |
| Legend pie (label + %) | **HTML** dưới donut SVG | Tiếng Việt dài, xuống dòng tự nhiên |
| Bảng | **HTML `<table>`** + Tailwind *hoặc* SVG grid | HTML dễ text đầy đủ |
| Compare 2 cột | **HTML** 2 `.chart-bar` *hoặc* SVG dual bar | Tương đương |
| Preview trong piece | **HTML** (`summaryRenderer`) | Đã có `.chart-bar` — không đổi sang SVG |

**Pattern hybrid khuyến nghị (pie):**

```tsx
// Donut SVG + legend HTML
<div className="flex flex-col sm:flex-row gap-3 items-center">
  <svg>...</svg>  {/* chỉ hình tròn */}
  <ul className="text-[8px] leading-snug space-y-2">
  {/* label đầy đủ + giá trị + % */}
  </ul>
</div>
```

## Bản đồ file

| File | Vai trò |
|------|---------|
| `src/components/InfographicCard.tsx` | Thẻ tab Số liệu — routing kind → component |
| `src/utils/statParse.ts` | `parseStatAmount`, `canCompareStats`, `tryDerivePerUnit` |
| `src/utils/svgText.ts` | `wrapSvgLines`, `pieDonutSlicePath`, `buildPieAngles` |
| `src/utils/infographicExtractor.ts` | Text → `InfographicData[]` |
| `src/utils/infographicNormalizer.ts` | Chuẩn hóa từ API |
| `src/utils/summaryRenderer.tsx` | Bar HTML trong piece — **giữ HTML** |
| `src/utils/chartColors.ts` | `PIE_SLICE_COLORS`, `BAR_GRADIENT_COLORS`, `getPieSliceColor` |
| `src/index.css` | `.chart-bar`, `.chart-bar-fill` |
| `server.ts` | `SUMMARY_PROMPT` + mảng `infographics` |

Chi tiết: [reference.md](reference.md) · Ví dụ: [examples.md](examples.md)

## Routing `stat` (InfographicCard)

```
parseStatAmount từng stat
    ↓
tryDerivePerUnit?     → SvgDerivedPerUnit (tiền + đơn vị → chi phí/đơn vị)
canCompareStats=false → SvgStatList (khác đơn vị — list, không bar sai)
length >= 3 + cùng đơn vị → SvgPieChart (donut SVG; legend ưu tiên HTML)
else                  → SvgComparableBars (1–2 chỉ số cùng đơn vị)
```

AI: gom ≥3 chỉ số cùng nhóm vào **một** `stats[]` (một feed item) để pie có ý nghĩa.

## Kind → render

| kind | Render | Ghi chú |
|------|--------|---------|
| `chart` | Bar ngang (HTML ưu tiên / SVG hiện tại) | Scale theo max |
| `stat` | Pie / bars / list / derived (xem trên) | Không so sánh bar khi khác đơn vị |
| `table` | HTML table hoặc SVG grid | Ưu tiên HTML nếu label dài |
| `compare` | Dual bar | A indigo, B teal |

## Text — không ellipsis

- HTML: `text-xs leading-snug`, `break-words` — không `line-clamp` trên label số liệu
- SVG (khi bắt buộc): `wrapSvgLines` + `fontSizeForLabel` (9→8→7)
- Cấm: `label.slice(0,n) + '…'`

## Palette & màu pie (phân biệt slice)

**Bar / gradient** (`BAR_GRADIENT_COLORS` trong `chartColors.ts`) — có thể cùng họ indigo.

**Pie / donut** — bắt buộc `PIE_SLICE_COLORS` / `getPieSliceColor(i)`:
- Mỗi slice **khác hue** (indigo → teal → cam → hồng → tím)
- **Cấm** 2 slice liên tiếp cùng họ: `#6366f1` + `#818cf8`, `#6366f1` + `#4f46e5`
- Legend swatch + giá trị % dùng **đúng màu slice** (không gom hết về teal)

| Index | Màu pie | Hue |
|-------|---------|-----|
| 0 | `#4f46e5` | indigo |
| 1 | `#0d9488` | teal |
| 2 | `#ea580c` | cam |
| 3 | `#be185d` | hồng |
| 4 | `#7c3aed` | tím |

**Slice mỏng** (< ~12° hoặc <5%): `stroke="#fff"` dày hơn (`2.5`) để tách viền.

**Kiểm tra nhanh:** nhìn thumbnail — 3 màu đầu phải phân biệt được ngay; nếu 2 slice trông “cùng xanh/tím” → đổi palette, không chỉ đổi gradient.

Card: `border-teal-100` · Track bar: `#e2e8f0`

## Checklist

- [ ] Pie dùng `PIE_SLICE_COLORS`, không `BAR_GRADIENT_COLORS`
- [ ] 3+ slice không có cặp màu quá giống (vd. indigo + indigo nhạt)
- [ ] Legend swatch khớp slice; slice mỏng có viền trắng đủ dày
- [ ] Đúng layer SVG vs HTML theo bảng trên
- [ ] `stat` ≥3 cùng đơn vị → pie; legend text đầy đủ
- [ ] `npm run build` pass

## Anti-patterns

- **Pie slice `#6366f1` + `#818cf8`** — khó phân biệt (lỗi thực tế đã gặp)
- Dùng `COLORS[i % n]` chung cho bar và pie
- Thay **toàn bộ** SVG → HTML hoặc ngược lại không cần thiết
- 3 vòng tròn rời chỉ có số · `slice()` + `'…'`
- Chart.js/Recharts cho pie đơn giản

## Giao tiếp

- Trả lời **tiếng Việt**
- Code gợi ý: tên hàm + comment bước chính
- Không tự format code hiện có trừ khi được yêu cầu
