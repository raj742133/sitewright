'use client';
import type { CSSProperties } from 'react';
import { BgDemo } from './_bg-a';
import { ShaderBg } from './_bg-a-gl';
import { BG_D_NOISE } from './_bg-d';

export interface LiquidEtherProps {
  /** Flow speed multiplier (default 1). */
  speed?: number;
  /** Pointer stirs the fluid, 0 to 1 (default 0.9). */
  react?: number;
  className?: string;
  style?: CSSProperties;
}

const FRAG = BG_D_NOISE + `
vec2 bdFlow(vec2 p,float t){
  float e=.1;
  float a=bdF(p+vec2(0.,e)+t)-bdF(p-vec2(0.,e)+t);
  float b=bdF(p+vec2(e,0.)+t)-bdF(p-vec2(e,0.)+t);
  return vec2(a,-b)/(2.*e);
}
void main(){
  float asp=uRes.x/uRes.y;
  vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y*1.8;
  float t=uT*.12;
  vec2 m=(uPtr-.5)*vec2(asp,1.)*1.8;
  vec2 d=p-m;
  float k=exp(-dot(d,d)*1.6)*uAmt;
  p+=vec2(-d.y,d.x)*k*1.1;
  vec2 w=p;
  for(int i=0;i<3;i++) w+=bdFlow(w*.7,t*(1.+float(i)*.35))*.42;
  float f=bdF(w*.8-t);
  float g=bdF(w*.5+vec2(4.,1.)+t*1.3);
  vec3 c1=mix(uSurf,uPri,.18);
  vec3 c2=mix(uSurf,uPri,.95);
  vec3 c3=mix(uSig,uSurf,.15);
  vec3 col=mix(c1,c2,smoothstep(.38,.58,f));
  col=mix(col,c3,smoothstep(.55,.85,g)*smoothstep(.35,.7,f)*.85);
  col=mix(col,mix(uSurf,uInk,.5),smoothstep(.62,.75,1.-f)*.28);
  
  gl_FragColor=vec4(col,1.);
}`;

/**
 * Colour that flows like ink in water: curl-noise currents carry soft blooms of --primary and --signal over
 * the surface colour, and the pointer drags a swirl through them. Fills its parent: put it first inside a
 * `position:relative` section. Decorative; static frame under reduced motion; CSS blobs without WebGL.
 */
export default function LiquidEther({ speed = 1, react = 0.9, className, style }: LiquidEtherProps) {
  return <ShaderBg cls="ui-liquid-ether" frag={FRAG} speed={speed} react={react} className={className} style={style} res={0.5} />;
}

export function Demo() {
  return (
    <BgDemo title="Liquid ether" note="Flowing colour, stirred by the pointer">
      <LiquidEther />
    </BgDemo>
  );
}
