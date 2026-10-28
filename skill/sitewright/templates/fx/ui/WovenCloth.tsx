'use client';
import { useState, type CSSProperties } from 'react';
import { Chips } from './_tu-three-chips';
import { clamp, useScene, type Env } from './_tu-three-kit';
import { drawCloth, fabricTones, makeCloth, stepCloth, weaveTexture, WEAVES, type Cloth, type Fabric, type Ptr, type Weave } from './_tu-three-cloth';

export type { Weave } from './_tu-three-cloth';
export interface WovenClothProps {
  /** Printed text; use \n for line breaks (default 'Thread by\nthread'). */
  text?: string;
  /** Weave pattern: plain, twill or basket (default 'plain'). */
  weave?: Weave;
  /** Wind strength 0..2 (default 1). */
  wind?: number;
  className?: string;
  style?: CSSProperties;
}
interface State { cl: Cloth; tex: HTMLCanvasElement; sk: number; F: Fabric; ptr: Ptr; acc: number; t: number; lx: number; ly: number }

function build(env: Env, o: { text: string; weave: Weave; wind: number }, host: HTMLElement | null): State {
  const cl = makeCloth(env.w, env.h), F = fabricTones(env), sk = clamp(env.dpr * 0.85, 0.7, 1.4);
  const font = host ? getComputedStyle(host).fontFamily || 'system-ui, sans-serif' : 'system-ui, sans-serif';
  const s: State = { cl, F, sk, tex: weaveTexture(cl.cw, cl.ch, sk, F, o.weave, o.text, font), ptr: { x: -999, y: -999, vx: 0, vy: 0, on: false }, acc: 0, t: 0, lx: -999, ly: -999 };
  for (let i = 0; i < 260; i++) stepCloth(cl, 3 + i / 60, 1 / 60, s.ptr, o.wind * clamp(cl.cw / 760, 0.25, 1), 90);
  return s;
}

/**
 * A hanging woven cloth: a verlet cloth simulation (gravity, travelling wind, distance constraints) whose procedurally woven threads carry printed text.
 * Move the pointer over it to dent and drag the weave; touch screens get idle wind gusts. Shading follows the surface normal.
 * Decorative (aria-hidden); fills its parent; with reduced motion it settles once and stays still.
 */
export default function WovenCloth({ text = 'Thread by\nthread', weave = 'plain', wind = 1, className, style }: WovenClothProps) {
  const o = { text, weave: WEAVES.includes(weave) ? weave : 'plain', wind: clamp(wind, 0, 2) };
  const { wrapRef, canvasRef } = useScene<State>((env, ctx) => build(env, o, ctx.canvas.parentElement), (c, env, s) => {
    const { w, h } = env;
    c.clearRect(0, 0, w, h);
    if (!env.reduced) {
      s.acc += Math.min(env.dt, 0.05); const R = Math.min(w, h) * 0.17;
      const mx = (env.px * 0.5 + 0.5) * w, my = (env.py * 0.5 + 0.5) * h;
      if (!env.coarse && s.lx > -900) { s.ptr.vx += ((mx - s.lx) / Math.max(env.dt, 0.008) - s.ptr.vx) * 0.3; s.ptr.vy += ((my - s.ly) / Math.max(env.dt, 0.008) - s.ptr.vy) * 0.3; }
      s.lx = mx; s.ly = my; s.ptr.x = mx; s.ptr.y = my; s.ptr.on = !env.coarse && Math.abs(env.px) < 1.01 && Math.abs(env.py) < 1.01;
      let k = 0;
      while (s.acc >= 1 / 60 && k++ < 3) { s.t += 1 / 60; stepCloth(s.cl, s.t + 6, 1 / 60, s.ptr, o.wind * clamp(s.cl.cw / 760, 0.25, 1), R); s.acc -= 1 / 60; }
      if (k === 4) s.acc = 0;
    }
    drawCloth(c, s.cl, s.tex, s.sk, w, h, env.dpr, null);
  }, { key: text + o.weave, fps: 30, maxPixels: 1.1e6 });
  return (
    <div ref={wrapRef} className={'ui-woven-cloth' + (className ? ' ' + className : '')} style={style} data-weave={o.weave} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-woven-cloth-canvas" />
    </div>
  );
}

export function Demo() {
  const [wv, setWv] = useState<Weave>('plain');
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 150, overflow: 'hidden', borderRadius: 'var(--radius, 12px)' }}>
      <WovenCloth weave={wv} />
      <div className="ui-woven-cloth-bar"><Chips prefix="ui-woven-cloth" label="Weave" value={wv} options={WEAVES} onChange={setWv} /></div>
    </div>
  );
}
