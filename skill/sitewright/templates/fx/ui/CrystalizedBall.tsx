'use client';
import { useRef, type CSSProperties } from 'react';
import { fullscreenScene, mix3, useGL } from './_t1';

export interface CrystalizedBallProps {
  /** Facet density, 2..6: higher means more, smaller facets (default 4). */
  facets?: number;
  /** Auto-spin speed in turns per minute; 0 stops it (default 5). */
  spin?: number;
  /** The ball turns to face the pointer (default true). */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

const FRAG = `
uniform vec3 uA,uB,uInk,uSurf; uniform float uAsp,uFacets; uniform mat3 uRot;
varying vec2 vUv;
vec3 h3(vec3 p){p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));return fract(sin(p)*43758.5453);}
void main(){
  vec2 q=(vUv-.5)*vec2(uAsp,1.)/.43;
  float r2=dot(q,q);
  float px=2./(.43*uRes.y);
  float rr=sqrt(r2);
  float edge=smoothstep(1.,1.-px*2.,rr);
  // soft contact glow under the ball
  vec2 gq=q-vec2(0.,-1.12);
  float shadow=exp(-dot(gq*vec2(.55,2.6),gq*vec2(.55,2.6)))*.28;
  vec3 glow=mix(uA,uB,.4);
  if(r2>=1.){
    float halo=exp(-(rr-1.)*5.)*.22;
    gl_FragColor=vec4(glow*(shadow+halo)*(1.-edge),(shadow+halo)*(1.-edge));
    return;
  }
  vec3 nv=vec3(q,sqrt(1.-r2));
  vec3 no=uRot*nv;                       // object-space normal
  vec3 sp=no*uFacets;
  vec3 ip=floor(sp),fp=fract(sp);
  float f1=9.,f2=9.; vec3 best=vec3(0.); vec3 bid=vec3(0.);
  for(int k=-1;k<=1;k++)for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){
    vec3 g=vec3(float(i),float(j),float(k));
    vec3 o=h3(ip+g);
    vec3 d=g+o-fp;
    float dd=dot(d,d);
    if(dd<f1){f2=f1;f1=dd;best=ip+g+o;bid=ip+g;}else if(dd<f2){f2=dd;}
  }
  vec3 fo=normalize(mix(no,normalize(best),.78));   // facet normal in object space
  vec3 fn=normalize(fo*uRot);                          // back to view space (rot is orthonormal)
  vec3 L=normalize(vec3(-.45,.65,.6));
  float diff=max(dot(fn,L),0.);
  vec3 H=normalize(L+vec3(0.,0.,1.));
  float spec=pow(max(dot(fn,H),0.),70.);
  float fres=pow(1.-fn.z,2.2);
  float id=h3(bid).x;
  vec3 tint=mix(uA,uB,id);
  vec3 deep=uA*.5+uInk*.05;
  vec3 col=mix(deep,tint*1.12,.38+.62*pow(diff,.8));
  col+=mix(uSurf,uB,.5)*fres*.32;
  col+=vec3(1.)*spec*.85;
  // inner refraction look: brighter where the facet faces away from the light
  col+=tint*.12*(1.-diff)*(.5+.5*sin(id*40.+uT));
  float ln=smoothstep(.0,.028,sqrt(f2)-sqrt(f1));
  col=mix(uSurf*.85+tint*.15,col,ln);
  col*=1.-.18*pow(rr,4.);
  gl_FragColor=vec4(col*edge,edge);
}`;

function rotMat(yaw: number, pitch: number): number[] {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  // column-major mat3 = Ry * Rx
  return [cy, 0, -sy, sy * sp, cp, cy * sp, sy * cp, -sp, cy * cp];
}

/**
 * A faceted crystal ball: a sphere split into flat voronoi facets, each lit separately with
 * specular glints and a bright edge. It turns slowly and leans toward the pointer. A fragment
 * shader centred in its parent; decorative (aria-hidden); a still frame with reduced motion; a CSS
 * faceted sphere if WebGL is unavailable.
 */
export default function CrystalizedBall({ facets = 4, spin = 5, interactive = true, className, style }: CrystalizedBallProps) {
  const ang = useRef({ yaw: 0.6, pitch: -0.25, lx: 0 });
  const { wrapRef, canvasRef, status } = useGL(
    (env) =>
      fullscreenScene(env.gl, FRAG, () => (t, dt, e, pr) => {
        const g = e.gl;
        const a = ang.current;
        const tx = interactive && e.ptr.inside && !e.coarse && !e.reduced ? (e.ptr.x - 0.5) * 1.6 : 0;
        const ty = interactive && e.ptr.inside && !e.coarse && !e.reduced ? (e.ptr.y - 0.5) * 0.9 : 0;
        const spinRad = e.reduced ? 0 : (spin * Math.PI * 2) / 60;
        a.yaw += spinRad * dt;
        const k = 1 - Math.pow(0.02, dt);
        const lean = (v: number, to: number) => v + (to - v) * k;
        a.pitch = lean(a.pitch, -0.25 + ty);
        a.lx = lean(a.lx, tx);
        const yawEff = a.yaw + a.lx;
        g.uniformMatrix3fv(pr.u('uRot'), false, new Float32Array(rotMat(yawEff, a.pitch)));
        g.uniform1f(pr.u('uAsp'), e.aspect);
        g.uniform1f(pr.u('uFacets'), Math.max(1.5, Math.min(7, facets)));
        g.uniform3fv(pr.u('uA'), e.pal.primary);
        g.uniform3fv(pr.u('uB'), mix3(e.pal.signal, [1, 1, 1], 0.1));
        g.uniform3fv(pr.u('uInk'), mix3(e.pal.ink, [0, 0, 0], 0.4));
        g.uniform3fv(pr.u('uSurf'), mix3(e.pal.surface, [1, 1, 1], 0.3));
      }),
    { res: 1, maxPixels: 1.6e6 },
  );
  return (
    <div ref={wrapRef} className={'ui-crystalized-ball' + (className ? ' ' + className : '')} style={style} data-gl={status} aria-hidden="true">
      <div className="ui-crystalized-ball-fallback" />
      <canvas ref={canvasRef} className="ui-crystalized-ball-canvas" hidden={status === 'off'} />
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-crystalized-ball-stage">
      <CrystalizedBall />
    </div>
  );
}
