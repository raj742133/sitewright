'use client';
import type { CSSProperties } from 'react';
import { clamp, fullscreenScene, mix3, useGL, type GLEnv, type Prog, type RGB } from './_t1';

/* Shared shell for the bg-a shader backgrounds: one full-screen fragment shader, brand-colour + pointer uniforms, CSS fallback hook. */

export const SHADER_UNIFORMS = 'uniform vec2 uPtr;uniform float uAmt;uniform vec3 uPri,uSig,uSurf,uInk,uDeep,uPale;varying vec2 vUv;\n';

const lum = (c: RGB) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

export interface ShaderBgProps {
  /** Fragment shader body; `SHADER_UNIFORMS`, uRes and uT are already declared. */
  frag: string;
  /** Base class, e.g. `ui-balatro`; the canvas gets `<cls>-canvas`. */
  cls: string;
  speed: number;
  /** Pointer influence 0..1 (0 = ignore the pointer). */
  react: number;
  /** Extra per-frame uniforms. */
  bind?: (gl: WebGLRenderingContext, pr: Prog, t: number, dt: number, env: GLEnv) => void;
  className?: string;
  style?: CSSProperties;
  res?: number;
}

export function ShaderBg({ frag, cls, speed, react, bind, className, style, res = 0.6 }: ShaderBgProps) {
  const { wrapRef, canvasRef, status } = useGL(
    (env) => {
      const sm = { x: 0.5, y: 0.5, a: 0 };
      return fullscreenScene(env.gl, SHADER_UNIFORMS + frag, () => (t, dt, e, pr) => {
        const k = 1 - Math.exp(-dt * 3.2);
        const live = react > 0 && e.ptr.inside && !e.reduced;
        sm.x += (e.ptr.x - sm.x) * (live ? k : 0);
        sm.y += (e.ptr.y - sm.y) * (live ? k : 0);
        sm.a += ((live ? clamp(react, 0, 1) : 0) - sm.a) * (dt ? k : 1);
        const g = e.gl, p = e.pal;
        const dark = lum(p.surface) < lum(p.ink);
        g.uniform2f(pr.u('uPtr'), sm.x, sm.y);
        g.uniform1f(pr.u('uAmt'), sm.a);
        g.uniform1f(pr.u('uT'), t * speed);
        g.uniform3fv(pr.u('uPri'), p.primary);
        g.uniform3fv(pr.u('uSig'), p.signal);
        g.uniform3fv(pr.u('uSurf'), p.surface);
        g.uniform3fv(pr.u('uInk'), p.ink);
        g.uniform3fv(pr.u('uDeep'), dark ? p.surface : p.ink);
        g.uniform3fv(pr.u('uPale'), mix3(dark ? p.ink : p.surface, [1, 1, 1], 0.0));
        bind?.(g, pr, t, dt, e);
      });
    },
    { res, fps: 30, maxPixels: 1.3e6 },
  );
  return (
    <div ref={wrapRef} className={cls + (className ? ' ' + className : '')} style={style} data-gl={status} aria-hidden="true">
      <canvas ref={canvasRef} className={cls + '-canvas'} hidden={status === 'off'} />
    </div>
  );
}
