'use client';
// Two charts the kit does not have: a trend line with a zoomed y axis (CSAT lives between 80 and 100) and the weekday x hour heatmap.
import { useState, type KeyboardEvent } from 'react';
import { cx, useWidth } from './_dash';

export function TrendLine({ labels, data, min, max, unit = '%', height = 200, ariaLabel, name }: { labels: string[]; data: number[]; min: number; max: number; unit?: string; height?: number; ariaLabel: string; name: string }) {
  const [ref, w] = useWidth<HTMLDivElement>(); const [hi, setHi] = useState<number | null>(null);
  const n = data.length, padL = 40, padR = 8, padT = 10, padB = 22, iw = Math.max(10, w - padL - padR), ih = height - padT - padB;
  const x = (i: number) => padL + (n === 1 ? iw / 2 : (i / (n - 1)) * iw), y = (v: number) => padT + ih - ((v - min) / (max - min)) * ih;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => min + t * (max - min));
  const line = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
  const xl = Math.min(6, n), xi = Array.from({ length: xl }, (_, k) => Math.round((k / (xl - 1)) * (n - 1)));
  const move = (cx0: number, el: Element) => setHi(Math.max(0, Math.min(n - 1, Math.round(((cx0 - el.getBoundingClientRect().left - padL) / iw) * (n - 1)))));
  const key = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') { e.preventDefault(); setHi((h) => Math.min(n - 1, (h ?? -1) + 1)); } else if (e.key === 'ArrowLeft') { e.preventDefault(); setHi((h) => Math.max(0, (h ?? n) - 1)); } else if (e.key === 'Escape') setHi(null); };
  return (
    <div className="td-chart" ref={ref} style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={ariaLabel} tabIndex={0} onKeyDown={key} onFocus={() => setHi((h) => h ?? n - 1)} onBlur={() => setHi(null)} onPointerMove={(e) => move(e.clientX, e.currentTarget)} onPointerLeave={() => setHi(null)}>
          {ticks.map((t) => <g key={t}><line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} className="td-grid" /><text x={padL - 8} y={y(t) + 4} textAnchor="end" className="td-axis">{Math.round(t)}{unit}</text></g>)}
          {xi.map((i) => <text key={i} x={x(i)} y={height - 5} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="td-axis">{labels[i]}</text>)}
          <path d={line} fill="none" stroke="var(--signal, #0f766e)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {hi !== null && <g><line x1={x(hi)} x2={x(hi)} y1={padT} y2={padT + ih} className="td-cross" /><circle cx={x(hi)} cy={y(data[hi]!)} r={4} fill="var(--raised, #fff)" stroke="var(--signal, #0f766e)" strokeWidth={2} /></g>}
        </svg>
      )}
      {hi !== null && w > 0 && <div className={cx('td-tip', x(hi) > w * 0.62 && 'is-left')} style={{ left: x(hi), top: padT }} role="status"><b>{labels[hi]}</b><span><i style={{ background: 'var(--signal, #0f766e)' }} />{name}<em>{data[hi]}{unit}</em></span></div>}
      <table className="td-sr"><caption>{ariaLabel}</caption><thead><tr><th>Day</th><th>{name}</th></tr></thead><tbody>{labels.map((l, i) => <tr key={l + i}><th>{l}</th><td>{data[i]}</td></tr>)}</tbody></table>
    </div>
  );
}

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** Weekday x hour grid, one tab stop, arrow keys move between cells. `cells[d][h]` is a conversation count. */
export function Heatmap({ cells }: { cells: number[][] }) {
  const [cur, setCur] = useState<[number, number]>([1, 10]); const [show, setShow] = useState<[number, number] | null>(null);
  const max = Math.max(...cells.flat(), 1); const sum = cells.flat().reduce((a, b) => a + b, 0);
  const key = (e: KeyboardEvent) => {
    const d = e.key === 'ArrowDown' ? [1, 0] : e.key === 'ArrowUp' ? [-1, 0] : e.key === 'ArrowRight' ? [0, 1] : e.key === 'ArrowLeft' ? [0, -1] : null; if (!d) return;
    e.preventDefault(); const n: [number, number] = [Math.max(0, Math.min(6, cur[0] + d[0]!)), Math.max(0, Math.min(23, cur[1] + d[1]!))]; setCur(n); setShow(n);
    (e.currentTarget.querySelector(`[data-c="${n[0]}-${n[1]}"]`) as HTMLElement | null)?.focus();
  };
  const at = show ?? cur; const v = cells[at[0]]![at[1]]!;
  return (
    <div className="tv-heat">
      <div className="tv-heat-g" role="grid" aria-label="Conversations by weekday and hour, UTC" onKeyDown={key} onPointerLeave={() => setShow(null)}>
        <div className="tv-heat-hrs" aria-hidden="true">{[0, 6, 12, 18].map((h) => <span key={h} style={{ gridColumn: `${h + 1} / span 6` }}>{String(h).padStart(2, '0')}:00</span>)}</div>
        {cells.map((row, d) => (
          <div key={d} role="row" className="tv-heat-r"><span className="tv-heat-d" role="rowheader">{DOW[d]}</span>
            <div className="tv-heat-cells">{row.map((n, h) => (
              <div key={h} role="gridcell" data-c={`${d}-${h}`} tabIndex={cur[0] === d && cur[1] === h ? 0 : -1} aria-label={`${DOW[d]} ${String(h).padStart(2, '0')}:00, ${n} conversations`}
                className="tv-hc" style={{ background: n ? `color-mix(in srgb, var(--primary, #c2410c) ${Math.round(8 + (n / max) * 82)}%, var(--raised, #fff))` : undefined }}
                onFocus={() => { setCur([d, h]); }} onPointerEnter={() => setShow([d, h])} onClick={() => setShow([d, h])} />))}</div>
          </div>))}
      </div>
      <div className="tv-heat-foot">
        <span role="status"><b>{DOW[at[0]]} {String(at[1]).padStart(2, '0')}:00</b> UTC · {v} {v === 1 ? 'conversation' : 'conversations'} ({sum ? Math.round((v / sum) * 1000) / 10 : 0}% of the period)</span>
        <span className="tv-heat-key" aria-hidden="true">Fewer<i /><i /><i /><i /><i />More</span>
      </div>
    </div>
  );
}
