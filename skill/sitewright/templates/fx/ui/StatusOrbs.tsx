'use client';
import { useMemo, type CSSProperties } from 'react';
import { mix, rgba, type RGB } from './_t2';
import { useCanvas2D, type CanvasEnv } from './_tu-ui-kit';

export type OrbState = 'thinking' | 'uploading' | 'listening' | 'idle';
export type OrbTone = 'primary' | 'signal' | 'aurora' | 'mono';
export interface StatusOrbProps {
  /** What the orb is doing: a pulse wave over the surface (thinking), dots rolling upward (uploading), an audio-like ripple around the equator (listening) or a calm slow turn (idle). */
  state?: OrbState;
  /** `sm` is 20px (inline with text), `md` is 56px. */
  size?: 'sm' | 'md';
  /** Colour style, all from host tokens. */
  tone?: OrbTone;
  /** Accessible name; defaults to the state ("Thinking"...). */
  label?: string;
  /** Render as a polite live status region so assistive tech announces the label. */
  announce?: boolean;
  className?: string;
  style?: CSSProperties;
}

const NAMES: Record<OrbState, string> = { thinking: 'Thinking', uploading: 'Uploading', listening: 'Listening', idle: 'Idle' };
const GOLD = Math.PI * (3 - Math.sqrt(5));

/** A small orb made of dots (a Fibonacci sphere) that animates to show an activity state. Drawn on a Canvas 2D at 20px or 56px; reduced motion shows one still pose. */
export default function StatusOrb({ state = 'thinking', size = 'md', tone = 'primary', label, announce = false, className, style }: StatusOrbProps) {
  const px = size === 'sm' ? 20 : 56;
  const N = size === 'sm' ? 30 : 110;
  const base = useMemo(() => Array.from({ length: N }, (_, i) => { const y = 1 - ((i + 0.5) / N) * 2, r = Math.sqrt(1 - y * y), a = i * GOLD; return [Math.cos(a) * r, y, Math.sin(a) * r] as [number, number, number]; }), [N]);
  const draw = (e: CanvasEnv) => {
    const { ctx, w, h, t, pal } = e;
    const R = Math.min(w, h) * (size === 'sm' ? 0.4 : 0.38);
    const dot = size === 'sm' ? 1.05 : 1.7;
    const c0: RGB = tone === 'signal' ? pal.signal : tone === 'mono' ? pal.ink : pal.primary;
    const c1: RGB = tone === 'aurora' ? pal.signal : c0;
    const ang = state === 'idle' ? t * 0.35 : state === 'listening' ? t * 0.5 : state === 'thinking' ? t * 0.9 : t * 0.4;
    const roll = state === 'uploading' ? t * 1.7 : 0.35;
    const ca = Math.cos(ang), sa = Math.sin(ang), cr = Math.cos(roll), sr = Math.sin(roll);
    if (size === 'md') {
      const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, R * 1.35);
      g.addColorStop(0, rgba(c0, 0.2)); g.addColorStop(1, rgba(c0, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    const pts = base.map(([x0, y0, z0]) => {
      const x = x0 * ca + z0 * sa, z1 = -x0 * sa + z0 * ca;
      const y = y0 * cr - z1 * sr, z = y0 * sr + z1 * cr;
      let amp = 0, k = 1;
      if (state === 'thinking') { const wv = Math.sin(y0 * 3.2 - t * 3.6) * 0.5 + 0.5; amp = wv * wv; k = 1 + amp * 0.22; }
      else if (state === 'uploading') { const wv = Math.sin(y0 * 2.4 - t * 3.2) * 0.5 + 0.5; amp = wv * wv * wv; k = 1 + amp * 0.1; }
      else if (state === 'listening') { const th = Math.atan2(z0, x0); const a = Math.abs(Math.sin(th * 3 + t * 3.1)) * Math.abs(Math.sin(t * 1.7 + th)); amp = a * (1 - Math.abs(y0) * 0.8); k = 1 + amp * 0.34; }
      else amp = 0.15;
      return { x: x * k, y: y * k, z, amp, my: y0 };
    }).sort((a, b) => a.z - b.z);
    for (const p of pts) {
      const depth = (p.z + 1) / 2;
      const col = tone === 'aurora' ? mix(c0, c1, (p.my + 1) / 2) : c0;
      const r = dot * (0.55 + 0.5 * depth + 0.6 * p.amp);
      ctx.fillStyle = rgba(state === 'idle' ? col : mix(col, [255, 255, 255], p.amp * 0.35), 0.28 + 0.5 * depth + 0.3 * p.amp > 1 ? 1 : 0.28 + 0.5 * depth + 0.3 * p.amp);
      ctx.beginPath(); ctx.arc(w / 2 + p.x * R, h / 2 - p.y * R, r, 0, 6.283); ctx.fill();
    }
  };
  const { canvasRef } = useCanvas2D(draw, { staticT: 1.7 });
  const name = label ?? NAMES[state];
  return (
    <span className={`ui-status-orbs-root ui-status-orbs-${size} ${className ?? ''}`} style={{ width: px, height: px, ...style }} role={announce ? 'status' : 'img'} aria-label={announce ? undefined : name}>
      <canvas ref={canvasRef} className="ui-status-orbs-cv" aria-hidden="true" />
      {announce && <span className="ui-status-orbs-sr">{name}</span>}
    </span>
  );
}

const SET: { state: OrbState; tone: OrbTone; text: string }[] = [
  { state: 'thinking', tone: 'primary', text: 'Thinking' },
  { state: 'uploading', tone: 'signal', text: 'Uploading' },
  { state: 'listening', tone: 'aurora', text: 'Listening' },
  { state: 'idle', tone: 'mono', text: 'Idle' },
];

export function Demo() {
  return (
    <div className="ui-status-orbs-demo">
      <div className="ui-status-orbs-grid">
        {SET.map((s) => (
          <div key={s.state} className="ui-status-orbs-cell">
            <StatusOrb state={s.state} tone={s.tone} size="md" label={s.text} />
            <span className="ui-status-orbs-cap">{s.text}</span>
          </div>
        ))}
      </div>
      <ul className="ui-status-orbs-inline">
        {SET.slice(0, 3).map((s) => (
          <li key={s.state}><StatusOrb state={s.state} tone={s.tone === 'aurora' ? 'primary' : s.tone} size="sm" label={s.text} /><span>{s.text}...</span></li>
        ))}
      </ul>
    </div>
  );
}
