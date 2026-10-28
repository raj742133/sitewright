'use client';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { mix, rgba, useCoarsePointer, useReducedMotion, watchLive, watchPalette, type Palette } from './_text-b';
import { burst, makeField, sampleText, stepField, type Field, type Pointer } from './_text-b-particles';

export interface ParticleTextProps {
  /** The word or short line to build out of particles. */
  text?: string;
  /** CSS height (default fills the parent, min 120px). */
  height?: number | string;
  /** Radius in px of the pointer's push. */
  radius?: number;
  /** Upper bound on the number of particles. */
  maxParticles?: number;
  className?: string;
  style?: CSSProperties;
}

/** A word drawn from thousands of tiny particles on a canvas. They gather into place, are pushed away by the pointer and spring back; click, tap or Enter scatters them. Touch screens get a drifting ripple. */
export default function ParticleText({ text = 'Particles', height, radius = 64, maxParticles = 3600, className, style }: ParticleTextProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const cvs = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();
  const [plain, setPlain] = useState(false);
  const api = useRef<{ burst: () => void }>({ burst: () => undefined });
  const live = useRef({ reduced, coarse });
  live.current = { reduced, coarse };

  useEffect(() => {
    const el = wrap.current, canvas = cvs.current;
    if (!el || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setPlain(true); return; }
    let field: Field | null = null;
    let W = 0, H = 0, dpr = 1, raf = 0, last = 0, t0 = 0, visible = true, ready = false;
    let pal: Palette | null = null;
    let cols: string[] = [];
    const ptr: Pointer = { x: 0, y: 0, active: false };
    const virt: Pointer = { x: 0, y: 0, active: false };

    const colours = () => {
      if (!pal) return;
      cols = [rgba(pal.primary, 1), rgba(mix(pal.primary, pal.ink, 0.45), 0.95), rgba(mix(pal.primary, pal.signal, 0.75), 1)];
    };
    const draw = () => {
      if (!field) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const s = field.size, h = s / 2;
      for (let b = 0; b < 3; b++) {
        ctx.fillStyle = cols[b] ?? '#888';
        ctx.beginPath();
        for (let i = 0; i < field.n; i++) if (field.c[i] === b) { const px = field.x[i] ?? 0, py = field.y[i] ?? 0; ctx.moveTo(px + h, py); ctx.arc(px, py, h, 0, 6.2832); }
        ctx.fill();
      }
    };
    const frame = (now: number) => {
      raf = 0;
      if (!field || !visible) return;
      const dt = Math.min(0.05, (now - (last || now - 16)) / 1000);
      last = now;
      const { reduced: rm, coarse: co } = live.current;
      let p = ptr;
      const ambient = co && !ptr.active && !rm;
      if (ambient) { const t = (now - t0) / 1000; virt.x = W * (0.5 + 0.42 * Math.sin(t * 0.9)); virt.y = H * (0.5 + 0.18 * Math.sin(t * 1.7)); virt.active = true; p = virt; }
      const e = stepField(field, dt, p, radius, 2.6);
      draw();
      if (ambient || ptr.active || e > 0.02) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf && visible && ready) raf = requestAnimationFrame(frame); };
    const rebuild = () => {
      const r = el.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      const fam = getComputedStyle(canvas).fontFamily || 'sans-serif';
      const { pts, step } = sampleText(text, W, H, fam, 800, maxParticles);
      field = makeField(pts, step, W, H, field, live.current.reduced);
      ready = true;
      if (live.current.reduced) { for (let i = 0; i < field.n; i++) { field.x[i] = field.tx[i] ?? 0; field.y[i] = field.ty[i] ?? 0; } draw(); } else kick();
    };
    api.current.burst = () => { if (field && !live.current.reduced) { burst(field, ptr.active ? ptr.x : W / 2, ptr.active ? ptr.y : H / 2, 14); kick(); } };

    const offPal = watchPalette(el, (p) => { pal = p; colours(); if (field) { if (live.current.reduced) draw(); else kick(); } });
    const ro = new ResizeObserver(() => { rebuild(); });
    ro.observe(el);
    const offLive = watchLive(el, (v) => { visible = v; if (v) { last = 0; t0 = performance.now(); kick(); } });
    const move = (e: globalThis.PointerEvent) => { const r = el.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.active = true; kick(); };
    const leave = () => { ptr.active = false; kick(); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    el.addEventListener('pointercancel', leave);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      offPal(); offLive(); ro.disconnect();
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); el.removeEventListener('pointercancel', leave);
    };
  }, [text, radius, maxParticles, reduced]);

  const down = () => api.current.burst();
  const key = (e: KeyboardEvent<HTMLDivElement>) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); api.current.burst(); } };

  return (
    <div ref={wrap} className={`ui-particle-text-root${className ? ` ${className}` : ''}`} style={{ height: height ?? '100%', ...style }} role="button" tabIndex={0}
      aria-label={`${text}. Particle text; press Enter to scatter the particles.`} onPointerDown={down} onKeyDown={key}>
      <canvas ref={cvs} className="ui-particle-text-canvas" aria-hidden="true" />
      {plain && <span className="ui-particle-text-plain" aria-hidden="true">{text}</span>}
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-particle-text-demo">
      <ParticleText text="Particles" />
      <span className="ui-particle-text-note" aria-hidden="true">Move across it. Click to scatter.</span>
    </div>
  );
}
