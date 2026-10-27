'use client';
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { buildProgram, clampDpr, getGL, mul, norm, perspective, rotX, rotY, translate, watchLive, watchPalette, useReducedMotion, mix, type GL, type Palette } from './_t2';

export interface LitTorusProps {
  label?: string;
  className?: string;
}
const VS = `attribute vec3 aPos; attribute vec3 aNor; attribute vec2 aUV;
uniform mat4 uMVP; uniform mat4 uModel;
varying vec3 vW; varying vec3 vN; varying vec2 vUV;
void main(){ vW=(uModel*vec4(aPos,1.0)).xyz; vN=(uModel*vec4(aNor,0.0)).xyz; vUV=aUV; gl_Position=uMVP*vec4(aPos,1.0); }`;
const FS = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec3 vW; varying vec3 vN; varying vec2 vUV;
uniform vec3 uEye; uniform vec3 uLight; uniform vec3 uA; uniform vec3 uB; uniform vec3 uAmb; uniform vec3 uRim;
void main(){
  vec3 N=normalize(vN); vec3 V=normalize(uEye-vW); vec3 L=normalize(uLight-vW); vec3 H=normalize(L+V);
  float band=0.5+0.5*sin(vUV.x*6.2831853*8.0+vUV.y*6.2831853*2.0);
  vec3 alb=mix(uA,uB,smoothstep(0.4,0.6,band));
  float diff=max(dot(N,L),0.0);
  float spec=pow(max(dot(N,H),0.0),56.0)*step(0.001,diff);
  float rim=pow(1.0-max(dot(N,V),0.0),3.0);
  vec3 c=alb*(uAmb+diff*0.95)+vec3(1.0)*spec*0.75+uRim*rim*0.4;
  gl_FragColor=vec4(c,1.0);
}`;
const MAJ = 72, MIN = 36, BIG = 1, SMALL = 0.4;

function torus() {
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= MAJ; i++) for (let j = 0; j <= MIN; j++) {
    const u = (i / MAJ) * Math.PI * 2, v = (j / MIN) * Math.PI * 2;
    const cu = Math.cos(u), su = Math.sin(u), cv = Math.cos(v), sv = Math.sin(v);
    pos.push((BIG + SMALL * cv) * cu, SMALL * sv, (BIG + SMALL * cv) * su, cv * cu, sv, cv * su, i / MAJ, j / MIN);
  }
  for (let i = 0; i < MAJ; i++) for (let j = 0; j < MIN; j++) {
    const a = i * (MIN + 1) + j, b = a + MIN + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  return { verts: new Float32Array(pos), idx: new Uint16Array(idx) };
}
const HOME = { rx: 0.9, ry: 0.4, dist: 3.7 };

/** A spinning WebGL torus lit with Blinn-Phong and a moving light. Drag to rotate, wheel (focused or Ctrl) or +/- to zoom, arrows rotate, Home resets. Fills its parent. */
export default function LitTorus({ label = 'Spinning lit 3D torus', className }: LitTorusProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const [ok, setOk] = useState(true);
  const st = useRef({ ...HOME, vx: 0, vy: 0, drag: false, px: 0, py: 0, live: true, reduced: false, redraw: () => {} });
  useEffect(() => { st.current.reduced = reduced; st.current.redraw(); }, [reduced]);

  useEffect(() => {
    const canvas = cv.current, el = wrap.current;
    if (!canvas || !el) return;
    const s = st.current;
    let gl: GL | null = null, prog: WebGLProgram | null = null, vb: WebGLBuffer | null = null, ib: WebGLBuffer | null = null;
    let pal: Palette | null = null, raf = 0, last = 0, tm = 0, w = 1, h = 1, lost = false, count = 0;
    const loc: Record<string, WebGLUniformLocation | null> = {};
    const geo = torus();
    count = geo.idx.length;

    const init = () => {
      gl = getGL(canvas);
      if (!gl) { setOk(false); return; }
      prog = buildProgram(gl, VS, FS);
      if (!prog) { setOk(false); return; }
      gl.useProgram(prog);
      ['uMVP', 'uModel', 'uEye', 'uLight', 'uA', 'uB', 'uAmb', 'uRim'].forEach((n) => { loc[n] = gl!.getUniformLocation(prog!, n); });
      vb = gl.createBuffer(); ib = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, geo.verts, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.idx, gl.STATIC_DRAW);
      [['aPos', 3, 0], ['aNor', 3, 3], ['aUV', 2, 6]].forEach(([n, size, off]) => {
        const a = gl!.getAttribLocation(prog!, n as string);
        if (a < 0) return;
        gl!.enableVertexAttribArray(a); gl!.vertexAttribPointer(a, size as number, gl!.FLOAT, false, 32, (off as number) * 4);
      });
      gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
      setOk(true);
    };
    const draw = (t: number) => {
      if (!gl || !prog || lost || !pal) return;
      const model = mul(rotY(s.ry), rotX(s.rx));
      const mvp = mul(perspective(0.8, w / h, 0.5, 20), mul(translate(0, 0, -s.dist), model));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const sec = t / 1000;
      gl.uniformMatrix4fv(loc.uMVP!, false, mvp); gl.uniformMatrix4fv(loc.uModel!, false, model);
      gl.uniform3f(loc.uEye!, 0, 0, s.dist);
      gl.uniform3f(loc.uLight!, Math.cos(sec * 0.9) * 3.2, 2.2 + Math.sin(sec * 0.6), 2.4 + Math.sin(sec * 0.9) * 2);
      gl.uniform3fv(loc.uA!, norm(pal.primary)); gl.uniform3fv(loc.uB!, norm(mix(pal.signal, pal.primary, 0.15)));
      gl.uniform3fv(loc.uAmb!, norm(mix(pal.muted, pal.ink, 0.4)).map((v) => v * 0.45));
      gl.uniform3fv(loc.uRim!, norm(pal.signal));
      gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
    };
    const frame = (t: number) => {
      raf = 0;
      const dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
      if (!s.drag) {
        s.ry += (s.vy + (s.reduced ? 0 : 0.35)) * dt; s.rx += s.vx * dt;
        const k = Math.exp(-dt * 2.2); s.vx *= k; s.vy *= k;
      }
      tm = t; draw(t);
      if (s.live && !s.reduced && !lost) raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf && s.live && !s.reduced && !lost && gl) { last = 0; raf = requestAnimationFrame(frame); } };
    s.redraw = () => { if (s.reduced || !s.live) draw(tm || 1200); else start(); };

    const ro = new ResizeObserver(() => {
      const d = clampDpr(); w = el.clientWidth || 1; h = el.clientHeight || 1;
      canvas.width = Math.round(w * d); canvas.height = Math.round(h * d); s.redraw(); if (s.reduced) draw(1200);
    });
    const onLost = (e: Event) => { e.preventDefault(); lost = true; if (raf) cancelAnimationFrame(raf); raf = 0; };
    const onRestored = () => { lost = false; init(); start(); draw(tm || 1200); };
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey || document.activeElement === el)) return;
      e.preventDefault(); s.dist = Math.max(2.8, Math.min(5.6, s.dist + e.deltaY * 0.004)); s.redraw();
    };
    canvas.addEventListener('webglcontextlost', onLost); canvas.addEventListener('webglcontextrestored', onRestored);
    el.addEventListener('wheel', onWheel, { passive: false });
    init();
    ro.observe(el);
    const offP = watchPalette(el, (p) => { pal = p; s.redraw(); if (s.reduced) draw(1200); });
    const offL = watchLive(el, (l) => { s.live = l; if (l) start(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } });
    start();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect(); offP(); offL(); s.redraw = () => {};
      canvas.removeEventListener('webglcontextlost', onLost); canvas.removeEventListener('webglcontextrestored', onRestored);
      el.removeEventListener('wheel', onWheel);
      if (gl) { if (vb) gl.deleteBuffer(vb); if (ib) gl.deleteBuffer(ib); if (prog) gl.deleteProgram(prog); gl.getExtension('WEBGL_lose_context')?.loseContext(); }
    };
  }, [reduced]);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    Object.assign(st.current, { drag: true, px: e.clientX, py: e.clientY });
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const s = st.current;
    if (!s.drag) return;
    const dx = e.clientX - s.px, dy = e.clientY - s.py;
    s.ry += dx * 0.011; s.rx += dy * 0.011; s.vy = dx * 0.5; s.vx = dy * 0.5;
    s.px = e.clientX; s.py = e.clientY; s.redraw();
  };
  const up = () => { const s = st.current; s.drag = false; if (s.reduced) { s.vx = s.vy = 0; } };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const s = st.current;
    if (e.key === 'ArrowLeft') s.ry -= 0.2; else if (e.key === 'ArrowRight') s.ry += 0.2;
    else if (e.key === 'ArrowUp') s.rx -= 0.2; else if (e.key === 'ArrowDown') s.rx += 0.2;
    else if (e.key === '+' || e.key === '=' || e.key === 'PageUp') s.dist = Math.max(2.8, s.dist - 0.3);
    else if (e.key === '-' || e.key === '_' || e.key === 'PageDown') s.dist = Math.min(5.6, s.dist + 0.3);
    else if (e.key === 'Home') Object.assign(s, { ...HOME, vx: 0, vy: 0 });
    else return;
    e.preventDefault(); s.redraw();
  };
  return (
    <div ref={wrap} className={`ui-lit-torus-root ${className ?? ''}`} tabIndex={0} role="img"
      aria-label={`${label}. Drag or use arrow keys to rotate, plus and minus to zoom, Home to reset.`}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}>
      <canvas ref={cv} aria-hidden="true" style={ok ? undefined : { display: 'none' }} />
      {!ok && <div className="ui-lit-torus-fallback" aria-hidden="true" />}
    </div>
  );
}

export function Demo() {
  return <LitTorus />;
}
