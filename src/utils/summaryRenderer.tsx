import { type ReactNode } from 'react';

export function renderSummaryContent(text: string): ReactNode[] {
  const lines = text.split('\n');
  const nodes: ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let tableBuffer: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (bulletBuffer.length === 0) return;
    nodes.push(
      <ul key={key++}>
        {bulletBuffer.map((b, i) => <li key={i}>{b}</li>)}
      </ul>
    );
    bulletBuffer = [];
  };

  const flushTable = () => {
    if (tableBuffer.length < 2) {
      tableBuffer.forEach(l => nodes.push(<p key={key++}>{l}</p>));
      tableBuffer = [];
      return;
    }
    const rows = tableBuffer
      .filter(l => l.includes('|'))
      .map(l => l.split('|').map(c => c.trim()).filter(Boolean));
    const header = rows[0];
    const body = rows.slice(2);
    nodes.push(
      <table key={key++}>
        <thead><tr>{header.map((h, i) => <th key={i}>{renderCellContent(h)}</th>)}</tr></thead>
        <tbody>
          {body.map((row, ri) => (
            <tr key={ri}>{row.map((c, ci) => <td key={ci}>{renderCellContent(c)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    );
    tableBuffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('[Biểu đồ]')) {
      flushBullets();
      flushTable();
      const chartData = trimmed.replace('[Biểu đồ]', '').trim();
      const items = chartData.split('|').map(s => s.trim()).filter(Boolean);
      nodes.push(
        <div key={key++} className="my-3 space-y-2">
          {items.map((item, i) => {
            const match = item.match(/^(.+?)[:：]\s*(\d+(?:\.\d+)?)\s*%?$/);
            if (!match) return <p key={i} className="text-sm">{item}</p>;
            const [, label, val] = match;
            const pct = Math.min(Number(val), 100);
            return (
              <div key={i}>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{label}</span><span>{pct}%</span>
                </div>
                <div className="chart-bar"><div className="chart-bar-fill" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
      );
      continue;
    }

    if (trimmed.startsWith('|')) {
      flushBullets();
      tableBuffer.push(trimmed);
      continue;
    } else if (tableBuffer.length > 0) {
      flushTable();
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      bulletBuffer.push(trimmed.slice(2));
      continue;
    } else if (bulletBuffer.length > 0) {
      flushBullets();
    }

    if (trimmed) nodes.push(<p key={key++} className="leading-relaxed">{trimmed}</p>);
  }

  flushBullets();
  flushTable();
  return nodes;
}

function renderCellContent(cell: string): ReactNode {
  const pctMatch = cell.match(/(\d+(?:\.\d+)?)\s*%/);
  if (pctMatch) {
    const pct = Math.min(Number(pctMatch[1]), 100);
    return (
      <div>
        <span>{cell}</span>
        <div className="chart-bar mt-1 max-w-[120px]"><div className="chart-bar-fill" style={{ width: `${pct}%` }} /></div>
      </div>
    );
  }
  return cell;
}
