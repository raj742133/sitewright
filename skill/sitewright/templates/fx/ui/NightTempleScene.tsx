'use client';
import type { CSSProperties } from 'react';
import { clamp, css, glowSprite, layer, mixc, ridgePath, rng, scale, useScene, type Env, type RGB } from './_tu-three-kit';
import { hall, nightTones, paintNight, pine, type NightTones } from './_tu-three-temple';
import { drawTower } from './_tu-three-towers';

export interface NightTempleSceneProps {
  /** Rain intensity 0..1 (default 0.6). */
  rain?: number;
  /** Mist density 0..1 (default 0.7). */
  mist?: number;
  /** Lantern glow strength 0..1 (default 0.8). */
  glow?: number;
  className?: string;
  style?: CSSProperties;
}
interface State { T: NightTones; bg: HTMLCanvasElement; fg: HTMLCanvasElement; halo: HTMLCanvasElement; mistTile: HTMLCanvasElement; lanterns: { x: number; y: number; s: number }[] }
const hash = (n: number) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

function build(env: Env): State {
  const { w, h, dpr } = env, T = nightTones(env);
  const px = w * 0.64, by = h * 0.585, H = h * 0.48;
  const fg = layer(w, h, dpr, (c) => {
    c.fillStyle = css(T.ridge[3]!); ridgePath(c, w, h, h * 0.93, h * 0.07, 40); c.fill();
    const col = scale(T.ridge[3]!, 0.55), r = rng(8);
    for (let i = 0; i < 6; i++) pine(c, w * (0.02 + i * 0.05) + r() * 8, h * (0.98 - (i % 2) * 0.03), h * (0.42 - i * 0.04) * (0.9 + r() * 0.2), col);
    for (let i = 0; i < 3; i++) pine(c, w * (0.94 - i * 0.06), h * (0.99 - (i % 2) * 0.03), h * (0.5 - i * 0.07), col);
    const wg = c.createLinearGradient(0, h * 0.9, 0, h); wg.addColorStop(0, css(mixc(T.sky1, [0, 0, 0], 0.4), 0)); wg.addColorStop(1, css(mixc(T.sky0, [0, 0, 0], 0.5), 0.55)); c.fillStyle = wg; c.fillRect(0, h * 0.9, w, h * 0.1);
  });
  const lanterns = Array.from({ length: 8 }, (_, i) => { const u = i / 7; return { x: px + H * 0.2 + u * (w * 0.18) + Math.sin(u * 5) * 6, y: by + 2 + u * (h * 0.31), s: 0.7 + u * 0.9 }; });
  const mistTile = layer(512, 120, 1, (c) => {
    const r = rng(2);
    for (let i = 0; i < 16; i++) { const x = r() * 512, y = 40 + r() * 40, rad = 40 + r() * 50; for (const dx of [0, -512, 512]) { const g = c.createRadialGradient(x + dx, y, 0, x + dx, y, rad); g.addColorStop(0, css(T.mist, 0.5)); g.addColorStop(1, css(T.mist, 0)); c.fillStyle = g; c.fillRect(x + dx - rad, y - rad, rad * 2, rad * 2); } }
  });
  return { T, bg: paintNight(env, T), fg, halo: glowSprite(T.lamp), mistTile, lanterns };
}

