'use client';
import { useState, type CSSProperties } from 'react';
import { Chips } from './_tu-three-chips';
import { clamp, css, glowSprite, layer, mixc, ridgePath, scale, useScene, WHITE, type Env, type RGB } from './_tu-three-kit';
import { drawTower, TOWER_KINDS, type TowerKind, type TowerStyle } from './_tu-three-towers';

export type TowerVariant = TowerKind | 'ensemble';
export const TOWER_VARIANTS: TowerVariant[] = ['ensemble', ...TOWER_KINDS];
export interface LandscapeTowersProps {
  /** One tower form, or `ensemble` for all five assembled across the landscape (default). */
  variant?: TowerVariant;
  /** Build each tower up from its foot when it appears (default true; still when reduced motion). */
  assemble?: boolean;
  className?: string;
  style?: CSSProperties;
}
interface Slot { kind: TowerKind; x: number; h: number; depth: number }
const ENSEMBLE: Slot[] = [
  { kind: 'pagoda', x: 0.17, h: 0.5, depth: 0.55 }, { kind: 'spire', x: 0.34, h: 0.42, depth: 0.35 }, { kind: 'minaret', x: 0.68, h: 0.56, depth: 0.2 },
  { kind: 'stupa', x: 0.5, h: 0.44, depth: 0.0 }, { kind: 'pharos', x: 0.86, h: 0.62, depth: 0.4 },
];
interface State { sky: HTMLCanvasElement; land: HTMLCanvasElement; slots: Slot[]; t0: number; sun: HTMLCanvasElement; tint: { hor: RGB; top: RGB; dark: RGB } }

function build(env: Env, variant: TowerVariant): State {
  const { w, h, dpr, pal } = env, dk: RGB = [0.03, 0.035, 0.07];
  const top = mixc(dk, pal.primary, env.dark ? 0.4 : 0.55), hor = mixc(pal.signal, [1, 0.78, 0.6], 0.4), dark = mixc(dk, pal.primary, 0.14);
  const by = h * 0.76;
  const sky = layer(w, h, dpr, (c) => {
    const g = c.createLinearGradient(0, 0, 0, h * 0.8); g.addColorStop(0, css(top)); g.addColorStop(0.75, css(mixc(top, hor, 0.8))); g.addColorStop(1, css(hor)); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { c.fillStyle = css(WHITE, 0.5 * Math.max(0, 1 - ((i * 37) % 100) / 60)); c.fillRect(((i * 97) % 100) / 100 * w, ((i * 53) % 100) / 100 * h * 0.35, 1, 1); }
    const sx = w * 0.5, sy = h * 0.6, R = h * 0.075, gl = c.createRadialGradient(sx, sy, R * 0.6, sx, sy, R * 7); gl.addColorStop(0, css(mixc(hor, WHITE, 0.4), 0.55)); gl.addColorStop(1, css(hor, 0)); c.fillStyle = gl; c.fillRect(0, 0, w, h);
    c.fillStyle = css(mixc(hor, WHITE, 0.7)); c.beginPath(); c.arc(sx, sy, R, 0, 6.3); c.fill();
    c.fillStyle = css(mixc(top, hor, 0.5), 0.35); for (let i = 0; i < 4; i++) c.fillRect(w * (0.05 + i * 0.27), h * (0.2 + (i % 2) * 0.1), w * 0.2, 2);
  });
  const land = layer(w, h * 1.0, dpr, (c) => {
    [[0.64, 0.12, 0.55, 3], [0.7, 0.1, 0.35, 4]].forEach(([y, a, k, sd]) => { c.fillStyle = css(mixc(hor, dark, k!)); ridgePath(c, w, h, h * y!, h * a!, sd!); c.fill(); });
    c.fillStyle = css(scale(dark, 1.15)); ridgePath(c, w, h, by, h * 0.06, 7); c.fill();
    const wg = c.createLinearGradient(0, by, 0, h); wg.addColorStop(0, css(mixc(hor, dark, 0.6))); wg.addColorStop(1, css(mixc(top, dark, 0.7))); c.fillStyle = wg; c.fillRect(0, by + h * 0.04, w, h);
  });
  const slots = variant === 'ensemble' ? ENSEMBLE : [{ kind: variant, x: 0.5, h: 0.62, depth: 0 }, { kind: 'pagoda' as TowerKind, x: 0, h: 0, depth: 0 }].slice(0, 1);
  return { sky, land, slots, t0: env.t, sun: glowSprite(hor), tint: { hor, top, dark } };
}

