'use client';
import type { CSSProperties } from 'react';
import { clamp, FS_PRE, GLSL_NOISE2, makeBuffer, makeProgram, useGL } from './_t1';

export interface WireTerrainProps {
  /** Scroll speed in grid rows per second (default 2.2). */
  speed?: number;
  /** Hill height multiplier (default 1). */
  height?: number;
  className?: string;
  style?: CSSProperties;
}

const COLS = 44, ROWS = 40;
const VS = `attribute vec2 aG;
uniform float uScroll,uAsp,uAmp,uYaw,uCamX;
varying float vFade,vH;
${GLSL_NOISE2}
void main(){
  float dz=.75;
  float x=(aG.x/${COLS}.-.5)*16.;
  float rz=aG.y-fract(uScroll);
  float idx=aG.y+floor(uScroll);
  float n=fbm(vec2(x*.32,idx*dz*.32));
  float h=(n-.3)*uAmp*smoothstep(1.,4.5,abs(x));
  vec3 v=vec3(x-uCamX,h-1.7,rz*dz+.5);
  float cy=cos(uYaw),sy=sin(uYaw);
  v=vec3(v.x*cy-v.z*sy,v.y,v.x*sy+v.z*cy);
  float ca=cos(.13),sa=sin(.13);
  vec3 q=vec3(v.x,v.y*ca+v.z*sa,v.z*ca-v.y*sa);
  float f=1.55,N=.3,F=60.;
  gl_Position=vec4(q.x*f/uAsp,q.y*f,q.z*(F+N)/(F-N)-2.*F*N/(F-N),q.z);
  vFade=(1.-smoothstep(9.,29.,q.z))*smoothstep(.3,2.,q.z)*(1.-smoothstep(.72,1.,abs(x)/8.));
  vH=clamp(h/uAmp*2.,0.,1.);
}`;
const FS = `uniform vec3 uA,uB;varying float vFade,vH;
void main(){float a=vFade*(.35+.65*vH+.25);a=clamp(a,0.,1.);gl_FragColor=vec4(mix(uA,uB,vH*.7)*a,a);}`;

/**
 * An endless scrolling wireframe terrain in perspective: a noise-displaced grid of lines with a
 * central valley, hidden-line removal and a horizon fade, drawn in --signal (peaks lean to --primary).
 * The pointer's X position steers the camera slightly. Fills its parent (`position:absolute; inset:0`).
 * Decorative (aria-hidden); one still frame with reduced motion; CSS horizon glow fallback.
 */
export default function WireTerrain({ speed = 2.2, height = 1, className, style }: WireTerrainProps) {
  const { wrapRef, canvasRef, status } = useGL(
    (env) => {
      const gl = env.gl;
      const prog = makeProgram(gl, VS, FS_PRE + FS, ['aG']);
      const verts: number[] = [];
      for (let z = 0; z <= ROWS; z++) for (let x = 0; x <= COLS; x++) verts.push(x, z);
      const at = (x: number, z: number) => z * (COLS + 1) + x;
      const lines: number[] = [], tris: number[] = [];
      for (let z = 0; z <= ROWS; z++) for (let x = 0; x < COLS; x++) lines.push(at(x, z), at(x + 1, z));
      for (let x = 0; x <= COLS; x++) for (let z = 0; z < ROWS; z++) lines.push(at(x, z), at(x, z + 1));
      for (let z = 0; z < ROWS; z++) for (let x = 0; x < COLS; x++) tris.push(at(x, z), at(x + 1, z), at(x, z + 1), at(x + 1, z), at(x + 1, z + 1), at(x, z + 1));
      const vb = makeBuffer(gl, new Float32Array(verts));
      const lb = makeBuffer(gl, new Uint16Array(lines), gl.ELEMENT_ARRAY_BUFFER);
      const tb = makeBuffer(gl, new Uint16Array(tris), gl.ELEMENT_ARRAY_BUFFER);
      let scroll = 7.3, cam = 0;
      return {
        draw(t, dt, e) {
          if (!e.reduced) scroll += dt * speed;
          const target = e.ptr.inside && !e.coarse && !e.reduced ? e.ptr.x - 0.5 : 0;
          cam += (target - cam) * (dt ? 1 - Math.exp(-dt * 2.5) : 1);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          gl.useProgram(prog.program);
          gl.bindBuffer(gl.ARRAY_BUFFER, vb);
          gl.enableVertexAttribArray(0);
          gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
          gl.uniform1f(prog.u('uScroll'), scroll);
          gl.uniform1f(prog.u('uAsp'), Math.max(0.6, e.aspect));
          gl.uniform1f(prog.u('uAmp'), 3.4 * clamp(height, 0.2, 3));
          gl.uniform1f(prog.u('uYaw'), -cam * 0.16);
          gl.uniform1f(prog.u('uCamX'), cam * 1.6);
          gl.uniform3fv(prog.u('uA'), e.pal.signal);
          gl.uniform3fv(prog.u('uB'), e.pal.primary);
          gl.enable(gl.DEPTH_TEST);
          gl.depthFunc(gl.LEQUAL);
          gl.colorMask(false, false, false, false);
          gl.enable(gl.POLYGON_OFFSET_FILL);
          gl.polygonOffset(1.5, 1.5);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tb);
          gl.drawElements(gl.TRIANGLES, tris.length, gl.UNSIGNED_SHORT, 0);
          gl.disable(gl.POLYGON_OFFSET_FILL);
          gl.colorMask(true, true, true, true);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lb);
          gl.drawElements(gl.LINES, lines.length, gl.UNSIGNED_SHORT, 0);
          gl.disable(gl.DEPTH_TEST);
          void t;
        },
        dispose() { gl.deleteBuffer(vb); gl.deleteBuffer(lb); gl.deleteBuffer(tb); prog.dispose(); },
      };
    },
    { depth: true, antialias: true, maxPixels: 2.2e6 },
  );
  return (
    <div ref={wrapRef} className={'ui-wire-terrain' + (className ? ' ' + className : '')} style={style} data-gl={status} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-wire-terrain-canvas" hidden={status === 'off'} />
    </div>
  );
}

export function Demo() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 150, overflow: 'hidden', borderRadius: 'var(--radius, 12px)' }}>
      <WireTerrain />
    </div>
  );
}
