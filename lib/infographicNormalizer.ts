type InfographicKind = 'chart' | 'table' | 'stat' | 'compare';

interface InfographicData {
  kind: InfographicKind;
  label: string;
  chart?: { label: string; value: number; unit?: string }[];
  table?: { headers: string[]; rows: string[][] };
  stats?: { label: string; value: string; unit?: string }[];
  compare?: { label: string; valueA: string; valueB?: string }[];
}

const KINDS: InfographicKind[] = ['chart', 'table', 'stat', 'compare'];

function normalizeInfographic(raw: unknown): InfographicData | null {
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
