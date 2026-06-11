import type { FeedItem, InfographicData } from '../types';

import { createInfographicFeedItem } from './infographicNormalizer';



function stripBullet(line: string): string {

  return line.replace(/^[-*•]\s+/, '').trim();

}



export function extractInfographics(content: string, defaultLabel = 'Số liệu'): { cleaned: string; items: InfographicData[] } {

  const items: InfographicData[] = [];

  const keptLines: string[] = [];

  const lines = content.split('\n');

  let tableBuffer: string[] = [];



  const flushTable = () => {

    if (tableBuffer.length < 2) {

      keptLines.push(...tableBuffer);

      tableBuffer = [];

      return;

    }

    const rows = tableBuffer.filter(l => l.includes('|')).map(l => l.split('|').map(c => c.trim()).filter(Boolean));

    if (rows.length >= 2) {

      const headers = rows[0];

      const body = rows.slice(rows[1].every(c => /^[-:]+$/.test(c)) ? 2 : 1);

      if (headers.length === 2 && body.length >= 1 && body.every(r => r.length >= 2)) {

        items.push({

          kind: 'compare',

          label: defaultLabel,

          compare: body.map(row => ({ label: row[0] || '', valueA: row[1] || '', valueB: row[2] || '' })),

        });

      } else if (headers.length >= 2 && body.length >= 1) {

        items.push({ kind: 'table', label: defaultLabel, table: { headers, rows: body } });

      } else {

        keptLines.push(...tableBuffer);

      }

    } else {

      keptLines.push(...tableBuffer);

    }

    tableBuffer = [];

  };



  const tryStatLine = (raw: string): boolean => {

    const trimmed = stripBullet(raw);

    const statMatch = trimmed.match(/^([^:：|]{2,60})[:：]\s*([\d,.]+)\s*(%|tỷ|triệu|nghìn|USD|tỷ USD|triệu USD|triệu đô)?/i);

    if (!statMatch) return false;

    const num = statMatch[2];

    const unit = statMatch[3] || (trimmed.includes('%') ? '%' : '');

    if (Number(num.replace(/,/g, '')) <= 0) return false;

    items.push({

      kind: 'stat',

      label: statMatch[1].trim(),

      stats: [{ label: statMatch[1].trim(), value: num.replace(/,/g, ''), unit }],

    });

    return true;

  };



  const tryChartLine = (raw: string): boolean => {

    const trimmed = raw.trim();

    const chartPrefix = /^\[Biểu đồ\]/i;

    if (!chartPrefix.test(trimmed)) return false;

    const chartData = trimmed.replace(chartPrefix, '').trim();

    const parts = chartData.split('|').map(s => s.trim()).filter(Boolean);

    const chart = parts.map(p => {

      const m = p.match(/^(.+?)[:：]\s*(\d+(?:\.\d+)?)\s*(%|tỷ|triệu|USD|usd)?$/i);

      if (!m) return null;

      return { label: m[1].trim(), value: Number(m[2]), unit: m[3] || '%' };

    }).filter(Boolean) as InfographicData['chart'];

    if (!chart?.length) return false;

    items.push({ kind: 'chart', label: defaultLabel, chart });

    return true;

  };



  for (const line of lines) {

    const trimmed = line.trim();

    if (!trimmed) { flushTable(); continue; }



    if (tryChartLine(trimmed)) { flushTable(); continue; }



    if (trimmed.startsWith('|')) {

      tableBuffer.push(trimmed);

      continue;

    }

    if (tableBuffer.length) flushTable();



    if (tryStatLine(trimmed)) continue;



    const vsMatch = stripBullet(trimmed).match(/^(.+?)\s+(?:so với|vs\.?|hơn|kém)\s+(.+?)[:：]?\s*([\d,.]+)\s*(.*)$/i);

    if (vsMatch) {

      items.push({

        kind: 'compare',

        label: defaultLabel,

        compare: [{ label: vsMatch[1].trim(), valueA: vsMatch[3], valueB: vsMatch[2].trim() }],

      });

      continue;

    }



    keptLines.push(line);

  }

  flushTable();



  const cleaned = keptLines.join('\n').trim();

  return { cleaned, items };

}



/** Tạo feed items infographic từ piece đã lưu (legacy) */

export function deriveInfographicFeedItems(piece: { id: string; title: string; summary: string; articleId?: string; pieceLabel?: string; createdAt: number }): FeedItem[] {

  const { items } = extractInfographics(piece.summary, piece.pieceLabel || 'Số liệu');

  return items.map((data, i) => ({

    ...createInfographicFeedItem(piece.articleId || piece.id, piece.title, data, i),

    id: `${piece.id}-ig${i}`,

    createdAt: piece.createdAt - (i + 1) * 0.001,

  }));

}


