# Reference — Infographic pipeline ScrollRecall

## InfographicData schema

```ts
type InfographicKind = 'chart' | 'table' | 'stat' | 'compare';

interface InfographicData {
  kind: InfographicKind;
  label: string;
  chart?: { label: string; value: number; unit?: string }[];
  table?: { headers: string[]; rows: string[][] };
  stats?: { label: string; value: string; unit?: string }[];
  compare?: { label: string; valueA: string; valueB?: string }[];
}
```

## Luồng dữ liệu

```
Gemini JSON (infographics[] + pieces)
    ↓
feedBuilder + infographicNormalizer
    ↓
FeedItem type: 'infographic'
    ↓
FeedCard → InfographicCard
    ├── Tab Số liệu: hybrid SVG + HTML
    └── Piece inline: summaryRenderer (HTML .chart-bar only)
```

## statParse (`src/utils/statParse.ts`)

| Hàm | Vai trò |
|-----|---------|
| `parseStatAmount(value, unit, label)` | Chuẩn hóa số, `unitKind`: currency/count/percent/other |
| `canCompareStats(items)` | Cùng loại đơn vị mới được bar/pie so sánh |
| `tryDerivePerUnit(items)` | Tiền + count → chi phí/đơn vị (không bar sai tỷ lệ) |
| `formatTyUsd(n)` | Hiển thị tỷ USD |

Tiền quy về **tỷ USD** trước khi tính tỷ trọng pie.

## Components InfographicCard

| Component | Điều kiện | Công nghệ |
|-----------|-----------|-----------|
| `SvgPieChart` | stat ≥3, `canCompareStats` | SVG donut + legend (ưu tiên HTML khi refactor) |
| `SvgComparableBars` | stat 1–2, cùng đơn vị | SVG bar (có thể chuyển HTML bar) |
| `SvgStatList` | khác đơn vị | SVG list — không bar |
| `SvgDerivedPerUnit` | tiền + count | SVG bar suy ra |
| `SvgBarChart` | kind chart | SVG bar |
| `SvgTable` | kind table | SVG grid (có thể HTML table) |
| `SvgCompare` | kind compare | SVG dual bar |

## HTML/CSS có sẵn (`index.css`)

```css
.chart-bar { height: 6px; border-radius: 9999px; background: #e2e8f0; }
.chart-bar-fill { background: linear-gradient(90deg, #6366f1, #818cf8); transition: width 0.6s ease; }
```

Dùng trong `summaryRenderer` và khi refactor bar trong `InfographicCard`.

## Màu (`chartColors.ts`)

```ts
// Bar — gradient OK, hue có thể gần
BAR_GRADIENT_COLORS = ['#6366f1', '#818cf8', '#14b8a6', ...]

// Pie — mỗi slice khác hue
PIE_SLICE_COLORS = ['#4f46e5', '#0d9488', '#ea580c', '#be185d', '#7c3aed']
getPieSliceColor(index)
```

**Quy tắc pie:**
- Không dùng `BAR_GRADIENT_COLORS` cho `<path>` donut
- Cấm cặp liên tiếp: indigo `#6366f1` + indigo nhạt `#818cf8`
- Slice <12°: `strokeWidth` 2.5, `#fff`
- Legend: swatch + text giá trị = màu slice

## SVG helpers (`svgText.ts`)

- `wrapSvgLines` — xuống dòng không ellipsis
- `buildPieAngles` / `pieDonutSlicePath` — donut slices
- `fontSizeForLabel` — 9 / 8 / 7

## SUMMARY_PROMPT

- Mảng `infographics` có cấu trúc (ưu tiên)
- ≥3 chỉ số cùng nhóm → **một** `kind: stat` với `stats[]`
- Pieces chỉ mô tả chữ, không lặp số

## Quyết định refactor

| User pain | Sửa |
|-----------|-----|
| Label pie bị cắt | Legend → HTML dưới SVG donut |
| Bar đơn giản khó maintain | `SvgComparableBars` → div + `.chart-bar` |
| Bảng label dài | `SvgTable` → `<table className="...">` |
| Pie lệch tỷ lệ | Kiểm tra `statParse` + `canCompareStats` |
