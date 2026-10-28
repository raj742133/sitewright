'use client';
import type { CSSProperties } from 'react';
import { BgDemo } from './_bg-a';
import { ShaderBg } from './_bg-a-gl';
import { BG_D_NOISE } from './_bg-d';

export interface MoltenMetalProps {
  /** Flow speed multiplier (default 1). */
  speed?: number;
  /** Pointer heats the metal under it, 0 to 1 (default 0.7). */
  react?: number;
  className?: string;
  style?: CSSProperties;
}

const FRAG = BG_D_NOISE + `
void main(){
  float asp=uRes.x/uRes.y;
  vec2 p=(gl_FragCoord.xy-.5*uRes)/uRes.y*2.2;
  float t=uT*.1;
  vec2 q=p+.5*vec2(bdF(p*.9+vec2(t,0.)),bdF(p*.9+vec2(0.,-t)+5.));
  q+=.35*vec2(sin(q.y*2.+t*3.),cos(q.x*2.2-t*2.));
  float f=bdF(q*1.2+vec2(0.,t*1.5));
  float seam=1.-smoothstep(.0,.06,abs(f-.5));
  float seam2=1.-smoothstep(.0,.035,abs(bdF(q*2.3-t)-.5));
  vec2 m=(uPtr-.5)*vec2(asp,1.)*2.2;
  float heat=exp(-dot(p-m,p-m)*1.8)*uAmt;
  float glow=clamp(seam*(.65+.35*sin(uT*.6+f*9.))+seam2*.35+heat*.8,0.,1.2);
  vec3 crust=mix(uDeep,uPri,.1+.14*f);
  crust=mix(crust,uPale,.07*smoothstep(.55,.9,f));
  vec3 hot=mix(uPri,mix(uPri,uSig,.5),smoothstep(.3,.8,glow));
  hot=mix(hot,mix(uSig,uPale,.8),smoothstep(.8,1.15,glow));
  vec3 col=mix(crust,hot,smoothstep(.05,.75,glow));
  col+=hot*.12*smoothstep(.0,.5,seam)*(1.-smoothstep(.5,1.,seam));
  col=mix(col,uDeep,smoothstep(.9,1.7,length(p))*.4);
  gl_FragColor=vec4(col,1.);
}`;

/**
 * Glowing flowing metal: a dark cooled crust broken by slow-moving seams that burn from --primary through
 * --signal to near white, with the pointer heating the metal beneath it. Fills its parent: put it first inside a
 * `position:relative` section. Decorative; static frame under reduced motion; CSS glow veins without WebGL.
 */
export default function MoltenMetal({ speed = 1, react = 0.7, className, style }: MoltenMetalProps) {
  return <ShaderBg cls="ui-molten-metal" frag={FRAG} speed={speed} react={react} className={className} style={style} res={0.5} />;
}

export function Demo() {
  return (
    <BgDemo title="Molten metal" note="Glowing seams in a cooling crust">
      <MoltenMetal />
    </BgDemo>
  );
}