function frame(assemble: boolean) {
  return (c: CanvasRenderingContext2D, env: Env, s: State) => {
    const { w, h, t, px } = env, by = h * 0.76, { hor, top, dark } = s.tint;
    c.drawImage(s.sky, 0, 0, w, h);
    c.save(); c.translate(-px * 6, 0); c.drawImage(s.land, 0, 0, w, h); c.restore();
    const order = [...s.slots].sort((a, b) => b.depth - a.depth);
    const ground = (sl: Slot) => by - sl.depth * h * 0.04 + h * 0.012;
    const lamp = 0.65 + 0.15 * Math.sin(t * 0.5);
    const draw = (reflect: boolean) => order.forEach((sl, i) => {
      const H = Math.min(sl.h * h, w * 0.7) * (s.slots.length === 1 ? 1 : 0.95), x = w * sl.x - px * (4 + (1 - sl.depth) * 8) * (s.slots.length === 1 ? 0.3 : 1);
      const k = clamp(sl.depth, 0, 0.8), body = mixc(scale(dark, 0.9), hor, k * 0.8), st: TowerStyle = { body, roof: scale(body, 0.8), trim: mixc(body, WHITE, 0.14 + 0.1 * (1 - k)), lit: mixc(hor, WHITE, 0.45), lamp: lamp * (1 - k * 0.5), t };
      const idx = s.slots.indexOf(sl), p = !assemble || env.reduced ? 1 : clamp((t - s.t0 - 0.2 - idx * 0.55) / 1.8, 0, 1), e = 1 - Math.pow(1 - p, 3);
      void i;
      const y = reflect ? 0 : 0;
      drawTower(c, sl.kind, x, ground(sl) + y, H, st, p >= 1 ? 1 : Math.max(0.0001, e));
    });
    c.save(); c.beginPath(); c.rect(0, by - 4, w, h); c.clip(); c.translate(0, 2 * (by + h * 0.012)); c.scale(1, -1); c.globalAlpha = 0.3; draw(true); c.restore();
    const wv = c.createLinearGradient(0, by, 0, h); wv.addColorStop(0, css(hor, 0.0)); wv.addColorStop(0.15, css(mixc(top, hor, 0.5), 0.55)); wv.addColorStop(1, css(top, 0.8)); c.fillStyle = wv; c.fillRect(0, by + h * 0.012, w, h);
    c.strokeStyle = css(mixc(hor, WHITE, 0.5), 0.3); c.lineWidth = 1; c.beginPath();
    for (let i = 0; i < 16; i++) { const f = i / 15, y = by + h * (0.03 + f * f * 0.2), len = w * (0.04 + f * 0.1), x = ((i * 137.5 + t * (6 + f * 18)) % (w + len * 2)) - len; c.moveTo(x, y); c.lineTo(x + len, y); }
    c.stroke();
    draw(false);
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.25 + 0.05 * Math.sin(t); c.drawImage(s.sun, w * 0.5 - h * 0.5, h * 0.6 - h * 0.5, h, h); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    const vg = c.createRadialGradient(w / 2, h * 0.5, Math.min(w, h) * 0.45, w / 2, h * 0.5, Math.max(w, h) * 0.8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,8,.35)'); c.fillStyle = vg; c.fillRect(0, 0, w, h);
  };
}

/**
 * A dusk landscape where invented tower forms rise out of the haze: a tiered pagoda-like tower, a slender balconied minaret-like tower,
 * a stepped stupa-like mound with a stacked spire, a lighthouse-like tower with a sweeping beam and a corncob-like stacked spire.
 * `variant` shows one form, or all five as an `ensemble`. Towers build up from their foot, lamps flicker and the water mirrors them.
 * Generic forms, not depictions of real monuments. Decorative (aria-hidden); fills its parent; one still frame with reduced motion.
 */
export default function LandscapeTowers({ variant = 'ensemble', assemble = true, className, style }: LandscapeTowersProps) {
  const v = TOWER_VARIANTS.includes(variant) ? variant : 'ensemble';
  const { wrapRef, canvasRef } = useScene<State>((env) => build(env, v), frame(assemble), { key: v, fps: 30, maxPixels: 1.2e6 });
  return (
    <div ref={wrapRef} className={'ui-landscape-towers' + (className ? ' ' + className : '')} style={style} data-variant={v} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-landscape-towers-canvas" />
    </div>
  );
}

export function Demo() {
  const [v, setV] = useState<TowerVariant>('ensemble');
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 150, overflow: 'hidden', borderRadius: 'var(--radius, 12px)' }}>
      <LandscapeTowers variant={v} />
      <div className="ui-landscape-towers-bar"><Chips prefix="ui-landscape-towers" label="Tower form" value={v} options={TOWER_VARIANTS} onChange={setV} /></div>
    </div>
  );
}
