'use client';
import type { CSSProperties } from 'react';
import { BgDemo } from './_bg-a';
import { ShaderBg } from './_bg-a-gl';
import { BG_D_NOISE } from './_bg-d';

export interface LiquidChromeProps {
  /** Flow speed multiplier (default 1). */
  speed?: number;
  /** Pointer pushes the liquid and moves the reflections, 0 to 1 (default 0.7). */
  react?: number;
  className?: string;
  style?: CSSProperties;
}

const FRAG = BG_D_NOISE + `
float bdHt(vec2 p){
  float t=uT*.18;
  vec2 q=p*.9;
  q+=.5*vec2(sin(q.y*1.3+t*1.3),cos(q.x*1.1-t));
  q+=.2*vec2(sin(q.y*2.2-t*1.7),cos(q.x*2.1+t*1.2));
  float d=length(p-(uPtr-.5)*vec2(uRes.x/uRes.y,1.))*uAmt;
  return sin(q.x*1.7+q.y*1.2)*.6+bdN(q*.9+t)*.5-.35*uAmt*exp(-d*d*6.);
}
void main(){
  float asp=uRes.x/uRes.y;
  vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y*1.5;
  float e=.012;
  float h=bdHt(p);
  vec2 g=vec2(bdHt(p+vec2(e,0.))-h,bdHt(p+vec2(0.,e))-h)/e;
  vec3 n=normalize(vec3(-g*.5,1.));
  vec3 R=reflect(vec3(0.,0.,-1.),n);
  float s=R.x*2.6+R.y*1.8+sin(R.x*7.+R.y*5.)*.35;
  float band=.5+.5*sin(s*3.1);
  band=smoothstep(.15,.85,band);
  vec3 dark=mix(uDeep,uPri,.12);
  vec3 lite=mix(uPale,uSig,.08);
  vec3 col=mix(dark,lite,band);
  col=mix(col,mix(uPri,uPale,.5),smoothstep(.6,.95,.5+.5*sin(s*3.1+2.2))*.3);
  float spec=pow(max(dot(n,normalize(vec3(-.4,.6,.7))),0.),48.);
  col+=spec*.55*uPale;
  float fres=pow(1.-n.z,2.);
  col=mix(col,uSig,fres*.25);
  gl_FragColor=vec4(col,1.);
}`;

/**
 * A mirror-bright liquid metal surface: a flowing height field is lit as a reflective sheet, so bands of dark
 * and light slide across it, tinted with --primary and --signal. Fills its parent: put it first inside a
 * `position:relative` section. Decorative; the pointer dents the surface; static frame under reduced motion; CSS gradient without WebGL.
 */
export default function LiquidChrome({ speed = 1, react = 0.7, className, style }: LiquidChromeProps) {
  return <ShaderBg cls="ui-liquid-chrome" frag={FRAG} speed={speed} react={react} className={className} style={style} res={0.5} />;
}

export function Demo() {
  return (
    <BgDemo title="Liquid chrome" note="Reflective flowing metal">
      <LiquidChrome />
    </BgDemo>
  );
}
