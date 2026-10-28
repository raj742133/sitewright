'use client';
import { useState, type CSSProperties } from 'react';
import { clamp, css, mixc, rng, useScene, WHITE, type Env, type RGB } from './_tu-three-kit';
import { Chips } from './_tu-three-chips';

export interface WarpFieldProps {
  /** Letters carried by the glyph tiles, cycled in order (default 'FORWARD'). */
  letters?: string;
  /** Flight speed multiplier (default 1; 0 freezes the field). */
  speed?: number;
  /** Streak density multiplier (default 1). */
  density?: number;
  /** Show the letter tiles (default true). */
  tiles?: boolean;
  className?: string;
  style?: CSSProperties;
}
interface Streak { th: number; r: number; a: number; sp: number; tint: number }
interface State { streaks: Streak[]; tiles: { th: number; r: number; a: number; roll: number; ch: string; sp: number }[]; bg: HTMLCanvasElement; tint: RGB[]; deep: RGB }

function build(env: Env, letters: string, density: number): State {
  const { w, h, dpr, pal } = env, r = rng(31), n = Math.round(clamp(Math.sqrt(w * h) * 0.8, 220, 700) * clamp(density, 0.2, 3));
  const streaks = Array.from({ length: n }, () => ({ th: r() * 6.2832, r: 0.14 + Math.pow(r(), 0.8) * 1.5, a: r(), sp: 0.7 + r() * 0.6, tint: r() < 0.14 ? 2 : r() < 0.3 ? 1 : 0 }));
  const chars = (letters.replace(/\s+/g, '') || 'FORWARD').toUpperCase().split('');
  const tn = Math.round(clamp(Math.sqrt(w * h) / 45, 7, 22));
  const tiles = Array.from({ length: tn }, (_, i) => ({ th: (i / tn) * 6.2832 * 2.7 + r() * 0.6, r: 0.52 + r() * 0.62, a: (i * 0.618) % 1, roll: (r() - 0.5) * 0.9, ch: chars[i % chars.length]!, sp: 0.8 + r() * 0.25 }));
  const deep = mixc([0.012, 0.016, 0.03], pal.primary, 0.13), tint = [mixc(WHITE, pal.primary, 0.18), mixc(pal.primary, WHITE, 0.45), mixc(pal.signal, WHITE, 0.4)];
  const bg = document.createElement('canvas'); bg.width = Math.round(w * dpr); bg.height = Math.round(h * dpr);
  const c = bg.getContext('2d');
  if (c) { c.scale(dpr, dpr); c.fillStyle = css(deep); c.fillRect(0, 0, w, h); const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.62); g.addColorStop(0, css(mixc(pal.signal, deep, 0.62), 0.55)); g.addColorStop(0.35, css(mixc(pal.primary, deep, 0.7), 0.3)); g.addColorStop(1, css(deep, 0)); c.fillStyle = g; c.fillRect(0, 0, w, h); }
  return { streaks, tiles, bg, tint, deep };
}
const frame = (speed: number, showTiles: boolean) => (c: CanvasRenderingContext2D, env: Env, s: State) => {
  const { w, h, t, px, py } = env, F = Math.min(w, h * 1.3) * 0.55, cx = w / 2 + px * w * 0.07, cy = h / 2 + py * h * 0.07, T = t * speed * 0.16;
  c.drawImage(s.bg, 0, 0, w, h);
  c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
  const buckets: number[][] = [[], [], [], [], [], []];
  for (const st of s.streaks) {
    const u = (st.a + T * st.sp) % 1, z = 1 - u, zz = 0.015 + z * z * 1.4, L = (0.006 + speed * 0.02 * (1 - z * 0.4)) * st.sp, z0 = 0.015 + Math.max(0, z + L) ** 2 * 1.4;
    const k1 = (F * 0.1) / zz, k0 = (F * 0.1) / z0, x = Math.cos(st.th) * st.r, y = Math.sin(st.th) * st.r, sx = cx + x * k1, sy = cy + y * k1;
    if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) continue;
    const al = clamp(u * 3, 0, 1) * clamp((1 - u) * 6, 0, 1) * (0.25 + 0.75 * u), b = st.tint * 2 + (u > 0.85 ? 1 : 0);
    buckets[b]!.push(cx + x * k0, cy + y * k0, sx, sy, al, 0.5 + u * 1.4);
  }
  buckets.forEach((q, b) => {
    if (!q.length) return;
    for (let lv = 0; lv < 3; lv++) {
      c.strokeStyle = css(s.tint[b >> 1]!, 0.35 + lv * 0.3); c.beginPath();
      for (let i = 0; i < q.length; i += 6) { if (Math.min(2, Math.floor(q[i + 4]! * 3)) !== lv) continue; c.lineWidth = q[i + 5]!; c.moveTo(q[i]!, q[i + 1]!); c.lineTo(q[i + 2]!, q[i + 3]!); }
      c.stroke();
    }
  });
  c.globalCompositeOperation = 'source-over';
  if (showTiles) {
    const list = s.tiles.map((tl) => { const u = (tl.a + T * 0.55 * tl.sp) % 1, z = 1 - u, zz = 0.05 + z * z * 1.6; return { tl, u, zz, k: (F * 0.1) / zz }; }).sort((a, b) => b.zz - a.zz);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    for (const { tl, u, k } of list) {
      const x = cx + Math.cos(tl.th + T * 0.12) * tl.r * k, y = cy + Math.sin(tl.th + T * 0.12) * tl.r * k, size = 0.17 * k;
      if (size < 6 || x < -size * 1.4 || x > w + size * 1.4 || y < -size * 1.4 || y > h + size * 1.4) continue;
      const a = clamp(u * 4, 0, 1) * clamp((1 - u) * 5, 0, 1) * (0.2 + 0.8 * u);
      c.save(); c.translate(x, y); c.rotate(tl.roll + T * 0.2 * (tl.sp - 0.9)); c.globalAlpha = a;
      const r = size * 0.16, hs = size / 2;
      c.fillStyle = css(mixc(s.deep, s.tint[1]!, 0.18)); c.strokeStyle = css(s.tint[tl.ch.charCodeAt(0) % 3 === 0 ? 2 : 1]!, 0.9); c.lineWidth = Math.max(1, size * 0.03);
      c.beginPath(); c.roundRect(-hs, -hs, size, size, r); c.fill(); c.stroke();
      c.fillStyle = css(WHITE, 0.95); c.font = `700 ${size * 0.58}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`; c.fillText(tl.ch, 0, size * 0.04);
      c.restore();
    }
    c.globalAlpha = 1;
  }
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.2); g.addColorStop(0, css(mixc(WHITE, s.tint[2]!, 0.4), 0.28)); g.addColorStop(1, css(WHITE, 0)); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(0, 0, w, h); c.globalCompositeOperation = 'source-over';
  
};

