'use client';
import type { CSSProperties } from 'react';
import { BgDemo } from './_bg-a';
import { ShaderBg } from './_bg-a-gl';

export interface ColorBendsProps {
  /** Flow speed multiplier (default 1). */
  speed?: number;
  /** Number of colour bands across the view (default 3.2). */
  bands?: number;
  /** Pointer bends the ribbons, 0 to 1 (default 0.7). */
  react?: number;
  className?: string;
  style?: CSSProperties;
}

const FRAG = `
uniform float uBands;
void main(){
  float asp=uRes.x/uRes.y;
  vec2 p=(vUv-.5)*vec2(asp,1.);
  vec2 m=(uPtr-.5)*vec2(asp,1.);
  float t=uT*.14;
  float ang=.55+.18*sin(t*.6);
  vec2 d=vec2(cos(ang),sin(ang));
  float s=dot(p,d)*uBands;
  s+=.42*sin(p.y*3.1+t*2.)+.26*sin(p.x*4.4-t*1.6+p.y*2.)+.1*sin((p.x+p.y)*9.+t*3.);
  vec2 dm=p-m;
  s+=uAmt*1.3*exp(-dot(dm,dm)*7.);
  float band=floor(s),f=fract(s);
  float h=mod(band,4.);
  vec3 A=uPri,B=mix(uSurf,uPri,.22),C=uSig,D=mix(uSurf,uInk,.1);
  vec3 c=h<1.?A:h<2.?B:h<3.?C:D;
  float ribbon=smoothstep(0.,.5,f)*smoothstep(1.,.5,f);
  c=mix(c,mix(c,vec3(1.),.35),(1.-f)*.5);
  c=mix(c,c*.72,smoothstep(.55,1.,f)*.6);
  float seam=smoothstep(0.,.035,f)*smoothstep(1.,.965,f);
  c=mix(uSurf,c,seam);
  c+=(fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5)/160.+ribbon*0.;
  gl_FragColor=vec4(c,1.);
}`;

/**
 * Soft ribbons of colour that sweep diagonally and bend like folded paper, cycling --primary, --signal and
 * tinted surface tones with shaded edges; the pointer pushes a bulge through them. Fills its parent: put it first inside a
 * `position:relative` section. Decorative; static frame under reduced motion; CSS stripes without WebGL.
 */
export default function ColorBends({ speed = 1, bands = 3.2, react = 0.7, className, style }: ColorBendsProps) {
  return (
    <ShaderBg
      cls="ui-color-bends" frag={FRAG} speed={speed} react={react} className={className} style={style}
      bind={(g, pr) => g.uniform1f(pr.u('uBands'), Math.max(1, Math.min(8, bands)))}
    />
  );
}

export function Demo() {
  return (
    <BgDemo title="Color bends" note="Ribbons that fold and flow">
      <ColorBends />
    </BgDemo>
  );
}
