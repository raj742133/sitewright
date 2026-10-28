'use client';
import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { clamp, FS_PRE, fullscreenScene, GLSL_NOISE2, makeBuffer, makeProgram, mix3, useGL, type RGB } from './_t1';
import { buildGlobe } from './_tu-bg-globe';

export type GlobeTone = 'dusk' | 'mono';
export interface NetworkGlobeProps {
  /** Number of arcs between hubs, 0 to 40 (default 16). */
  arcs?: number;
  /** `dusk` uses --primary and --signal, `mono` uses ink tones only (default `dusk`). */
  tone?: GlobeTone;
  /** Idle rotation in radians per second; 0 stops it (default 0.12). */
  spin?: number;
  /** Accessible description. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const GLOW = `
uniform vec2 uR,uRot; uniform vec3 uA,uB; uniform float uDark;
varying vec2 vUv;
${GLSL_NOISE2}
void main(){
  vec2 p=(gl_FragCoord.xy-uRes*.5)/uR.x;
  float r=length(p);
  float sm=fbm(p*2.6+uRot*.6+vec2(uT*.03,-uT*.02));
  float sm2=fbm(p*4.2-uRot*.9+vec2(-uT*.04,uT*.03)+7.);
  float rim=exp(-max(r-1.,0.)*7.)*step(.0,r-.97+.0);
  float halo=smoothstep(1.9,1.0,r)*(.25+.9*sm)*(r>1.?1.:0.);
  float body=(r<1.)?(.2+.5*sm*sm2*2.)*(.55+.45*smoothstep(1.,-.3,p.y*.8+p.x*.4)):0.;
  float edge=smoothstep(1.,.86,r)*(r<1.?1.:0.);
  float g=halo*.55+rim*.6+body*(.5+.5*(1.-edge));
  g*=uDark>.5?1.:.8;
  vec3 c=mix(uA,uB,clamp(.35+.65*(p.y*-.5+.5)+sm*.3,0.,1.));
  float a=clamp(g*.65,0.,.9);
  gl_FragColor=vec4(c*a,a);
}`;
const VS_P = `attribute vec4 aP;uniform mat3 uM;uniform vec2 uK;uniform float uPx,uSz;varying float vZ,vK;
void main(){vec3 p=uM*aP.xyz;vZ=p.z;vK=aP.w;gl_Position=vec4(p.x*uK.x,p.y*uK.y,0.,1.);gl_PointSize=(aP.w>.5?uSz*2.8:uSz)*uPx;}`;
const FS_P = `uniform vec3 uA,uB;uniform float uT;varying float vZ,vK;
void main(){
  float d=length(gl_PointCoord-.5);if(d>.5)discard;
  float f=smoothstep(-1.,1.,vZ);
  float front=mix(.12,1.,f);
  vec3 c=vK>.5?uB:uA;
  float a=(vK>.5?smoothstep(.5,.0,d)*(.8+.2*sin(uT*3.))*front:smoothstep(.5,.3,d)*front*.75);
  gl_FragColor=vec4(c*a,a);
}`;
const VS_L = `attribute vec3 aP;attribute vec2 aS;uniform mat3 uM;uniform vec2 uK;varying float vZ,vS,vPh;
void main(){vec3 p=uM*aP;vZ=p.z;vS=aS.x;vPh=aS.y;gl_Position=vec4(p.x*uK.x,p.y*uK.y,0.,1.);}`;
const FS_L = `uniform vec3 uA,uB;uniform float uT;varying float vZ,vS,vPh;
void main(){
  float f=mix(.08,1.,smoothstep(-.8,.9,vZ));
  float head=fract(uT*.22+vPh);float d=fract(head-vS);
  float pulse=exp(-d*9.)*step(d,.6);
  vec3 c=mix(uA,uB,vS);
  float a=(.4+.95*pulse)*f;
  gl_FragColor=vec4(mix(c,vec3(1.),pulse*.35)*a,a);
}`;

function rot(yaw: number, pitch: number): Float32Array {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  return new Float32Array([cy, sy * sp, -sy * cp, 0, cp, sp, sy, -cy * sp, cy * cp].map((v, i) => (i === 3 ? 0 : v)));
}
const lum = (c: RGB) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/**
 * A dotted globe of land-like dots, hub nodes and glowing arcs with pulses running along them, wrapped in an
 * FBM smoke atmosphere (raw WebGL; geometry is invented, not a real map). Drag to spin with inertia
 * (vertical page scroll still works on touch), arrow keys rotate, Home resets. role="img", focusable.
 * Fills the parent; the globe fits the smaller side. Reduced motion: no spin or inertia, one still frame
 * that redraws on drag. A CSS globe is shown when WebGL is missing.
 */
export default function NetworkGlobe({ arcs = 16, tone = 'dusk', spin = 0.12, label = 'Decorative globe of connected nodes. Drag or use the arrow keys to rotate, Home to reset.', className, style }: NetworkGlobeProps) {
  const st = useRef({ yaw: 0.9, pitch: 0.32, vy: spin, vp: 0, drag: false, lx: 0, ly: 0, lt: 0 });
  const { wrapRef, canvasRef, status, invalidate } = useGL(
    (env) => {
      const gl = env.gl;
      const geo = buildGlobe(3400, clamp(Math.round(arcs), 0, 40));
      const glow = fullscreenScene(gl, GLOW, () => (_t, _dt, e, pr) => {
        const s = st.current;
        const R = Math.min(e.pw, e.ph) * 0.5 * 0.7;
        gl.uniform2f(pr.u('uR'), R, R);
        gl.uniform2f(pr.u('uRot'), s.yaw, s.pitch);
        const [a, b] = colors(e.pal, tone, lum(e.pal.surface) < 0.45);
        gl.uniform3fv(pr.u('uA'), a); gl.uniform3fv(pr.u('uB'), b);
        gl.uniform1f(pr.u('uDark'), lum(e.pal.surface) < 0.45 ? 1 : 0);
      });
      const pp = makeProgram(gl, VS_P, FS_P_PRE, ['aP']);
      const lp = makeProgram(gl, VS_L, FS_L_PRE, ['aP', 'aS']);
      const pb = makeBuffer(gl, geo.points), lb = makeBuffer(gl, geo.lines);
      return {
        draw(t, dt, e) {
          const s = st.current;
          if (!e.reduced && !s.drag) {
            s.yaw += s.vy * dt; s.pitch = clamp(s.pitch + s.vp * dt, -1.2, 1.2);
            s.vy += (spin - s.vy) * (1 - Math.exp(-dt * 1.4)); s.vp *= Math.exp(-dt * 3);
          }
          gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
          glow.draw(t, dt, e);
          const R = Math.min(e.w, e.h) * 0.5 * 0.7, M = rot(s.yaw, s.pitch);
          const [a, b] = colors(e.pal, tone, lum(e.pal.surface) < 0.45);
          gl.useProgram(lp.program);
          gl.bindBuffer(gl.ARRAY_BUFFER, lb);
          gl.enableVertexAttribArray(0); gl.enableVertexAttribArray(1);
          gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 20, 0); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 20, 12);
          gl.uniformMatrix3fv(lp.u('uM'), false, M); gl.uniform2f(lp.u('uK'), R / (e.w / 2), R / (e.h / 2));
          gl.uniform3fv(lp.u('uA'), a); gl.uniform3fv(lp.u('uB'), b); gl.uniform1f(lp.u('uT'), e.reduced ? 0.4 : t);
          if (geo.lineCount) gl.drawArrays(gl.LINES, 0, geo.lineCount);
          gl.useProgram(pp.program);
          gl.bindBuffer(gl.ARRAY_BUFFER, pb);
          gl.enableVertexAttribArray(0); gl.disableVertexAttribArray(1);
          gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
          gl.uniformMatrix3fv(pp.u('uM'), false, M); gl.uniform2f(pp.u('uK'), R / (e.w / 2), R / (e.h / 2));
          gl.uniform1f(pp.u('uPx'), e.dpr); gl.uniform1f(pp.u('uSz'), clamp(R / 90, 0.9, 2.2) * 1.6);
          gl.uniform3fv(pp.u('uA'), a); gl.uniform3fv(pp.u('uB'), b); gl.uniform1f(pp.u('uT'), e.reduced ? 0 : t);
          gl.drawArrays(gl.POINTS, 0, geo.pointCount);
        },
        dispose() { glow.dispose(); pp.dispose(); lp.dispose(); gl.deleteBuffer(pb); gl.deleteBuffer(lb); },
      };
    },
    { pointer: false, res: 1, dpr: 2, maxPixels: 1.8e6, fps: 60 },
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
    s.yaw += dx * 0.008; s.pitch = clamp(s.pitch + dy * 0.008, -1.2, 1.2);
    s.vy += (dx * 0.008 / dts - s.vy) * 0.5; s.vp += (dy * 0.008 / dts - s.vp) * 0.5;
    s.lx = e.clientX; s.ly = e.clientY; s.lt = now;
    invalidate();
  };
  const up = () => {
    const s = st.current;
    if (!s.drag) return;
    s.drag = false;
    if (performance.now() - s.lt > 90 || reduced()) { s.vy = reduced() ? 0 : spin; s.vp = 0; }
    s.vy = clamp(s.vy, -5, 5);
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const s = st.current, step = 0.16;
    if (e.key === 'ArrowLeft') s.yaw -= step;
    else if (e.key === 'ArrowRight') s.yaw += step;
    else if (e.key === 'ArrowUp') s.pitch = clamp(s.pitch - step, -1.2, 1.2);
    else if (e.key === 'ArrowDown') s.pitch = clamp(s.pitch + step, -1.2, 1.2);
    else if (e.key === 'Home') { s.yaw = 0.9; s.pitch = 0.32; s.vy = spin; s.vp = 0; }
    else return;
    e.preventDefault();
    invalidate();
  };
  return (
    <div ref={wrapRef} className={'ui-network-globe' + (className ? ' ' + className : '')} style={style} data-gl={status} data-tone={tone}
      role="img" aria-label={label} tabIndex={0} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}>
      <div className="ui-network-globe-fallback" />
      <canvas ref={canvasRef} className="ui-network-globe-canvas" hidden={status === 'off'} />
    </div>
  );
}

