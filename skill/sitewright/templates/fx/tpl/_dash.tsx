'use client';
// The building blocks every dashboard template is made of. One design language, so seven dashboards look like one product family:
// an app shell (rail, top bar, page header), panels with hairline borders instead of nested cards, dense tables, KPI tiles with
// sparklines and deltas, and charts you can read (axes, grid, a crosshair with a tooltip, keyboard and screen-reader access).
// Only host tokens are used (--ink --muted --line --raised --surface --primary --signal --ok --critical --radius), so any brand
// colours and both themes work. Sizes: 13px app text, 12px labels, tabular numerals for every figure.
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';

export const cx = (...a: Array<string | false | null | undefined>) => a.filter(Boolean).join(' ');

/* ------------------------------------------------------------------ icons: simple 24px strokes, drawn for this kit */
const P: Record<string, string> = {
  home: 'M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  users: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20a6 6 0 0112 0M16 6a3 3 0 010 5.5M18 20a5 5 0 00-2-4',
  inbox: 'M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5l1 2h4l1-2h5',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.9l.1.1-2 3.4-.2-.1a1.7 1.7 0 00-2 .3 1.7 1.7 0 00-.9 1.5V22h-4v-.3a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.9.3l-.1.1-2-3.4.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H2v-4h.3a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.9l-.1-.1 2-3.4.1.1a1.7 1.7 0 001.9.3h.1a1.7 1.7 0 001-1.5V2h4v.3a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1 2 3.4-.1.1a1.7 1.7 0 00-.3 1.9v.1a1.7 1.7 0 001.5 1H22v4h-.3a1.7 1.7 0 00-1.5 1z',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-5-5',
  bell: 'M6 9a6 6 0 0112 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 004 0',
  plus: 'M12 5v14M5 12h14',
  filter: 'M3 5h18l-7 8v6l-4-2v-4z',
  calendar: 'M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1zM4 10h16M8 3v4M16 3v4',
  chevron: 'M9 6l6 6-6 6',
  down: 'M6 9l6 6 6-6',
  up: 'M12 19V5M6 11l6-6 6 6',
  arrowdown: 'M12 5v14M6 13l6 6 6-6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12M18 6L6 18',
  dollar: 'M12 3v18M16.5 7.5A4 4 0 0012 6c-2.5 0-4 1.2-4 3s1.5 2.6 4 3 4 1.2 4 3-1.5 3-4 3a4.5 4.5 0 01-4.5-1.5',
  box: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10',
  cart: 'M3 4h2l2.5 11h10l2-8H6.5M10 20a1 1 0 100-2 1 1 0 000 2zM17 20a1 1 0 100-2 1 1 0 000 2z',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
  trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  file: 'M7 3h7l5 5v12a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM14 3v5h5M9 13h6M9 17h6',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  send: 'M21 3L10 14M21 3l-7 18-4-7-7-4z',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  command: 'M9 9V6a3 3 0 10-3 3zM9 9h6M9 9v6M15 9V6a3 3 0 113 3zM15 9v6M9 15v3a3 3 0 11-3-3zM9 15h6M15 15v3a3 3 0 103-3z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18',
  truck: 'M2 6h11v10H2zM13 10h4l4 3v3h-8M7 19a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4z',
  tag: 'M3 12V4h8l10 10-8 8zM7.5 8.5h.01',
};
export type IconName = keyof typeof P;
export function Icon({ name, size = 16, className }: { name: IconName | string; size?: number; className?: string }) {
  return <svg className={cx('td-icon', className)} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={P[name] ?? P.more} /></svg>;
}

