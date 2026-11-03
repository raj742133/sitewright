'use client';
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { clamp, seeded, useCanvasLoop } from './_ha-kit';

/* Lanternfall helpers: a still SVG night scene (the fallback under the canvas scene), the falling petals and rising embers, the
   dawn stage art used by the scroll-linked journey, and the one scroll loop that drives the whole night-to-dawn story. */

const W = 1600, H = 900;

/** ridge line as a closed SVG path */
function ridge(seed: number, base: number, amp: number): string {
  const r = seeded(seed);
  const ph = [r() * 6, r() * 6, r() * 6];
  const pts: string[] = [];
  for (let x = 0; x <= W; x += 16) {
    const u = x / W;
    const y = base - amp * (0.55 * Math.sin(u * 5.2 + ph[0]!) + 0.3 * Math.sin(u * 11.7 + ph[1]!) + 0.15 * Math.sin(u * 27 + ph[2]!) + (r() - 0.5) * 0.1);
    pts.push(`${x},${y.toFixed(1)}`);
  }
  return `M0,${H} L${pts.join(' L')} L${W},${H} Z`;
}
const R_FAR = ridge(7, 560, 130), R_MID = ridge(21, 650, 96), R_NEAR = ridge(33, 780, 74);
const STARS = (() => { const r = seeded(5); return Array.from({ length: 110 }, (_, i) => ({ x: r() * W, y: r() * 470, s: 0.6 + r() * 1.5, d: (i % 11) * -0.8 })); })();
const PINES = (() => { const r = seeded(9); return Array.from({ length: 24 }, () => ({ x: 10 + r() * 1580, h: 80 + r() * 110 })); })();

/** one pagoda tier as a roof curve + wall + lit window */
function tier(cx: number, y: number, w: number, h: number) {
  const roof = `M${cx - w - 30},${y - 6} Q${cx - w - 6},${y + 10} ${cx - w * 0.55},${y + 10} L${cx + w * 0.55},${y + 10} Q${cx + w + 6},${y + 10} ${cx + w + 30},${y - 6} Q${cx + w * 0.7},${y - 5} ${cx + w * 0.5},${y - 20} L${cx - w * 0.5},${y - 20} Q${cx - w * 0.7},${y - 5} ${cx - w - 30},${y - 6} Z`;
  return (
    <g key={y}>
      <path className="hnt-sv-roof" d={roof} />
      <rect className="hnt-sv-wall" x={cx - w * 0.42} y={y + 10} width={w * 0.84} height={h} />
      <rect className="hnt-sv-win" x={cx - w * 0.15} y={y + 16} width={w * 0.3} height={h - 14} rx="2" />
    </g>
  );
}
function Pagoda({ cx, by, k = 1 }: { cx: number; by: number; k?: number }) {
  const tiers = [{ y: -250, w: 34, h: 40 }, { y: -190, w: 50, h: 44 }, { y: -124, w: 66, h: 48 }, { y: -52, w: 84, h: 52 }];
  return (
    <g transform={`translate(${cx} ${by}) scale(${k})`}>
      <rect className="hnt-sv-wall" x="-2" y="-340" width="4" height="96" />
      <path className="hnt-sv-roof" d="M0,-352 l6,30 h-12 z" />
      {tiers.map((t) => tier(0, t.y, t.w, t.h))}
      <rect className="hnt-sv-wall" x="-120" y="2" width="240" height="14" />
      <rect className="hnt-sv-wall" x="-190" y="-14" width="56" height="18" />
      <path className="hnt-sv-roof" d="M-206,-14 Q-180,-4 -162,-30 Q-144,-4 -118,-14 L-136,-42 L-188,-42 Z" />
    </g>
  );
}

/** the still night scene: shown under the canvas scene, and the whole scene when canvas is unavailable */
export function FallbackScene() {
  return (
    <svg className="hnt-fb" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="hnt-fb-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--hnt-s0)" /><stop offset=".7" stopColor="var(--hnt-s1)" /></linearGradient>
        <radialGradient id="hnt-fb-moon"><stop offset="0" stopColor="#f3ead7" stopOpacity=".5" /><stop offset="1" stopColor="#f3ead7" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#hnt-fb-sky)" />
      {STARS.map((s, i) => <circle key={i} cx={s.x.toFixed(0)} cy={s.y.toFixed(0)} r={s.s.toFixed(2)} fill="#e8ecff" opacity={0.25 + (i % 5) * 0.12} />)}
      <circle cx="330" cy="190" r="240" fill="url(#hnt-fb-moon)" />
      <circle cx="330" cy="190" r="44" fill="#f3ead7" opacity=".92" />
      <path d={R_FAR} fill="var(--hnt-r0)" />
      <path d={R_MID} fill="var(--hnt-r1)" />
      <g className="hnt-fb-temple"><Pagoda cx={930} by={640} /></g>
      <path d={R_NEAR} fill="var(--hnt-r2)" />
      {PINES.map((p, i) => <path key={i} fill="var(--hnt-r3)" d={`M${p.x - 18},${H} L${p.x},${H - p.h - 40} L${p.x + 18},${H} Z`} />)}
    </svg>
  );
}

