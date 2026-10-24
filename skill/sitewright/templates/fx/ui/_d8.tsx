'use client';
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/** true when the visitor asks for reduced motion (corrected in an effect, so SSR is stable) */
export function useReducedMotion(): boolean {
  const [r, setR] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setR(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return r;
}

/** false on the server and first paint, true one frame after mount: drives enter transitions */
export function useMounted(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setM(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return m;
}

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export const SR: CSSProperties = { position: 'absolute', width: 1, height: 1, margin: -1, padding: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 };
export const fmtNum = (n: number) => (Math.abs(n) >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(Math.round(n * 10) / 10));
export const money = (n: number, cur = '$') => cur + Math.round(n).toLocaleString('en-US');

/** Gallery miniature: lays the block out at `w` px wide and scales it down to the container (150px stage). */
export function Mini({ w = 1000, h = 150, children }: { w?: number; h?: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState(0.28);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const f = () => setS(Math.max(0.1, el.clientWidth / w));
    f();
    const ro = new ResizeObserver(f);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w]);
  return (
    <div ref={ref} aria-hidden="true" style={{ position: 'relative', width: '100%', height: h, overflow: 'hidden', borderRadius: 8 }}>
      <div inert style={{ width: w, height: h / s, overflow: 'hidden', transform: `scale(${s})`, transformOrigin: '0 0', pointerEvents: 'none' }}>
        {children}
      </div>
    </div>
  );
}

/** nice axis maximum */
export function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}

export interface Pt { label: string; value: number }
export interface Pt2 { label: string; a: number; b?: number }

const tipStyle: CSSProperties = { position: 'absolute', zIndex: 3, pointerEvents: 'none', padding: '6px 9px', borderRadius: 8, fontSize: 12, lineHeight: 1.35, whiteSpace: 'nowrap', background: 'var(--raised-2, #fff)', color: 'var(--ink, #111)', border: '1px solid var(--line-strong, #bbb)', boxShadow: 'var(--shadow, 0 2px 8px rgba(0,0,0,.2))', transform: 'translate(-50%, -100%)' };

