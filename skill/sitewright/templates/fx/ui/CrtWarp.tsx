'use client';
import type { CSSProperties } from 'react';
import { BgDemo } from './_bg-a';
import { ShaderBg } from './_bg-a-gl';

export interface CrtWarpProps {
  /** Animation speed multiplier (default 1). */
  speed?: number;
  /** Barrel curvature 0..1 (default 0.55). */
  curve?: number;
  /** Pointer tugs a horizontal tear of the picture, 0 to 1 (default 0.6). */
  react?: number;
  className?: string;
  style?: CSSProperties;
}

const FRAG = `
uniform float uCurve;
vec3 scene(vec2 cp,float t){
  float g1=.5+.5*sin(cp.x*2.4+t*.7)*sin(cp.y*3.2-t*.5);
  float g2=.5+.5*sin(length(cp-vec2(.6*sin(t*.3),.3*cos(t*.4)))*5.-t*1.1);
  vec3 c=mix(uDeep,mix(uDeep,uPri,.5),g1*.9);
  c+=uSig*pow(g2,3.)*.5*smoothstep(.2,.9,g1);
  c+=uPri*.6*pow(g2*g1,2.);
  vec2 gr=abs(fract(cp*vec2(3.,3.)+.5)-.5);
  c+=mix(uPri,uPale,.5)*.22*(1.-smoothstep(0.,.03,min(gr.x,gr.y)));
  return c;
}
void main(){
  float asp=uRes.x/uRes.y;
  vec2 uv=vUv*2.-1.;
  float k=.04+.16*uCurve;
  vec2 u=uv*(1.+k*dot(uv,uv))/(1.+k);
  float tear=uAmt*exp(-pow((vUv.y-uPtr.y)*9.,2.))*.05*sin(vUv.y*220.+uT*30.);
  u.x+=tear;
  vec2 cp=u*vec2(asp,1.)*1.3;
  float t=uT*.5;
  vec3 c=vec3(scene(cp+vec2(.006,0.),t).r,scene(cp,t).g,scene(cp-vec2(.006,0.),t).b);
  float sp=max(2.,floor(uRes.y/150.));
  float sl=.72+.28*sin(gl_FragCoord.y/sp*6.28318);
  float xi=mod(floor(gl_FragCoord.x/max(1.,sp*.5)),3.);
  vec3 mask=vec3(xi<.5?1.:.8,(xi>.5&&xi<1.5)?1.:.8,xi>1.5?1.:.8);
  c*=sl*mask*1.5;
  float roll=fract(uv.y*.5+.5-uT*.06);
  c*=1.+.2*smoothstep(.0,.12,roll)*smoothstep(.3,.12,roll);
  c*=1.-.45*dot(uv,uv)*.5;
  float edge=max(abs(u.x),abs(u.y));
  float inside=1.-smoothstep(.985,1.,edge);
  vec3 bezel=uDeep*.55;
  gl_FragColor=vec4(mix(bezel,c,inside),1.);
}`;

/**
 * A CRT-style warp: a glowing signal field seen through barrel-curved glass, with scanlines, an RGB phosphor
 * mask, colour fringing, a rolling brightness bar and a vignette; the pointer pulls a horizontal tear into the picture.
 * Tube tones come from --primary, --signal and the darker of --surface/--ink. Fills its parent: put it first
 * inside a `position:relative` section. Decorative; static frame under reduced motion; CSS scanlines without WebGL.
 */
export default function CrtWarp({ speed = 1, curve = 0.55, react = 0.6, className, style }: CrtWarpProps) {
  return (
    <ShaderBg
      cls="ui-crtwarp" frag={FRAG} speed={speed} react={react} className={className} style={style} res={0.75}
      bind={(g, pr) => g.uniform1f(pr.u('uCurve'), Math.max(0, Math.min(1, curve)))}
    />
  );
}

export function Demo() {
  return (
    <BgDemo title="CRT warp" note="Curved glass, scanlines, phosphor">
      <CrtWarp />
    </BgDemo>
  );
}
