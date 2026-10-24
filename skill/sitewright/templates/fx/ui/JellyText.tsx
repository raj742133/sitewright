'use client';
import { useEffect, useRef, type ElementType, type KeyboardEvent } from 'react';
import { useReducedMotion } from './_d5';

export interface JellyTextProps {
  text?: string;
  as?: ElementType;
  /** Wobble strength multiplier. */
  strength?: number;
  className?: string;
}

interface Jelly { el: HTMLElement; cx: number; cy: number; x: number; y: number; vx: number; vy: number; wait: number }
const K = 190, DAMP = 7.5, REACH = 80;

/** Headline whose letters wobble like jelly: each letter is its own spring, pushed by the pointer's motion. Tap, Enter or Space sends a wave. */
export default function JellyText({ text = 'Jelly letters', as: Tag = 'span', strength = 1, className }: JellyTextProps) {
  const root = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const api = useRef<{ wave: () => void }>({ wave: () => {} });

  useEffect(() => {
    const el = root.current;
    if (!el || reduced) return;
    const letters: Jelly[] = Array.from(el.querySelectorAll<HTMLElement>('[data-j]')).map((e) => ({ el: e, cx: 0, cy: 0, x: 0, y: 0, vx: 0, vy: 0, wait: -1 }));
    let raf = 0, prev = 0, lastX = 0, lastY = 0, lastT = 0;
    const measure = () => letters.forEach((l) => { const r = l.el.getBoundingClientRect(); l.cx = r.left + r.width / 2; l.cy = r.top + r.height / 2; });
    const step = (t: number) => {
      const dt = Math.min(0.032, (t - prev) / 1000 || 0.016); prev = t;
      let busy = false;
      for (const l of letters) {
        if (l.wait >= 0) { l.wait -= dt * 1000; busy = true; if (l.wait < 0) l.vy -= 380 * strength; }
        l.vx += (-K * l.x - DAMP * l.vx) * dt; l.vy += (-K * l.y - DAMP * l.vy) * dt;
        l.x += l.vx * dt; l.y += l.vy * dt;
        const rest = Math.abs(l.x) + Math.abs(l.y) + Math.abs(l.vx) * 0.05 + Math.abs(l.vy) * 0.05 < 0.12 && l.wait < 0;
        if (rest) { l.x = l.y = l.vx = l.vy = 0; l.el.style.transform = ''; } else {
          busy = true;
          const sp = Math.min(0.35, Math.hypot(l.vx, l.vy) / 1400);
          l.el.style.transform = `translate(${l.x.toFixed(2)}px,${l.y.toFixed(2)}px) rotate(${(l.x * 0.9).toFixed(2)}deg) scale(${(1 + sp * 0.5).toFixed(3)},${(1 - sp * 0.5).toFixed(3)})`;
        }
      }
      raf = busy ? requestAnimationFrame(step) : 0;
    };
    const run = () => { if (!raf) { prev = performance.now(); raf = requestAnimationFrame(step); } };
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      if (!raf) measure();
      const now = e.timeStamp || performance.now();
      const dt = Math.max(8, now - lastT);
      const vx = lastT ? ((e.clientX - lastX) / dt) * 1000 : 0, vy = lastT ? ((e.clientY - lastY) / dt) * 1000 : 0;
      lastX = e.clientX; lastY = e.clientY; lastT = now;
      for (const l of letters) {
        const d = Math.hypot(e.clientX - l.cx, e.clientY - l.cy);
        if (d > REACH) continue;
        const f = (1 - d / REACH) * 0.16 * strength;
        l.vx += Math.max(-420, Math.min(420, vx)) * f; l.vy += Math.max(-420, Math.min(420, vy)) * f;
      }
      run();
    };
    const leave = () => { lastT = 0; };
    const wave = () => { letters.forEach((l, i) => { l.wait = i * 35; }); run(); };
    api.current.wave = wave;
    const down = (e: PointerEvent) => { if (e.pointerType === 'touch') wave(); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave); el.addEventListener('pointerdown', down);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); el.removeEventListener('pointerdown', down);
      api.current.wave = () => {};
      letters.forEach((l) => { l.el.style.transform = ''; });
    };
  }, [reduced, strength]);

  const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); api.current.wave(); } };
  const words = text.split(' ');
  return (
    <Tag ref={root} className={`ui-jelly-text-root ${className ?? ''}`} tabIndex={0} aria-label={text} onKeyDown={onKey} onFocus={(e: { target: unknown; currentTarget: unknown }) => { if (e.target === e.currentTarget) api.current.wave(); }}>
      {words.map((w, wi) => (
        <span key={wi} aria-hidden="true">
          <span className="ui-jelly-text-word">{Array.from(w).map((ch, ci) => <span key={ci} data-j="" className="ui-jelly-text-ch">{ch}</span>)}</span>
          {wi < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  );
}

export function Demo() {
  return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100%', minHeight: 150, textAlign: 'center' }}>
      <JellyText as="h3" text="Wobble me" />
    </div>
  );
}
