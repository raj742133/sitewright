'use client';
import type { CSSProperties } from 'react';
import { clamp, fullscreenScene, GLSL_NOISE2, useGL } from './_t1';
import { TuDemo } from './_tu-bg-demo';

export type LaserVariant = 'fan' | 'grid' | 'prism';
export interface LaserFieldProps {
  /** `fan` beams radiating from the floor, `grid` a vanishing-point laser grid, `prism` one beam split into a spectrum (default `fan`). */
  variant?: LaserVariant;
  /** Beam brightness multiplier, 0.3 to 1.6 (default 1). */
  intensity?: number;
  /** How strongly the beams follow the pointer, 0 to 1 (default 0.8). */
  follow?: number;
  className?: string;
  style?: CSSProperties;
}

const FRAG = `
uniform vec2 uPtr; uniform float uV,uInt,uDark; uniform vec3 uP,uS,uSurf,uInk;
varying vec2 vUv;
${GLSL_NOISE2}
float beam(vec2 p,vec2 o,float a,float w,float dec){
  vec2 d=p-o; vec2 dir=vec2(cos(a),sin(a));
  float al=dot(d,dir); float pe=dot(d,vec2(-dir.y,dir.x));
  float ww=w*(1.+al*.35);
  return exp(-pe*pe/(ww*ww))*smoothstep(0.,.04,al)*exp(-al*dec);
}
float ht(float v){
  vec2 g=fract(gl_FragCoord.xy/7.)-.5; float d=length(g);
  return smoothstep(d*1.25+.06,d*1.25-.06,v);
}
void main(){
  float asp=uRes.x/uRes.y;
  vec2 p=vec2((vUv.x-.5)*asp,vUv.y);
  vec2 m=vec2((uPtr.x-.5)*asp,uPtr.y);
  float t=uT;
  float fog=.55+.9*fbm(p*2.2+vec2(t*.05,-t*.03));
  vec3 bp=mix(uP,uInk,uDark>.5?-.0:.18), bs=mix(uS,uInk,uDark>.5?0.:.2);
  vec3 add=vec3(0.); float I=0.; float core=0.;
  if(uV<.5){
    vec2 o=vec2(0.,-.12);
    for(int i=0;i<7;i++){
      float fi=float(i)-3.;
      float a=1.5708+fi*.17+sin(t*(.25+float(i)*.07)+float(i)*1.7)*.07;
      a+=(-(m.x)*.55-(uPtr.y-.4)*fi*.12)*.5;
      float b=beam(p,o,a,.012+.006*abs(fi)*.3,.7);
      float w=beam(p,o,a,.06,.9)*.35;
      float k=mod(float(i),2.);
      add+=mix(bp,bs,k*.8+.1)*(b*1.5+w);
      core+=b;
      I+=b+w;
    }
    I*=fog;
    float floorGlow=exp(-vUv.y*6.)*.35;
    add+=mix(bp,bs,.5)*floorGlow;
    I+=floorGlow*.5;
  } else if(uV<1.5){
    vec2 vp=vec2(m.x*.5,.46+(uPtr.y-.5)*.12);
    float dy=vp.y-p.y;
    if(dy>.003){
      float gx=(p.x-vp.x)*2.4/dy;
      float gz=.55/dy+t*.8;
      float wx=clamp(1.4*2.4*asp/(uRes.x*dy),0.,.5);
      float wz=clamp(1.4*.55/(dy*dy*uRes.y),0.,.5);
      float lx=abs(fract(gx)-.5), lz=abs(fract(gz)-.5);
      float line=smoothstep(.5-wx*2.,.5,lx)*(1.-wx*1.6)+smoothstep(.5-wz*2.,.5,lz)*(1.-wz*1.6);
      float fade=smoothstep(.0,.12,dy)*(.5+.5*smoothstep(.5,.0,dy));
      float pulse=smoothstep(.85,1.,fract(gz*.2-t*.08))*smoothstep(.45,.5,lx);
      add+=mix(bp,bs,clamp(pulse*2.,0.,1.))*(line*.7+pulse*2.)*fade;
      I+=(line*.6+pulse*1.5)*fade;
    }
    for(int i=0;i<5;i++){
      float fi=float(i)-2.;
      float a=1.5708+fi*.3+sin(t*.4+float(i)*2.)*.08+(vp.x-m.x)*.2;
      float b=beam(p,vp,a,.01,.5);
      float w=beam(p,vp,a,.05,.7)*.3;
      add+=mix(bp,bs,.5+fi*.2)*(b*1.4+w);
      I+=(b+w)*fog; core+=b;
    }
    float sun=exp(-length((p-vp)*vec2(1.,1.6))*9.);
    add+=bs*sun*1.2; I+=sun;
  } else {
    float py=clamp(uPtr.y,.25,.75);
    vec2 pc=vec2(-.02+m.x*.08,py);
    float inb=smoothstep(.0,.03,pc.x-p.x)*0.+beam(p,vec2(-asp*.5-.1,py),0.,.012,.0)*step(p.x,pc.x);
    vec3 wh=mix(vec3(1.),uInk,uDark>.5?0.:.55);
    add+=wh*inb*1.3; I+=inb*1.2; core+=inb;
    vec2 q=p-pc;
    float tri=1.-smoothstep(.0,.012,max(abs(q.x)*.9+q.y*.5-.05,max(-q.y*1.1-.06,abs(q.x)*.9-q.y*.5-.05)));
    add+=mix(bp,bs,.5)*tri*.5; I+=tri*.4;
    for(int i=0;i<6;i++){
      float fi=float(i);
      float a=.18-fi*.075+(py-.5)*.35+sin(t*.5)*.015;
      float b=beam(p,pc+vec2(.03,0.),a,.011,.45);
      float w=beam(p,pc+vec2(.03,0.),a,.05,.6)*.25;
      vec3 c=fi<2.?mix(bp,bs,fi*.4):fi<4.?mix(bs,bp,(fi-2.)*.5+.2):mix(bp,vec3(.8,.9,1.),.5);
      add+=c*(b*1.4+w)*fog; I+=(b+w)*fog; core+=b;
    }
  }
  I*=uInt; add*=uInt;
  float halo=ht(clamp(I*.9,0.,1.));
  vec3 col;
  if(uDark>.5){
    col=uSurf+add*(.6+.5*halo)+vec3(clamp(core*.35,0.,1.))*uInt;
  } else {
    float a=clamp(I*1.1,0.,1.)*(.62+.38*halo);
    vec3 beamC=add/max(I,.001);
    col=mix(uSurf,clamp(beamC,0.,1.),a);
    col=mix(col,uInk,clamp(core*.25,0.,1.));
  }
  col+=(hash(gl_FragCoord.xy+fract(uT))-.5)/160.;
  gl_FragColor=vec4(col,1.);
}`;

