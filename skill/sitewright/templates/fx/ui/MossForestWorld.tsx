'use client';
import type { CSSProperties } from 'react';
import { clamp, css, layer, mixc, rng, scale, useScene, type Env, type RGB } from './_tu-three-kit';
import { FOREST_VARIANTS, SEASONS, fern, glowSprite, leafPath, makeMotes, paintArch, paintGround, paintTrunks, tones, type ForestVariant, type Mote, type Tones } from './_tu-three-forest';

export interface MossForestWorldProps {
  /** Season: green moss with pollen, spring blossoms, autumn leaves or winter snow (default 'moss'). */
  variant?: ForestVariant;
  /** Multiplier for drifting particles (default 1, 0 = none). */
  density?: number;
  className?: string;
  style?: CSSProperties;
}

interface State { v: ForestVariant; T: Tones; L: Record<string, HTMLCanvasElement>; W2: number; motes: Mote[]; glow: HTMLCanvasElement; ferns: { x: number; y: number; s: number; ph: number; seed: number; k: number }[]; vig: HTMLCanvasElement; cs: number }

function build(env: Env, v: ForestVariant, density: number): State {
  const { w, h, dpr } = env, T = tones(env, v), S = SEASONS[v], W2 = Math.round(w * 1.14), cs = clamp(Math.min(w, h * 1.4) / 640, 0.55, 1.7);
  const L: Record<string, HTMLCanvasElement> = {};
  L.sky = layer(w, h, dpr, (c) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, css(T.sky0)); g.addColorStop(0.7, css(T.sky1)); g.addColorStop(1, css(T.sky0)); c.fillStyle = g; c.fillRect(0, 0, w, h);
    const r = c.createRadialGradient(w * 0.5, h * 0.52, 0, w * 0.5, h * 0.52, w * 0.34); r.addColorStop(0, css(T.glow, env.dark ? 0.85 : 0.95)); r.addColorStop(1, css(T.glow, 0)); c.fillStyle = r; c.fillRect(0, 0, w, h);
  });
  L.far = layer(W2, h, dpr, (c) => paintTrunks(c, W2, h, T, 11, 9, 14 * cs, 34 * cs, 0.62, S.frost));
  L.mid = layer(W2, h, dpr, (c) => { paintTrunks(c, W2, h, T, 23, 5, 36 * cs, 64 * cs, 0.3, S.frost); paintGround(c, W2, h, T, 5, h * 0.8, 10 * cs, 0.1, 30, S.frost); });
  L.arch = layer(W2, h, dpr, (c) => paintArch(c, W2, h, T, 31, S.frost));
  L.front = layer(W2, h, dpr, (c) => {
    paintGround(c, W2, h, T, 41, h * 0.86, 12 * cs, 0.9, 46, S.frost);
    const r = rng(77);
    for (let i = 0; i < 70; i++) {
      const x = r() * W2, y = h * 0.88 + r() * h * 0.12, s = (1.5 + r() * 3) * cs;
      if (v === 'autumn') { c.save(); c.translate(x, y); c.rotate(r() * 6); c.fillStyle = css(mixc(T.accent, T.accent2, r()), 0.85); leafPath(c, s * 2.4); c.fill(); c.restore(); }
      else if (v === 'spring') { c.fillStyle = css(r() < 0.5 ? T.accent : T.accent2, 0.95); c.beginPath(); c.arc(x, y, s, 0, 6.3); c.fill(); }
      else if (v === 'moss') { c.fillStyle = css(mixc(T.accent, [1, 1, 1], 0.2), 0.8); c.beginPath(); c.arc(x, y, s * 0.6, 0, 6.3); c.fill(); }
    }
  });
  L.vig = layer(w, h, dpr, (c) => { const g = c.createRadialGradient(w / 2, h * 0.5, Math.min(w, h) * 0.3, w / 2, h * 0.5, Math.max(w, h) * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, env.dark ? 'rgba(0,0,0,.6)' : css(scale(T.sky0, 0.55), 0.55)); c.fillStyle = g; c.fillRect(0, 0, w, h); });
  const r = rng(5);
  const ferns = Array.from({ length: 11 }, (_, i) => { const k = r(); return { x: ((i + 0.5) / 11) * W2 + (r() - 0.5) * 60, y: h * (0.83 + k * 0.17), s: (0.55 + k * 0.9) * cs, ph: r() * 6, seed: 100 + i, k }; });
  return { v, T, L, W2, motes: makeMotes(Math.round(46 * density * (S.fall === 'none' ? 1.2 : 1)), 9), glow: glowSprite(mixc(T.glow, [1, 1, 0.8], 0.4)), ferns, vig: L.vig!, cs };
}

