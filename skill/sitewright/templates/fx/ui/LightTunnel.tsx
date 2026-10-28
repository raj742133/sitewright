'use client';
import type { CSSProperties } from 'react';
import { BgDemo } from './_bg-a';
import { ShaderBg } from './_bg-a-gl';

export interface LightTunnelProps {
  /** Travel speed multiplier (default 1). */
  speed?: number;
  /** Pointer steers the vanishing point, 0 to 1 (default 0.7). */
  react?: number;
  className?: string;
  style?: CSSProperties;
}

const FRAG = `
void main(){
  vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  p-=(uPtr-.5)*vec2(uRes.x/uRes.y,1.)*uAmt*.5;
  p+=.03*vec2(sin(uT*.21),cos(uT*.17));
  vec2 q=abs(p);
  float r=pow(pow(q.x,4.)+pow(q.y,4.),.25);
  float a=atan(p.y,p.x);
  float z=.22/max(r,.001);
  float run=z*2.6-uT*.55;
  float fr=fract(run);
  float edge=smoothstep(.0,.05,fr)*(1.-smoothstep(.1,.3,fr));
  float seg=floor(a*3.8197+floor(run)*.5);
  float on=step(.35,fract(sin(seg*12.9898+floor(run)*4.1)*43758.5453));
  float side=smoothstep(.5,.46,abs(fract(a*3.8197*2.)-.5));
  vec3 base=mix(uSurf,uPri,.1);
  vec3 ring=mix(uPri,uSig,smoothstep(.2,.9,fract(floor(run)*.37)));
  float fog=smoothstep(.0,.55,r);
  float depth=smoothstep(.02,.9,r);
  float I=edge*(.45+.55*on)*smoothstep(.0,.25,r)*(1.-.0*fog);
  vec3 col=base;
  col=mix(col,ring,clamp(I*1.1,0.,1.));
  float rib=smoothstep(.06,.0,abs(fract(a*3.8197*2.)-.5)*r*3.-.02);
  col=mix(col,mix(uPri,uInk,.35),rib*.07*fog*(1.-edge));
  float core=exp(-r*5.5);
  col=mix(col,mix(uSig,uPale,.55),core*.85);
  col=mix(col,mix(uSurf,uInk,.45),smoothstep(.55,1.2,length(p))*.45);
  gl_FragColor=vec4(col,1.);
}`;

/**
 * A rushing square tunnel of light rings with broken segments racing toward a glowing vanishing point,
 * in --primary and --signal. Fills its parent: put it first inside a `position:relative` section.
 * Decorative; the pointer steers the vanishing point; static frame under reduced motion; CSS rings without WebGL.
 */
export default function LightTunnel({ speed = 1, react = 0.7, className, style }: LightTunnelProps) {
  return <ShaderBg cls="ui-light-tunnel" frag={FRAG} speed={speed} react={react} className={className} style={style} res={0.6} />;
}

export function Demo() {
  return (
    <BgDemo title="Light tunnel" note="Rings racing to a vanishing point">
      <LightTunnel />
    </BgDemo>
  );
}
