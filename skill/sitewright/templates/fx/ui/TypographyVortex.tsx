'use client';
import { useEffect, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { rgba, mix, useCanvasLoop, useReducedMotion, clamp } from './_text-c';

export interface TypographyVortexProps {
  /** Letters that fill the rings (spaces are skipped). */
  text?: string;
  /** Number of concentric rings (default 9). */
  rings?: number;
  /** Accessible description (default describes the effect). */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

interface Burst { t0: number; x: number; y: number }

/**
 * Rings of letters whirl around a centre at different speeds with a breathing twist. The pointer pulls nearby letters toward it,
 * a click, tap or Enter sends a shockwave through the rings. Idle and touch get a drifting attractor; reduced motion shows one still frame.
 */
export default function TypographyVortex({ text = 'whirl spiral orbit drift', rings = 9, label, className, style }: TypographyVortexProps) {
  const cvs = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const st = useRef({ px: 0, py: 0, inside: false, bursts: [] as Burst[], now: 0, pull: 0 });
  const glyphs = Array.from(text.replace(/\s+/g, ''));

  useCanvasLoop(cvs, ({ ctx, w, h, t, pal, family }) => {
    const s = st.current;
    s.now = t;
    const cx = w / 2, cy = h / 2;
    const maxR = Math.hypot(cx, cy) * 0.92;
    const minR = Math.min(w, h) * 0.08;
    const gap = (maxR - minR) / rings;
    const ax = s.inside ? s.px : cx + Math.cos(t * 0.6) * w * 0.28;
    const ay = s.inside ? s.py : cy + Math.sin(t * 0.8) * h * 0.22;
    s.pull += ((s.inside ? 1 : 0.55) - s.pull) * 0.08;
    s.bursts = s.bursts.filter((b) => t - b.t0 < 2.2);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    let gi = 0;
    for (let r = 0; r < rings; r++) {
      const rho = minR + r * gap;
      const size = clamp(10 + r * 2.4 * (Math.min(w, h) / 420 + 0.4), 9, 40);
      const n = Math.max(6, Math.floor((2 * Math.PI * rho) / (size * 0.95)));
      const dir = r % 2 ? -1 : 1;
      const phase = dir * t * (0.55 / (1 + r * 0.22)) + Math.sin(t * 0.35 + r) * 0.25;
      const twist = Math.sin(t * 0.4) * 0.5 * (rho / maxR);
      ctx.font = `${r % 3 === 0 ? 700 : 500} ${size.toFixed(1)}px ${family}`;
      const depth = r / rings;
      for (let i = 0; i < n; i++) {
        const th = (i / n) * Math.PI * 2 + phase + twist;
        let rr = rho + Math.sin(th * 3 + t * 1.2 + r) * gap * 0.12;
        let flash = 0;
        for (const b of s.bursts) {
          const age = t - b.t0;
          const front = age * Math.min(w, h) * 0.6;
          const d = Math.abs(Math.hypot(Math.cos(th) * rho + cx - b.x, Math.sin(th) * rho + cy - b.y) - front);
          const k = Math.exp(-((d / (gap * 1.6)) ** 2)) * Math.max(0, 1 - age / 2.2);
          rr += k * gap * 1.4; flash = Math.max(flash, k);
        }
        let x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr * 0.9;
        const dx = ax - x, dy = ay - y;
        const near = Math.exp(-((dx * dx + dy * dy) / (Math.min(w, h) * 0.22) ** 2)) * s.pull;
        x += dx * near * 0.45; y += dy * near * 0.45;
        const ch = glyphs[gi++ % glyphs.length] ?? '*';
        const col = flash > 0.15 ? mix(pal.primary, pal.signal, flash) : mix(pal.ink, pal.primary, clamp(near * 1.4 + (1 - depth) * 0.3, 0, 1));
        ctx.fillStyle = rgba(col, clamp(0.35 + near * 0.6 + flash + (1 - depth) * 0.3, 0.2, 1));
        ctx.save(); ctx.translate(x, y); ctx.rotate(th + Math.PI / 2); ctx.scale(1 + near * 0.5 + flash * 0.6, 1 + near * 0.5 + flash * 0.6);
        ctx.fillText(ch, 0, 0); ctx.restore();
      }
    }
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, minR * 1.2);
    g.addColorStop(0, rgba(pal.signal, 0.9)); g.addColorStop(0.3, rgba(pal.primary, 0.35)); g.addColorStop(1, rgba(pal.primary, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, minR * 1.2, 0, Math.PI * 2); ctx.fill();
  }, reduced);

  useEffect(() => {
    const el = cvs.current;
    if (!el || reduced) return;
    const s = st.current;
    const pos = (e: PointerEvent) => { const r = el.getBoundingClientRect(); s.px = e.clientX - r.left; s.py = e.clientY - r.top; };
    const move = (e: PointerEvent) => { pos(e); s.inside = true; };
    const leave = () => { s.inside = false; };
    const down = (e: PointerEvent) => { pos(e); s.inside = true; s.bursts.push({ t0: s.now, x: s.px, y: s.py }); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave); el.addEventListener('pointerdown', down);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); el.removeEventListener('pointerdown', down); };
  }, [reduced]);

  const onKey = (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    const c = cvs.current;
    if (c && !reduced) st.current.bursts.push({ t0: st.current.now, x: c.clientWidth / 2, y: c.clientHeight / 2 });
  };

  return (
    <div className={`ui-typography-vortex-root ${className ?? ''}`} style={style}>
      <canvas ref={cvs} className="ui-typography-vortex-canvas" tabIndex={0} role="img" onKeyDown={onKey}
        aria-label={label ?? `Rings of the letters "${text}" whirling around a centre. Move the pointer to pull them, click or press Enter for a shockwave.`} />
    </div>
  );
}

export function Demo() {
  return <div className="ui-typography-vortex-stage"><TypographyVortex /></div>;
}
