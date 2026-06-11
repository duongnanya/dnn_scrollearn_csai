import type { FeedItem, InfographicData, InfographicKind } from '../types';

const KINDS: InfographicKind[] = ['chart', 'table', 'stat', 'compare'];

export function normalizeInfographic(raw: unknown): InfographicData | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const kind = String(o.kind || '') as InfographicKind;
  if (!KINDS.includes(kind)) return null;

  const label = String(o.label || 'Số liệu').trim() || 'Số liệu';
  const base: InfographicData = { kind, label };

  if (kind === 'chart' && Array.isArray(o.chart)) {
    const chart = o.chart
      .map((c: unknown) => {
        if (!c || typeof c !== 'object') return null;
        const x = c as Record<string, unknown>;
        const value = Number(x.value);
        if (!Number.isFinite(value)) return null;
        return {
          label: String(x.label || '').trim(),
          value,
          unit: x.unit != null ? String(x.unit) : '%',
        };
      })
      .filter(Boolean) as NonNullable<InfographicData['chart']>;
    if (!chart?.length) return null;
    return { ...base, chart };
  }

  if (kind === 'stat' && Array.isArray(o.stats)) {
    const stats = o.stats
      .map((s: unknown) => {
        if (!s || typeof s !== 'object') return null;
        const x = s as Record<string, unknown>;
        const value = String(x.value ?? '').trim();
        if (!value) return null;
        return {
          label: String(x.label || label).trim(),
          value,
          unit: x.unit != null ? String(x.unit) : undefined,
        };
      })
      .filter(Boolean) as NonNullable<InfographicData['stats']>;
    if (!stats?.length) return null;
    return { ...base, stats };
  }

  if (kind === 'table' && o.table && typeof o.table === 'object') {
    const t = o.table as Record<string, unknown>;
    const headers = Array.isArray(t.headers) ? t.headers.map(h => String(h)) : [];
    const rows = Array.isArray(t.rows)
      ? t.rows.map(r => (Array.isArray(r) ? r.map(c => String(c)) : []))
      : [];
    if (!headers.length || !rows.length) return null;
    return { ...base, table: { headers, rows } };
  }

  if (kind === 'compare' && Array.isArray(o.compare)) {
    const compare = o.compare
      .map((c: unknown) => {
        if (!c || typeof c !== 'object') return null;
        const x = c as Record<string, unknown>;
        return {
          label: String(x.label || '').trim(),
          valueA: String(x.valueA ?? ''),
          valueB: x.valueB != null ? String(x.valueB) : undefined,
        };
      })
      .filter(Boolean) as NonNullable<InfographicData['compare']>;
    if (!compare?.length) return null;
    return { ...base, compare };
  }

  return null;
}

export function normalizeInfographics(raw: unknown): InfographicData[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeInfographic).filter((x): x is InfographicData => x != null);
}

export function resolveInfographicData(item: FeedItem): InfographicData | null {
  if (item.infographic) return item.infographic;
  if (!item.summary) return null;
  try {
    const parsed = JSON.parse(item.summary) as unknown;
    return normalizeInfographic(parsed);
  } catch {
    return null;
  }
}

export function createInfographicFeedItem(
  articleId: string,
  title: string,
  data: InfographicData,
  index: number,
): FeedItem {
  return {
    id: `${articleId}-ig${index}`,
    type: 'infographic',
    articleId,
    pieceLabel: data.label,
    title,
    summary: JSON.stringify(data),
    infographic: data,
    createdAt: 0,
  };
}
