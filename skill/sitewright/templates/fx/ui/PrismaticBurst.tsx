'use client';
import { useRef, type CSSProperties } from 'react';
import { BgDemo } from './_bg-a';
import { ShaderBg } from './_bg-a-gl';
import { GLSL_COMPOSE } from './_bg-e';

export interface PrismaticBurstProps {
  /** Animation speed multiplier (default 1). */
  speed?: number;
  /** The burst centre leans toward the pointer, 0 to 1 (default 0.6). Clicks send a shock ring regardless. */
  react?: number;
  /** Number of rays around the centre (default 14). */
  rays?: number;
  className?: string;
  style?: CSSProperties;
}

const FRAG = GLSL_COMPOSE + `
uniform vec4 uB0,uB1,uB2,uB3;uniform float uRaw,uRays;
float shock(vec4 b,vec2 uv,float asp,float off){
  float age=uRaw-b.z;
  if(b.z<0.||age<0.||age>2.4) return 0.;
  float r=length((uv-b.xy)*vec2(asp,1.));
  float R=age*.62+off;
  float d=(r-R)*13.;
  return exp(-d*d)*(1.-age/2.4);
}
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  float asp=uRes.x/uRes.y;
  vec2 c=vec2(.5)+(uPtr-.5)*uAmt*.3;
  vec2 p=(uv-c)*vec2(asp,1.);
  float r=length(p),a=atan(p.y,p.x);
  float t=uT*.5;
  vec3 acc=vec3(0.);
  for(int i=0;i<3;i++){
    float fi=float(i)-1.;
    float off=fi*.05*(1.+r*1.6);
    float ra=a+off+t*.14+.28*sin(r*3.-t*1.5);
    float ray=pow(.5+.5*cos(ra*uRays),5.);
    ray*=.55+.45*sin(ra*3.+t);
    ray/=(1.+r*3.2);
    vec3 tone=i==0?uPri:(i==1?uPale:uSig);
    float cyc=fract(t*.32);
    float ring=exp(-pow((r-cyc*1.25+fi*.012)*8.,2.))*(1.-cyc);
    float sk=shock(uB0,uv,asp,fi*.012)+shock(uB1,uv,asp,fi*.012)+shock(uB2,uv,asp,fi*.012)+shock(uB3,uv,asp,fi*.012);
    acc+=tone*(ray*.62+ring*.5+sk*.8);
  }
  acc+=mix(uPri,uSig,.5)*.05/(r+.05);
  vec3 base=mix(uSurf,uPri,.08+.1*(1.-smoothstep(0.,.9,r)));
  gl_FragColor=vec4(bgeCompose(base,acc),1.);
}`;

/**
 * A burst of rays radiating from the centre with a coloured fringe that widens with distance (--primary, a pale
 * highlight and --signal drifting apart), a slow pulse ring, and a shock ring for every click or tap on it.
 * Fills its parent (`position:absolute; inset:0`): put it first inside a `position:relative` section.
 * Decorative (aria-hidden); a still frame under reduced motion; a CSS conic-ray rendering without WebGL.
 */
export default function PrismaticBurst({ speed = 1, react = 0.6, rays = 14, className, style }: PrismaticBurstProps) {
  const bursts = useRef<{ x: number; y: number; t0: number }[]>([]);
  return (
    <ShaderBg
      cls="ui-prismatic-burst"
      frag={FRAG}
      speed={speed}
      react={react}
      res={0.6}
      className={className}
      style={style}
      bind={(g, pr, t, _dt, e) => {
        const list = bursts.current;
        for (const tp of e.ptr.taps) { list.push({ x: tp.x, y: tp.y, t0: t }); if (list.length > 4) list.shift(); }
        for (let i = 0; i < 4; i++) {
          const b = list[i];
          g.uniform4f(pr.u('uB' + i), b ? b.x : 0, b ? b.y : 0, b ? b.t0 : -1, 0);
        }
        g.uniform1f(pr.u('uRaw'), t);
        g.uniform1f(pr.u('uRays'), Math.max(3, Math.round(rays)));
      }}
    />
  );
}

export function Demo() {
  return (
    <BgDemo title="Prismatic burst" note="Click for a shock ring">
      <PrismaticBurst />
    </BgDemo>
  );
}