/**
 * A warp tunnel: additive light streaks rush out of a vanishing point while keycap-like letter tiles fly past in perspective, tinted from the host's primary and signal.
 * The pointer steers the vanishing point (touch gets an idle sway). Decorative (aria-hidden); always a deep dark field; fills its parent; one still frame with reduced motion.
 */
export default function WarpField({ letters = 'FORWARD', speed = 1, density = 1, tiles = true, className, style }: WarpFieldProps) {
  const { wrapRef, canvasRef } = useScene<State>((env) => build(env, letters, density), frame(clamp(speed, 0, 4), tiles), { key: letters + density, fps: 30, maxPixels: 1.2e6 });
  return (
    <div ref={wrapRef} className={'ui-warp-field' + (className ? ' ' + className : '')} style={style} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-warp-field-canvas" />
    </div>
  );
}

export function Demo() {
  const [sp, setSp] = useState<'cruise' | 'warp'>('cruise');
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 150, overflow: 'hidden', borderRadius: 'var(--radius, 12px)' }}>
      <WarpField speed={sp === 'warp' ? 2.6 : 1} />
      <div className="ui-warp-field-bar"><Chips prefix="ui-warp-field" label="Speed" value={sp} options={['cruise', 'warp'] as const} onChange={setSp} /></div>
    </div>
  );
}
