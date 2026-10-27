'use client';
import type { CSSProperties } from 'react';
import { clamp, fullscreenScene, GLSL_NOISE2, useGL } from './_t1';

export interface ShaderGradientProps {
  /** Drift speed multiplier (default 1). */
  speed?: number;
  /** How strongly the pointer bends the flow, 0 to 1 (default 0.7). */
  bend?: number;
  className?: string;
  style?: CSSProperties;
}

const FRAG = `
uniform vec2 uPtr; uniform float uAmt; uniform vec3 uC0,uC1,uC2,uC3;
varying vec2 vUv;
${GLSL_NOISE2}
void main(){
  float asp=uRes.x/uRes.y;
  vec2 p=(vUv-.5)*vec2(asp,1.)*1.15;
  vec2 m=(uPtr-.5)*vec2(asp,1.)*1.7;
  vec2 d=p-m;
  p-=d*exp(-dot(d,d)*1.8)*uAmt*.55;
  float t=uT*.045;
  vec2 q=vec2(fbm(p+vec2(0.,t)),fbm(p+vec2(5.2,1.3)-t));
  vec2 r=vec2(fbm(p+2.*q+vec2(1.7,9.2)+t*1.3),fbm(p+2.*q+vec2(8.3,2.8)-t*1.1));
  float f=fbm(p+2.*r);
  vec3 col=uC2;
  col=mix(col,uC0,smoothstep(.2,.72,f)*.8);
  col=mix(col,uC1,smoothstep(.3,.8,length(q)*.9)*smoothstep(.35,.8,r.x)*.88);
  col=mix(col,uC3,smoothstep(.5,.95,f*f*2.4)*.1);
  col+=(hash(gl_FragCoord.xy+fract(uT))-.5)/200.;
  gl_FragColor=vec4(col,1.);
}`;

/**
 * Flowing mesh-gradient background drawn by a fragment shader (domain-warped noise) in the host's
 * --primary, --signal, --surface and --ink. Fills its parent: it is `position:absolute; inset:0`, so
 * put it first inside a `position:relative` section. Decorative (aria-hidden); static frame when
 * reduced motion is on; plain CSS gradient when WebGL is unavailable.
 */
export default function ShaderGradient({ speed = 1, bend = 0.7, className, style }: ShaderGradientProps) {
  const { wrapRef, canvasRef, status } = useGL(
    (env) => {
      const sm = { x: 0.5, y: 0.5, a: 0 };
      return fullscreenScene(env.gl, FRAG, () => (t, dt, e, pr) => {
        const k = 1 - Math.exp(-dt * 3.2);
        const live = e.ptr.inside && !e.coarse && !e.reduced;
        sm.x += (e.ptr.x - sm.x) * (live ? k : 0);
        sm.y += (e.ptr.y - sm.y) * (live ? k : 0);
        sm.a += ((live ? clamp(bend, 0, 1) : 0) - sm.a) * (dt ? k : 1);
        const g = e.gl;
        g.uniform2f(pr.u('uPtr'), sm.x, sm.y);
        g.uniform1f(pr.u('uAmt'), sm.a);
        g.uniform1f(pr.u('uT'), t * speed);
        g.uniform3fv(pr.u('uC0'), e.pal.primary);
        g.uniform3fv(pr.u('uC1'), e.pal.signal);
        g.uniform3fv(pr.u('uC2'), e.pal.surface);
        g.uniform3fv(pr.u('uC3'), e.pal.ink);
      });
    },
    { res: 0.5, fps: 30, maxPixels: 1.4e6 },
  );
  return (
    <div ref={wrapRef} className={'ui-shader-gradient' + (className ? ' ' + className : '')} style={style} data-gl={status} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-shader-gradient-canvas" hidden={status === 'off'} />
    </div>
  );
}

export function Demo() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 150, overflow: 'hidden', borderRadius: 'var(--radius, 12px)' }}>
      <ShaderGradient />
      <div style={{ position: 'relative', display: 'grid', placeItems: 'center', height: '100%', minHeight: 150, font: '600 15px var(--font-body, system-ui)', color: 'var(--ink, #111)', textShadow: '0 0 12px var(--surface, #fff)' }}>
        Move the pointer
      </div>
    </div>
  );
}