function frame(c: CanvasRenderingContext2D, env: Env, s: State) {
  const { w, h, t, px, py } = env, S = SEASONS[s.v], off = (s.W2 - w) / 2, T = s.T;
  const draw = (k: string, par: number, dy = 0) => c.drawImage(s.L[k]!, 0, 0, s.L[k]!.width, s.L[k]!.height, -off - px * par, dy - py * par * 0.3, s.W2, h);
  c.drawImage(s.L.sky!, 0, 0, w, h);
  draw('far', 6); draw('mid', 14);
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const x = w * (0.2 + i * 0.2) - px * 18, a = (0.05 + 0.03 * Math.sin(t * 0.4 + i * 1.7)) * (env.dark ? 1.3 : 0.7), wd = w * 0.07;
    const g = c.createLinearGradient(x, 0, x + h * 0.4, h); g.addColorStop(0, css(T.glow, a)); g.addColorStop(1, css(T.glow, 0));
    c.fillStyle = g; c.beginPath(); c.moveTo(x - wd, 0); c.lineTo(x + wd, 0); c.lineTo(x + h * 0.45 + wd * 2, h * 0.9); c.lineTo(x + h * 0.45 - wd, h * 0.9); c.closePath(); c.fill();
  }
  c.globalCompositeOperation = 'source-over';
  draw('arch', 24); draw('front', 38);
  const col = mixc(T.moss, T.mossLit, 0.5), stem = scale(T.moss, 0.7);
  for (const f of s.ferns) {
    const sw = Math.sin(t * 0.9 + f.ph) * 0.05 + px * 0.05 * f.k;
    fern(c, f.x - off - px * (30 + f.k * 24), f.y - py * 8 * f.k, f.s, sw, mixc(col, T.sky0, (1 - f.k) * 0.4), stem, f.seed);
  }
  for (const m of s.motes) {
    const fall = S.fall;
    const spd = fall === 'none' ? 0.012 : 0.05;
    const yy = fall === 'none' ? (m.y + t * -spd * m.sp * 0.4 + Math.sin(t * 0.5 + m.ph) * 0.02 + 2) % 1 : (m.y + t * spd * m.sp) % 1;
    const xx = (m.x + Math.sin(t * 0.4 * m.sp + m.ph) * 0.04 + t * (fall === 'none' ? 0.004 : 0.012) * m.sp + 1) % 1;
    const X = xx * w - px * 40 * m.z, Y = yy * h, sz = m.size * s.cs;
    if (fall === 'none' || (fall === 'snow' && m.z > 0.8) ) {
      c.globalAlpha = 0.5 + 0.5 * Math.sin(t * 1.3 * m.sp + m.ph) ** 2; c.globalCompositeOperation = 'lighter';
      c.drawImage(s.glow, X - 9 * sz, Y - 9 * sz, 18 * sz, 18 * sz);
    } else if (fall === 'snow') { c.globalAlpha = 0.85; c.fillStyle = '#fff'; c.beginPath(); c.arc(X, Y, 1.3 * sz * m.z + 0.5, 0, 6.3); c.fill(); }
    else {
      c.globalAlpha = 0.9; c.save(); c.translate(X, Y); c.rotate(m.rot + t * m.sp * 1.4); c.scale(1, Math.abs(Math.cos(t * m.sp * 2 + m.ph)) * 0.8 + 0.2);
      c.fillStyle = css(fall === 'petal' ? (m.ph > 3 ? T.accent : T.accent2) : mixc(T.accent, T.accent2, m.ph / 6.3));
      if (fall === 'leaf') leafPath(c, 5.5 * sz); else { c.beginPath(); c.ellipse(0, 0, 4.5 * sz, 2.6 * sz, 0, 0, 6.3); }
      c.fill(); c.restore();
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  c.drawImage(s.vig, 0, 0, w, h);
}

/**
 * A procedural mossy forest glade: layered trunks, light shafts, a moss-capped root arch, ferns that sway, and drifting pollen,
 * blossom petals, autumn leaves or snow depending on `variant`. The pointer shifts the layers for parallax (touch gets an idle sway).
 * Decorative (aria-hidden); fills its parent; one still frame with reduced motion.
 */
export default function MossForestWorld({ variant = 'moss', density = 1, className, style }: MossForestWorldProps) {
  const v = FOREST_VARIANTS.includes(variant) ? variant : 'moss';
  const { wrapRef, canvasRef } = useScene<State>((env) => build(env, v, clamp(density, 0, 3)), frame, { key: v + ':' + density, fps: 30, maxPixels: 1.2e6 });
  return (
    <div ref={wrapRef} className={'ui-moss-forest-world' + (className ? ' ' + className : '')} style={style} data-variant={v} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-moss-forest-world-canvas" />
    </div>
  );
}

export function Demo() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 150, overflow: 'hidden', borderRadius: 'var(--radius, 12px)' }}>
      <MossForestWorld />
    </div>
  );
}