/* ------------------------------------------------------------------ data helpers (deterministic: no Math.random in render) */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** A believable series: a base level, a slow trend, weekly rhythm and noise. */
export function series(seed: number, n: number, { base = 100, trend = 0.4, wave = 0.12, noise = 0.08 } = {}): number[] {
  const r = seeded(seed);
  return Array.from({ length: n }, (_, i) => Math.max(0, Math.round(base * (1 + (trend * i) / n) * (1 + wave * Math.sin((i / 7) * Math.PI * 2)) * (1 + (r() - 0.5) * 2 * noise))));
}
export const fmt = {
  n: (v: number) => v.toLocaleString('en-US'),
  c: (v: number, cur = '$') => `${v < 0 ? '−' : ''}${cur}${Math.abs(Math.round(v)).toLocaleString('en-US')}`,
  k: (v: number) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : Math.abs(v) >= 1e3 ? `${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1)}k` : String(Math.round(v))),
  p: (v: number, d = 1) => `${(v * 100).toFixed(d)}%`,
};
const niceMax = (v: number) => { const p = Math.pow(10, Math.floor(Math.log10(v || 1))); const f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; };

export function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null); const [w, setW] = useState(0);
  useEffect(() => { const el = ref.current; if (!el) return; const f = () => setW(Math.round(el.clientWidth)); f(); const ro = new ResizeObserver(f); ro.observe(el); return () => ro.disconnect(); }, []);
  return [ref, w];
}
export function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => { const m = window.matchMedia('(prefers-reduced-motion: reduce)'); const f = () => setR(m.matches); f(); m.addEventListener('change', f); return () => m.removeEventListener('change', f); }, []);
  return r;
}

/* ------------------------------------------------------------------ shell */
export interface NavEntry { id: string; label: string; icon: IconName; badge?: string | number }
/** The app frame: a rail on the left (icons only on narrow containers), a top bar and the content. Responds to its own width, not the screen's. */
export function Shell({ brand = 'Acme', nav, active, onNav, title, crumbs, children, user = { name: 'Dana Ortiz', role: 'Admin' }, searchHint = 'Search', actions }: { brand?: string; nav: NavEntry[]; active: string; onNav?: (id: string) => void; title?: string; crumbs?: string[]; children: ReactNode; user?: { name: string; role: string }; searchHint?: string; actions?: ReactNode }) {
  return (
    <div className="td-shell"><div className="td-frame">
      <aside className="td-rail" aria-label="Main">
        <div className="td-brand"><span className="td-logo" aria-hidden="true">{brand[0]}</span><span className="td-brand-name">{brand}</span></div>
        <nav>
          {nav.map((n) => (
            <button key={n.id} type="button" className={cx('td-nav', n.id === active && 'is-on')} aria-current={n.id === active ? 'page' : undefined} onClick={() => onNav?.(n.id)} title={n.label}>
              <Icon name={n.icon} /><span className="td-nav-l">{n.label}</span>{n.badge !== undefined && <span className="td-nav-b">{n.badge}</span>}
            </button>
          ))}
        </nav>
        <div className="td-user"><Avatar name={user.name} size={28} /><span className="td-user-t"><b>{user.name}</b><small>{user.role}</small></span></div>
      </aside>
      <div className="td-main">
        <header className="td-top">
          <div className="td-crumbs">{(crumbs ?? [brand, title ?? '']).filter(Boolean).map((c, i, a) => <span key={i} className={i === a.length - 1 ? 'is-last' : undefined}>{c}{i < a.length - 1 && <Icon name="chevron" size={12} />}</span>)}</div>
          <button type="button" className="td-search" aria-label={searchHint}><Icon name="search" size={14} /><span>{searchHint}</span><kbd>⌘K</kbd></button>
          {actions}
          <button type="button" className="td-iconbtn" aria-label="Notifications"><Icon name="bell" /><i className="td-dot" /></button>
        </header>
        <div className="td-content">{children}</div>
      </div>
    </div></div>
  );
}
export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return <div className="td-ph"><div><h1>{title}</h1>{sub && <p>{sub}</p>}</div><div className="td-ph-a">{children}</div></div>;
}

