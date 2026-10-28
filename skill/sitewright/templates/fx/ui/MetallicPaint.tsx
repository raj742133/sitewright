'use client';
import { useRef, type CSSProperties } from 'react';
import { fullscreenScene, GLSL_NOISE2, mix3, useGL } from './_t1';

export interface MetallicPaintProps {
  /** How strongly the surface ripples, 0.3..2 (default 1). */
  relief?: number;
  /** Flow speed multiplier; 0 freezes (default 1). */
  speed?: number;
  /** The pointer dents the liquid metal (default true). */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

const FRAG = `
uniform vec3 uA,uB,uLo,uHi; uniform float uAsp,uRel,uSpd,uPa; uniform vec2 uPt;
varying vec2 vUv;
${GLSL_NOISE2}
float hgt(vec2 p){
  float t=uT*uSpd;
  vec2 w=vec2(fbm(p*1.3+vec2(t*.07,0.)),fbm(p*1.3+vec2(5.2,1.3-t*.06)));
  float h=vn(p*1.2+w*1.6+vec2(0.,t*.05))*1.3+vn(p*2.1-w*1.2+vec2(t*.04,3.))*.35;
  vec2 d=p-uPt; h-=exp(-dot(d,d)*7.)*.7*uPa;
  return h*uRel;
}
vec3 env(vec3 r){
  float y=r.y*.5+.5;
  float band=sin(y*9.+r.x*2.)*.5+.5;
  vec3 sky=mix(uLo,uHi,smoothstep(.1,.9,y));
  float box=smoothstep(.55,.62,r.x+.3*r.y)*smoothstep(.95,.8,r.x+.3*r.y);
  float strip=smoothstep(.04,0.,abs(y-.72))*.8;
  vec3 c=sky*(.55+.45*band)+vec3(1.)*(box*.55+strip*.7);
  return mix(c,mix(uA,uB,band),.14);
}
void main(){
  vec2 p=(vUv-.5)*vec2(uAsp,1.)*1.15;
  float e=.01;
  float h0=hgt(p);
  vec2 g=vec2(hgt(p+vec2(e,0.))-h0,hgt(p+vec2(0.,e))-h0)/e;
  vec3 n=normalize(vec3(-g*.42,1.));
  vec3 v=vec3(0.,0.,1.);
  vec3 r=reflect(-v,n);
  vec3 col=env(r);
  float fres=pow(1.-n.z,1.6);
  vec3 irid=.5+.5*cos(6.2832*(fres*1.1+vec3(0.,.33,.67)+h0*.4));
  col=mix(col,col*mix(vec3(1.),irid,.5),.28);
  col+=pow(max(dot(r,normalize(vec3(-.4,.6,.7))),0.),48.)*.7;
  col=pow(col,vec3(.92));
  gl_FragColor=vec4(col,1.);
}`;

/**
 * A pool of liquid chrome: a domain-warped height field lit as a mirror that reflects a small
 * studio environment tinted with the brand colours and a thin-film sheen; the pointer dents it. A
 * fragment shader that fills its parent; decorative (aria-hidden); a still frame with reduced
 * motion; a CSS brushed-chrome gradient if WebGL is unavailable.
 */
export default function MetallicPaint({ relief = 1, speed = 1, interactive = true, className, style }: MetallicPaintProps) {
  const pa = useRef(0);
  const pt = useRef({ x: 0, y: 0 });
  const { wrapRef, canvasRef, status } = useGL(
    (env) =>
      fullscreenScene(env.gl, FRAG, () => (t, dt, e, pr) => {
        const g = e.gl;
        const act = interactive && e.ptr.inside && !e.coarse && !e.reduced;
        const tx = (e.ptr.x - 0.5) * e.aspect * 1.15, ty = (e.ptr.y - 0.5) * 1.15;
        if (act) {
          if (pa.current < 0.02) { pt.current.x = tx; pt.current.y = ty; }
          const k = 1 - Math.pow(0.003, dt);
          pt.current.x += (tx - pt.current.x) * k; pt.current.y += (ty - pt.current.y) * k;
        }
        pa.current += ((act ? 1 : 0) - pa.current) * (1 - Math.pow(0.03, dt));
        g.uniform1f(pr.u('uAsp'), e.aspect);
        g.uniform1f(pr.u('uRel'), relief);
        g.uniform1f(pr.u('uSpd'), speed);
        g.uniform1f(pr.u('uPa'), pa.current);
        g.uniform2f(pr.u('uPt'), pt.current.x, pt.current.y);
        g.uniform3fv(pr.u('uA'), e.pal.primary);
        g.uniform3fv(pr.u('uB'), e.pal.signal);
        g.uniform3fv(pr.u('uLo'), mix3([0.04, 0.05, 0.08], e.pal.primary, 0.05));
        g.uniform3fv(pr.u('uHi'), mix3([0.93, 0.95, 0.98], e.pal.primary, 0.03));
      }),
    { res: 0.7, maxPixels: 1.5e6 },
  );
  return (
    <div ref={wrapRef} className={'ui-metallic-paint' + (className ? ' ' + className : '')} style={style} data-gl={status} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-metallic-paint-canvas" hidden={status === 'off'} />
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-metallic-paint-stage">
      <MetallicPaint />
      <span className="ui-metallic-paint-label">Liquid chrome</span>
    </div>
  );
}
