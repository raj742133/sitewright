'use client';
import { useEffect, useRef, type CSSProperties } from 'react';
import { useBg2D, type Bg2DOpts, type Env2D, type Sketch } from './_bg-a';
import { useReducedMotion } from './_t2';

/* Shared plumbing for the bg-e backgrounds: a Canvas2D wrapper that also collects taps (pointerdown on the parent),
   a deterministic hash, and one GLSL helper that composes glow onto a base in both themes. */

/** A tap or click on the parent, in px relative to the background. */
export interface Tap { x: number; y: number }

/** Deterministic hash of two integers (and a seed) to 0..1: no Math.random anywhere near render. */
export function hash2(i: number, j: number, s = 0): number {
  let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(s | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export const mod = (a: number, n: number) => ((a % n) + n) % n;

export interface Canvas2DBgProps {
  /** Base class (`ui-<id>`); the canvas gets `<cls>-canvas`. */
  cls: string;
  /** Runs once per canvas; `taps` is a queue the sketch drains each frame (only filled when `taps` is enabled). */
  make: (e: Env2D, taps: Tap[]) => Sketch;
  opts?: Bg2DOpts;
  /** Collect pointerdown taps on the parent element. */
  taps?: boolean;
  className?: string;
  style?: CSSProperties;
}

/** The common shell: a positioned wrapper, a canvas and a CSS fallback that shows only if 2D is unavailable. */
export function Canvas2DBg({ cls, make, opts, taps = false, className, style }: Canvas2DBgProps) {
  const queue = useRef<Tap[]>([]);
  const reduced = useReducedMotion();
  const { wrapRef, canvasRef, ready } = useBg2D((e) => make(e, queue.current), opts);
  useEffect(() => {
    const wrap = wrapRef.current;
    const host = wrap?.parentElement;
    if (!taps || reduced || !wrap || !host) return;
    const onDown = (ev: PointerEvent) => {
      if (!ev.isPrimary) return;
      const r = wrap.getBoundingClientRect();
      const q = queue.current;
      q.push({ x: ev.clientX - r.left, y: ev.clientY - r.top });
      if (q.length > 8) q.shift();
    };
    host.addEventListener('pointerdown', onDown, { passive: true });
    return () => host.removeEventListener('pointerdown', onDown);
  }, [taps, reduced, wrapRef]);
  return (
    <div ref={wrapRef} className={cls + (className ? ' ' + className : '')} style={style} data-ready={ready} aria-hidden="true">
      <canvas ref={canvasRef} className={cls + '-canvas'} />
    </div>
  );
}

/** GLSL: `bgeCompose(base, acc)` lays additive glow `acc` over `base`; glows on dark surfaces, inks onto light ones. Needs uSurf. */
export const GLSL_COMPOSE = `
vec3 bgeCompose(vec3 base, vec3 acc){
  float dk=step(dot(uSurf,vec3(.3333)),.5);
  float m=max(acc.r,max(acc.g,acc.b));
  float a=clamp(m,0.,1.);
  vec3 hue=acc/max(m,.001);
  vec3 col=mix(base,hue*mix(.82,1.,dk),a);
  return col+dk*acc*.22;
}
`;