/* ------------------------------------------------------------------ primitives */
export function Panel({ title, sub, actions, children, className, flush, id }: { title?: string; sub?: string; actions?: ReactNode; children: ReactNode; className?: string; flush?: boolean; id?: string }) {
  return (
    <section className={cx('td-panel', className)} aria-labelledby={title ? `${id}-t` : undefined}>
      {(title || actions) && <header className="td-panel-h"><div>{title && <h2 id={`${id}-t`}>{title}</h2>}{sub && <p>{sub}</p>}</div>{actions && <div className="td-panel-a">{actions}</div>}</header>}
      <div className={cx('td-panel-b', flush && 'is-flush')}>{children}</div>
    </section>
  );
}
export function Button({ children, variant = 'default', icon, onClick, type = 'button', disabled, small, label }: { children?: ReactNode; variant?: 'default' | 'primary' | 'ghost'; icon?: IconName; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean; small?: boolean; label?: string }) {
  return <button type={type} className={cx('td-btn', `is-${variant}`, small && 'is-sm', !children && 'is-icon')} onClick={onClick} disabled={disabled} aria-label={label}>{icon && <Icon name={icon} size={small ? 13 : 15} />}{children}</button>;
}
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: Array<{ id: T; label: string }>; onChange: (v: T) => void; label: string }) {
  return <div className="td-seg" role="group" aria-label={label}>{options.map((o) => <button key={o.id} type="button" aria-pressed={o.id === value} onClick={() => onChange(o.id)}>{o.label}</button>)}</div>;
}
export function Tabs<T extends string>({ value, tabs, onChange, label }: { value: T; tabs: Array<{ id: T; label: string; count?: number }>; onChange: (v: T) => void; label: string }) {
  const onKey = (e: KeyboardEvent) => { const i = tabs.findIndex((t) => t.id === value); const n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1; if (n < 0) return; e.preventDefault(); const t = tabs[(n + tabs.length) % tabs.length]!; onChange(t.id); (e.currentTarget.querySelector(`[data-tab="${t.id}"]`) as HTMLElement | null)?.focus(); };
  return <div className="td-tabs" role="tablist" aria-label={label} onKeyDown={onKey}>{tabs.map((t) => <button key={t.id} type="button" role="tab" data-tab={t.id} aria-selected={t.id === value} tabIndex={t.id === value ? 0 : -1} onClick={() => onChange(t.id)}>{t.label}{t.count !== undefined && <span>{t.count}</span>}</button>)}</div>;
}
export function Pill({ tone = 'neutral', children, dot = true }: { tone?: 'neutral' | 'ok' | 'warn' | 'bad' | 'info' | 'accent'; children: ReactNode; dot?: boolean }) {
  return <span className={cx('td-pill', `is-${tone}`)}>{dot && <i aria-hidden="true" />}{children}</span>;
}
export function Delta({ value, good = 'up', suffix = '%' }: { value: number; good?: 'up' | 'down'; suffix?: string }) {
  const up = value >= 0; const ok = good === 'up' ? up : !up;
  return <span className={cx('td-delta', ok ? 'is-good' : 'is-bad')}><Icon name={up ? 'up' : 'arrowdown'} size={11} />{Math.abs(value).toFixed(1)}{suffix}<span className="td-sr"> {up ? 'up' : 'down'}</span></span>;
}
export function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  const ini = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return <span className="td-avatar" aria-hidden="true" style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4), background: `hsl(${h} 38% 30%)` }}>{ini}</span>;
}
export function AvatarStack({ names, max = 4 }: { names: string[]; max?: number }) {
  return <span className="td-stack" role="img" aria-label={`${names.length} people: ${names.join(', ')}`}>{names.slice(0, max).map((n) => <Avatar key={n} name={n} size={24} />)}{names.length > max && <span className="td-avatar td-more" aria-hidden="true">+{names.length - max}</span>}</span>;
}
export function Progress({ value, tone = 'primary', label }: { value: number; tone?: 'primary' | 'signal' | 'ok' | 'bad'; label: string }) {
  return <div className={cx('td-progress', `is-${tone}`)} role="progressbar" aria-label={label} aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} /></div>;
}
export function Empty({ title, text }: { title: string; text: string }) {
  return <div className="td-empty"><Icon name="inbox" size={22} /><b>{title}</b><p>{text}</p></div>;
}

