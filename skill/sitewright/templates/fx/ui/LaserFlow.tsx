'use client';
import { useRef, type CSSProperties } from 'react';
import { fullscreenScene, mix3, useGL } from './_t1';

export interface LaserFlowProps {
  /** Number of beams, 1..6 (default 4). */
  beams?: number;
  /** Haze density 0..1: how much of the beam's glow hangs in the air (default 0.6). */
  haze?: number;
  /** Beams lean toward the pointer's height (default true). */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

const FRAG = `
uniform vec3 uA,uB,uBg; uniform float uAsp,uLean,uHaze,uN;
varying vec2 vUv;
float hs(float n){return fract(sin(n*91.3458)*47453.5453);}
void main(){
  vec2 p=(vUv-.5)*vec2(uAsp,1.);
  vec3 col=uBg;
  vec2 o=vec2(-uAsp*.5-.15,-.2+uLean*.25);
  float air=.55+.45*sin(p.x*3.+uT*.2)*sin(p.y*4.-uT*.15);
  for(int i=0;i<6;i++){
    if(float(i)>=uN) break;
    float fi=float(i);
    float ang=.04+fi*.16-.2+.07*sin(uT*.31+fi*1.9)+uLean*.18;
    vec2 dir=vec2(cos(ang),sin(ang));
    vec2 nrm=vec2(-dir.y,dir.x);
    vec2 q=p-o;
    float along=dot(q,dir);
    float wob=.035*sin(along*5.+uT*.7+fi*2.3)+.012*sin(along*17.-uT*1.9+fi);
    float d=abs(dot(q,nrm)-wob);
    float fade=smoothstep(0.,.25,along)*exp(-along*.28);
    float pulse=.62+.38*sin(along*11.-uT*(2.4+fi*.35)+fi*3.);
    float core=.0022/(d*d+.0016*.0016*4.)*.012;
    float glow=exp(-d*(30.+fi*3.))*(.35+.65*pulse)*.55+exp(-d*7.)*.18*uHaze*air;
    float hot=smoothstep(.014,0.,d);
    vec3 c=mix(uA,uB,fract(fi*.37+.15));
    col+=(c*(glow+core)+vec3(1.)*hot*.7*(.6+.4*pulse))*fade;
  }
  // soft vignette and a hint of film grain-free banding guard
  col*=1.-.35*dot(vUv-.5,vUv-.5)*2.;
  gl_FragColor=vec4(col,1.);
}`;

/**
 * Volumetric laser beams sweeping across a dark stage, with pulses running down each beam and a
 * soft haze. A fragment shader; fills its parent (first child of a position:relative section). The
 * stage is always dark. Decorative (aria-hidden); a still frame with reduced motion; a CSS beam
 * drawing if WebGL is unavailable.
 */
export default function LaserFlow({ beams = 4, haze = 0.6, interactive = true, className, style }: LaserFlowProps) {
  const lean = useRef(0);
  const { wrapRef, canvasRef, status } = useGL(
    (env) =>
      fullscreenScene(env.gl, FRAG, () => (t, dt, e, pr) => {
        const g = e.gl;
        const want = interactive && e.ptr.inside && !e.coarse && !e.reduced ? e.ptr.y - 0.5 : 0;
        lean.current += (want - lean.current) * (1 - Math.pow(0.01, dt));
        g.uniform1f(pr.u('uAsp'), e.aspect);
        g.uniform1f(pr.u('uLean'), lean.current);
        g.uniform1f(pr.u('uHaze'), haze);
        g.uniform1f(pr.u('uN'), Math.max(1, Math.min(6, Math.round(beams))));
        g.uniform3fv(pr.u('uA'), mix3(e.pal.primary, [1, 1, 1], 0.12));
        g.uniform3fv(pr.u('uB'), mix3(e.pal.signal, [1, 1, 1], 0.1));
        g.uniform3fv(pr.u('uBg'), mix3([0.02, 0.025, 0.045], e.pal.primary, 0.05));
      }),
    { res: 0.75, maxPixels: 1.6e6 },
  );
  return (
    <div ref={wrapRef} className={'ui-laser-flow' + (className ? ' ' + className : '')} style={style} data-gl={status} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-laser-flow-canvas" hidden={status === 'off'} />
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-laser-flow-stage">
      <LaserFlow />
      <div className="ui-laser-flow-copy">
        <strong>Beam line</strong>
        <span>Lean the pointer to steer.</span>
      </div>
    </div>
  );
}
