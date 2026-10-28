'use client';
import type { CSSProperties } from 'react';
import { fullscreenScene, mix3, useGL } from './_t1';
import { DemoShell } from './_bg-b-kit';

export interface FerrofluidProps {
  /** Spike height, 0..1 (default 0.7). */
  spikes?: number;
  /** Drift speed multiplier (default 1). */
  speed?: number;
  /** The pointer is a magnet that raises spikes and drags the fluid (default true). */
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
}

const FRAG = `
uniform vec4 uB[5]; uniform vec3 uM[3]; uniform float uAsp,uSp; uniform vec3 uBg,uInk,uPri,uSig;
varying vec2 vUv;
vec2 hexc(vec2 p){vec2 r=vec2(1.,1.7320508);vec2 a=mod(p,r)-r*.5;vec2 b=mod(p-r*.5,r)-r*.5;return dot(a,a)<dot(b,b)?a:b;}
float mag(vec2 p){float m=0.;for(int i=0;i<3;i++){vec2 d=p-uM[i].xy;m+=uM[i].z*exp(-dot(d,d)*7.);}return m;}
float blob(vec2 p){float f=0.;for(int i=0;i<5;i++){vec2 d=p-uB[i].xy;f+=uB[i].z*uB[i].z/(dot(d,d)+.0006);}return f;}
// returns height (0 outside the fluid); w = coverage
float heightAt(vec2 p,out float cov){
  float f=blob(p);
  float m=clamp(mag(p),0.,1.4);
  vec2 q=hexc(p/.05);
  float cone=pow(max(0.,1.-length(q)*1.75),3.4);
  float spike=cone*(.18+m*1.3)*uSp;
  float s=f+spike*.5;
  cov=smoothstep(1.,1.1,s);
  float dome=sqrt(clamp(f-.55,0.,3.))*.5;
  return (dome*.35+spike*.9)*cov;
}
void main(){
  vec2 p=(vUv-.5)*vec2(uAsp,1.);
  float cov;
  float h=heightAt(p,cov);
  float e=.0035,c1,c2;
  float hx=heightAt(p+vec2(e,0.),c1),hy=heightAt(p+vec2(0.,e),c2);
  vec3 n=normalize(vec3(-(hx-h)/e*.5,-(hy-h)/e*.5,1.));
  vec3 L=normalize(vec3(-.4,.6,.7));
  float diff=max(dot(n,L),0.);
  float spec=pow(max(dot(n,normalize(L+vec3(0.,0.,1.))),0.),70.);
  float rim=pow(1.-n.z,2.);
  vec3 fluid=mix(vec3(.02,.02,.03),uPri*.3,.18);
  float ao=smoothstep(0.,.45,h*2.2);
  float sky=pow(clamp(n.y*.9+.45,0.,1.),3.);
  fluid+=uPri*.22*diff*diff+uSig*.22*rim+mix(uPri,vec3(1.),.6)*sky*.5*ao+vec3(1.)*spec*1.2;
  fluid*=mix(.3,1.,ao);
  float m=clamp(mag(p),0.,1.);
  vec3 bg=uBg+uPri*.06*m;
  // soft contact shadow around the fluid
  float f=blob(p);
  bg=mix(bg,uInk,.07*smoothstep(.35,1.,f)*(1.-cov));
  vec3 col=mix(bg,fluid,cov);
  gl_FragColor=vec4(col,1.);
}`;

/**
 * A pool of black, glossy ferrofluid: soft metaball puddles drifting about, with a lattice of sharp magnetic spikes that
 * rises wherever a magnet is near. The pointer (listened on the window, relative to this element) is a magnet; on touch
 * two magnets wander on their own. Fills its parent (first child of a `position:relative` section). Decorative
 * (aria-hidden); a still frame with reduced motion; a CSS rendering when WebGL is unavailable.
 */
export default function Ferrofluid({ spikes = 0.7, speed = 1, interactive = true, className, style }: FerrofluidProps) {
  const { wrapRef, canvasRef, status } = useGL(
    (env) => {
      let mx = 0.5, my = 0.5, hov = 0, started = false;
      const arr = new Float32Array(20);
      const mags = new Float32Array(9);
      return fullscreenScene(env.gl, FRAG, () => (t, dt, e, pr) => {
        const tt = t * speed;
        const gl = e.gl;
        const live = interactive && e.ptr.inside && !e.coarse && !e.reduced;
        if (!started) { started = true; mx = 0.5; my = 0.5; }
        const k = e.reduced ? 1 : 1 - Math.exp(-dt * 6);
        const tx = live ? e.ptr.x : 0.5 + Math.sin(tt * 0.31) * 0.25, ty = live ? e.ptr.y : 0.5 + Math.cos(tt * 0.23) * 0.2;
        mx += (tx - mx) * k; my += (ty - my) * k; hov += ((live ? 1 : 0) - hov) * (e.reduced ? 1 : 1 - Math.exp(-dt * 4));
        const A = e.aspect;
        // puddles: five slow orbits, the nearest ones drift toward the magnet
        for (let i = 0; i < 5; i++) {
          const ph = i * 1.9;
          let x = Math.sin(tt * (0.17 + i * 0.043) + ph) * (0.28 * A) * (0.6 + i * 0.14);
          let y = Math.cos(tt * (0.21 + i * 0.037) + ph * 1.3) * 0.26 * (0.7 + i * 0.1);
          const mxw = (mx - 0.5) * A, myw = my - 0.5;
          x += (mxw - x) * 0.12 * hov; y += (myw - y) * 0.12 * hov;
          arr.set([x, y, (0.12 + 0.03 * Math.sin(tt * 0.6 + ph)) * (i === 0 ? 1.45 : 1) * Math.min(1, 0.65 + A * 0.25), 0], i * 4);
        }
        mags.set([(mx - 0.5) * A, my - 0.5, 0.55 + 0.7 * hov], 0);
        mags.set([Math.sin(tt * 0.27 + 2) * 0.3 * A, Math.cos(tt * 0.35) * 0.22, 0.5], 3);
        mags.set([Math.cos(tt * 0.22 + 4) * 0.34 * A, Math.sin(tt * 0.29 + 1) * 0.24, 0.42], 6);
        gl.uniform4fv(pr.u('uB'), arr); gl.uniform3fv(pr.u('uM'), mags);
        gl.uniform1f(pr.u('uAsp'), A); gl.uniform1f(pr.u('uSp'), Math.max(0, Math.min(1.2, spikes)) * 1.15);
        gl.uniform3fv(pr.u('uBg'), mix3(e.pal.surface, e.pal.primary, 0.07));
        gl.uniform3fv(pr.u('uInk'), e.pal.ink); gl.uniform3fv(pr.u('uPri'), e.pal.primary); gl.uniform3fv(pr.u('uSig'), mix3(e.pal.signal, e.pal.primary, 0.3));
      });
    },
    { res: 0.8, maxPixels: 1.6e6, pointer: interactive },
  );
  return (
    <div ref={wrapRef} className={'ui-ferrofluid' + (className ? ' ' + className : '')} style={style} data-gl={status} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-ferrofluid-canvas" hidden={status === 'off'} />
    </div>
  );
}

export function Demo() {
  return <DemoShell bg={<Ferrofluid />} title="Liquid magnet" sub="Bring the pointer close to raise spikes." align="start" />;
}