/* ------------------------------------------------------------------ KPI + sparkline */
export function Sparkline({ data, width = 96, height = 28, tone = 'primary', fill = true }: { data: number[]; width?: number; height?: number; tone?: 'primary' | 'signal' | 'bad' | 'muted'; fill?: boolean }) {
  const id = useId();
  const { line, area } = useMemo(() => {
    const mx = Math.max(...data), mn = Math.min(...data), span = mx - mn || 1;
    const pts = data.map((v, i) => [(i / (data.length - 1)) * width, height - 2 - ((v - mn) / span) * (height - 4)] as const);
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
    return { line, area: `${line}L${width} ${height}L0 ${height}Z` };
  }, [data, width, height]);
  return (
    <svg className={cx('td-spark', `is-${tone}`)} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity=".18" /><stop offset="1" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
      {fill && <path d={area} fill={`url(#${id})`} />}<path d={line} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
export function Kpi({ label, value, delta, goodWhen = 'up', spark, tone = 'primary', hint }: { label: string; value: string; delta?: number; goodWhen?: 'up' | 'down'; spark?: number[]; tone?: 'primary' | 'signal'; hint?: string }) {
  return (
    <div className="td-kpi">
      <span className="td-kpi-l">{label}</span>
      <div className="td-kpi-v"><b>{value}</b>{delta !== undefined && <Delta value={delta} good={goodWhen} />}</div>
      <div className="td-kpi-f">{hint && <small>{hint}</small>}{spark && <Sparkline data={spark} tone={tone} />}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ charts */
export interface Series { id: string; label: string; data: number[]; color?: string }
export const PALETTE = ['var(--primary, #c2410c)', 'var(--signal, #0f766e)', 'color-mix(in srgb, var(--ink, #15130e) 60%, transparent)', 'color-mix(in srgb, var(--primary, #c2410c) 45%, var(--surface, #fff))', 'color-mix(in srgb, var(--signal, #0f766e) 45%, var(--surface, #fff))'];

/** Area/line chart with a y axis, grid, x labels, a crosshair and a tooltip. Hover, touch or arrow keys move the crosshair. */
export function AreaChart({ labels, series: ss, height = 220, format = fmt.k, stacked = false, area = true, ariaLabel, tipFormat }: { labels: string[]; series: Series[]; height?: number; format?: (v: number) => string; stacked?: boolean; area?: boolean; ariaLabel: string; tipFormat?: (v: number) => string }) {
  const [ref, w] = useWidth<HTMLDivElement>(); const gid = useId(); const reduced = useReducedMotion();
  const [hi, setHi] = useState<number | null>(null);
  const n = labels.length;
  const padL = 40, padR = 8, padT = 10, padB = 22; const iw = Math.max(10, w - padL - padR), ih = height - padT - padB;
  const stack = useMemo(() => { const out: number[][] = []; ss.forEach((s, k) => out.push(s.data.map((v, i) => (stacked ? v + (out[k - 1]?.[i] ?? 0) : v)))); return out; }, [ss, stacked]);
  const max = niceMax(Math.max(...stack.flat(), 1)); const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const x = (i: number) => padL + (n === 1 ? iw / 2 : (i / (n - 1)) * iw); const y = (v: number) => padT + ih - (v / max) * ih;
  const path = (k: number) => stack[k]!.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join('');
  const areaPath = (k: number) => `${path(k)}L${x(n - 1).toFixed(1)} ${y(stacked && k > 0 ? 0 : 0).toFixed(1)}L${x(0).toFixed(1)} ${y(0).toFixed(1)}Z`;
  const move = (clientX: number, el: Element) => { const r = el.getBoundingClientRect(); const i = Math.round(((clientX - r.left - padL) / iw) * (n - 1)); setHi(Math.max(0, Math.min(n - 1, i))); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') { e.preventDefault(); setHi((h) => Math.min(n - 1, (h ?? -1) + 1)); } else if (e.key === 'ArrowLeft') { e.preventDefault(); setHi((h) => Math.max(0, (h ?? n) - 1)); } else if (e.key === 'Escape') setHi(null); };
  const tf = tipFormat ?? format; const xl = Math.min(6, n); const xi = Array.from({ length: xl }, (_, k) => Math.round((k / (xl - 1)) * (n - 1)));
  const tipLeft = hi !== null && x(hi) > w * 0.62;
  return (
    <div className="td-chart" ref={ref} style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={ariaLabel} tabIndex={0} onKeyDown={onKey} onFocus={() => setHi((h) => h ?? n - 1)} onBlur={() => setHi(null)} onPointerMove={(e) => move(e.clientX, e.currentTarget)} onPointerLeave={() => setHi(null)}>
          <defs>{ss.map((s, k) => <linearGradient key={s.id} id={`${gid}-${k}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={s.color ?? PALETTE[k % PALETTE.length]} stopOpacity=".22" /><stop offset="1" stopColor={s.color ?? PALETTE[k % PALETTE.length]} stopOpacity="0" /></linearGradient>)}</defs>
          {ticks.map((t) => <g key={t}><line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} className="td-grid" /><text x={padL - 8} y={y(t) + 4} textAnchor="end" className="td-axis">{format(t)}</text></g>)}
          {xi.map((i) => <text key={i} x={x(i)} y={height - 5} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className="td-axis">{labels[i]}</text>)}
          {[...ss].reverse().map((s, ri) => { const k = ss.length - 1 - ri; const c = s.color ?? PALETTE[k % PALETTE.length]; return <g key={s.id} className={cx('td-series', !reduced && 'is-in')}>{area && <path d={areaPath(k)} fill={`url(#${gid}-${k})`} />}<path d={path(k)} fill="none" stroke={c} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="td-line" /></g>; })}
          {hi !== null && <g><line x1={x(hi)} x2={x(hi)} y1={padT} y2={padT + ih} className="td-cross" />{ss.map((s, k) => <circle key={s.id} cx={x(hi)} cy={y(stack[k]![hi]!)} r={4} fill="var(--raised, #fff)" stroke={s.color ?? PALETTE[k % PALETTE.length]} strokeWidth={2} />)}</g>}
        </svg>
      )}
      {hi !== null && w > 0 && <div className={cx('td-tip', tipLeft && 'is-left')} style={{ left: x(hi), top: padT }} role="status"><b>{labels[hi]}</b>{ss.map((s, k) => <span key={s.id}><i style={{ background: s.color ?? PALETTE[k % PALETTE.length] }} />{s.label}<em>{tf(s.data[hi]!)}</em></span>)}</div>}
      <table className="td-sr"><caption>{ariaLabel}</caption><thead><tr><th>Period</th>{ss.map((s) => <th key={s.id}>{s.label}</th>)}</tr></thead><tbody>{labels.map((l, i) => <tr key={l + i}><th>{l}</th>{ss.map((s) => <td key={s.id}>{s.data[i]}</td>)}</tr>)}</tbody></table>
    </div>
  );
}

/** Vertical bars (grouped or one series) with axis, grid and a hover/keyboard tooltip. */
export function BarChart({ labels, series: ss, height = 200, format = fmt.k, ariaLabel, stacked = false }: { labels: string[]; series: Series[]; height?: number; format?: (v: number) => string; ariaLabel: string; stacked?: boolean }) {
  const [ref, w] = useWidth<HTMLDivElement>(); const [hi, setHi] = useState<number | null>(null);
  const n = labels.length; const padL = 40, padR = 6, padT = 10, padB = 22; const iw = Math.max(10, w - padL - padR), ih = height - padT - padB;
  const tot = (i: number) => (stacked ? ss.reduce((a, s) => a + s.data[i]!, 0) : Math.max(...ss.map((s) => s.data[i]!)));
  const max = niceMax(Math.max(...labels.map((_, i) => tot(i)), 1)); const ticks = [0, 0.5, 1].map((t) => t * max);
  const slot = iw / n; const bw = Math.min(28, slot * 0.62); const gw = stacked ? bw : bw / ss.length;
  const y = (v: number) => padT + ih - (v / max) * ih;
  const onKey = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') { e.preventDefault(); setHi((h) => Math.min(n - 1, (h ?? -1) + 1)); } else if (e.key === 'ArrowLeft') { e.preventDefault(); setHi((h) => Math.max(0, (h ?? n) - 1)); } else if (e.key === 'Escape') setHi(null); };
  const step = Math.ceil(n / 8);
  return (
    <div className="td-chart" ref={ref} style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={ariaLabel} tabIndex={0} onKeyDown={onKey} onFocus={() => setHi((h) => h ?? 0)} onBlur={() => setHi(null)} onPointerLeave={() => setHi(null)}>
          {ticks.map((t) => <g key={t}><line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} className="td-grid" /><text x={padL - 8} y={y(t) + 4} textAnchor="end" className="td-axis">{format(t)}</text></g>)}
          {labels.map((l, i) => { const cxm = padL + slot * (i + 0.5); let acc = 0; return (
            <g key={l + i} onPointerEnter={() => setHi(i)} className={cx('td-bar', hi === i && 'is-hi')}>
              <rect x={padL + slot * i} y={padT} width={slot} height={ih} fill="transparent" />
              {ss.map((s, k) => { const v = s.data[i]!; const x0 = stacked ? cxm - bw / 2 : cxm - bw / 2 + k * gw; const y0 = stacked ? y(acc + v) : y(v); const h = stacked ? y(acc) - y(acc + v) : y(0) - y(v); acc += v; return <rect key={s.id} x={x0} y={y0} width={Math.max(2, gw - (stacked ? 0 : 2))} height={Math.max(0, h)} rx={3} fill={s.color ?? PALETTE[k % PALETTE.length]} />; })}
              {i % step === 0 && <text x={cxm} y={height - 5} textAnchor="middle" className="td-axis">{l}</text>}
            </g>); })}
        </svg>
      )}
      {hi !== null && w > 0 && <div className="td-tip" style={{ left: padL + slot * (hi + 0.5), top: padT }} role="status"><b>{labels[hi]}</b>{ss.map((s, k) => <span key={s.id}><i style={{ background: s.color ?? PALETTE[k % PALETTE.length] }} />{s.label}<em>{format(s.data[hi]!)}</em></span>)}</div>}
      <table className="td-sr"><caption>{ariaLabel}</caption><thead><tr><th>Period</th>{ss.map((s) => <th key={s.id}>{s.label}</th>)}</tr></thead><tbody>{labels.map((l, i) => <tr key={l + i}><th>{l}</th>{ss.map((s) => <td key={s.id}>{s.data[i]}</td>)}</tr>)}</tbody></table>
    </div>
  );
}

/** A ring split into parts, with the legend and values beside it. */
export function Donut({ parts, total, size = 132, center, ariaLabel }: { parts: Array<{ label: string; value: number; color?: string }>; total?: number; size?: number; center?: ReactNode; ariaLabel: string }) {
  const sum = total ?? parts.reduce((a, p) => a + p.value, 0); const r = size / 2 - 9; const c = 2 * Math.PI * r; let acc = 0;
  return (
    <div className="td-donut">
      <div className="td-donut-g" style={{ width: size, height: size }}>
        <svg width={size} height={size} role="img" aria-label={ariaLabel}><circle cx={size / 2} cy={size / 2} r={r} className="td-donut-bg" />{parts.map((p, k) => { const len = (p.value / sum) * c; const el = <circle key={p.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.color ?? PALETTE[k % PALETTE.length]} strokeWidth={10} strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-acc} transform={`rotate(-90 ${size / 2} ${size / 2})`} />; acc += len; return el; })}</svg>
        {center && <div className="td-donut-c">{center}</div>}
      </div>
      <ul>{parts.map((p, k) => <li key={p.label}><i style={{ background: p.color ?? PALETTE[k % PALETTE.length] }} /><span>{p.label}</span><b>{fmt.n(p.value)}</b><em>{fmt.p(p.value / sum, 0)}</em></li>)}</ul>
    </div>
  );
}

/** Horizontal bars with a label, a value and a share: the "top pages / sources" list. */
export function RankList({ rows, format = fmt.n, tone = 'primary' }: { rows: Array<{ label: string; value: number; sub?: string }>; format?: (v: number) => string; tone?: 'primary' | 'signal' }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return <ul className={cx('td-rank', `is-${tone}`)}>{rows.map((r) => <li key={r.label}><i style={{ width: `${(r.value / max) * 100}%` }} /><span>{r.label}{r.sub && <small>{r.sub}</small>}</span><b>{format(r.value)}</b></li>)}</ul>;
}

/* ------------------------------------------------------------------ table */
export interface Col<T> { id: string; label: string; w?: string; align?: 'right' | 'left'; sort?: (a: T, b: T) => number; cell: (row: T) => ReactNode; hideBelow?: 'sm' | 'md' }
/** A dense table: sticky header, sortable columns (button + aria-sort), row hover, optional row click. */
export function Table<T>({ cols, rows, rowKey, onRow, caption, empty = 'Nothing matches.', selected }: { cols: Array<Col<T>>; rows: T[]; rowKey: (r: T) => string; onRow?: (r: T) => void; caption: string; empty?: string; selected?: string }) {
  const [sort, setSort] = useState<{ id: string; dir: 1 | -1 } | null>(null);
  const sorted = useMemo(() => { const c = cols.find((x) => x.id === sort?.id); if (!sort || !c?.sort) return rows; return [...rows].sort((a, b) => c.sort!(a, b) * sort.dir); }, [rows, sort, cols]);
  return (
    <div className="td-tablewrap">
      <table className="td-table">
        <caption className="td-sr">{caption}</caption>
        <thead><tr>{cols.map((c) => <th key={c.id} scope="col" style={{ width: c.w, textAlign: c.align }} className={cx(c.hideBelow && `hide-${c.hideBelow}`)} aria-sort={sort?.id === c.id ? (sort.dir === 1 ? 'ascending' : 'descending') : c.sort ? 'none' : undefined}>{c.sort ? <button type="button" onClick={() => setSort((s) => (s?.id === c.id ? (s.dir === 1 ? { id: c.id, dir: -1 } : null) : { id: c.id, dir: 1 }))}>{c.label}<Icon name="down" size={11} className={cx('td-sortic', sort?.id === c.id && 'is-on', sort?.id === c.id && sort.dir === 1 && 'is-asc')} /></button> : c.label}</th>)}</tr></thead>
        <tbody>
          {sorted.length === 0 && <tr><td colSpan={cols.length} className="td-none">{empty}</td></tr>}
          {sorted.map((r) => <tr key={rowKey(r)} className={cx(onRow && 'is-click', selected === rowKey(r) && 'is-sel')} onClick={onRow ? () => onRow(r) : undefined}>{cols.map((c) => <td key={c.id} style={{ textAlign: c.align }} className={cx(c.hideBelow && `hide-${c.hideBelow}`)}>{c.cell(r)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ preview (used by the gallery's miniature) */
export function Preview({ w = 1280, h = 150, children }: { w?: number; h?: number; children: ReactNode }) {
  const [ref, cw] = useWidth<HTMLDivElement>(); const s = cw ? cw / w : 0.2;
  return <div ref={ref} aria-hidden="true" style={{ position: 'relative', width: '100%', height: h, overflow: 'hidden', borderRadius: 8 }}><div inert style={{ width: w, height: h / s, transform: `scale(${s})`, transformOrigin: '0 0', pointerEvents: 'none' } as CSSProperties}>{children}</div></div>;
}
