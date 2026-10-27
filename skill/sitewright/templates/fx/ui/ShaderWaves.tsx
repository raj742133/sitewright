'use client';
import type { CSSProperties } from 'react';
import { fullscreenScene, mix3, useGL } from './_t1';

export interface ShaderWavesProps {
  /** Pointer movement and clicks send rings (default true). */
  interactive?: boolean;
  /** Seconds between ambient drops while idle; 0 turns them off (default 5). */
  ambient?: number;
  className?: string;
  style?: CSSProperties;
}

const RINGS = 8;
const FRAG = `
uniform vec4 uRing[${RINGS}]; uniform vec3 uDeep,uShallow,uHi; uniform float uAsp;
varying vec2 vUv;
float height(vec2 p){
  float h=sin(dot(p,vec2(1.3,.8))*5.+uT*.9)*.5+sin(dot(p,vec2(-.7,1.5))*7.+uT*1.15+1.7)*.32
         +sin(dot(p,vec2(2.1,-.4))*11.+uT*1.5+4.)*.16+sin(dot(p,vec2(.3,2.3))*17.-uT*1.9)*.08;
  for(int i=0;i<${RINGS};i++){
    vec4 r=uRing[i];
    if(r.w>0.){
      float age=uT-r.z; vec2 c=(r.xy-.5)*vec2(uAsp,1.);
      float d=length(p-c); float x=d-age*.3;
      h+=r.w*.13*sin(x*40.)*exp(-x*x*150.)*exp(-age*.7)/(1.+d*3.);
    }
  }
  return h;
}
void main(){
  vec2 p=(vUv-.5)*vec2(uAsp,1.);
  float e=.004;
  float h0=height(p);
  vec2 g=vec2(height(p+vec2(e,0.))-h0,height(p+vec2(0.,e))-h0)/e;
  vec3 n=normalize(vec3(-g*.055,1.));
  vec3 L=normalize(vec3(-.5,.6,.65));
  float diff=dot(n,L)*.5+.5;
  float spec=pow(max(dot(n,normalize(L+vec3(0.,0.,1.))),0.),70.);
  float fres=1.-n.z;
  vec3 col=mix(uDeep,uShallow,clamp(diff*diff*1.2+fres*2.,0.,1.));
  col=mix(col,uHi,spec*.7);
  gl_FragColor=vec4(col,1.);
}`;

/**
 * A calm water surface: layered sine height field with fake lighting; pointer movement and
 * clicks or taps send rings across it. Fills its parent (`position:absolute; inset:0`, put it first
 * inside a `position:relative` section). Decorative (aria-hidden); one still frame with reduced
 * motion; quiet CSS gradient if WebGL is unavailable.
 */
export default function ShaderWaves({ interactive = true, ambient = 5, className, style }: ShaderWavesProps) {
  const { wrapRef, canvasRef, status } = useGL(
    (env) => {
      const rings: { x: number; y: number; t0: number; a: number }[] = [];
      let lastDrop = 0, lastX = -1, lastY = -1, nextAmbient = 1.5, seeded = false;
      const add = (x: number, y: number, t: number, a: number) => { rings.push({ x, y, t0: t, a }); if (rings.length > RINGS) rings.shift(); };
      return fullscreenScene(env.gl, FRAG, () => (t, dt, e, pr) => {
        if (!seeded) { seeded = true; add(0.5, 0.5, t - 1.4, 1); if (e.reduced) add(0.28, 0.62, t - 2.2, 0.8); }
        if (!e.reduced) {
          if (interactive) {
            const q = e.ptr;
            if (q.inside && !e.coarse && t - lastDrop > 0.16 && Math.hypot((q.x - lastX) * e.aspect, q.y - lastY) > 0.035) {
              add(q.x, q.y, t, 0.55); lastDrop = t; lastX = q.x; lastY = q.y;
            }
            for (const tp of q.taps) add(tp.x, tp.y, t, 1.25);
          }
          if (ambient > 0 && t > nextAmbient) {
            add(0.15 + ((t * 7.31) % 1) * 0.7, 0.2 + ((t * 3.77) % 1) * 0.6, t, 0.7);
            nextAmbient = t + ambient;
          }
        }
        void dt;
        const g = e.gl;
        const arr = new Float32Array(RINGS * 4);
        rings.forEach((r, i) => { arr.set([r.x, r.y, r.t0, r.a], i * 4); });
        g.uniform4fv(pr.u('uRing'), arr);
        g.uniform1f(pr.u('uAsp'), e.aspect);
        g.uniform3fv(pr.u('uDeep'), mix3(e.pal.surface, e.pal.primary, 0.5));
        g.uniform3fv(pr.u('uShallow'), mix3(e.pal.surface, e.pal.primary, 0.14));
        g.uniform3fv(pr.u('uHi'), mix3(e.pal.signal, [1, 1, 1], 0.45));
      });
    },
    { res: 0.6, maxPixels: 1.4e6 },
  );
  return (
    <div ref={wrapRef} className={'ui-shader-waves' + (className ? ' ' + className : '')} style={style} data-gl={status} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-shader-waves-canvas" hidden={status === 'off'} />
    </div>
  );
}

export function Demo() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 150, overflow: 'hidden', borderRadius: 'var(--radius, 12px)' }}>
      <ShaderWaves ambient={3} />
      <div style={{ position: 'relative', display: 'grid', placeItems: 'center', height: '100%', minHeight: 150, font: '600 15px var(--font-body, system-ui)', color: 'var(--ink, #111)', textShadow: '0 0 12px var(--surface, #fff)', pointerEvents: 'none' }}>
        Touch the water
      </div>
    </div>
  );
}