function frame(c: CanvasRenderingContext2D, env: Env, s: State, o: { rain: number; mist: number; glow: number }) {
  const { w, h, t, px, py } = env, T = s.T, ox = -px * 6;
  c.drawImage(s.bg, 0, 0, w, h);
  const mist = (y: number, k: number, a: number) => {
    const tw = w * 1.6, th = tw * (120 / 512), sh = (t * 7 * k) % tw;
    c.globalAlpha = a * o.mist;
    for (let x = -sh - tw; x < w; x += tw) c.drawImage(s.mistTile, x + ox * k, y - th / 2, tw, th);
    c.globalAlpha = 1;
  };
  mist(h * 0.66, 1, 0.5);
  const by = h * 0.585, H = h * 0.48, gx = w * 0.64;
  c.save(); c.translate(ox * 1.4, -py * 3);
  const lamp = clamp(o.glow, 0, 1);
  hall(c, gx - H * 0.5, by, H * 0.5, T, lamp, t);
  drawTower(c, 'pagoda', gx + H * 0.12, by, H * 0.9, { body: T.body, roof: T.roof, trim: T.trim, lit: T.lamp, lamp, t });
  c.globalCompositeOperation = 'lighter';
  const flick = (i: number) => 0.7 + 0.3 * Math.sin(t * 5 + i * 2.1) * Math.sin(t * 3.3 + i);
  for (let i = 0; i < 5; i++) { const lx = gx + H * 0.12 - H * 0.2 + i * H * 0.1, ly = by - H * (0.14 + (i % 2) * 0.12), r = H * 0.09; c.globalAlpha = lamp * 0.6 * flick(i); c.drawImage(s.halo, lx - r, ly - r, r * 2, r * 2); }
  s.lanterns.forEach((l, i) => { const r = 16 * l.s * (h / 300 + 0.5); c.globalAlpha = lamp * 0.85 * flick(i + 4); c.drawImage(s.halo, l.x - r, l.y - r, r * 2, r * 2); });
  c.restore(); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  s.lanterns.forEach((l) => { c.fillStyle = css(T.trim); c.fillRect(l.x - 1, l.y, 2, 8 * l.s); c.fillStyle = css(T.lamp, 0.9 * lamp); c.fillRect(l.x - 3 * l.s, l.y - 5 * l.s, 6 * l.s, 6 * l.s); });
  mist(h * 0.8, -1.4, 0.42);
  c.drawImage(s.fg, 0, 0, w, h);
  c.globalCompositeOperation = 'lighter';
  for (const l of s.lanterns.slice(3)) { const g = c.createLinearGradient(0, h * 0.93, 0, h); g.addColorStop(0, css(T.lamp, 0.0)); g.addColorStop(1, css(T.lamp, 0.12 * lamp)); c.fillStyle = g; c.fillRect(l.x - 2 + Math.sin(t * 2 + l.x) * 2, h * 0.93, 4, h * 0.07); }
  c.globalCompositeOperation = 'source-over';
  const n = Math.round(160 * clamp(o.rain, 0, 1) * Math.min(1.6, w / 520 + 0.5));
  c.lineCap = 'round';
  for (let pass = 0; pass < 2; pass++) {
    c.strokeStyle = pass ? 'rgba(200,215,255,.34)' : 'rgba(190,205,245,.16)'; c.lineWidth = pass ? 1.2 : 0.8; c.beginPath();
    for (let i = pass; i < n; i += 2) {
      const sp = (pass ? 520 : 340) * (0.85 + hash(i) * 0.3), len = (pass ? 15 : 9) * (0.8 + hash(i + 9) * 0.5), cyc = h + 40;
      const y = ((hash(i + 3) * cyc + t * sp) % cyc) - 20, x = ((hash(i + 1) * (w + 80) - t * sp * 0.18 - 40) % (w + 80) + w + 80) % (w + 80) - 20;
      c.moveTo(x, y); c.lineTo(x - len * 0.18, y - len);
    }
    c.stroke();
  }
  c.strokeStyle = 'rgba(200,215,255,.3)'; c.lineWidth = 1;
  const nr = Math.round(10 * o.rain);
  for (let i = 0; i < nr; i++) { const ph = t * 0.9 + i * 0.37, id = Math.floor(ph), f = ph - id, rx = hash(id * 13 + i) * w, ry = h * (0.945 + hash(id * 7 + i * 3) * 0.045); c.globalAlpha = (1 - f) * 0.5; c.beginPath(); c.ellipse(rx, ry, f * 16 + 1, f * 4 + 0.4, 0, 0, 6.3); c.stroke(); }
  c.globalAlpha = 1;
  const vg = c.createRadialGradient(w / 2, h * 0.5, Math.min(w, h) * 0.35, w / 2, h * 0.5, Math.max(w, h) * 0.8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,8,.45)'); c.fillStyle = vg; c.fillRect(0, 0, w, h);
}

/**
 * A procedural night temple: a pagoda and hall silhouetted on a mountain under a moon, with layered ridges, drifting mist, rain, flickering lantern glow and ripples on wet ground.
 * The pointer shifts the layers slightly (touch gets an idle sway). Decorative (aria-hidden); fills its parent; one still frame with reduced motion.
 * All forms are invented and generic.
 */
export default function NightTempleScene({ rain = 0.6, mist = 0.7, glow = 0.8, className, style }: NightTempleSceneProps) {
  const opts = { rain, mist, glow };
  const { wrapRef, canvasRef } = useScene<State>(build, (c, e, s) => frame(c, e, s, opts), { fps: 30, maxPixels: 1.2e6 });
  return (
    <div ref={wrapRef} className={'ui-night-temple-scene' + (className ? ' ' + className : '')} style={style} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-night-temple-scene-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 150, overflow: 'hidden', borderRadius: 'var(--radius, 12px)' }}>
      <NightTempleScene />
    </div>
  );
}
