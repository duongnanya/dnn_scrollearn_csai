# Examples — Infographic Agent

## Ví dụ 1: Hybrid pie (khuyến nghị)

**Data:** 3 chỉ số SpaceX Q1 (cùng tỷ USD)

```ts
{ kind: 'stat', label: 'Tình hình tài chính AI SpaceX (Q1)', stats: [
  { label: 'Chi phí vốn (tổng)', value: '10.1', unit: 'tỷ USD' },
  { label: 'Chi phí vốn (cho AI)', value: '7.7', unit: 'tỷ USD' },
  { label: 'Lỗ hoạt động AI', value: '2.5', unit: 'tỷ USD' },
]}
```

**Render:**
- **SVG:** donut 3 slice — màu `#4f46e5` / `#0d9488` / `#ea580c` (không 2 indigo giống nhau)
- Slice 12%: viền trắng dày hơn để thấy trên chart
- **Legend:** swatch + giá trị % **cùng màu slice**
- Không 3 vòng tròn rời; không `…` trên label

## Ví dụ 1b: Pie 3 vòng gọi vốn — tránh màu trùng

```ts
stats: [
  { label: 'Vòng hạt giống 2023', value: '8', unit: 'triệu USD' },   // ~0% — slice mỏng
  { label: 'Vòng Series A 2024', value: '60', unit: 'triệu USD' },  // ~3%
  { label: 'Vòng Series D 2025', value: '2.30', unit: 'tỷ USD' },    // ~97%
]
```

**Sai:** slice 0 = `#6366f1`, slice 1 = `#818cf8` → khó phân biệt 2 vòng nhỏ.

**Đúng:** `getPieSliceColor(0/1/2)` → indigo / teal / cam; slice mỏng có `strokeWidth: 2.5`.

## Ví dụ 2: Bar HTML (refactor từ SVG)

```tsx
const HtmlBarRow = ({ label, pct, display }: { label: string; pct: number; display: string }) => (
  <div className="space-y-1">
    <p className="text-[8px] leading-snug text-slate-600">{label}</p>
    <div className="chart-bar">
      <div className="chart-bar-fill" style={{ width: `${pct}%` }} />
    </div>
    <p className="text-[8px] font-semibold text-teal-700 text-right">{display}</p>
  </div>
);
```

Dùng cho `SvgComparableBars` / `chart` khi label tiếng Việt dài.

## Ví dụ 3: Khác đơn vị → list, không bar

```ts
stats: [
  { label: 'Chi phí vốn', value: '10.1', unit: 'tỷ USD' },
  { label: 'Số GPU thuê', value: '700000', unit: 'đơn vị' },
]
```

→ `canCompareStats` = false → `SvgStatList` (hoặc HTML list), **không** pie/bar so sánh sai.

## Ví dụ 4: Tiền + đơn vị → derived

```ts
stats: [
  { label: 'Chi phí vốn (tổng)', value: '10.1', unit: 'tỷ USD' },
  { label: 'Số GPU thuê', value: '700000', unit: 'đơn vị' },
]
```

→ `tryDerivePerUnit` → hiển thị ~14.4k USD/GPU + nguồn liệt kê.

## Ví dụ 5: Piece vs tab Số liệu

| Nơi | Công nghệ | File |
|-----|-----------|------|
| Trong mảnh tin | HTML `.chart-bar` | `summaryRenderer.tsx` |
| Tab Số liệu | Hybrid SVG+HTML | `InfographicCard.tsx` |

Không nhân đôi logic — cùng `InfographicData`, khác mức chi tiết render.

## Ví dụ 6: Feed filter

| Filter | Infographic |
|--------|-------------|
| Hỗn hợp | Ẩn |
| Số liệu | Hiện đầy đủ |
| Mảnh tin | Không (đã tách) |