const FS_P_PRE = FS_PRE + FS_P, FS_L_PRE = FS_PRE + FS_L;
function colors(p: { primary: RGB; signal: RGB; ink: RGB; surface: RGB }, tone: GlobeTone, dark: boolean): [RGB, RGB] {
  if (tone === 'mono') { const base = dark ? mix3(p.ink, [1, 1, 1], 0.25) : mix3(p.ink, p.surface, 0.1); return [mix3(base, p.surface, dark ? 0.25 : 0.2), base]; }
  return dark ? [mix3(p.primary, [1, 1, 1], 0.35), mix3(p.signal, [1, 1, 1], 0.25)] : [mix3(p.primary, p.ink, 0.15), mix3(p.signal, p.ink, 0.2)];
}

export function Demo() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 150, overflow: 'hidden', borderRadius: 'var(--radius, 12px)', background: 'var(--surface, #fff)' }}>
      <NetworkGlobe />
      <p style={{ position: 'absolute', left: 12, right: 12, bottom: 10, margin: 0, textAlign: 'center', pointerEvents: 'none', font: '600 clamp(11px, 1.6vw, 13px)/1.3 var(--font-body, system-ui)', color: 'var(--ink, #111)' }}>
        <span style={{ padding: '3px 10px', borderRadius: 999, background: 'color-mix(in srgb, var(--surface, #fff) 90%, transparent)', border: '1px solid var(--line, #d4d4d8)' }}>Drag to spin the globe</span>
      </p>
    </div>
  );
}
