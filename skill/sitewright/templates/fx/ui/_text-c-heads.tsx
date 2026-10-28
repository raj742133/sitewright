'use client';
import { useEffect, useRef } from 'react';
import { clamp, mix, rgba, seeded, useCanvasLoop } from './_text-c';

interface P { tx: number; ty: number; x: number; y: number; vx: number; vy: number; delay: number; u: number }

/** Canvas heading made of particles that fly in and settle into the letters; the pointer scatters them and they spring back. */
export function ParticleHeading({ text, run, reduced }: { text: string; run: number; reduced: boolean }) {
  const cvs = useRef<HTMLCanvasElement>(null);
  const st = useRef({ ps: [] as P[], key: '', t0: -1, run: -1, px: -999, py: -999 });

  useCanvasLoop(cvs, ({ ctx, w, h, t, dt, pal, family, still }) => {
    const s = st.current;
    const key = `${w}x${h}|${text}|${family}`;
    if (key !== s.key) {
      s.key = key;
      const off = document.createElement('canvas');
      off.width = Math.round(w); off.height = Math.round(h);
      const o = off.getContext('2d', { willReadFrequently: true });
      s.ps = [];
      if (o) {
        const lines = text.split(/\n/);
        let size = 120;
        o.font = `800 ${size}px ${family}`;
        const widest = Math.max(...lines.map((l) => o.measureText(l).width), 1);
        size = clamp(Math.min((size * w * 0.9) / widest, (h * 0.8) / lines.length / 1.1), 14, 160);
        o.font = `800 ${size}px ${family}`; o.textAlign = 'center'; o.textBaseline = 'middle'; o.fillStyle = '#000';
        lines.forEach((l, i) => o.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.1));
        const data = o.getImageData(0, 0, off.width, off.height).data;
        let gap = Math.max(2, Math.round(size / 28));
        const hits: [number, number][] = [];
        for (;;) {
          hits.length = 0;
          for (let y = 0; y < off.height; y += gap) for (let x = 0; x < off.width; x += gap) if ((data[(y * off.width + x) * 4 + 3] ?? 0) > 128) hits.push([x, y]);
          if (hits.length <= 4200) break;
          gap++;
        }
        const rnd = seeded(11);
        s.ps = hits.map(([tx, ty]) => {
          const a = rnd() * Math.PI * 2, r = (0.35 + rnd() * 0.6) * Math.max(w, h);
          return { tx, ty, x: w / 2 + Math.cos(a) * r, y: h / 2 + Math.sin(a) * r, vx: 0, vy: 0, delay: (tx / w) * 0.7 + rnd() * 0.3, u: tx / w };
        });
        s.t0 = t; s.run = run;
      }
    }
    if (s.run !== run) {
      s.run = run; s.t0 = t;
      const rnd = seeded(run * 31 + 5);
      for (const p of s.ps) { const a = rnd() * Math.PI * 2, r = (0.35 + rnd() * 0.6) * Math.max(w, h); p.x = w / 2 + Math.cos(a) * r; p.y = h / 2 + Math.sin(a) * r; p.vx = p.vy = 0; }
    }
    const el = t - s.t0, k = Math.min(1, dt * 60), r2 = 80 * 80, rad = clamp(w / 260, 1, 2);
    for (const p of s.ps) {
      if (still) { p.x = p.tx; p.y = p.ty; }
      else if (el >= p.delay) {
        let ax = (p.tx - p.x) * 0.05, ay = (p.ty - p.y) * 0.05;
        const dx = p.x - s.px, dy = p.y - s.py, d2 = dx * dx + dy * dy;
        if (d2 < r2) { const f = (1 - d2 / r2) * 6; const d = Math.sqrt(d2) + 0.01; ax += (dx / d) * f; ay += (dy / d) * f; }
        p.vx = (p.vx + ax * k) * Math.pow(0.86, k); p.vy = (p.vy + ay * k) * Math.pow(0.86, k);
        p.x += p.vx * k; p.y += p.vy * k;
      }
      ctx.fillStyle = rgba(mix(pal.primary, pal.signal, p.u), 0.95);
      ctx.fillRect(p.x - rad / 2, p.y - rad / 2, rad, rad);
    }
  }, reduced);

  useEffect(() => {
    const el = cvs.current;
    if (!el || reduced) return;
    const s = st.current;
    const move = (e: PointerEvent) => { const r = el.getBoundingClientRect(); s.px = e.clientX - r.left; s.py = e.clientY - r.top; };
    const leave = () => { s.px = s.py = -999; };
    el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  }, [reduced]);

  return <canvas ref={cvs} className="ui-article-headings-canvas" aria-hidden="true" />;
}
