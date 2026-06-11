/** Tách text thành nhiều dòng cho SVG — không cắt bằng … */
export function wrapSvgLines(text: string, maxCharsPerLine: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxCharsPerLine && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

import { parseStatAmount } from './statParse';

/** @deprecated dùng parseStatAmount — giữ để tương thích */
export function parseStatNumeric(value: string, unit?: string): number {
  return parseStatAmount(value, unit).num;
}

export function fontSizeForLabel(text: string, base = 9, min = 7): number {
  if (text.length <= 14) return base;
  if (text.length <= 22) return base - 1;
  return min;
}

/** Y dòng đầu để khối text căn giữa theo chiều dọc trong ô */
export function vCenterTextY(cellY: number, cellH: number, lineCount: number, fontSize: number): number {
  const lh = fontSize * 1.2;
  const blockH = lineCount * lh;
  return cellY + (cellH - blockH) / 2 + fontSize * 0.85;
}

/** Góc độ slice cho pie chart (0–360) */
export function buildPieAngles(values: number[]): { start: number; end: number; pct: number }[] {
  const total = values.reduce((a, b) => a + b, 0) || 1;
  let acc = 0;
  return values.map(v => {
    const pct = (v / total) * 100;
    const sweep = (v / total) * 360;
    const start = acc;
    acc += sweep;
    return { start, end: acc, pct };
  });
}

export function pieSlicePath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  if (endDeg - startDeg >= 359.99) {
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy} Z`;
  }
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(startDeg));
  const y1 = cy + r * Math.sin(rad(startDeg));
  const x2 = cx + r * Math.cos(rad(endDeg));
  const y2 = cy + r * Math.sin(rad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

export function pieDonutSlicePath(cx: number, cy: number, rOut: number, rIn: number, startDeg: number, endDeg: number): string {
  if (endDeg - startDeg >= 359.99) {
    return `M ${cx - rOut} ${cy} A ${rOut} ${rOut} 0 1 1 ${cx + rOut} ${cy} A ${rOut} ${rOut} 0 1 1 ${cx - rOut} ${cy} M ${cx - rIn} ${cy} A ${rIn} ${rIn} 0 1 0 ${cx + rIn} ${cy} A ${rIn} ${rIn} 0 1 0 ${cx - rIn} ${cy} Z`;
  }
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const ox1 = cx + rOut * Math.cos(rad(startDeg));
  const oy1 = cy + rOut * Math.sin(rad(startDeg));
  const ox2 = cx + rOut * Math.cos(rad(endDeg));
  const oy2 = cy + rOut * Math.sin(rad(endDeg));
  const ix2 = cx + rIn * Math.cos(rad(endDeg));
  const iy2 = cy + rIn * Math.sin(rad(endDeg));
  const ix1 = cx + rIn * Math.cos(rad(startDeg));
  const iy1 = cy + rIn * Math.sin(rad(startDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${ox1} ${oy1} A ${rOut} ${rOut} 0 ${large} 1 ${ox2} ${oy2} L ${ix2} ${iy2} A ${rIn} ${rIn} 0 ${large} 0 ${ix1} ${iy1} Z`;
}
