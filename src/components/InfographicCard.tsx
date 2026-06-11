import { BarChart3 } from 'lucide-react';
import type { InfographicData, InfographicKind } from '../types';
import { canCompareStats, formatTyUsd, joinValueUnit, parseStatAmount, tryDerivePerUnit, type ParsedStatAmount } from '../utils/statParse';
import { BAR_GRADIENT_COLORS, getPieSliceColor } from '../utils/chartColors';
import { buildPieAngles, fontSizeForLabel, pieDonutSlicePath, vCenterTextY, wrapSvgLines } from '../utils/svgText';

const BAR_VALUE_W = 92;

interface Props {
  label?: string;
  data: InfographicData;
  compact?: boolean;
}

const COLORS = BAR_GRADIENT_COLORS;
const KIND_LABEL: Record<InfographicKind, string> = {
  stat: 'Chỉ số',
  chart: 'Biểu đồ',
  table: 'Bảng',
  compare: 'So sánh',
};

export default function InfographicCard({ label, data, compact }: Props) {
  return (
    <article className={`feed-card rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/90 via-white to-cyan-50/60 shadow-md ${compact ? '' : ''}`}>
      <div className="shrink-0 px-4 pt-4 pb-2 border-b border-teal-100/80">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-semibold uppercase tracking-wide">
          <BarChart3 className="w-3 h-3" /> {KIND_LABEL[data.kind]}
        </span>
        {label && <p className="text-xs text-teal-600 mt-1.5 leading-snug">{label}</p>}
      </div>
      <div className="feed-card-body p-4 flex flex-col justify-center items-center min-h-[140px]">
        {data.kind === 'chart' && data.chart && <SvgBarChart items={data.chart} />}
        {data.kind === 'table' && data.table && <SvgTable table={data.table} />}
        {data.kind === 'stat' && data.stats && <SvgStats stats={data.stats} />}
        {data.kind === 'compare' && data.compare && <SvgCompare items={data.compare} />}
      </div>
    </article>
  );
}

