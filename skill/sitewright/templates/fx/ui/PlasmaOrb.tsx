'use client';
import type { CSSProperties } from 'react';
import { clamp, fullscreenScene, useGL } from './_t1';

export interface PlasmaOrbProps {
  /** Swirl speed multiplier (default 1). */
  speed?: number;
  /** Orb radius as a fraction of the parent height (default 0.3). */
  radius?: number;
  className?: string;
  style?: CSSProperties;
}

const FRAG = `
uniform vec3 uL,uP,uS; uniform float uR,uAsp;
varying vec2 vUv;
float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
return mix(mix(mix(h3(i),h3(i+vec3(1.,0.,0.)),f.x),mix(h3(i+vec3(0.,1.,0.)),h3(i+vec3(1.,1.,0.)),f.x),f.y),
mix(mix(h3(i+vec3(0.,0.,1.)),h3(i+vec3(1.,0.,1.)),f.x),mix(h3(i+vec3(0.,1.,1.)),h3(i+vec3(1.,1.,1.)),f.x),f.y),f.z);}
float f3(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n3(p);p=p*2.1+vec3(3.1,1.7,5.3);a*=.5;}return s;}
void main(){
  vec2 p=(vUv-.5)*vec2(uAsp,1.);
  float R=uR,d=length(p);
  float halo=exp(-max(d-R,0.)*6.5)*.6;
  vec3 hc=mix(uP,uS,.5);
  if(d>R+.02){gl_FragColor=vec4(hc*halo,halo);return;}
  vec2 q=p/R; float z=sqrt(max(1.-dot(q,q),0.)); vec3 n=vec3(q,z);
  float a=uT*.22; vec3 s=vec3(n.x*cos(a)+n.z*sin(a),n.y,-n.x*sin(a)+n.z*cos(a));
  vec3 w=s*1.9;
  vec3 f1=vec3(f3(w+uT*.11),f3(w+vec3(5.2,1.3,3.7)-uT*.09),f3(w+vec3(2.,8.,4.)+uT*.07));
  float pl=f3(w*1.5+2.4*f1+uT*.08);
  float veins=pow(1.-abs(2.*pl-1.),3.);
  vec3 body=mix(uP*.22,uP,smoothstep(.25,.75,pl));
  body=mix(body,uS,veins*.9);
  float diff=max(dot(n,uL),0.);
  float rim=pow(1.-z,2.4);
  float spec=pow(max(dot(reflect(-uL,n),vec3(0.,0.,1.)),0.),22.);
  vec3 col=body*(.42+.8*diff)+uS*rim*.85+vec3(spec*.35);
  float edge=smoothstep(R+.004,R-.004,d);
  vec3 outc=col*edge+hc*halo*(1.-edge);
  gl_FragColor=vec4(outc,edge+halo*(1.-edge));
}`;

/**
 * A glowing plasma orb in a fragment shader: swirling surface, soft rim light and halo in --primary
 * and --signal. The pointer tilts where the light comes from (it orbits on its own otherwise). Fills
 * its parent (`position:absolute; inset:0`, orb centred). Decorative (aria-hidden); one still frame
 * with reduced motion; CSS glow fallback when WebGL is unavailable.
 */
export default function PlasmaOrb({ speed = 1, radius = 0.3, className, style }: PlasmaOrbProps) {
  const { wrapRef, canvasRef, status } = useGL(
    (env) => {
      const L = { x: 0.6, y: 0.5 };
      return fullscreenScene(env.gl, FRAG, () => (t, dt, e, pr) => {
        const live = e.ptr.inside && !e.coarse && !e.reduced;
        const tx = live ? (e.ptr.x - 0.5) * 2.2 : Math.cos(t * 0.3) * 0.7;
        const ty = live ? (e.ptr.y - 0.5) * 2.2 : 0.45 + Math.sin(t * 0.2) * 0.2;
        const k = dt ? 1 - Math.exp(-dt * 4) : 1;
        L.x += (tx - L.x) * k; L.y += (ty - L.y) * k;
        const m = Math.hypot(L.x, L.y, 0.8);
        const g = e.gl;
        g.uniform1f(pr.u('uT'), t * speed);
        g.uniform3f(pr.u('uL'), L.x / m, L.y / m, 0.8 / m);
        g.uniform1f(pr.u('uR'), Math.min(clamp(radius, 0.1, 0.45), e.aspect * 0.4));
        g.uniform1f(pr.u('uAsp'), e.aspect);
        g.uniform3fv(pr.u('uP'), e.pal.primary);
        g.uniform3fv(pr.u('uS'), e.pal.signal);
      });
    },
    { dpr: 1.5, maxPixels: 1.3e6 },
  );
  return (
    <div ref={wrapRef} className={'ui-plasma-orb' + (className ? ' ' + className : '')} style={style} data-gl={status} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-plasma-orb-canvas" hidden={status === 'off'} />
    </div>
  );
}

export function Demo() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 150, overflow: 'hidden', borderRadius: 'var(--radius, 12px)' }}>
      <PlasmaOrb radius={0.34} />
    </div>
  );
}
