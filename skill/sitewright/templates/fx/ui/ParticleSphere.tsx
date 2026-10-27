'use client';
import { useEffect, useRef } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { clamp, FS_PRE, makeBuffer, makeProgram, mix3, useGL } from './_t1';

export interface ParticleSphereProps {
  /** Number of points (default 2500, max 8000). */
  count?: number;
  /** Point size in CSS pixels (default 2.4). */
  size?: number;
  /** Idle rotation in radians per second; 0 stops it (default 0.22). */
  spin?: number;
  /** Accessible description. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const VS = `attribute vec3 aPos;attribute float aSeed;
uniform mat3 uRot;uniform vec2 uK;uniform float uT,uPx,uSize;
varying float vZ,vSeed;
void main(){
  float r=1.+.04*sin(aSeed*60.+uT*.9+aPos.y*3.);
  vec3 p=uRot*(aPos*r);
  float w=(3.-p.z)/3.;
  vZ=p.z;vSeed=aSeed;
  gl_Position=vec4(p.x*uK.x,p.y*uK.y,0.,w);
  gl_PointSize=max(1.,uSize*uPx*(.7+.6*fract(aSeed*7.3))/w);
}`;
const FS = `uniform vec3 uA,uB,uM;varying float vZ,vSeed;
void main(){
  float d=length(gl_PointCoord-.5);
  if(d>.5)discard;
  float depth=clamp(vZ*.5+.5,0.,1.);
  float a=smoothstep(.5,.15,d)*mix(.14,1.,pow(depth,1.4));
  vec3 c=mix(mix(uA,uB,vSeed),uM,(1.-depth)*.55);
  gl_FragColor=vec4(c*a,a);
}`;

function rotation(yaw: number, pitch: number): Float32Array {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  // Rx(pitch) * Ry(yaw), column-major
  return new Float32Array([cy, sy * sp, -sy * cp, 0, cp, sp, sy, -cy * sp, cy * cp].map((v, i) => (i === 3 ? 0 : v)));
}

/**
 * A rotating sphere of points (gl.POINTS), depth-sized and depth-faded, tinted by --primary and
 * --signal. Fills its parent (`position:absolute; inset:0`; the sphere is sized to fit). Drag to
 * rotate with inertia (vertical page scroll still works on touch), arrow keys rotate, Home resets.
 * role="img" and focusable. Reduced motion: no idle spin or inertia, drags and keys still redraw.
 */
export default function ParticleSphere({ count = 2500, size = 2.4, spin = 0.22, label = 'Rotating sphere of points. Drag or use the arrow keys to rotate, Home to reset.', className, style }: ParticleSphereProps) {
  const st = useRef({ yaw: 0.6, pitch: 0.25, vy: spin, vp: 0, drag: false, lx: 0, ly: 0, lt: 0 });
  const n = Math.max(100, Math.min(8000, Math.round(count)));
  const { wrapRef, canvasRef, status, invalidate } = useGL(
    (env) => {
      const gl = env.gl;
      const prog = makeProgram(gl, VS, FS_PRE + FS, ['aPos', 'aSeed']);
      const data = new Float32Array(n * 4);
      const ga = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) {
        const y = 1 - ((i + 0.5) / n) * 2, r = Math.sqrt(1 - y * y), th = ga * i;
        data.set([Math.cos(th) * r, y, Math.sin(th) * r, ((i * 0.6180339887) % 1)], i * 4);
      }
      const buf = makeBuffer(gl, data);
      return {
        draw(t, dt, e) {
          const s = st.current;
          if (!e.reduced && !s.drag) {
            s.yaw += s.vy * dt; s.pitch = clamp(s.pitch + s.vp * dt, -1.3, 1.3);
            s.vy += (spin - s.vy) * (1 - Math.exp(-dt * 1.4));
            s.vp *= Math.exp(-dt * 3);
          }
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.useProgram(prog.program);
          gl.bindBuffer(gl.ARRAY_BUFFER, buf);
          gl.enableVertexAttribArray(0); gl.enableVertexAttribArray(1);
          gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 16, 0);
          gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 16, 12);
          const R = Math.min(e.w, e.h) * 0.5 * 0.74;
          gl.uniformMatrix3fv(prog.u('uRot'), false, rotation(s.yaw, s.pitch));
          gl.uniform2f(prog.u('uK'), R / (e.w / 2), R / (e.h / 2));
          gl.uniform1f(prog.u('uT'), e.reduced ? 0 : t);
          gl.uniform1f(prog.u('uPx'), e.dpr);
          gl.uniform1f(prog.u('uSize'), size * Math.max(0.7, Math.min(1.4, R / 110)));
          gl.uniform3fv(prog.u('uA'), e.pal.primary);
          gl.uniform3fv(prog.u('uB'), e.pal.signal);
          gl.uniform3fv(prog.u('uM'), mix3(e.pal.muted, e.pal.primary, 0.3));
          gl.drawArrays(gl.POINTS, 0, n);
        },
        dispose() { gl.deleteBuffer(buf); prog.dispose(); },
      };
    },
    { pointer: false, dpr: 2, maxPixels: 2.2e6 },
  );
  useEffect(() => { st.current.vy = spin; }, [spin]);

  const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const down = (e: PointerEvent<HTMLDivElement>) => {
    const s = st.current;
    s.drag = true; s.lx = e.clientX; s.ly = e.clientY; s.lt = performance.now(); s.vy = 0; s.vp = 0;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const s = st.current;
    if (!s.drag) return;
    const now = performance.now(), dts = Math.max(0.008, (now - s.lt) / 1000);
    const dx = e.clientX - s.lx, dy = e.clientY - s.ly;
    s.yaw += dx * 0.009; s.pitch = clamp(s.pitch + dy * 0.009, -1.3, 1.3);
    s.vy += (dx * 0.009 / dts - s.vy) * 0.5; s.vp += (dy * 0.009 / dts - s.vp) * 0.5;
    s.lx = e.clientX; s.ly = e.clientY; s.lt = now;
    invalidate();
  };
  const up = () => {
    const s = st.current;
    if (!s.drag) return;
    s.drag = false;
    if (performance.now() - s.lt > 90 || reduced()) { s.vy = reduced() ? 0 : spin; s.vp = 0; }
    s.vy = clamp(s.vy, -6, 6);
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const s = st.current, step = 0.18;
    if (e.key === 'ArrowLeft') s.yaw -= step;
    else if (e.key === 'ArrowRight') s.yaw += step;
    else if (e.key === 'ArrowUp') s.pitch = clamp(s.pitch - step, -1.3, 1.3);
    else if (e.key === 'ArrowDown') s.pitch = clamp(s.pitch + step, -1.3, 1.3);
    else if (e.key === 'Home') { s.yaw = 0.6; s.pitch = 0.25; s.vy = spin; s.vp = 0; }
    else return;
    e.preventDefault();
    invalidate();
  };
  return (
    <div ref={wrapRef} className={'ui-particle-sphere' + (className ? ' ' + className : '')} style={style} data-gl={status}
      role="img" aria-label={label} tabIndex={0} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}>
      <canvas ref={canvasRef} className="ui-particle-sphere-canvas" hidden={status === 'off'} />
    </div>
  );
}

export function Demo() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 150 }}>
      <ParticleSphere count={1500} size={2.2} />
    </div>
  );
}
