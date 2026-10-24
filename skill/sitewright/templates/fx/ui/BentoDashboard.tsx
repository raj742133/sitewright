'use client';
import { useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { Mini, money, useCountUp, useEntry } from './_d7';

export interface RevenueRange { id: string; label: string; points: number[]; labels?: string[] }
export interface BentoTask { id: string; text: string; done?: boolean }
export interface BentoDay { label: string; date: number; events: string[] }
export interface BentoProduct { name: string; value: number }
export interface BentoDashboardProps {
  title?: string;
  ranges?: RevenueRange[];
  goal?: { label: string; value: number; target: number };
  heat?: number[][];
  tasks?: BentoTask[];
  week?: BentoDay[];
  products?: BentoProduct[];
}

const R7 = [3.2, 3.9, 3.4, 4.6, 4.1, 5.3, 6.1].map((n) => n * 1000);
const R30 = Array.from({ length: 30 }, (_, i) => Math.round((3000 + i * 95 + Math.sin(i * 0.9) * 700 + Math.cos(i * 0.37) * 420) / 10) * 10);
const RANGES: RevenueRange[] = [
  { id: '7d', label: '7 days', points: R7, labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  { id: '30d', label: '30 days', points: R30 },
];
const HEAT: number[][] = Array.from({ length: 7 }, (_, d) => Array.from({ length: 12 }, (_, w) => {
  const v = Math.sin(d * 1.7 + w * 0.8) * 2 + Math.cos(w * 0.5 - d) * 1.5 + (d < 5 ? 1.6 : -0.8) + w * 0.12;
  return Math.max(0, Math.min(4, Math.round(v)));
}));
const TASKS: BentoTask[] = [
  { id: 't1', text: 'Approve spring menu photos', done: true },
  { id: 't2', text: 'Reply to wholesale enquiry' },
  { id: 't3', text: 'Restock oat milk and filters' },
  { id: 't4', text: 'Publish Saturday market post' },
];
const WEEK: BentoDay[] = [
  { label: 'Mon', date: 20, events: ['Supplier call 10:00'] },
  { label: 'Tue', date: 21, events: [] },
  { label: 'Wed', date: 22, events: ['Tasting menu shoot 14:00', 'Payroll'] },
  { label: 'Thu', date: 23, events: ['Staff meeting 09:00'] },
  { label: 'Fri', date: 24, events: ['Launch: autumn blend', 'Newsletter 16:00'] },
  { label: 'Sat', date: 25, events: ['Farmers market 08:00'] },
  { label: 'Sun', date: 26, events: [] },
];
const PRODUCTS: BentoProduct[] = [
  { name: 'House blend 1kg', value: 412 },
  { name: 'Cold brew kit', value: 318 },
  { name: 'Ceramic dripper', value: 244 },
  { name: 'Gift subscription', value: 171 },
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function Spark({ points, labels, rangeKey }: { points: number[]; labels?: string[]; rangeKey: string }) {
  const W = 320, H = 96, P = 6;
  const [idx, setIdx] = useState<number | null>(null);
  const max = Math.max(...points), min = Math.min(...points);
  const pts = points.map((v, i) => [P + (i * (W - 2 * P)) / (points.length - 1), P + (1 - (v - min) / (max - min || 1)) * (H - 2 * P)] as const);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = d + ` L${pts[pts.length - 1]![0]} ${H} L${pts[0]![0]} ${H} Z`;
  const move = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    setIdx(Math.max(0, Math.min(points.length - 1, Math.round(((x - P) / (W - 2 * P)) * (points.length - 1)))));
  };
  const key = (e: KeyboardEvent) => {
    const last = points.length - 1;
    const cur = idx ?? last;
    if (e.key === 'ArrowRight') setIdx(Math.min(last, cur + 1));
    else if (e.key === 'ArrowLeft') setIdx(Math.max(0, cur - 1));
    else if (e.key === 'Home') setIdx(0);
    else if (e.key === 'End') setIdx(last);
    else if (e.key === 'Escape') setIdx(null);
    else return;
    e.preventDefault();
  };
  const name = (i: number) => labels?.[i] ?? `Day ${i + 1}`;
  const at = idx === null ? null : pts[idx]!;
  return (
    <div className="ui-bento-dashboard-spark">
      <svg viewBox={`0 0 ${W} ${H}`} role="slider" tabIndex={0} aria-label="Revenue by day, use arrow keys" aria-valuemin={0} aria-valuemax={points.length - 1} aria-valuenow={idx ?? points.length - 1} aria-valuetext={`${name(idx ?? points.length - 1)}: ${money(points[idx ?? points.length - 1]!)}`}
        onPointerMove={move} onPointerLeave={() => setIdx(null)} onKeyDown={key} onBlur={() => setIdx(null)} key={rangeKey} preserveAspectRatio="none">
        <defs><linearGradient id={`ui-bento-g-${rangeKey}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--primary, #2563eb)" stopOpacity=".32" /><stop offset="1" stopColor="var(--primary, #2563eb)" stopOpacity="0" /></linearGradient></defs>
        <path d={area} fill={`url(#ui-bento-g-${rangeKey})`} className="ui-bento-dashboard-area" />
        <path d={d} pathLength={1} className="ui-bento-dashboard-line" fill="none" stroke="var(--primary, #2563eb)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {at && <g><line x1={at[0]} x2={at[0]} y1="0" y2={H} stroke="var(--line-strong, #999)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" /><circle cx={at[0]} cy={at[1]} r="4" fill="var(--surface, #fff)" stroke="var(--primary, #2563eb)" strokeWidth="2" vectorEffect="non-scaling-stroke" /></g>}
      </svg>
      <p className="ui-bento-dashboard-readout" aria-live="polite">{idx === null ? 'Hover or use arrow keys to inspect' : `${name(idx)}: ${money(points[idx]!)}`}</p>
    </div>
  );
}

function Gauge({ value, target, label, run }: { value: number; target: number; label: string; run: boolean }) {
  const pct = Math.min(1, value / target);
  const shown = useCountUp(Math.round(pct * 100), run, 1200);
  return (
    <div className="ui-bento-dashboard-gauge">
      <svg viewBox="0 0 120 120" role="img" aria-label={`${label}: ${Math.round(pct * 100)}% of ${money(target)}`}>
        <circle cx="60" cy="60" r="48" pathLength={100} className="ui-bento-dashboard-track" strokeDasharray="75 100" transform="rotate(135 60 60)" />
        <circle cx="60" cy="60" r="48" pathLength={100} className="ui-bento-dashboard-arc" strokeDasharray={`${pct * 75} 100`} transform="rotate(135 60 60)" />
        <text x="60" y="62" textAnchor="middle" className="ui-bento-dashboard-gnum">{Math.round(shown)}%</text>
        <text x="60" y="80" textAnchor="middle" className="ui-bento-dashboard-gsub">{money(value)}</text>
      </svg>
    </div>
  );
}

export default function BentoDashboard({ title = 'Studio overview', ranges = RANGES, goal: goalIn = { label: 'Monthly goal', value: 31800, target: 40000 }, heat = HEAT, tasks = TASKS, week = WEEK, products = PRODUCTS }: BentoDashboardProps) {
  const root = useRef<HTMLDivElement>(null);
  const { shown, cls } = useEntry(root);
  const [rid, setRid] = useState(ranges[0]?.id ?? '');
  const range = ranges.find((r) => r.id === rid) ?? ranges[0]!;
  const total = useMemo(() => range.points.reduce((a, b) => a + b, 0), [range]);
  const sum = useCountUp(total, shown);
  const [bonus, setBonus] = useState(0);
  const [list, setList] = useState(tasks);
  const [day, setDay] = useState(Math.max(0, week.findIndex((d) => d.events.length > 1)));
  const [hc, setHc] = useState<[number, number]>([0, 0]);
  const hcells = useRef<Record<string, HTMLButtonElement | null>>({});
  const done = list.filter((t) => t.done).length;
  const pmax = Math.max(...products.map((p) => p.value));
  const hmove = (e: KeyboardEvent, r: number, c: number) => {
    const nr = r + (e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0);
    const nc = c + (e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0);
    if ((nr === r && nc === c) || nr < 0 || nc < 0 || nr >= heat.length || nc >= (heat[0]?.length ?? 0)) return;
    e.preventDefault(); setHc([nr, nc]); hcells.current[`${nr}-${nc}`]?.focus();
  };
  const hl = ['No orders', 'A few orders', 'Some orders', 'Many orders', 'Busiest'];
  return (
    <div ref={root} className={'ui-bento-dashboard' + cls}>
      <header className="ui-bento-dashboard-head"><h2>{title}</h2><span className="ui-bento-dashboard-chip">Live</span></header>
      <div className="ui-bento-dashboard-grid">
        <section className="ui-bento-dashboard-tile ui-bento-dashboard-revenue" style={{ '--i': 0 } as React.CSSProperties} aria-label="Revenue">
          <div className="ui-bento-dashboard-row">
            <div><p className="ui-bento-dashboard-k">Revenue</p><p className="ui-bento-dashboard-big" aria-label={money(total)}>{money(sum)}</p></div>
            <div className="ui-bento-dashboard-seg" role="group" aria-label="Range">
              {ranges.map((r) => <button key={r.id} type="button" aria-pressed={r.id === range.id} onClick={() => setRid(r.id)}>{r.label}</button>)}
            </div>
          </div>
          <Spark points={range.points} labels={range.labels} rangeKey={range.id} />
        </section>
        <section className="ui-bento-dashboard-tile ui-bento-dashboard-goal" style={{ '--i': 1 } as React.CSSProperties} aria-label={goalIn.label}>
          <p className="ui-bento-dashboard-k">{goalIn.label}</p>
          <Gauge value={goalIn.value + bonus} target={goalIn.target} label={goalIn.label} run={shown} />
          <button type="button" className="ui-bento-dashboard-btn" onClick={() => setBonus((b) => b + 1500)} aria-label="Log a $1,500 sale">+ Log $1,500 sale</button>
        </section>
        <section className="ui-bento-dashboard-tile ui-bento-dashboard-tasks" style={{ '--i': 2 } as React.CSSProperties} aria-label="Tasks">
          <div className="ui-bento-dashboard-row"><p className="ui-bento-dashboard-k">Tasks</p><span className="ui-bento-dashboard-count" aria-live="polite">{done}/{list.length} done</span></div>
          <ul className="ui-bento-dashboard-tasks">
            {list.map((t) => (
              <li key={t.id}><label className={t.done ? 'is-done' : ''}>
                <input type="checkbox" checked={!!t.done} onChange={() => setList((l) => l.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))} />
                <span className="ui-bento-dashboard-box" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="m2.5 6.4 2.4 2.4 4.7-5.3" pathLength={1} /></svg></span>
                <span className="ui-bento-dashboard-ttext">{t.text}</span>
              </label></li>
            ))}
          </ul>
        </section>
        <section className="ui-bento-dashboard-tile ui-bento-dashboard-heat" style={{ '--i': 3 } as React.CSSProperties} aria-label="Order activity heatmap">
          <p className="ui-bento-dashboard-k">Order activity, last 12 weeks</p>
          <div className="ui-bento-dashboard-heat" role="grid" aria-label="Orders by weekday and week">
            {heat.map((row, r) => (
              <div role="row" key={r} className="ui-bento-dashboard-hrow">
                <span className="ui-bento-dashboard-dname" aria-hidden="true">{DAYS[r]}</span>
                {row.map((v, c) => (
                  <button type="button" role="gridcell" key={c} ref={(el) => { hcells.current[`${r}-${c}`] = el; }} tabIndex={hc[0] === r && hc[1] === c ? 0 : -1}
                    className={`ui-bento-dashboard-cell l${v}`} style={{ '--d': (r + c) * 22 + 'ms' } as React.CSSProperties}
                    title={`${DAYS[r]}, week ${c + 1}: ${hl[v]}`} aria-label={`${DAYS[r]}, week ${c + 1}: ${hl[v]}`}
                    onKeyDown={(e) => hmove(e, r, c)} onFocus={() => setHc([r, c])} />
                ))}
              </div>
            ))}
          </div>
        </section>
        <section className="ui-bento-dashboard-tile ui-bento-dashboard-cal" style={{ '--i': 4 } as React.CSSProperties} aria-label="This week">
          <p className="ui-bento-dashboard-k">This week</p>
          <div className="ui-bento-dashboard-days" role="group" aria-label="Pick a day">
            {week.map((d, i) => (
              <button key={d.label} type="button" aria-pressed={i === day} onClick={() => setDay(i)} aria-label={`${d.label} ${d.date}, ${d.events.length} events`}>
                <small>{d.label}</small><b>{d.date}</b><i className={d.events.length ? 'has' : ''} />
              </button>
            ))}
          </div>
          <ul className="ui-bento-dashboard-events" aria-live="polite">
            {(week[day]?.events.length ? week[day]!.events : ['Nothing scheduled']).map((e) => <li key={e}>{e}</li>)}
          </ul>
        </section>
        <section className="ui-bento-dashboard-tile ui-bento-dashboard-top" style={{ '--i': 5 } as React.CSSProperties} aria-label="Top products">
          <p className="ui-bento-dashboard-k">Top products</p>
          <ul className="ui-bento-dashboard-bars">
            {products.map((p, i) => (
              <li key={p.name}><div className="ui-bento-dashboard-brow"><span>{p.name}</span><b>{p.value}</b></div>
                <div className="ui-bento-dashboard-bar" aria-hidden="true"><i style={{ width: (p.value / pmax) * 100 + '%', '--d': 500 + i * 90 + 'ms' } as React.CSSProperties} /></div></li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

export function Demo() {
  return <Mini width={1000} height={150}><BentoDashboard /></Mini>;
}
