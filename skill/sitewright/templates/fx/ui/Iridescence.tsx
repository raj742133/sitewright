'use client';
import type { CSSProperties } from 'react';
import { clamp, fullscreenScene, GLSL_NOISE2, useGL } from './_t1';
import { BgcDemo } from './_bg-c-demo';

export interface IridescenceProps {
  /** Flow speed multiplier (default 1). */
  speed?: number;
  /** How strongly the film's colours cycle, 0 to 1 (default 0.7). */
  shimmer?: number;
  /** How much the pointer disturbs the film, 0 to 1 (default 0.7). */
  touch?: number;
  className?: string;
  style?: CSSProperties;
}

const FRAG = `
uniform vec2 uPtr; uniform float uAmt, uShim, uDark; uniform vec3 uP, uS, uSurf, uInk;
varying vec2 vUv;
${GLSL_NOISE2}
float film(vec2 p, float t){
  vec2 q=vec2(fbm(p*1.1+vec2(0.,t)),fbm(p*1.1+vec2(4.7,-t*.8)));
  return fbm(p*.9+q*1.9+vec2(t*.4,3.1));
}
void main(){
  float asp=uRes.x/uRes.y;
  vec2 p=(vUv-.5)*vec2(asp,1.)*1.9;
  vec2 m=(uPtr-.5)*vec2(asp,1.)*1.9;
  vec2 d=p-m;
  float bump=exp(-dot(d,d)*3.2)*uAmt;
  float t=uT*.07;
  float e=.012;
  float f=film(p,t)+bump*.35;
  float fx=film(p+vec2(e,0.),t)+bump*.35;
  float fy=film(p+vec2(0.,e),t)+bump*.35;
  vec3 n=normalize(vec3((f-fx)/e*.07,(f-fy)/e*.07,1.));
  float thick=f*2.2+n.x*.6+uT*.015;
  /* thin-film style colour cycle between the two brand colours, a pearly tint and a faint spectral shimmer */
  float a=.5+.5*sin(thick*6.2831), b2=.5+.5*sin(thick*4.58+2.);
  vec3 pearl=mix(uSurf,vec3(1.),.55);
  vec3 spec=.5+.5*cos(6.2831*(thick*vec3(1.,.93,.82)+vec3(.0,.22,.47)));
  vec3 col=mix(mix(uP,uS,a),pearl,b2*.5);
  col+=(spec-.5)*(.1+.22*uShim);
  float lum=dot(col,vec3(.299,.587,.114));
  col=mix(vec3(lum),col,1.15);
  col=mix(uSurf,col,mix(.8,.9,uDark));
  if(uDark>.5) col*=.62; else col=mix(col,uSurf,.14);
  float spc=pow(max(dot(n,normalize(vec3(-.4,.5,.8))),0.),22.);
  col+=spc*(uDark>.5?.28:.2);
  col+=(hash(gl_FragCoord.xy+fract(uT))-.5)/150.;
  gl_FragColor=vec4(col,1.);
}`;

/**
 * An iridescent, oil-slick surface: a thin-film colour cycle driven by flowing noise, pulled toward the host's
 * --primary and --signal, with a soft specular sheen. The pointer presses a dent into the film. Fills its parent
 * (`position:absolute; inset:0`); decorative (aria-hidden). WebGL (half-resolution, 30 fps cap, paused
 * off-screen); a static conic-gradient shows when WebGL is missing, and a still frame under reduced motion.
 */
export default function Iridescence({ speed = 1, shimmer = 0.7, touch = 0.7, className, style }: IridescenceProps) {
  const { wrapRef, canvasRef, status } = useGL(
    (env) => {
      const sm = { x: 0.5, y: 0.5, a: 0 };
      return fullscreenScene(env.gl, FRAG, () => (t, dt, e, pr) => {
        const k = 1 - Math.exp(-dt * 3);
        const live = e.ptr.inside && !e.coarse && !e.reduced;
        sm.x += (e.ptr.x - sm.x) * (live ? k : 0);
        sm.y += (e.ptr.y - sm.y) * (live ? k : 0);
        sm.a += ((live ? clamp(touch, 0, 1) : 0) - sm.a) * (dt ? k : 1);
        const g = e.gl;
        g.uniform2f(pr.u('uPtr'), sm.x, sm.y);
        g.uniform1f(pr.u('uAmt'), sm.a);
        g.uniform1f(pr.u('uShim'), clamp(shimmer, 0, 1));
        g.uniform1f(pr.u('uT'), t * speed);
        const lum = 0.299 * e.pal.surface[0] + 0.587 * e.pal.surface[1] + 0.114 * e.pal.surface[2];
        g.uniform1f(pr.u('uDark'), lum < 0.45 ? 1 : 0);
        g.uniform3fv(pr.u('uP'), e.pal.primary);
        g.uniform3fv(pr.u('uS'), e.pal.signal);
        g.uniform3fv(pr.u('uSurf'), e.pal.surface);
        g.uniform3fv(pr.u('uInk'), e.pal.ink);
      });
    },
    { res: 0.5, fps: 30, maxPixels: 1.4e6 },
  );
  return (
    <div ref={wrapRef} className={'ui-iridescence' + (className ? ' ' + className : '')} style={style} data-gl={status} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-iridescence-canvas" hidden={status === 'off'} />
    </div>
  );
}

export function Demo() {
  return (
    <BgcDemo title="Oil on water" sub="Move the pointer to press into the film.">
      <Iridescence />
    </BgcDemo>
  );
}
