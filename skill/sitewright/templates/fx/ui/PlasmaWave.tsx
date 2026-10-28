'use client';
import type { CSSProperties } from 'react';
import { BgDemo } from './_bg-a';
import { ShaderBg } from './_bg-a-gl';
import { GLSL_COMPOSE } from './_bg-e';

export interface PlasmaWaveProps {
  /** Flow speed multiplier (default 1). */
  speed?: number;
  /** Pointer height bends the ribbons, 0 to 1 (default 0.6). */
  react?: number;
  className?: string;
  style?: CSSProperties;
}

const FRAG = GLSL_COMPOSE + `
void main(){
  vec2 uv=gl_FragCoord.xy/uRes;
  float asp=uRes.x/uRes.y;
  vec2 p=vec2((uv.x-.5)*asp,uv.y-.5);
  float t=uT*.32;
  vec3 acc=vec3(0.);
  for(int i=0;i<8;i++){
    float k=float(i);
    float f=k/7.;
    float y=(f-.5)*.34
      +.13*sin(p.x*(1.8+k*.3)+t*(1.+k*.11)+k*.9)
      +.05*sin(p.x*(5.+k*.4)-t*1.6+k*2.1);
    y+=(uPtr.y-.5)*uAmt*.3*(1.-abs(f-.5)*1.4)*cos(p.x*1.2+k);
    float d=abs(p.y-y);
    float glow=.011/(d+.011);
    float core=.0022/(d+.0022);
    float pulse=.62+.38*sin(p.x*3.+t*1.5+k*1.7);
    vec3 c=mix(uPri,uSig,f);
    acc+=c*(glow*.55+core*.7)*pulse*.62;
  }
  vec3 base=mix(uSurf,uPri,.1+.12*(1.-uv.y));
  gl_FragColor=vec4(bgeCompose(base,acc),1.);
}`;

/**
 * Eight glowing ribbons of plasma that undulate across the width, shifting from --primary to --signal with a bright
 * core and soft halo each; the pointer's height bends the bundle. Fills its parent (`position:absolute; inset:0`):
 * put it first inside a `position:relative` section. Decorative (aria-hidden); a still frame under reduced motion;
 * a CSS ribbon rendering without WebGL.
 */
export default function PlasmaWave({ speed = 1, react = 0.6, className, style }: PlasmaWaveProps) {
  return <ShaderBg cls="ui-plasma-wave" frag={FRAG} speed={speed} react={react} className={className} style={style} res={0.7} />;
}

export function Demo() {
  return (
    <BgDemo title="Plasma wave" note="Ribbons of energy">
      <PlasmaWave />
    </BgDemo>
  );
}
