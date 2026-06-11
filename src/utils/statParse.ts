/** Parse & chuẩn hóa số liệu tiếng Việt — so sánh đúng tỉ lệ, xử lý đơn vị lẫn */

export type UnitKind = 'currency' | 'count' | 'percent' | 'other';

export interface ParsedStatAmount {
  label: string;
  num: number;
  unitKind: UnitKind;
  display: string;
  unitNote: string;
}

function extractRawNumber(text: string): number {
  const range = text.match(/([\d.,]+)\s*[-–]\s*([\d.,]+)/);
  if (range) {
    const a = parseFloat(range[1].replace(/,/g, ''));
    const b = parseFloat(range[2].replace(/,/g, ''));
    if (Number.isFinite(a) && Number.isFinite(b)) return (a + b) / 2;
  }
  const m = text.match(/([\d.,]+)/);
  return m ? parseFloat(m[0].replace(/,/g, '')) : 0;
}

/** Quy về tỷ USD để so sánh tiền */
function toTyUsd(combined: string, raw: number): number {
  if (/nghìn\s*tỷ|nghin\s*ty|nghin ty/i.test(combined)) return raw * 1000;
  if (/triệu|trieu|million/i.test(combined)) return raw / 1000;
  if (/\btỷ\b|\bty\b|billion|usd|đô|\$/i.test(combined)) return raw;
  return raw;
}

function detectUnitKind(combined: string): UnitKind {
  if (/%|phần trăm|percent/i.test(combined)) return 'percent';
  if (/usd|đô|vnd|vnđ|\$|tỷ|ty\b|triệu|trieu|nghìn\s*tỷ/i.test(combined)) return 'currency';
  if (/đơn vị|don vi|gpu|chip|máy|may|thiết bị|thiet bi|cổ phiếu|co phieu/i.test(combined)) return 'count';
  return 'other';
}

/** Chèn khoảng trắng giữa số và đơn vị (vd. 200,000chiếc → 200,000 chiếc) */
export function formatValueWithUnit(value: string, unit?: string): string {
  let v = String(value).trim();
  v = v.replace(/([\d,.]+)(?=[^\d,.\s%\-–])/g, '$1 ');
  const u = (unit || '').trim();
  if (u && !v.toLowerCase().includes(u.toLowerCase())) {
    return `${v} ${u}`.replace(/\s+/g, ' ').trim();
  }
  return v.replace(/\s+/g, ' ').trim();
}

export function joinValueUnit(value: string | number, unit?: string, fallback = ''): string {
  return formatValueWithUnit(String(value), unit || fallback);
}

export function parseStatAmount(value: string, unit?: string, label = ''): ParsedStatAmount {
  const display = formatValueWithUnit(value, unit);
  const combined = `${value} ${unit || ''} ${label}`.toLowerCase();
  const raw = extractRawNumber(combined);
  const unitKind = detectUnitKind(combined);

  let num = raw;
  let unitNote = unit || '';

  if (unitKind === 'currency') {
    num = toTyUsd(combined, raw);
    unitNote = 'tỷ USD';
  } else if (unitKind === 'percent') {
    unitNote = '%';
  } else if (unitKind === 'count') {
    unitNote = unit?.replace(/^đơn vị$/i, 'đơn vị') || 'đơn vị';
  }

  return { label, num, unitKind, display, unitNote };
}

export function canCompareStats(items: ParsedStatAmount[]): boolean {
  if (items.length < 2) return true;
  const kinds = new Set(items.map(i => i.unitKind));
  if (kinds.size !== 1) return false;
  const k = items[0].unitKind;
  return k === 'currency' || k === 'percent' || k === 'count';
}

export interface DerivedPerUnit {
  label: string;
  value: number;
  display: string;
  sources: ParsedStatAmount[];
}

/** Tiền + số lượng → chi phí trung bình / đơn vị */
export function tryDerivePerUnit(items: ParsedStatAmount[]): DerivedPerUnit | null {
  if (items.length !== 2) return null;
  const money = items.find(i => i.unitKind === 'currency');
  const qty = items.find(i => i.unitKind === 'count');
  if (!money || !qty || qty.num <= 0) return null;

  const moneyUsd = money.num * 1e9;
  const perUnit = moneyUsd / qty.num;

  let display: string;
  if (perUnit >= 1e6) display = `${(perUnit / 1e6).toFixed(2)} triệu USD/đơn vị`;
  else if (perUnit >= 1000) display = `${(perUnit / 1000).toFixed(1)} nghìn USD/đơn vị`;
  else display = `${Math.round(perUnit).toLocaleString('vi-VN')} USD/đơn vị`;

  const qtyLabel = qty.label.toLowerCase();
  const perLabel = qtyLabel.includes('gpu')
    ? 'Chi phí trung bình mỗi GPU/tháng'
    : `Chi phí trung bình mỗi ${qty.unitNote}/tháng`;

  return { label: perLabel, value: perUnit, display, sources: [money, qty] };
}

export function formatTyUsd(ty: number): string {
  if (ty >= 1000) return `${(ty / 1000).toFixed(2)} nghìn tỷ USD`;
  if (ty >= 1) return `${ty % 1 === 0 ? ty : ty.toFixed(2)} tỷ USD`;
  if (ty >= 0.001) return `${(ty * 1000) % 1 === 0 ? ty * 1000 : (ty * 1000).toFixed(0)} triệu USD`;
  return `${ty} tỷ USD`;
}
