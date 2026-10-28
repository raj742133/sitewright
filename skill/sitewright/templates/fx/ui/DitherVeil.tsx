'use client';
import { useRef, type CSSProperties } from 'react';
import { fullscreenScene, GLSL_NOISE2, mix3, useGL } from './_t1';

export interface DitherVeilProps {
  /** Dither dot size in CSS px (default 3). */
  cell?: number;
  /** Where the veil is densest (default "bottom"). */
  from?: 'top' | 'bottom' | 'left' | 'right';
  /** Overall coverage 0..1 (default 0.6). */
  amount?: number;
  /** The veil thins out around the pointer (default true). */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

const FRAG = `
uniform vec3 uA,uB; uniform float uCell,uAmt,uAsp; uniform vec2 uDir,uPt; uniform float uPa;
varying vec2 vUv;
${GLSL_NOISE2}
float b2(vec2 p){p=mod(p,2.);return mod(2.*p.x+3.*p.y,4.);}
float bayer8(vec2 c){return (16.*b2(c)+4.*b2(floor(c/2.))+b2(floor(c/4.))+.5)/64.;}
void main(){
  vec2 cell=floor(gl_FragCoord.xy/uCell);
  vec2 uv=(cell+.5)*uCell/uRes;
  vec2 p=vec2(uv.x*uAsp,uv.y);
  float flow=fbm(p*2.2+vec2(uT*.05,-uT*.07))*.7+fbm(p*4.7-vec2(uT*.09,uT*.02))*.3;
  float edge=clamp(dot(uv-.5,uDir)+.5,0.,1.);
  float v=flow*.5+edge*1.25-.62+uAmt*.45;
  float hole=exp(-length((uv-uPt)*vec2(uAsp,1.))*3.2)*uPa;
  v-=hole*.9;
  float on=step(bayer8(cell),v);
  vec3 c=mix(uA,uB,clamp(flow*1.4+edge*.4-.2,0.,1.));
  gl_FragColor=vec4(c*on,on);
}`;

const DIRS = { top: [0, 1], bottom: [0, -1], left: [-1, 0], right: [1, 0] } as const;

/**
 * An ordered-dither veil: a drifting noise field quantised through an 8x8 Bayer matrix into crisp
 * dots of brand colour, densest on one edge and thinning around the pointer. A fragment shader
 * with a transparent background, so it overlays whatever is behind it; fills its parent.
 * Decorative (aria-hidden); a still frame with reduced motion; a CSS dot pattern if WebGL is unavailable.
 */
export default function DitherVeil({ cell = 3, from = 'bottom', amount = 0.5, interactive = true, className, style }: DitherVeilProps) {
  const pa = useRef(0);
  const pt = useRef({ x: 0.5, y: 0.5 });
  const { wrapRef, canvasRef, status } = useGL(
    (env) =>
      fullscreenScene(env.gl, FRAG, () => (t, dt, e, pr) => {
        const g = e.gl;
        const act = interactive && e.ptr.inside && !e.coarse && !e.reduced;
        if (act) {
          if (pa.current < 0.02) { pt.current.x = e.ptr.x; pt.current.y = e.ptr.y; }
          const k = 1 - Math.pow(0.002, dt);
          pt.current.x += (e.ptr.x - pt.current.x) * k; pt.current.y += (e.ptr.y - pt.current.y) * k;
        }
        pa.current += ((act ? 1 : 0) - pa.current) * (1 - Math.pow(0.02, dt));
        g.uniform1f(pr.u('uCell'), Math.max(1, cell) * e.dpr);
        g.uniform1f(pr.u('uAmt'), amount);
        g.uniform1f(pr.u('uAsp'), e.aspect);
        g.uniform2f(pr.u('uDir'), DIRS[from][0], DIRS[from][1]);
        g.uniform2f(pr.u('uPt'), pt.current.x, pt.current.y);
        g.uniform1f(pr.u('uPa'), pa.current);
        g.uniform3fv(pr.u('uA'), e.pal.primary);
        g.uniform3fv(pr.u('uB'), mix3(e.pal.signal, e.pal.primary, 0.25));
      }),
    { res: 1, maxPixels: 2.0e6 },
  );
  return (
    <div ref={wrapRef} className={'ui-dither-veil' + (className ? ' ' + className : '')} style={{ ['--ui-dv-from' as string]: from === 'top' ? '0deg' : from === 'bottom' ? '180deg' : from === 'left' ? '90deg' : '270deg', ...style }} data-gl={status} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-dither-veil-canvas" hidden={status === 'off'} />
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-dither-veil-stage">
      <div className="ui-dither-veil-copy">
        <strong>Fade to texture</strong>
        <span>Content stays crisp above the dots.</span>
      </div>
      <DitherVeil />
    </div>
  );
}
