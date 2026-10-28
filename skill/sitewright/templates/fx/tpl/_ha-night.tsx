'use client';
import { useRef, type RefObject } from 'react';
import { seeded, useCanvasLoop, useThemeVars } from './_ha-kit';

/* The night-mountain scene of the Lanternfall page: layered SVG ridges, a pagoda with lit windows, stone steps with lanterns,
   deterministic stars, and a canvas of rising embers and drifting petals. Everything is procedural; colours come from CSS variables. */

const W = 1600, H = 900;

/** ridge line as a closed SVG path; `flat` blends the ridge into a level terrace (for the temple) */
function ridge(seed: number, base: number, amp: number, flat?: [number, number, number]): string {
  const r = seeded(seed);
  const ph = [r() * 6, r() * 6, r() * 6];
  const pts: string[] = [];
  for (let x = 0; x <= W; x += 16) {
    const u = x / W;
    let y = base - amp * (0.55 * Math.sin(u * 5.2 + ph[0]!) + 0.3 * Math.sin(u * 11.7 + ph[1]!) + 0.15 * Math.sin(u * 27 + ph[2]!) + (r() - 0.5) * 0.12);
    if (flat) { const [a, b, fy] = flat; const k = x < a ? 0 : x > b ? 0 : Math.min(1, Math.min(x - a, b - x) / 90); y = y + (fy - y) * k; }
    pts.push(`${x},${y.toFixed(1)}`);
  }
  return `M0,${H} L${pts.join(' L')} L${W},${H} Z`;
}
const FAR = ridge(7, 560, 120);
const MID = ridge(21, 640, 90, [880, 1240, 612]);
const NEAR = ridge(33, 790, 70);
const STARS = (() => { const r = seeded(5); return Array.from({ length: 90 }, (_, i) => ({ x: r() * W, y: r() * 430, s: 0.6 + r() * 1.5, d: (i % 9) * -0.7 })); })();
const PINES = (() => { const r = seeded(9); return Array.from({ length: 22 }, () => ({ x: 20 + r() * 1560, h: 70 + r() * 90 })); })();

function tier(cx: number, y: number, w: number, h: number) {
  const roof = `M${cx - w - 26},${y - 6} Q${cx - w - 4},${y + 8} ${cx - w * 0.55},${y + 8} L${cx + w * 0.55},${y + 8} Q${cx + w + 4},${y + 8} ${cx + w + 26},${y - 6} Q${cx + w * 0.7},${y - 5} ${cx + w * 0.5},${y - 18} L${cx - w * 0.5},${y - 18} Q${cx - w * 0.7},${y - 5} ${cx - w - 26},${y - 6} Z`;
  return (
    <g key={y}>
      <path className="hnt-roof" d={roof} />
      <rect className="hnt-wall" x={cx - w * 0.42} y={y + 8} width={w * 0.84} height={h} />
      <rect className="hnt-win" x={cx - w * 0.16} y={y + 14} width={w * 0.32} height={h - 12} rx="2" />
    </g>
  );
}

/** Pagoda, steps and lanterns. Positioned on the mid-ridge terrace. */
function Temple() {
  const cx = 1060;
  const tiers = [{ y: 330, w: 36, h: 46 }, { y: 394, w: 52, h: 50 }, { y: 464, w: 68, h: 54 }, { y: 538, w: 84, h: 58 }];
  return (
    <g>
      <rect className="hnt-wall" x={cx - 2} y={250} width={4} height={80} />
      <path className="hnt-roof" d={`M${cx},238 l5,26 h-10 z`} />
      {tiers.map((t) => tier(cx, t.y, t.w, t.h))}
      <rect className="hnt-wall" x={cx - 110} y={596} width={220} height={14} />
      {[-150, -170, 150].map((o, i) => <g key={o}><rect className="hnt-wall" x={cx + o - 24} y={560 + i * 4} width={48} height={42} /><path className="hnt-roof" d={`M${cx + o - 40},${562 + i * 4} Q${cx + o - 20},${568 + i * 4} ${cx + o},${556 + i * 4} Q${cx + o + 20},${568 + i * 4} ${cx + o + 40},${562 + i * 4} L${cx + o + 22},${540 + i * 4} L${cx + o - 22},${540 + i * 4} Z`} /></g>)}
    </g>
  );
}

const STEP_LANTERNS = [{ x: 770, y: 632 }, { x: 690, y: 676 }, { x: 600, y: 720 }, { x: 500, y: 766 }, { x: 380, y: 812 }];

