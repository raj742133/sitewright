'use client';
import type { CSSProperties } from 'react';
import { BgDemo } from './_bg-a';
import { ShaderBg } from './_bg-a-gl';
import { GLSL_NOISE2 } from './_t1';

export interface DarkVeilProps {
  /** Drift speed multiplier (default 1). */
  speed?: number;
  /** Pointer lights the folds near it, 0 to 1 (default 0.7). */
  react?: number;
  className?: string;
  style?: CSSProperties;
}

const FRAG = `
${GLSL_NOISE2}
void main(){
  float asp=uRes.x/uRes.y;
  vec2 p=vec2(vUv.x*asp,vUv.y);
  float t=uT*.07;
  float n=fbm(vec2(p.x*1.4,p.y*.3+t));
  float f1=sin(p.x*5.+n*5.5+t*2.)*.5+.5;
  float f2=sin(p.x*13.-n*4.-t*1.6)*.5+.5;
  float sh=mix(f1,f2,.35);
  vec3 deep=mix(uDeep,vec3(0.),.45);
  vec3 col=mix(deep,mix(deep,uPri,.6),sh*sh);
  col+=uPri*smoothstep(.78,1.,sh)*.34*(.5+.5*(1.-vUv.y));
  col+=uSig*pow(1.-vUv.y,5.)*.34*(.4+.6*f1);
  col=mix(col,deep,smoothstep(.6,1.,vUv.y)*.4);
  vec2 m=(uPtr-.5)*vec2(asp,1.)+vec2(asp*.5,.5);
  vec2 dm=p-m;
  col+=mix(uPri,uPale,.4)*exp(-dot(dm,dm)*9.)*uAmt*.3*(.4+sh);
  col*=1.-.4*dot(vUv-.5,vUv-.5)*2.;
  col+=(hash(gl_FragCoord.xy+fract(uT))-.5)/150.;
  gl_FragColor=vec4(col,1.);
}`;

/**
 * Hanging curtains of dark, slowly breathing folds lit from below by --signal and along their crests by
 * --primary, over the darker of --surface/--ink so it stays deep in both themes. Fills its parent: put it
 * first inside a `position:relative` section. Decorative; static frame under reduced motion; CSS folds without WebGL.
 */
export default function DarkVeil({ speed = 1, react = 0.7, className, style }: DarkVeilProps) {
  return <ShaderBg cls="ui-dark-veil" frag={FRAG} speed={speed} react={react} className={className} style={style} res={0.5} />;
}

export function Demo() {
  return (
    <BgDemo title="Dark veil" note="Curtains of shadow and light">
      <DarkVeil />
    </BgDemo>
  );
}
