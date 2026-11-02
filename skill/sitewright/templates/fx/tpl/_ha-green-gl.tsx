'use client';
import { useEffect, useRef, type RefObject } from 'react';
import { useCanvasLoop, useThemeVars, seeded } from './_ha-kit';

/* The air of the Hollowfern hero: one canvas of drifting spores (two depths, soft glow sprites) over the whole hero, and the same
   loop eases the pointer into --px / --py on the hero so the terrarium, its reflections and the interior layers shift together.
   One rAF loop (paused off screen and in hidden tabs by the kit), still frame under reduced motion. Colours come from --hg-spore. */

const N = 56;
const SEED = (() => { const r = seeded(5); return Array.from({ length: N }, () => ({ x: r(), y: r(), z: r(), s: 0.5 + r(), ph: r() * 6.28, w: 0.4 + r() })); })();

function sprite(color: string): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); if (!g) return null;
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, color); r.addColorStop(0.2, color); r.addColorStop(0.5, 'rgba(255,255,255,0.0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const h = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  h.addColorStop(0, 'rgba(255,255,255,.55)'); h.addColorStop(0.08, 'rgba(255,255,255,.18)'); h.addColorStop(0.3, 'rgba(255,255,255,0)');
  g.globalCompositeOperation = 'lighter'; g.fillStyle = h; g.fillRect(0, 0, 64, 64);
  return c;
}

/** spores + pointer easing for a hero element; `hero` receives --px/--py (-1..1) and --mx/--my (0..1) */
export function Atmosphere({ hero, reduced }: { hero: RefObject<HTMLElement | null>; reduced: boolean }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const [pal, rev] = useThemeVars(hero, ['hg-spore', 'hg-spore-blend']);
  const sp = useRef<HTMLCanvasElement | null>(null);
  const ptr = useRef({ x: 0, y: 0, tx: 0, ty: 0, last: -9, coarse: false });
  useEffect(() => { sp.current = sprite(pal.current['hg-spore'] || 'rgba(255,214,120,.9)'); }, [pal, rev]);
  useEffect(() => {
    const el = hero.current; if (!el) return;
    ptr.current.coarse = !!window.matchMedia?.('(pointer: coarse)').matches;
    const mv = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const r = el.getBoundingClientRect();
      ptr.current.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1));
      ptr.current.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1));
      ptr.current.last = performance.now() / 1000;
    };
    window.addEventListener('pointermove', mv, { passive: true });
    return () => window.removeEventListener('pointermove', mv);
  }, [hero]);

  useCanvasLoop(cv, reduced, (ctx, api, t, dt) => {
    const el = hero.current, p = ptr.current;
    // pointer easing (idle sway when the pointer has not moved for a while, and always on touch screens)
    const idle = p.coarse || t - p.last > 3.2 || p.last < 0;
    const gx = idle ? Math.sin(t * 0.32) * 0.5 : p.tx, gy = idle ? Math.cos(t * 0.23) * 0.3 : p.ty;
    const k = 1 - Math.exp(-dt * 3.2);
    p.x += (gx - p.x) * k; p.y += (gy - p.y) * k;
    if (el) {
      el.style.setProperty('--px', p.x.toFixed(3)); el.style.setProperty('--py', p.y.toFixed(3));
      el.style.setProperty('--mx', (p.x * 0.5 + 0.5).toFixed(3)); el.style.setProperty('--my', (p.y * 0.5 + 0.5).toFixed(3));
    }
    const { w, h } = api, img = sp.current;
    ctx.clearRect(0, 0, w, h);
    if (!img) return;
    ctx.globalCompositeOperation = pal.current['hg-spore-blend'] === 'lighter' ? 'lighter' : 'source-over';
    for (const s of SEED) {
      const z = 0.35 + s.z * 0.9, sp2 = 0.012 * s.s * z;
      const yy = (((s.y - t * sp2) % 1) + 1) % 1;
      const xx = (((s.x + Math.sin(t * 0.25 * s.w + s.ph) * 0.03 + t * 0.004 * s.s) % 1) + 1) % 1;
      const X = xx * w - p.x * 26 * z, Y = yy * h - p.y * 14 * z;
      const size = (7 + s.z * 17) * Math.min(1.3, w / 900 + 0.5);
      const tw = 0.55 + 0.45 * Math.sin(t * 1.1 * s.w + s.ph);
      ctx.globalAlpha = (0.25 + 0.55 * tw) * (0.5 + 0.5 * s.z);
      ctx.drawImage(img, X - size, Y - size, size * 2, size * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }, rev);
  return <canvas ref={cv} className="hlg-air" aria-hidden="true" />;
}
