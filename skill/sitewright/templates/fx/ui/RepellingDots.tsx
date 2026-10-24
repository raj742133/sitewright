'use client';
import { useEffect, useRef } from 'react';
import { usePrefs, useActive } from './_d6';

export interface RepellingDotsProps {
  /** Distance between dots in px. */
  spacing?: number;
  /** Pointer influence radius in px. */
  radius?: number;
  className?: string;
  style?: React.CSSProperties;
}

/** A dot grid on canvas. Dots are pushed away from the pointer and spring back. On touch a gentle automatic wave plays instead; static with reduced motion. Decorative. */
export default function RepellingDots({ spacing = 22, radius = 90, className, style }: RepellingDotsProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const { reduced, coarse } = usePrefs();
  const active = useActive(wrap);

  useEffect(() => {
    const c = cv.current, w = wrap.current;
    if (!c || !w) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let W = 0, H = 0, cols = 0, rows = 0, dpr = 1;
    let ox = new Float32Array(0), oy = new Float32Array(0), vx = new Float32Array(0), vy = new Float32Array(0);
    let colA = '#2563eb', colB = '#f59e0b';
    let px = -9999, py = -9999;
    let raf = 0, frames = 0;
    const readColors = () => {
      const cs = getComputedStyle(w);
      colA = cs.getPropertyValue('--primary').trim() || '#2563eb';
      colB = cs.getPropertyValue('--signal').trim() || '#f59e0b';
    };
    const size = () => {
      const r = w.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      cols = Math.ceil(W / spacing) + 1; rows = Math.ceil(H / spacing) + 1;
      ox = new Float32Array(cols * rows); oy = new Float32Array(cols * rows);
      vx = new Float32Array(cols * rows); vy = new Float32Array(cols * rows);
      draw();
    };
    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const x0 = (W - (cols - 1) * spacing) / 2, y0 = (H - (rows - 1) * spacing) / 2;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        const d = Math.min(1, Math.hypot(ox[k]!, oy[k]!) / 28);
        ctx.globalAlpha = 0.45 + d * 0.5;
        ctx.fillStyle = d > 0.25 ? colB : colA;
        ctx.beginPath();
        ctx.arc(x0 + i * spacing + ox[k]!, y0 + j * spacing + oy[k]!, 1.4 + d * 1.6, 0, 6.2832);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    const step = (now: number) => {
      if (++frames % 40 === 1) readColors();
      if (coarse) {
        const t = now / 1000;
        px = W / 2 + Math.sin(t * 0.9) * W * 0.38;
        py = H / 2 + Math.sin(t * 1.3 + 1) * H * 0.32;
      }
      const x0 = (W - (cols - 1) * spacing) / 2, y0 = (H - (rows - 1) * spacing) / 2;
      const r2 = radius * radius;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        const bx = x0 + i * spacing, by = y0 + j * spacing;
        const dx = bx + ox[k]! - px, dy = by + oy[k]! - py;
        const d2 = dx * dx + dy * dy;
        let fx = -ox[k]! * 0.09, fy = -oy[k]! * 0.09;
        if (d2 < r2 && d2 > 0.01) {
          const d = Math.sqrt(d2), f = (1 - d / radius) * 3.2;
          fx += (dx / d) * f; fy += (dy / d) * f;
        }
        vx[k] = (vx[k]! + fx) * 0.84; vy[k] = (vy[k]! + fy) * 0.84;
        ox[k] = ox[k]! + vx[k]!; oy[k] = oy[k]! + vy[k]!;
      }
      draw();
      raf = requestAnimationFrame(step);
    };
    readColors();
    const ro = new ResizeObserver(size);
    ro.observe(w);
    size();
    const move = (e: PointerEvent) => { const r = w.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; };
    const leave = () => { px = py = -9999; };
    const live = !reduced && active;
    if (live) {
      if (!coarse) { window.addEventListener('pointermove', move, { passive: true }); document.addEventListener('pointerleave', leave); }
      raf = requestAnimationFrame(step);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
    };
  }, [reduced, coarse, active, spacing, radius]);

  return (
    <div ref={wrap} className={`ui-repelling-dots${className ? ' ' + className : ''}`} style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none', ...style }} aria-hidden="true">
      <canvas ref={cv} style={{ width: '100%', height: '100%', display: 'block' }} />
    </div>
  );
}

export function Demo() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 150, display: 'grid', placeItems: 'center' }}>
      <RepellingDots spacing={18} radius={70} />
      <span style={{ position: 'relative', font: '700 1.1rem var(--font-body, system-ui)', color: 'var(--ink, #111)', background: 'var(--raised, transparent)', padding: '4px 12px', borderRadius: 999 }}>Move over the dots</span>
    </div>
  );
}
