'use client';
// A zoomed line chart (y axis fitted to the data, optional dashed target line): the kit's area chart always starts at zero, which flattens
// rates and prices that move by a few percent. Crosshair, tooltip, arrow keys and a screen reader table like the kit's charts.
import { useState, type KeyboardEvent } from 'react';
import { useWidth } from './_dash';

export function LineChart({ labels, data, target, format, label, name, targetName = 'Target', height = 190 }: { labels: string[]; data: number[]; target?: number; format: (v: number) => string; label: string; name: string; targetName?: string; height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>(); const [hi, setHi] = useState<number | null>(null); const padL = 48, padR = 10, padT = 10, padB = 22, n = data.length;
  const all = target === undefined ? data : [...data, target]; const lo = Math.min(...all), up = Math.max(...all), span = up - lo || up * 0.04 || 1, mn = lo - span * 0.2, mx = up + span * 0.2;
  const iw = Math.max(10, w - padL - padR), ih = height - padT - padB; const x = (i: number) => padL + (n === 1 ? iw / 2 : (i / (n - 1)) * iw), y = (v: number) => padT + ih - ((v - mn) / (mx - mn)) * ih;
  const path = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
  const key = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') { e.preventDefault(); setHi((h) => Math.min(n - 1, (h ?? -1) + 1)); } else if (e.key === 'ArrowLeft') { e.preventDefault(); setHi((h) => Math.max(0, (h ?? n) - 1)); } else if (e.key === 'Escape') setHi(null); };
  const ticks = [0, 1, 2, 3].map((t) => mn + ((mx - mn) * t) / 3); const xl = Math.min(6, n), xi = Array.from({ length: xl }, (_, k) => Math.round((k / Math.max(1, xl - 1)) * (n - 1)));
  return (
    <div className="td-chart" ref={ref} style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={label} tabIndex={0} onKeyDown={key} onFocus={() => setHi((h) => h ?? n - 1)} onBlur={() => setHi(null)} onPointerLeave={() => setHi(null)}
          onPointerMove={(e) => { const b = e.currentTarget.getBoundingClientRect(); setHi(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - b.left - padL) / iw) * (n - 1))))); }}>
          {ticks.map((t) => <g key={t}><line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} className="td-grid" /><text x={padL - 8} y={y(t) + 4} textAnchor="end" className="td-axis">{format(t)}</text></g>)}
          {xi.map((i) => <text key={i} x={x(i)} y={height - 5} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="td-axis">{labels[i]}</text>)}
          {target !== undefined && <line x1={padL} x2={w - padR} y1={y(target)} y2={y(target)} className="to-tline" />}
          <path d={path} fill="none" stroke="var(--primary, #c2410c)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {hi !== null && <g><line x1={x(hi)} x2={x(hi)} y1={padT} y2={padT + ih} className="td-cross" /><circle cx={x(hi)} cy={y(data[hi]!)} r={4} fill="var(--raised, #fff)" stroke="var(--primary, #c2410c)" strokeWidth="2" /></g>}
        </svg>
      )}
      {hi !== null && w > 0 && <div className={`td-tip${x(hi) > w * 0.62 ? ' is-left' : ''}`} style={{ left: x(hi), top: padT }} role="status"><b>{labels[hi]}</b><span><i style={{ background: 'var(--primary, #c2410c)' }} />{name}<em>{format(data[hi]!)}</em></span>{target !== undefined && <span>{targetName}<em>{format(target)}</em></span>}</div>}
      <table className="td-sr"><caption>{label}</caption><thead><tr><th>Period</th><th>{name}</th></tr></thead><tbody>{data.map((v, i) => <tr key={i}><th>{labels[i]}</th><td>{format(v)}</td></tr>)}</tbody></table>
    </div>
  );
}
