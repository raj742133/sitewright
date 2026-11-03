'use client';
/*
 * Adapted from BoardUI (MIT), Copyright (c) 2026 Mertcan Dundar Esmergul (BoardUI) (free tier). See THIRD_PARTY_NOTICES.md.
 * The year-over-year chart card behind RevenueChartCard (area + lines) and OrdersChartCard (paired bars). Upstream draws them with recharts;
 * this is plain SVG: smooth monotone paths, nice axis ticks, a hover and arrow-key crosshair that swaps the headline for the month,
 * a screen-reader table and live announcement, and CSS-only draw-in that stops under reduced motion.
 */
import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Chip, cx, describeDelta, useCountUp, useSize } from './_bui';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export interface YearPoint { label: string; current: number; previous: number }

/** A round step (1, 1.5, 2, 2.5, 3, 4, 5, 6, 8 or 10 times a power of ten) that is at least v. */
function niceStep(v: number): number { const p = Math.pow(10, Math.floor(Math.log10(v || 1))); const f = v / p; return ([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((x) => f <= x + 1e-9) ?? 10) * p; }
/** d3-style monotone cubic path through the points: smooth, and it never overshoots between samples. */
export function monotone(pts: Array<[number, number]>): string {
  const n = pts.length; if (n === 0) return '';
  if (n === 1) return `M${pts[0]![0]},${pts[0]![1]}`;
  const dx: number[] = [], m: number[] = [], t: number[] = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1]![0] - pts[i]![0]; m[i] = dx[i]! === 0 ? 0 : (pts[i + 1]![1] - pts[i]![1]) / dx[i]!; }
  t[0] = m[0]!; t[n - 1] = m[n - 2]!;
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1]! * m[i]! <= 0 ? 0 : (m[i - 1]! + m[i]!) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i]! / m[i]!, b = t[i + 1]! / m[i]!, s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]!; t[i + 1] = k * b * m[i]!; }
  }
  let d = `M${pts[0]![0].toFixed(1)},${pts[0]![1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i]! / 3;
    d += `C${(pts[i]![0] + h).toFixed(1)},${(pts[i]![1] + h * t[i]!).toFixed(1)} ${(pts[i + 1]![0] - h).toFixed(1)},${(pts[i + 1]![1] - h * t[i + 1]!).toFixed(1)} ${pts[i + 1]![0].toFixed(1)},${pts[i + 1]![1].toFixed(1)}`;
  }
  return d;
}
const topRound = (x: number, y: number, w: number, h: number, r: number) => { const k = Math.max(0, Math.min(r, w / 2, h)); return `M${x},${y + h}V${y + k}Q${x},${y} ${x + k},${y}H${x + w - k}Q${x + w},${y} ${x + w},${y + k}V${y + h}Z`; };

export function YearChartCard({ data, title, kind, tone, money, className, nounThis = 'This year', nounLast = 'Last year' }: {
  data: YearPoint[]; title: string; kind: 'area' | 'bars'; tone: 'revenue' | 'orders'; money: boolean; className?: string; nounThis?: string; nounLast?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const gid = useId();
  const [wrap, W, H] = useSize<HTMLDivElement>(640, 220);
  const fmtFull = (v: number) => (money ? '$' : '') + Math.round(v).toLocaleString('en-US');
  const fmtAxis = (v: number) => (money ? '$' : '') + (v >= 1000 ? `${+(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `${v}`);
  const sums = useMemo(() => ({ cur: data.reduce((s, p) => s + p.current, 0), prev: data.reduce((s, p) => s + p.previous, 0) }), [data]);
  const point = active !== null ? data[active] ?? null : null;
  const headline = point ? point.current : sums.cur;
  const comparison = point ? point.previous : sums.prev;
  const delta = describeDelta(headline, comparison);
  const mi = point ? MONTHS.indexOf(point.label) : -1;
  const label = point ? (mi >= 0 ? MONTHS_FULL[mi]! : point.label) : title;
  const shown = useCountUp(Math.round(headline));

  const n = data.length;
  const L = money ? 46 : 40, R = 8, T = 6, B = 28;
  const pw = Math.max(40, W - L - R), ph = Math.max(40, H - T - B);
  const yStep = niceStep((Math.max(1, ...data.map((d) => Math.max(d.current, d.previous))) * 1.04) / 4);
  const yMax = yStep * 4;
  const ticks = [0, 1, 2, 3, 4].map((i) => yStep * i);
  const y = (v: number) => T + ph - (v / yMax) * ph;
  const step = pw / Math.max(1, n); // band width (bars) / spacing basis
  const xBand = (i: number) => L + step * i + step / 2;
  const xLine = (i: number) => L + (n <= 1 ? pw / 2 : (pw * i) / (n - 1));
  const xAt = kind === 'bars' ? xBand : xLine;
  const every = Math.max(1, Math.ceil(30 / Math.max(10, kind === 'bars' ? step : pw / Math.max(1, n - 1))));

  const idxFrom = (clientX: number, el: HTMLElement) => { const r = el.getBoundingClientRect(); const x = ((clientX - r.left) / Math.max(1, r.width)) * W; const k = kind === 'bars' ? Math.floor((x - L) / step) : Math.round(((x - L) / pw) * (n - 1)); return Math.max(0, Math.min(n - 1, k)); };
  const onMove = (e: PointerEvent<HTMLDivElement>) => setActive(idxFrom(e.clientX, e.currentTarget));
  const onKey = (e: KeyboardEvent) => {
    const k = e.key; if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(k)) return; e.preventDefault();
    if (k === 'Escape') return setActive(null);
    setActive((a) => (k === 'Home' ? 0 : k === 'End' ? n - 1 : k === 'ArrowRight' ? Math.min(n - 1, (a ?? -1) + 1) : Math.max(0, (a ?? n) - 1)));
  };
  const curPts = data.map((d, i) => [xAt(i), y(d.current)] as [number, number]);
  const prevPts = data.map((d, i) => [xAt(i), y(d.previous)] as [number, number]);
  const curPath = monotone(curPts);
  const areaPath = n > 1 ? `${curPath}L${xAt(n - 1).toFixed(1)},${y(0)}L${xAt(0).toFixed(1)},${y(0)}Z` : '';
  const bw = Math.max(3, Math.min(22, (step - 8) / 2));
  const live = point ? `${label}: ${fmtFull(point.current)}, ${delta.label} against ${fmtFull(point.previous)} a year earlier` : '';

  return (
    <section className={cx('bui', 'bui-yc', `is-${tone}`, `is-${kind}`, className)} aria-label={title}>
      <div className="bui-yc-h">
        <div className="bui-yc-t">
          <p className="bui-yc-l">{label}</p>
          <div className="bui-yc-v">
            <p key={active ?? 'total'} className="bui-yc-n bui-fade">{fmtFull(shown)}</p>
            <Chip variant="bold" color={delta.color}>{delta.label}</Chip>
          </div>
          <p className="bui-yc-c">{fmtFull(comparison)} {point ? 'a year earlier' : 'last year'}</p>
        </div>
        <dl className="bui-yc-lg">
          <div><span className="bui-yc-dot is-cur" aria-hidden="true" /><dt>{nounThis}</dt></div>
          <div><span className="bui-yc-dot is-prev" aria-hidden="true" /><dt>{nounLast}</dt></div>
        </dl>
      </div>
      <div ref={wrap} className="bui-yc-plot" tabIndex={0} role="group" aria-roledescription="chart" aria-label={`${title} by month, this year against last year. Use the left and right arrow keys to read each month.`}
        onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setActive(null)} onKeyDown={onKey} onBlur={() => setActive(null)}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={`${gid}g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--bui-cur)" stopOpacity="0.35" /><stop offset="100%" stopColor="var(--bui-cur)" stopOpacity="0" /></linearGradient>
          </defs>
          {ticks.map((t, i) => <g key={i}><line className="bui-yc-grid" x1={L} x2={W - R} y1={y(t)} y2={y(t)} /><text className="bui-yc-ty" x={L - 8} y={y(t)} dy="0.32em" textAnchor="end">{fmtAxis(t)}</text></g>)}
          {data.map((d, i) => (i % every === 0 ? <text key={d.label} className="bui-yc-tx" x={xAt(i)} y={H - 8} textAnchor="middle">{d.label}</text> : null))}
          {kind === 'area' && n > 1 && (
            <>
              <path className="bui-yc-prev" d={monotone(prevPts)} fill="none" />
              <path className="bui-yc-area" d={areaPath} fill={`url(#${gid}g)`} />
              <path className="bui-yc-cur" d={curPath} fill="none" pathLength={1} />
              {active !== null && (
                <g>
                  <line className="bui-yc-cross" x1={xLine(active)} x2={xLine(active)} y1={T} y2={y(0)} />
                  <circle cx={xLine(active)} cy={y(data[active]!.current)} r={7} fill="var(--bui-cur)" opacity={0.25} />
                  <circle className="bui-yc-pt" cx={xLine(active)} cy={y(data[active]!.current)} r={4} />
                </g>
              )}
            </>
          )}
          {kind === 'bars' && data.map((d, i) => {
            const cx0 = xBand(i), hp = Math.max(0, y(0) - y(d.previous)), hc = Math.max(0, y(0) - y(d.current));
            return (
              <g key={d.label} className={cx('bui-yc-bg', active === i && 'is-on')}>
                {active === i && <rect className="bui-yc-track" x={cx0 - step / 2 + 2} y={T} width={step - 4} height={ph} rx={6} />}
                <path className="bui-yc-bprev" d={topRound(cx0 - bw - 1, y(d.previous), bw, hp, 4)} style={{ animationDelay: `${i * 18}ms` }} />
                <path className="bui-yc-bcur" d={topRound(cx0 + 1, y(d.current), bw, hc, 4)} style={{ animationDelay: `${i * 18 + 40}ms` }} />
              </g>
            );
          })}
        </svg>
      </div>
      <p className="bui-sr" role="status" aria-live="polite">{live}</p>
      <table className="bui-sr"><caption>{title} by month</caption><thead><tr><th scope="col">Month</th><th scope="col">{nounThis}</th><th scope="col">{nounLast}</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.label}><th scope="row">{d.label}</th><td>{fmtFull(d.current)}</td><td>{fmtFull(d.previous)}</td></tr>)}</tbody></table>
    </section>
  );
}