function SvgDefs() {
  return (
    <defs>
      {COLORS.map((c, i) => (
        <linearGradient key={i} id={`ig-grad-${i}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={c} stopOpacity="0.95" />
          <stop offset="100%" stopColor={c} stopOpacity="0.65" />
        </linearGradient>
      ))}
    </defs>
  );
}

function SvgMultilineText({
  x, y, text, fontSize, fill, anchor = 'start', maxChars = 14, fontWeight,
}: {
  x: number; y: number; text: string; fontSize: number; fill: string;
  anchor?: 'start' | 'middle' | 'end'; maxChars?: number; fontWeight?: number | string;
}) {
  const lines = wrapSvgLines(text, maxChars);
  const lh = fontSize * 1.2;
  return (
    <text x={x} y={y} fontSize={fontSize} fill={fill} textAnchor={anchor} fontWeight={fontWeight} fontFamily="Inter, sans-serif">
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : lh}>{line}</tspan>
      ))}
    </text>
  );
}

function SvgBarChart({ items }: { items: NonNullable<InfographicData['chart']> }) {
  const max = Math.max(...items.map(i => i.value), 1);
  const w = 320;
  const labelW = 96;
  const barH = 26;
  const gap = 8;
  const trackW = w - labelW - BAR_VALUE_W;
  const labelLines = items.map(i => wrapSvgLines(i.label, 12).length);
  const rowExtra = labelLines.map(n => Math.max(0, n - 1) * 10);
  let yOff = 12;
  const rows = items.map((item, i) => {
    const y = yOff;
    yOff += barH + gap + rowExtra[i];
    return { item, i, y };
  });
  const h = yOff + 8;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-sm" role="img" aria-label="Biểu đồ cột">
      <SvgDefs />
      {rows.map(({ item, i, y }) => {
        const pct = (item.value / max) * 100;
        const barW = (pct / 100) * trackW;
        const fs = fontSizeForLabel(item.label, 10, 8);
        const labelLineCount = wrapSvgLines(item.label, 12).length;
        return (
          <g key={i}>
            <SvgMultilineText x={0} y={vCenterTextY(y, barH, labelLineCount, fs)} text={item.label} fontSize={fs} fill="#475569" maxChars={12} />
            <rect x={labelW} y={y} width={trackW} height={barH} rx={6} fill="#e2e8f0" />
            <rect x={labelW} y={y} width={Math.max(barW, 4)} height={barH} rx={6} fill={`url(#ig-grad-${i % COLORS.length})`} />
            <text x={w - 2} y={y + barH / 2} fontSize="9" fill="#334155" fontWeight="600" textAnchor="end" dominantBaseline="middle" fontFamily="Inter, sans-serif">
              {joinValueUnit(item.value, item.unit, '%')}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function SvgTable({ table }: { table: NonNullable<InfographicData['table']> }) {
  const cols = table.headers.length;
  const cellW = Math.min(110, 300 / Math.max(cols, 1));
  const lineH = 11;
  const padY = 10;
  const rowHeights = table.rows.map(row =>
    Math.max(...row.map(cell => wrapSvgLines(cell, 11).length), 1) * lineH + padY * 2
  );
  const headerH = Math.max(...table.headers.map(h => wrapSvgLines(h, 11).length), 1) * lineH + padY * 2;
  const w = cols * cellW + 2;
  let y = 0;
  const headerY = y;
  y += headerH;

  return (
    <svg viewBox={`0 0 ${w} ${headerH + rowHeights.reduce((a, b) => a + b, 0) + 2}`} className="w-full max-w-sm" role="img" aria-label="Bảng số liệu">
      {table.headers.map((hdr, ci) => {
        const fs = fontSizeForLabel(hdr, 9, 7);
        const lines = wrapSvgLines(hdr, 11).length;
        return (
          <g key={`h${ci}`}>
            <rect x={ci * cellW} y={headerY} width={cellW} height={headerH} fill="#f0fdfa" stroke="#99f6e4" strokeWidth="0.5" />
            <SvgMultilineText x={ci * cellW + cellW / 2} y={vCenterTextY(headerY, headerH, lines, fs)} text={hdr} fontSize={fs} fill="#0f766e" anchor="middle" maxChars={11} fontWeight="600" />
          </g>
        );
      })}
      {table.rows.map((row, ri) => {
        const rowY = y;
        y += rowHeights[ri];
        return row.map((cell, ci) => {
          const fs = fontSizeForLabel(cell, 9, 7);
          const lines = wrapSvgLines(cell, 11).length;
          return (
            <g key={`${ri}-${ci}`}>
              <rect x={ci * cellW} y={rowY} width={cellW} height={rowHeights[ri]} fill={ri % 2 ? '#f8fafc' : '#fff'} stroke="#e2e8f0" strokeWidth="0.5" />
              <SvgMultilineText x={ci * cellW + cellW / 2} y={vCenterTextY(rowY, rowHeights[ri], lines, fs)} text={cell} fontSize={fs} fill="#475569" anchor="middle" maxChars={11} />
            </g>
          );
        });
      })}
    </svg>
  );
}

function statValueLabel(p: ParsedStatAmount): string {
  if (p.unitKind === 'currency') return formatTyUsd(p.num);
  return p.display;
}

function SvgStats({ stats }: { stats: NonNullable<InfographicData['stats']> }) {
  const shown = stats.slice(0, Math.min(stats.length, 5));
  const parsed = shown.map(s => parseStatAmount(s.value, s.unit, s.label));

  const derived = tryDerivePerUnit(parsed);
  if (derived) return <SvgDerivedPerUnit derived={derived} />;

  if (!canCompareStats(parsed)) return <SvgStatList items={parsed} />;

  if (parsed.length >= 3 && parsed.some(p => p.num > 0)) {
    return <SvgPieChart segments={parsed} />;
  }

  return <SvgComparableBars items={parsed} />;
}

/** Tiền + số lượng → chi phí/đơn vị, không bar so sánh sai */
function SvgDerivedPerUnit({ derived }: { derived: import('../utils/statParse').DerivedPerUnit }) {
  const w = 300;
  const barH = 18;
  const h = 28 + derived.sources.length * 36 + 24;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-sm" role="img" aria-label="Chỉ số suy ra">
      <SvgDefs />
      <SvgMultilineText x={0} y={12} text={derived.label} fontSize={9} fill="#0f766e" maxChars={18} fontWeight="600" />
      <rect x={0} y={18} width={w - BAR_VALUE_W} height={barH} rx={6} fill="#e2e8f0" />
      <rect x={0} y={18} width={w - BAR_VALUE_W - 4} height={barH} rx={6} fill="url(#ig-grad-0)" />
      <text x={w - 2} y={18 + barH / 2} fontSize="9" fill="#0f766e" fontWeight="700" textAnchor="end" dominantBaseline="middle" fontFamily="Plus Jakarta Sans, sans-serif">
        {derived.display}
      </text>
      <text x={0} y={52} fontSize="7" fill="#94a3b8" fontFamily="Inter, sans-serif">Nguồn:</text>
      {derived.sources.map((s, i) => (
        <g key={i}>
          <rect x={0} y={58 + i * 34} width={6} height={6} rx={1} fill={COLORS[i % COLORS.length]} />
          <SvgMultilineText x={10} y={66 + i * 34} text={s.label} fontSize={8} fill="#64748b" maxChars={20} />
          <text x={w - 2} y={66 + i * 34} fontSize={8} fill="#475569" textAnchor="end" fontFamily="Inter, sans-serif">
            {s.display}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Chỉ số khác đơn vị — chỉ liệt kê, không bar so sánh */
function SvgStatList({ items }: { items: ParsedStatAmount[] }) {
  const w = 300;
  let y = 10;
  const rows = items.map((s, i) => {
    const fs = fontSizeForLabel(s.label, 8, 7);
    const lines = wrapSvgLines(s.label, 18).length;
    const rowY = y;
    y += lines * (fs * 1.2) + 14;
    return { s, i, rowY, fs, lines };
  });
  const h = y + 6;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-sm" role="img" aria-label="Danh sách chỉ số">
      {rows.map(({ s, i, rowY, fs }) => (
        <g key={i}>
          <rect x={0} y={rowY} width={8} height={8} rx={2} fill={COLORS[i % COLORS.length]} />
          <SvgMultilineText x={12} y={rowY + 8} text={s.label} fontSize={fs} fill="#475569" maxChars={18} />
          <text x={w - 2} y={rowY + 8} fontSize={fs} fill="#0f766e" fontWeight="600" textAnchor="end" fontFamily="Plus Jakarta Sans, sans-serif">
            {statValueLabel(s)}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** Bar so sánh — chỉ khi cùng loại đơn vị, đã chuẩn hóa */
function SvgComparableBars({ items }: { items: ParsedStatAmount[] }) {
  const max = Math.max(...items.map(p => p.num), 0.0001);
  const w = 300;
  const barH = 14;
  const blockGap = 10;
  const trackW = w - BAR_VALUE_W;
  let y = 8;
  const blocks = items.map((s, i) => {
    const labelFs = fontSizeForLabel(s.label, 8, 7);
    const labelLineCount = wrapSvgLines(s.label, 14).length;
    const labelBlockH = labelLineCount * (labelFs * 1.2) + 2;
    const blockY = y;
    y += labelBlockH + barH + blockGap;
    return { s, i, blockY, labelFs, labelBlockH, labelLineCount };
  });
  const h = y + 4;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-sm" role="img" aria-label="Biểu đồ so sánh">
      <SvgDefs />
      {blocks.map(({ s, i, blockY, labelFs, labelBlockH, labelLineCount }) => {
        const barY = blockY + labelBlockH;
        const pct = s.num > 0 ? s.num / max : 0;
        return (
          <g key={i}>
            <SvgMultilineText x={0} y={vCenterTextY(blockY, labelBlockH, labelLineCount, labelFs)} text={s.label} fontSize={labelFs} fill="#475569" maxChars={14} />
            <rect x={0} y={barY} width={trackW} height={barH} rx={5} fill="#e2e8f0" />
            <rect x={0} y={barY} width={Math.max(pct * trackW, s.num > 0 ? 4 : 0)} height={barH} rx={5} fill={`url(#ig-grad-${i % COLORS.length})`} />
            <text x={w - 2} y={barY + barH / 2} fontSize="8" fill="#334155" fontWeight="700" textAnchor="end" dominantBaseline="middle" fontFamily="Plus Jakarta Sans, sans-serif">
              {statValueLabel(s)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Donut pie — >= 3 chỉ số cùng đơn vị */
function SvgPieChart({ segments }: { segments: ParsedStatAmount[] }) {
  const w = 320;
  const cx = 86;
  const cy = 88;
  const rOut = 66;
  const rIn = 40;
  const legendGap = 18;
  const legendX = cx + rOut + legendGap;
  const values = segments.map(s => Math.max(s.num, 0));
  const angles = buildPieAngles(values);
  const legendFs = 8;
  const lineH = legendFs * 1.25;
  const legendRows = segments.map((s, i) => {
    const lines = wrapSvgLines(s.label, 16);
    return { s, i, lines, pct: angles[i].pct };
  });
  const legendH = legendRows.reduce((h, r) => h + r.lines.length * lineH + 6, 8);
  const h = Math.max(cy + rOut + 16, legendH + 8);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-sm" role="img" aria-label="Biểu đồ tròn tỷ trọng">
      <SvgDefs />
      {angles.map((a, i) => {
        const thin = a.end - a.start < 12;
        return (
          <path
            key={i}
            d={pieDonutSlicePath(cx, cy, rOut, rIn, a.start, a.end)}
            fill={getPieSliceColor(i)}
            stroke="#fff"
            strokeWidth={thin ? 2.5 : 1.5}
          />
        );
      })}
      <text x={cx} y={cy - 2} fontSize="9" fill="#64748b" textAnchor="middle" fontFamily="Inter, sans-serif">
        Tỷ trọng
      </text>
      <text x={cx} y={cy + 10} fontSize="7" fill="#94a3b8" textAnchor="middle" fontFamily="Inter, sans-serif">
        {segments[0]?.unitNote || ''}
      </text>
      {(() => {
        let ly = 10;
        return legendRows.map(({ s, i, lines, pct }) => {
          const rowY = ly;
          const labelH = lines.length * lineH;
          ly += labelH + lineH + 4;
          return (
            <g key={i}>
              <rect x={legendX} y={rowY + 1} width={8} height={8} rx={2} fill={getPieSliceColor(i)} />
              <text x={legendX + 12} y={rowY + 8} fontSize={legendFs} fill="#475569" fontFamily="Inter, sans-serif">
                {lines.map((line, li) => (
                  <tspan key={li} x={legendX + 12} dy={li === 0 ? 0 : lineH}>{line}</tspan>
                ))}
              </text>
              <text x={legendX + 12} y={rowY + labelH + 10} fontSize={legendFs - 1} fill={getPieSliceColor(i)} fontWeight="600" fontFamily="Inter, sans-serif">
                {statValueLabel(s)} · {pct.toFixed(0)}%
              </text>
            </g>
          );
        });
      })()}
    </svg>
  );
}

function SvgCompare({ items }: { items: NonNullable<InfographicData['compare']> }) {
  const w = 300;
  const gap = 8;
  let y = 6;
  const blocks = items.map((item, i) => {
    const labelFs = fontSizeForLabel(item.label, 9, 7);
    const labelLines = wrapSvgLines(item.label, 16).length;
    const labelH = labelLines * (labelFs * 1.2);
    const blockY = y;
    y += labelH + 22 + gap;
    return { item, i, blockY, labelFs, labelH };
  });
  const h = y + 4;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-sm" role="img" aria-label="So sánh">
      <SvgDefs />
      {blocks.map(({ item, i, blockY, labelFs, labelH }) => {
        const barY = blockY + labelH + 2;
        const valA = parseStatAmount(String(item.valueA), undefined, item.label).num;
        const valB = parseStatAmount(String(item.valueB || '0'), undefined, item.label).num;
        const max = Math.max(valA, valB, 1);
        const half = (w - 16) / 2;
        return (
          <g key={i}>
            <SvgMultilineText x={0} y={blockY + labelFs} text={item.label} fontSize={labelFs} fill="#475569" maxChars={16} fontWeight="500" />
            <rect x={0} y={barY} width={half - 20} height={12} rx={4} fill="#e2e8f0" />
            <rect x={0} y={barY} width={Math.max((valA / max) * (half - 20), 2)} height={12} rx={4} fill="url(#ig-grad-0)" />
            <text x={half - 22} y={barY + 6} fontSize="8" fill="#6366f1" textAnchor="end" dominantBaseline="middle" fontWeight="600">{item.valueA}</text>
            <rect x={half + 4} y={barY} width={half - 20} height={12} rx={4} fill="#e2e8f0" />
            <rect x={half + 4} y={barY} width={Math.max((valB / max) * (half - 20), 2)} height={12} rx={4} fill="url(#ig-grad-2)" />
            <text x={w - 2} y={barY + 6} fontSize="8" fill="#14b8a6" textAnchor="end" dominantBaseline="middle" fontWeight="600">{item.valueB || '—'}</text>
          </g>
        );
      })}
    </svg>
  );
}