/** Grouped SVG bars (one or two series) with focusable bars, tooltip, sr table and an enter grow. */
export function Bars({ data, aName = 'Value', bName = 'Other', fmt = fmtNum, title, height = 150, ca = 'var(--primary, #2563eb)', cb = 'var(--signal, #f59e0b)' }: { data: Pt2[]; aName?: string; bName?: string; fmt?: (n: number) => string; title: string; height?: number; ca?: string; cb?: string }) {
  const reduced = useReducedMotion();
  const on = useMounted();
  const [tip, setTip] = useState(-1);
  const W = 320, padL = 4, padB = 18, padT = 8;
  const hasB = data.some((d) => d.b != null);
  const max = niceMax(Math.max(1, ...data.map((d) => Math.max(d.a, d.b ?? 0))));
  const slot = (W - padL) / Math.max(1, data.length);
  const bw = Math.min(hasB ? 12 : 22, slot / (hasB ? 2.6 : 1.8));
  const ph = height - padB - padT;
  const y = (v: number) => padT + ph - (v / max) * ph;
  const cx = (i: number) => padL + slot * i + slot / 2;
  const grow = (i: number): CSSProperties => ({ transformBox: 'fill-box', transformOrigin: '50% 100%', transform: on || reduced ? 'scaleY(1)' : 'scaleY(0)', transition: reduced ? 'none' : `transform .6s cubic-bezier(.2,.8,.2,1) ${i * 45}ms` });
  const d = tip >= 0 ? data[tip] : undefined;
  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${height}`} width="100%" role="img" aria-label={title} style={{ display: 'block', overflow: 'visible' }}>
        <title>{title}</title>
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={0} x2={W} y1={y(max * t)} y2={y(max * t)} stroke="var(--line, #ddd)" strokeWidth={1} strokeDasharray={t ? '2 3' : undefined} />
          </g>
        ))}
        {data.map((p, i) => (
          <g key={p.label} onPointerEnter={() => setTip(i)} onPointerLeave={() => setTip(-1)}>
            <rect x={cx(i) - (hasB ? bw : bw / 2)} y={y(p.a)} width={bw} height={Math.max(1, padT + ph - y(p.a))} rx={2.5} fill={ca} style={grow(i)} tabIndex={0} role="img" aria-label={`${p.label}: ${aName} ${fmt(p.a)}${p.b != null ? `, ${bName} ${fmt(p.b)}` : ''}`} onFocus={() => setTip(i)} onBlur={() => setTip(-1)} />
            {p.b != null && <rect x={cx(i)} y={y(p.b)} width={bw} height={Math.max(1, padT + ph - y(p.b))} rx={2.5} fill={cb} style={grow(i)} />}
            <rect x={cx(i) - slot / 2} y={0} width={slot} height={height} fill="transparent" />
            <text x={cx(i)} y={height - 4} textAnchor="middle" fontSize={10} fill="var(--muted, #667)">{p.label}</text>
          </g>
        ))}
      </svg>
      {d && <div style={{ ...tipStyle, left: `${(cx(tip) / W) * 100}%`, top: `${(Math.min(y(d.a), d.b != null ? y(d.b) : 999) / height) * 100}%`, marginTop: -4 }} aria-hidden="true"><b>{d.label}</b><br />{aName}: {fmt(d.a)}{d.b != null && <><br />{bName}: {fmt(d.b)}</>}</div>}
      <div style={SR}><table><caption>{title}</caption><thead><tr><th>Period</th><th>{aName}</th>{hasB && <th>{bName}</th>}</tr></thead><tbody>{data.map((p) => <tr key={p.label}><td>{p.label}</td><td>{p.a}</td>{hasB && <td>{p.b}</td>}</tr>)}</tbody></table></div>
    </div>
  );
}

/** Responsive area chart: HTML y labels, pointer + arrow-key scrub with tooltip, left-to-right reveal. */
export function Area({ data, title, fmt = fmtNum, height = 200, color = 'var(--primary, #2563eb)', name = 'Value' }: { data: Pt[]; title: string; fmt?: (n: number) => string; height?: number; color?: string; name?: string }) {
  const reduced = useReducedMotion();
  const on = useMounted();
  const [idx, setIdx] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const gid = 'd8a' + useId().replace(/[^a-z0-9]/gi, '');
  const n = data.length;
  const max = niceMax(Math.max(1, ...data.map((p) => p.value)));
  const W = 600, H = 200, pt = 10;
  const px = (i: number) => (n < 2 ? W / 2 : (i / (n - 1)) * W);
  const py = (v: number) => pt + (H - pt) - (v / max) * (H - pt);
  let line = '';
  data.forEach((p, i) => {
    if (i === 0) { line = `M${px(0)} ${py(p.value)}`; return; }
    const x0 = px(i - 1), y0 = py(data[i - 1]!.value), x1 = px(i), y1 = py(p.value), mx = (x0 + x1) / 2;
    line += ` C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`;
  });
  const area = `${line} L${px(n - 1)} ${H} L${px(0)} ${H} Z`;
  const step = Math.max(1, Math.ceil(n / 6));
  const onMove = (e: React.PointerEvent) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    setIdx(clamp(Math.round(((e.clientX - r.left) / r.width) * (n - 1)), 0, n - 1));
  };
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); setIdx((i) => clamp(i + 1, 0, n - 1)); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); setIdx((i) => clamp((i < 0 ? n : i) - 1, 0, n - 1)); }
    else if (e.key === 'Escape') setIdx(-1);
  };
  const cur = idx >= 0 ? data[idx] : undefined;
  const lx = cur ? (px(idx) / W) * 100 : 0, ly = cur ? (py(cur.value) / H) * 100 : 0;
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height, paddingBottom: 22, fontSize: 11, color: 'var(--muted, #667)', textAlign: 'right', minWidth: 28 }}>
        {[1, 0.5, 0].map((t) => <span key={t}>{fmt(max * t)}</span>)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div ref={box} tabIndex={0} role="group" aria-label={`${title}. Use left and right arrow keys to read values.`} onPointerMove={onMove} onPointerLeave={() => setIdx(-1)} onKeyDown={key} onBlur={() => setIdx(-1)} style={{ position: 'relative', height: height - 22, touchAction: 'pan-y', borderRadius: 6 }}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height="100%" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
            <defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".34" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
            {[0, 0.5, 1].map((t) => <line key={t} x1={0} x2={W} y1={py(max * t)} y2={py(max * t)} stroke="var(--line, #ddd)" strokeWidth={1} vectorEffect="non-scaling-stroke" strokeDasharray={t ? '3 4' : undefined} />)}
            <g style={{ clipPath: `inset(0 ${on || reduced ? 0 : 100}% 0 0)`, transition: reduced ? 'none' : 'clip-path 1s cubic-bezier(.3,.7,.2,1)' }}>
              <path d={area} fill={`url(#${gid})`} />
              <path d={line} fill="none" stroke={color} strokeWidth={2.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            </g>
            {cur && <line x1={px(idx)} x2={px(idx)} y1={0} y2={H} stroke="var(--line-strong, #aaa)" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
          </svg>
          {cur && <>
            <span aria-hidden="true" style={{ position: 'absolute', left: `${lx}%`, top: `${ly}%`, width: 11, height: 11, margin: '-5.5px 0 0 -5.5px', borderRadius: '50%', background: color, border: '2px solid var(--raised, #fff)' }} />
            <div aria-hidden="true" style={{ ...tipStyle, left: `${clamp(lx, 12, 88)}%`, top: `${ly}%`, marginTop: -12 }}><b>{cur.label}</b><br />{name}: {fmt(cur.value)}</div>
          </>}
        </div>
        <div aria-hidden="true" style={{ position: 'relative', height: 22, fontSize: 11, color: 'var(--muted, #667)' }}>
          {data.map((p, i) => i % step === 0 && <span key={p.label} style={{ position: 'absolute', top: 6, left: `${(px(i) / W) * 100}%`, transform: i === 0 ? 'none' : i === n - 1 ? 'translateX(-100%)' : 'translateX(-50%)', whiteSpace: 'nowrap' }}>{p.label}</span>)}
        </div>
        <div style={SR}><table><caption>{title}</caption><thead><tr><th>Period</th><th>{name}</th></tr></thead><tbody>{data.map((p) => <tr key={p.label}><td>{p.label}</td><td>{p.value}</td></tr>)}</tbody></table></div>
        <div aria-live="polite" style={SR}>{cur ? `${cur.label}: ${fmt(cur.value)}` : ''}</div>
      </div>
    </div>
  );
}

/** Donut with an interactive legend (hover/focus highlights a slice). Colours come from the `colors` list. */
export function Donut({ data, colors, title, centre, unit = '%', cls }: { data: Pt[]; colors: string[]; title: string; centre?: string; unit?: string; cls: string }) {
  const reduced = useReducedMotion();
  const on = useMounted();
  const [hot, setHot] = useState(-1);
  const total = data.reduce((s, p) => s + p.value, 0) || 1;
  const R = 42, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: 140, height: 140, flex: 'none' }}>
        <svg viewBox="0 0 100 100" width="140" height="140" role="img" aria-label={title} style={{ transform: 'rotate(-90deg)' }}>
          <title>{title}</title>
          {data.map((p, i) => {
            const len = (p.value / total) * C, off = acc;
            acc += len;
            return <circle key={p.label} cx={50} cy={50} r={R} fill="none" stroke={colors[i % colors.length]} strokeWidth={hot === i ? 14 : 11} strokeDasharray={`${on || reduced ? Math.max(0, len - 1.5) : 0} ${C}`} strokeDashoffset={-off} style={{ transition: reduced ? 'none' : `stroke-dasharray .8s ease ${i * 90}ms, stroke-width .15s`, opacity: hot < 0 || hot === i ? 1 : 0.45 }} />;
          })}
        </svg>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', lineHeight: 1.15 }}>
          <div><b style={{ fontSize: 20 }}>{hot >= 0 ? `${Math.round((data[hot]!.value / total) * 100)}${unit}` : centre ?? ''}</b><div style={{ fontSize: 11, color: 'var(--muted, #667)' }}>{hot >= 0 ? data[hot]!.label : 'total'}</div></div>
        </div>
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4, flex: 1, minWidth: 130 }}>
        {data.map((p, i) => (
          <li key={p.label}>
            <button type="button" className={`${cls}-leg`} onPointerEnter={() => setHot(i)} onPointerLeave={() => setHot(-1)} onFocus={() => setHot(i)} onBlur={() => setHot(-1)} aria-label={`${p.label}: ${Math.round((p.value / total) * 100)} percent`} style={{ all: 'unset', boxSizing: 'border-box', display: 'flex', width: '100%', alignItems: 'center', gap: 8, minHeight: 32, padding: '0 6px', borderRadius: 6, cursor: 'default', fontSize: 13 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: colors[i % colors.length], flex: 'none' }} />
              <span style={{ flex: 1 }}>{p.label}</span>
              <b>{Math.round((p.value / total) * 100)}%</b>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
