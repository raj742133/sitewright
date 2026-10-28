'use client';
import type { CSSProperties } from 'react';
import { clamp, fullscreenScene, useGL } from './_t1';

export interface LiquidFormProps {
  /** Number of orbiting lobes, 2 to 5 (default 4). */
  lobes?: number;
  /** Motion speed multiplier (default 1). */
  speed?: number;
  /** How hard the pointer pulls a lobe, 0 to 1 (default 0.8). */
  pull?: number;
  className?: string;
  style?: CSSProperties;
}

const FRAG = `
uniform vec2 uPtr; uniform float uN,uPull,uDark; uniform vec3 uP,uS,uSurf,uInk;
varying vec2 vUv;
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
vec3 gM; float gT;
float map(vec3 p){
  float d=1e5;
  for(int i=0;i<5;i++){
    if(float(i)>=uN)break;
    float fi=float(i);
    vec3 c=vec3(sin(gT*.7+fi*2.1)*.62,cos(gT*.6+fi*1.7)*.5,sin(gT*.5+fi*3.3)*.45);
    float r=.42+.07*sin(gT*.9+fi);
    d=smin(d,length(p-c)-r,.55);
  }
  d=smin(d,length(p-gM)-.3*(.4+uPull*.6),.5);
  d+=.035*sin(p.x*4.+gT*1.1)*sin(p.y*4.2-gT*.9)*sin(p.z*3.8+gT*.7);
  return d;
}
vec3 nrm(vec3 p){vec2 e=vec2(.002,-.002);return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));}
vec3 env(vec3 r){
  vec3 lo=uDark>.5?mix(uInk,uSurf,.1)*.28:mix(uSurf,uInk,.4);
  vec3 hi=uDark>.5?mix(uSurf,vec3(1.),.35)*1.25:mix(uSurf,vec3(1.),.6);
  vec3 c=mix(lo,hi,smoothstep(-.5,.7,r.y));
  c=mix(c,lo*.8,smoothstep(.1,-.6,r.y)*.6);
  float band=smoothstep(.5,.6,sin(r.y*6.+r.x*2.5+r.z))*smoothstep(-.4,.5,r.y);
  c=mix(c,hi*(uDark>.5?1.7:1.15),band*.85);
  c=mix(c,lo*.5,smoothstep(.2,-.25,r.y)*smoothstep(-.9,-.3,r.y)*.7);
  c+=uP*pow(max(dot(r,normalize(vec3(-.7,.35,-.6))),0.),6.)*(uDark>.5?1.1:.7);
  c+=uS*pow(max(dot(r,normalize(vec3(.8,.15,-.5))),0.),7.)*(uDark>.5?1.0:.6);
  return c;
}
void main(){
  float asp=uRes.x/uRes.y;
  vec2 p=(vUv-.5)*vec2(asp,1.)*2.;
  gT=uT*.6;
  gM=vec3((uPtr.x-.5)*asp*1.5,(uPtr.y-.5)*1.5,-.2);
  vec3 ro=vec3(0.,0.,-3.4),rd=normalize(vec3(p*.78,1.7));
  float t=0.,md=1e3,d=1.;
  for(int i=0;i<56;i++){
    d=map(ro+rd*t); md=min(md,d); if(d<.002||t>7.)break; t+=d*.9;
  }
  vec3 col=vec3(0.); float a=0.;
  float glow=exp(-md*5.5)*.28;
  if(d<.01&&t<7.){
    vec3 pos=ro+rd*t, n=nrm(pos), r=reflect(rd,n);
    float fr=pow(1.-max(dot(-rd,n),0.),3.);
    vec3 base=mix(uP,uS,.5+.5*n.y);
    vec3 m=env(r)*(.9+.5*fr);
    m=mix(m,m*mix(vec3(1.),base*1.3,.5),.55);
    m+=pow(max(dot(r,normalize(vec3(.3,.8,-.5))),0.),50.)*1.1;
    col=m; a=1.;
  } else {
    col=mix(uP,uS,.5)*(uDark>.5?1.:.8); a=glow;
    col*=a;
  }
  col=clamp(col,0.,1.);
  gl_FragColor=vec4(a>=1.?col:col,a);
}`;

const lum = (c: number[]) => 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;

/**
 * A metallic liquid blob: a few spheres smoothly merged and wobbled, ray-marched in a fragment shader and
 * shaded as a mirror that reflects a procedural studio sky tinted by --primary and --signal. The pointer
 * drags an extra lobe through it; touch and reduced motion get an idle drift or one still frame. Fills the
 * parent (absolute, centred, sized to fit), aria-hidden, no pointer events. CSS blob without WebGL.
 */
export default function LiquidForm({ lobes = 4, speed = 1, pull = 0.8, className, style }: LiquidFormProps) {
  const { wrapRef, canvasRef, status } = useGL(
    (env) => {
      const sm = { x: 0.5, y: 0.5 };
      return fullscreenScene(env.gl, FRAG, () => (t, dt, e, pr) => {
        const k = 1 - Math.exp(-dt * 4);
        const live = e.ptr.inside && !e.coarse && !e.reduced;
        const tx = live ? e.ptr.x : 0.5 + Math.sin(t * 0.37) * 0.22, ty = live ? e.ptr.y : 0.5 + Math.cos(t * 0.29) * 0.18;
        sm.x += (tx - sm.x) * (dt ? k : 1); sm.y += (ty - sm.y) * (dt ? k : 1);
        const g = e.gl;
        g.uniform2f(pr.u('uPtr'), sm.x, sm.y);
        g.uniform1f(pr.u('uT'), t * speed);
        g.uniform1f(pr.u('uN'), clamp(Math.round(lobes), 2, 5));
        g.uniform1f(pr.u('uPull'), clamp(pull, 0, 1));
        g.uniform1f(pr.u('uDark'), lum(e.pal.surface) < 0.45 ? 1 : 0);
        g.uniform3fv(pr.u('uP'), e.pal.primary);
        g.uniform3fv(pr.u('uS'), e.pal.signal);
        g.uniform3fv(pr.u('uSurf'), e.pal.surface);
        g.uniform3fv(pr.u('uInk'), e.pal.ink);
      });
    },
    { res: 0.75, fps: 40, maxPixels: 1.3e6 },
  );
  return (
    <div ref={wrapRef} className={'ui-liquid-form' + (className ? ' ' + className : '')} style={style} data-gl={status} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-liquid-form-canvas" hidden={status === 'off'} />
    </div>
  );
}

export function Demo() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 150, overflow: 'hidden', borderRadius: 'var(--radius, 12px)', background: 'var(--surface, #fff)' }}>
      <LiquidForm />
      <p style={{ position: 'absolute', left: 12, right: 12, bottom: 10, margin: 0, textAlign: 'center', pointerEvents: 'none', font: '600 clamp(11px, 1.6vw, 13px)/1.3 var(--font-body, system-ui)', color: 'var(--ink, #111)' }}>
        <span style={{ padding: '3px 10px', borderRadius: 999, background: 'color-mix(in srgb, var(--surface, #fff) 90%, transparent)', border: '1px solid var(--line, #d4d4d8)' }}>Drag the pointer through the metal</span>
      </p>
    </div>
  );
}
