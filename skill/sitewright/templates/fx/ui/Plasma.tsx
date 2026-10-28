'use client';
import type { CSSProperties } from 'react';
import { BgDemo } from './_bg-a';
import { ShaderBg } from './_bg-a-gl';

export interface PlasmaProps {
  /** Flow speed multiplier (default 1). */
  speed?: number;
  /** Pointer pulls a ripple into the field, 0 to 1 (default 0.6). */
  react?: number;
  className?: string;
  style?: CSSProperties;
}

const FRAG = `
void main(){
  vec2 p=(gl_FragCoord.xy-.5*uRes)/min(uRes.x,uRes.y)*3.4;
  float t=uT*.3;
  vec2 q=(uPtr-.5)*vec2(uRes.x/uRes.y,1.)*3.4;
  float v=sin(p.x*1.15+t)+sin(p.y*1.35+t*1.3)+sin((p.x+p.y)*.85+t*.7);
  v+=sin(length(p+vec2(sin(t*.7),cos(t*.55))*1.7)*1.7-t*1.4);
  v+=uAmt*1.4*sin(length(p-q)*2.6-uT*.9)/(1.+length(p-q)*.5);
  float s=clamp(v*.19+.5,0.,1.);
  vec3 c0=mix(uSurf,uPri,.22),c1=uPri,c2=mix(uPri,uSig,.6),c3=mix(uSig,uPale,.55);
  vec3 col=s<.4?mix(c0,c1,smoothstep(0.,.4,s)):s<.7?mix(c1,c2,smoothstep(.4,.7,s)):mix(c2,c3,smoothstep(.7,1.,s));
  col*=.93+.07*sin(s*30.);
  float vg=smoothstep(1.7,.2,length((gl_FragCoord.xy-.5*uRes)/uRes.y));
  col=mix(mix(col,uSurf,.35),col,.6+.4*vg);
  gl_FragColor=vec4(col,1.);
}`;

/**
 * A classic plasma field: interfering sine waves mapped onto a four-stop ramp from a tinted surface through
 * --primary and --signal to a pale highlight, with a soft vignette. The pointer drops a rippling source into it.
 * Fills its parent (`position:absolute; inset:0`): put it first inside a `position:relative` section. Decorative
 * (aria-hidden); a still frame under reduced motion; a CSS gradient blob rendering without WebGL.
 */
export default function Plasma({ speed = 1, react = 0.6, className, style }: PlasmaProps) {
  return <ShaderBg cls="ui-plasma" frag={FRAG} speed={speed} react={react} className={className} style={style} res={0.5} />;
}

export function Demo() {
  return (
    <BgDemo title="Plasma" note="Interfering sine waves">
      <Plasma />
    </BgDemo>
  );
}
