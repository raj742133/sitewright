'use client';
import type { CSSProperties } from 'react';
import { BgDemo } from './_bg-a';
import { ShaderBg } from './_bg-a-gl';

export interface BalatroProps {
  /** Swirl speed multiplier (default 1). */
  speed?: number;
  /** Pointer nudges the vortex centre, 0 to 1 (default 0.6). */
  react?: number;
  className?: string;
  style?: CSSProperties;
}

const FRAG = `
void main(){
  float asp=uRes.x/uRes.y;
  float px=max(3.,floor(uRes.y/120.));
  vec2 fc=(floor(gl_FragCoord.xy/px)+.5)*px;
  vec2 p=(fc-.5*uRes)/uRes.y*2.3;
  p-=(uPtr-.5)*vec2(asp,1.)*uAmt*1.2;
  float t=uT*.16;
  float r=length(p),a=atan(p.y,p.x);
  a+=r*2.3-t*1.3+sin(r*3.-t)*.7;
  vec2 q=vec2(cos(a),sin(a))*r;
  for(int i=0;i<5;i++){
    float k=float(i);
    q+=.55*vec2(sin(q.y*1.7+t+k),cos(q.x*1.9-t*1.1+k*1.3));
    q*=1.06;
  }
  float v=(sin(q.x*1.3)+cos(q.y*1.2)+sin(length(q)*1.5-t*2.))/6.+.5;
  float s=v*4.;
  float lv=floor(s),fr=fract(s);
  vec3 c0=mix(uSurf,uPri,.14),c1=mix(uSurf,uPri,.5),c2=uPri,c3=uSig;
  vec3 col=lv<1.?c0:lv<2.?c1:lv<3.?c2:c3;
  col=mix(col,uInk,.38*(1.-smoothstep(.0,.1,fr)));
  col=mix(col,uSurf,.2*smoothstep(.9,1.,fr));
  float vg=smoothstep(1.5,.3,length((fc-.5*uRes)/uRes.y));
  col=mix(uInk*.35+uSurf*.2,col,.55+.45*vg);
  gl_FragColor=vec4(col,1.);
}`;

/**
 * A pixelated, posterised paint swirl: a spiral vortex whose domain-warped folds are cut into four flat
 * tones (surface to --primary to --signal) with inked contours, like a card-table felt. Fills its parent: put it first
 * inside a `position:relative` section. Decorative; static frame under reduced motion; CSS conic gradient without WebGL.
 */
export default function Balatro({ speed = 1, react = 0.6, className, style }: BalatroProps) {
  return <ShaderBg cls="ui-balatro" frag={FRAG} speed={speed} react={react} className={className} style={style} res={0.5} />;
}

export function Demo() {
  return (
    <BgDemo title="Balatro" note="Posterised vortex">
      <Balatro />
    </BgDemo>
  );
}