interface Mote { x: number; y: number; v: number; s: number; ph: number; f: number; kind: 0 | 1 }
const MOTES: Mote[] = (() => { const r = seeded(77); return Array.from({ length: 46 }, (_, i) => ({ x: r(), y: r(), v: 0.018 + r() * 0.04, s: 1.2 + r() * 2.8, ph: r() * 6.28, f: 0.4 + r() * 0.9, kind: (i % 3 === 0 ? 1 : 0) as 0 | 1 })); })();

/** petals that fall slowly on the wind and embers that rise from the lanterns; `lit` is read from a ref so the loop is never rebuilt */
export function Drift({ reduced, lit }: { reduced: boolean; lit: RefObject<boolean> }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const motes = useRef<Mote[]>(MOTES.map((m) => ({ ...m })));
  useCanvasLoop(cv, reduced, (ctx, { w, h }, t, dt) => {
    ctx.clearRect(0, 0, w, h);
    const on = lit.current !== false;
    const n = on ? motes.current.length : 18;
    for (let i = 0; i < n; i++) {
      const m = motes.current[i]!;
      if (dt) {
        if (m.kind === 1) { m.y += m.v * dt * 0.9; m.x += dt * 0.012 * (0.6 + m.f); if (m.y > 1.05) { m.y = -0.05; m.x = (m.x * 7.13) % 1; } if (m.x > 1.05) m.x = -0.05; }
        else { m.y -= m.v * dt * (on ? 1.2 : 0.7); if (m.y < -0.05) { m.y = 1.05; } }
      }
      const x = (m.x + Math.sin(t * m.f + m.ph) * 0.02) * w, y = m.y * h;
      const fade = Math.min(1, Math.max(0, m.y * 4)) * Math.min(1, Math.max(0, (1.06 - m.y) * 5));
      if (m.kind === 1) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(t * 0.7 * m.f + m.ph); ctx.scale(1, Math.abs(Math.cos(t * 1.3 * m.f + m.ph)) * 0.8 + 0.2);
        ctx.globalAlpha = 0.62 * fade; ctx.fillStyle = i % 2 ? '#ffb4a2' : '#ffd2b8';
        ctx.beginPath(); ctx.ellipse(0, 0, m.s * 2.2, m.s * 1.1, 0, 0, 6.283); ctx.fill(); ctx.restore();
      } else {
        const r = m.s * (on ? 6.5 : 4.5), tw = 0.55 + 0.45 * Math.sin(t * 2 * m.f + m.ph);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(255,214,150,1)'); g.addColorStop(0.28, 'rgba(255,170,80,.7)'); g.addColorStop(1, 'rgba(255,150,60,0)');
        ctx.globalAlpha = (on ? 0.9 : 0.5) * fade * tw; ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }, 0);
  return <canvas ref={cv} className="hnt-drift" aria-hidden="true" />;
}

/** a hanging paper lantern, drawn once; used large and soft in the foreground of the hero */
export function HangingLantern() {
  return (
    <svg className="hnt-hang" viewBox="0 0 120 300" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="hnt-hl-g" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#fff2cf" /><stop offset=".45" stopColor="#ffb85a" /><stop offset="1" stopColor="#c8561c" /></radialGradient>
      </defs>
      <path d="M60 0V122" stroke="#1a1308" strokeWidth="2" />
      <rect x="44" y="118" width="32" height="9" rx="2" fill="#150f06" />
      <path d="M42 128 Q16 168 42 214 L78 214 Q104 168 78 128 Z" fill="url(#hnt-hl-g)" />
      {[0, 1, 2].map((i) => <path key={i} d={`M${46 + i * 14} 130 Q${30 + i * 30} 170 ${46 + i * 14} 213`} fill="none" stroke="#7a2e0c" strokeWidth="1.2" opacity=".55" />)}
      <rect x="42" y="212" width="36" height="8" rx="2" fill="#150f06" />
      <path d="M60 220V262M54 240l6-8 6 8" stroke="#ffb85a" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".9" />
    </svg>
  );
}

const CLOCK = ['19:40', '21:00', '00:00', '05:42'] as const;
export { CLOCK };

/**
 * The journey art: a sky that goes from night to dawn as --p (0..1, set by the scroll loop on the stage) grows. Everything is CSS-driven
 * from that one variable: sky cross-fade, stars, moon setting, sun rising, far ridges taking light, lanterns dimming.
 */
export function DawnArt({ rays }: { rays?: ReactNode }) {
  return (
    <div className="hnt-art" aria-hidden="true">
      <div className="hnt-sky hnt-sky-n" />
      <div className="hnt-sky hnt-sky-d" />
      <svg className="hnt-stars" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMin slice" focusable="false">
        {STARS.map((s, i) => <circle key={i} cx={s.x.toFixed(0)} cy={(s.y * 0.8).toFixed(0)} r={s.s.toFixed(2)} style={{ animationDelay: `${s.d}s` }} />)}
      </svg>
      <div className="hnt-moon" />
      <div className="hnt-sun" />
      <div className="hnt-sunrays">{rays}</div>
      <svg className="hnt-ridges" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" focusable="false">
        <path className="hnt-rg hnt-rg-0" d={R_FAR} />
      </svg>
      <svg className="hnt-pagoda" viewBox="-270 -372 540 372" focusable="false">
        <path className="hnt-rg hnt-rg-1" d="M-270,500 L-270,56 Q-150,14 -60,6 L60,6 Q150,14 270,56 L270,500 Z" />
        <g className="hnt-rg-t"><Pagoda cx={0} by={0} /></g>
      </svg>
      <svg className="hnt-ridges" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" focusable="false">
        <path className="hnt-rg hnt-rg-1" d={R_MID} />
        <path className="hnt-rg hnt-rg-2" d={R_NEAR} />
        {PINES.map((p, i) => <path key={i} className="hnt-rg hnt-rg-3" d={`M${p.x - 18},${H} L${p.x},${H - p.h - 40} L${p.x + 18},${H} Z`} />)}
      </svg>
      <div className="hnt-mist-a" /><div className="hnt-mist-b" />
      <div className="hnt-lamps">{[0, 1, 2, 3, 4, 5].map((i) => <i key={i} style={{ ['--i' as string]: i }} />)}</div>
    </div>
  );
}

export interface Story { step: number; phase: number }
interface Els { root: HTMLElement; hero: HTMLElement; journey: HTMLElement; stage: HTMLElement; nav: HTMLElement }

/**
 * The one scroll loop: --exit on the hero (0..1 while it leaves), --p on the stage (0..1 through the night), --dawn on the root (0..1 for the
 * whole page), the journey step (0..3), the nav tone (light type over night, ink over day) and the clock phase. Writes variables directly,
 * calls `onPhase` only when the step or phase actually changes. With reduced motion nothing is written and the css defaults apply.
 */
export function useStory(get: () => Els | null, reduced: boolean, onPhase: (s: Story) => void) {
  const cb = useRef(onPhase); cb.current = onPhase;
  useEffect(() => {
    const els = get();
    if (!els) return;
    const { root, hero, journey, stage, nav } = els;
    let raf = 0, step = -1, phase = -2, tone = '';
    const run = () => {
      raf = 0;
      const vh = window.innerHeight || 800;
      const rr = root.getBoundingClientRect(), hr = hero.getBoundingClientRect(), jr = journey.getBoundingClientRect();
      const T = 36;
      const overNight = (hr.top <= T && hr.bottom > T) || (jr.top <= T && jr.bottom > 300);
      const nt = overNight ? 'night' : 'day';
      if (nt !== tone) { tone = nt; nav.dataset.tone = nt; }
      if (reduced) {
        const ph = jr.bottom < T ? 5 : jr.top <= T ? 2 : 0;
        if (ph !== phase) { phase = ph; step = ph === 2 ? 1 : 0; cb.current({ step: Math.max(0, step), phase }); }
        return;
      }
      root.style.setProperty('--dawn', clamp(-rr.top / Math.max(1, rr.height - vh), 0, 1).toFixed(3));
      hero.style.setProperty('--exit', clamp(-hr.top / Math.max(1, hr.height), 0, 1).toFixed(3));
      const p = clamp(-jr.top / Math.max(1, jr.height - vh), 0, 1);
      stage.style.setProperty('--p', p.toFixed(3));
      const s = Math.min(3, Math.floor(p * 4)), after = jr.bottom <= vh * 0.55;
      const ph = after ? 5 : jr.top > vh * 0.5 ? 0 : 1 + s;
      if (s !== step || ph !== phase) { step = s; phase = ph; cb.current({ step: s, phase: ph }); }
    };
    const tick = () => { if (!raf) raf = requestAnimationFrame(run); };
    run();
    window.addEventListener('scroll', tick, { passive: true, capture: true });
    window.addEventListener('resize', tick);
    return () => { if (raf) cancelAnimationFrame(raf); window.removeEventListener('scroll', tick, { capture: true }); window.removeEventListener('resize', tick); };
  }, [get, reduced]);
}