export function NightSky() {
  return (
    <svg className="hnt-sky" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      <defs>
        <linearGradient id="hnt-sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--hnt-sky0)" /><stop offset=".55" stopColor="var(--hnt-sky1)" /><stop offset="1" stopColor="var(--hnt-sky2)" /></linearGradient>
        <radialGradient id="hnt-moon"><stop offset="0" stopColor="var(--hnt-moon)" stopOpacity=".5" /><stop offset=".35" stopColor="var(--hnt-moon)" stopOpacity=".14" /><stop offset="1" stopColor="var(--hnt-moon)" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#hnt-sk)" />
      <g className="hnt-stars">{STARS.map((s, i) => <circle key={i} cx={s.x.toFixed(0)} cy={s.y.toFixed(0)} r={s.s.toFixed(2)} style={{ animationDelay: `${s.d}s` }} />)}</g>
      <g className="hnt-moonwrap">
        <mask id="hnt-cres"><rect width={W} height={H} fill="#fff" /><circle cx="926" cy="176" r="40" fill="#000" /></mask>
        <circle cx="900" cy="190" r="260" fill="url(#hnt-moon)" />
        <circle className="hnt-moondisc" cx="900" cy="190" r="48" mask="url(#hnt-cres)" />
      </g>
    </svg>
  );
}

export function NightLand({ lit }: { lit: boolean }) {
  return (
    <>
      <svg className="hnt-layer hnt-far" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path className="hnt-ridge-far" d={FAR} /></svg>
      <div className="hnt-mist hnt-mist-a" aria-hidden="true" />
      <svg className="hnt-layer hnt-mid" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true" data-lit={lit}>
        <path className="hnt-ridge-mid" d={MID} />
        <Temple />
        <path className="hnt-steps" d="M1000,612 L780,634 L700,680 L610,724 L510,770 L390,816 L390,830 L520,786 L626,740 L722,696 L800,650 L1000,630 Z" />
        {STEP_LANTERNS.map((l) => <g key={l.x} className="hnt-lamp"><circle className="hnt-halo" cx={l.x} cy={l.y - 16} r="34" /><rect className="hnt-wall" x={l.x - 3} y={l.y - 2} width="6" height="16" /><rect className="hnt-lan" x={l.x - 7} y={l.y - 22} width="14" height="20" rx="3" /></g>)}
      </svg>
      <div className="hnt-mist hnt-mist-b" aria-hidden="true" />
      <svg className="hnt-layer hnt-near" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <path className="hnt-ridge-near" d={NEAR} />
        {PINES.map((p, i) => <path key={i} className="hnt-pine" d={`M${p.x - 16},${H} L${p.x},${H - p.h - 40} L${p.x + 16},${H} Z M${p.x - 12},${H - 36} L${p.x},${H - p.h - 14} L${p.x + 12},${H - 36} Z`} />)}
      </svg>
    </>
  );
}

interface Mote { x: number; y: number; v: number; s: number; ph: number; f: number; petal: boolean }
const MOTES: Mote[] = (() => { const r = seeded(77); return Array.from({ length: 72 }, (_, i) => ({ x: r(), y: r(), v: 0.012 + r() * 0.028, s: 1.2 + r() * 2.6, ph: r() * 6.28, f: 0.4 + r() * 0.9, petal: i % 3 === 0 })); })();

/** rising lantern embers and drifting petals; `lit` raises their number and glow */
export function Embers({ root, reduced, lit }: { root: RefObject<HTMLElement | null>; reduced: boolean; lit: boolean }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const motes = useRef<Mote[]>(MOTES.map((m) => ({ ...m })));
  const litRef = useRef(lit);
  litRef.current = lit;
  const [pal, rev] = useThemeVars(root, ['signal', 'primary', 'ink']);
  useCanvasLoop(cv, reduced, (ctx, { w, h }, t, dt) => {
    ctx.clearRect(0, 0, w, h);
    const on = litRef.current;
    const n = on ? motes.current.length : 26;
    const sig = pal.current.signal || '#f59e0b', pri = pal.current.primary || '#e11d48';
    for (let i = 0; i < n; i++) {
      const m = motes.current[i]!;
      if (dt) { m.y -= m.v * dt * (on ? 1.3 : 0.8); if (m.y < -0.05) { m.y = 1.05; } }
      const x = (m.x + Math.sin(t * m.f + m.ph) * 0.025) * w;
      const y = m.y * h;
      const fade = Math.min(1, Math.max(0, m.y * 3.2)) * Math.min(1, (1.08 - m.y) * 6);
      if (m.petal) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.6 * m.f + m.ph);
        ctx.globalAlpha = 0.5 * fade; ctx.fillStyle = pri;
        ctx.beginPath(); ctx.ellipse(0, 0, m.s * 1.9, m.s * 0.9, 0, 0, 6.283); ctx.fill(); ctx.restore();
      } else {
        const r = m.s * (on ? 7 : 4.5);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const tw = 0.55 + 0.45 * Math.sin(t * 2 * m.f + m.ph);
        g.addColorStop(0, sig); g.addColorStop(0.25, sig); g.addColorStop(1, 'transparent');
        ctx.globalAlpha = (on ? 0.8 : 0.45) * fade * tw; ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }, rev);
  return <canvas ref={cv} className="hnt-embers" aria-hidden="true" />;
}