const lum = (c: number[]) => 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;

function Scene({ variant, intensity, follow, className, style }: Required<Pick<LaserFieldProps, 'variant' | 'intensity' | 'follow'>> & Pick<LaserFieldProps, 'className' | 'style'>) {
  const vi = variant === 'grid' ? 1 : variant === 'prism' ? 2 : 0;
  const { wrapRef, canvasRef, status } = useGL(
    (env) => {
      const sm = { x: 0.5, y: 0.4, a: 0 };
      return fullscreenScene(env.gl, FRAG, () => (t, dt, e, pr) => {
        const k = 1 - Math.exp(-dt * 3.4);
        const live = e.ptr.inside && !e.coarse && !e.reduced;
        const tx = live ? e.ptr.x : 0.5 + Math.sin(t * 0.31) * 0.28, ty = live ? e.ptr.y : 0.42 + Math.cos(t * 0.23) * 0.14;
        const f = clamp(follow, 0, 1);
        sm.x += ((0.5 + (tx - 0.5) * f) - sm.x) * (dt ? k : 1);
        sm.y += ((0.42 + (ty - 0.42) * f) - sm.y) * (dt ? k : 1);
        const g = e.gl;
        g.uniform2f(pr.u('uPtr'), sm.x, sm.y);
        g.uniform1f(pr.u('uV'), vi);
        g.uniform1f(pr.u('uInt'), clamp(intensity, 0.3, 1.6));
        g.uniform1f(pr.u('uDark'), lum(e.pal.surface) < 0.45 ? 1 : 0);
        g.uniform3fv(pr.u('uP'), e.pal.primary);
        g.uniform3fv(pr.u('uS'), e.pal.signal);
        g.uniform3fv(pr.u('uSurf'), e.pal.surface);
        g.uniform3fv(pr.u('uInk'), e.pal.ink);
      });
    },
    { res: 0.6, fps: 40, maxPixels: 1.6e6 },
  );
  return (
    <div ref={wrapRef} className={'ui-laser-field' + (className ? ' ' + className : '')} style={style} data-gl={status} data-variant={variant} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-laser-field-canvas" hidden={status === 'off'} />
    </div>
  );
}

/**
 * Pointer-reactive laser beams drawn by a fragment shader, in three layouts. Fills its parent
 * (`position:absolute; inset:0`, put it first in a `position:relative` section), aria-hidden, pointer
 * events none (the window pointer steers the beams; touch and reduced motion get a slow idle sweep or a
 * still frame). Beams use --primary and --signal over --surface, light and dark. CSS beams without WebGL.
 */
export default function LaserField({ variant = 'fan', intensity = 1, follow = 0.8, className, style }: LaserFieldProps) {
  return <Scene key={variant} variant={variant} intensity={intensity} follow={follow} className={className} style={style} />;
}

const VARIANTS = ['fan', 'grid', 'prism'] as const;
const NAMES: Record<LaserVariant, string> = { fan: 'Fan', grid: 'Grid', prism: 'Prism' };
export function Demo() {
  return (
    <TuDemo title="Laser field" sub="Beams follow the pointer." variants={VARIANTS} labels={NAMES}>
      {(v) => <LaserField variant={v} />}
    </TuDemo>
  );
}
