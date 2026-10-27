import { useCallback, useEffect, useRef, useState } from 'react';

/* Tiny raw-WebGL helper shared by the t1 "3d" batch: context + palette + loop + fallbacks. No libraries. */

export type RGB = [number, number, number];
export interface Palette { primary: RGB; signal: RGB; surface: RGB; ink: RGB; raised: RGB; muted: RGB }
export interface Pointer { x: number; y: number; inside: boolean; taps: { x: number; y: number }[] }
export interface GLEnv {
  gl: WebGLRenderingContext;
  canvas: HTMLCanvasElement;
  pal: Palette;
  /** CSS pixel size of the canvas, backing-store size, and aspect */
  w: number; h: number; pw: number; ph: number; dpr: number; aspect: number;
  /** pointer in 0..1 (y up), relative to the canvas; null-ish when coarse or reduced */
  ptr: Pointer;
  reduced: boolean; coarse: boolean;
}
export interface Scene { draw(t: number, dt: number, env: GLEnv): void; dispose(): void }
export interface GLOpts {
  /** max device pixel ratio (default 2) */ dpr?: number;
  /** extra resolution factor, e.g. 0.5 renders at half size and lets CSS stretch it */ res?: number;
  /** backing-store pixel budget (default 2.2M) */ maxPixels?: number;
  fps?: number; depth?: boolean; antialias?: boolean;
  /** listen to the window pointer relative to the canvas (default true) */ pointer?: boolean;
}

const FALLBACK: Record<keyof Palette, string> = { primary: '#2563eb', signal: '#f59e0b', surface: '#ffffff', ink: '#111827', raised: '#f3f4f6', muted: '#6b7280' };
const STATIC_T = 4.2;

let probe: CanvasRenderingContext2D | null | undefined;
function hexToRgb(h: string): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(h);
  const n = m ? parseInt(m[1]!, 16) : 0;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
/** Any CSS colour the browser understands (hex, rgb, oklch, color-mix...) to 0..1 rgb, via a 1px canvas. */
export function parseColor(css: string, fallback: string): RGB {
  try {
    if (!css) return hexToRgb(fallback);
    if (probe === undefined) {
      const c = document.createElement('canvas');
      c.width = c.height = 1;
      probe = c.getContext('2d', { willReadFrequently: true });
    }
    if (!probe) return hexToRgb(fallback);
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = '#ff00ff';
    probe.fillStyle = css;
    probe.fillRect(0, 0, 1, 1);
    const d = probe.getImageData(0, 0, 1, 1).data;
    return [d[0]! / 255, d[1]! / 255, d[2]! / 255];
  } catch {
    return hexToRgb(fallback);
  }
}
export function readPalette(el: Element): Palette {
  const cs = getComputedStyle(el);
  const out = {} as Palette;
  (Object.keys(FALLBACK) as (keyof Palette)[]).forEach((k) => { out[k] = parseColor(cs.getPropertyValue('--' + k).trim(), FALLBACK[k]); });
  return out;
}
export const mix3 = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/* ---------- GL helpers ---------- */
export const FS_PRE = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n';
export const VS_FULL = 'attribute vec2 p;varying vec2 vUv;void main(){vUv=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
export const GLSL_NOISE2 = `
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.03+vec2(17.1,9.7);a*=.5;}return s;}
`;

export interface Prog { program: WebGLProgram; u: (name: string) => WebGLUniformLocation | null; dispose: () => void }
function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type);
  if (!s) throw new Error('shader');
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const m = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error(m || 'compile'); }
  return s;
}
/** Compile + link. `attribs` are bound to locations 0..n-1 in order. Throws on failure (callers are inside setup, which is guarded). */
export function makeProgram(gl: WebGLRenderingContext, vs: string, fs: string, attribs: string[]): Prog {
  const v = compile(gl, gl.VERTEX_SHADER, vs);
  const f = compile(gl, gl.FRAGMENT_SHADER, fs);
  const program = gl.createProgram();
  if (!program) throw new Error('program');
  gl.attachShader(program, v);
  gl.attachShader(program, f);
  attribs.forEach((a, i) => gl.bindAttribLocation(program, i, a));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'link');
  const cache: Record<string, WebGLUniformLocation | null> = {};
  return {
    program,
    u: (n) => (n in cache ? cache[n]! : (cache[n] = gl.getUniformLocation(program, n))),
    dispose: () => { gl.deleteProgram(program); gl.deleteShader(v); gl.deleteShader(f); },
  };
}
export function makeBuffer(gl: WebGLRenderingContext, data: BufferSource, target: number = gl.ARRAY_BUFFER) {
  const b = gl.createBuffer();
  gl.bindBuffer(target, b);
  gl.bufferData(target, data, gl.STATIC_DRAW);
  return b;
}
/** A full-screen shader scene: one big triangle, `setup` returns the per-frame uniform setter. */
export function fullscreenScene(
  gl: WebGLRenderingContext, frag: string, bind: (prog: Prog) => (t: number, dt: number, env: GLEnv, prog: Prog) => void,
): Scene {
  const prog = makeProgram(gl, VS_FULL, FS_PRE + frag, ['p']);
  const buf = makeBuffer(gl, new Float32Array([-1, -1, 3, -1, -1, 3]));
  const upd = bind(prog);
  return {
    draw(t, dt, env) {
      gl.useProgram(prog.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(prog.u('uRes'), env.pw, env.ph);
      gl.uniform1f(prog.u('uT'), t);
      upd(t, dt, env, prog);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() { gl.deleteBuffer(buf); prog.dispose(); },
  };
}

/* ---------- the hook ---------- */
export type GLStatus = 'init' | 'on' | 'off';

/**
 * Owns the canvas lifecycle: context (WebGL2 then WebGL1), DPR clamp, resize, theme palette, pointer,
 * IntersectionObserver + visibility pause, context loss/restore, reduced-motion single frame, cleanup.
 * `setup` runs once per context; it must not touch `window` during render. Returns refs to attach plus
 * `status` ('init' | 'on' | 'off') for the CSS fallback and `invalidate` to redraw while paused/static.
 */
export function useGL(setup: (env: GLEnv) => Scene, opts: GLOpts = {}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<GLStatus>('init');
  const setupRef = useRef(setup);
  setupRef.current = setup;
  const optsRef = useRef(opts);
  optsRef.current = opts;
  const inv = useRef<() => void>(() => {});
  const invalidate = useCallback(() => inv.current(), []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const o = optsRef.current;
    const mqR = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mqC = window.matchMedia('(pointer: coarse)');
    const mqD = window.matchMedia('(prefers-color-scheme: dark)');
    const env = {
      gl: null as unknown as WebGLRenderingContext, canvas, pal: readPalette(wrap), w: 1, h: 1, pw: 1, ph: 1, dpr: 1, aspect: 1,
      ptr: { x: 0.5, y: 0.5, inside: false, taps: [] } as Pointer, reduced: mqR.matches, coarse: mqC.matches,
    } as GLEnv;
    let scene: Scene | null = null;
    let raf = 0, still = 0, last = 0, t0 = 0, lost = false, onScreen = true, dead = false, hasGL = false;
    const minGap = 1000 / (o.fps ?? 60) - 3;

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      const w = Math.max(1, r.width), h = Math.max(1, r.height);
      let dpr = Math.min(window.devicePixelRatio || 1, o.dpr ?? 2) * (o.res ?? 1);
      const budget = o.maxPixels ?? 2.2e6;
      if (w * h * dpr * dpr > budget) dpr = Math.sqrt(budget / (w * h));
      env.w = w; env.h = h; env.dpr = dpr; env.aspect = w / h;
      env.pw = Math.max(1, Math.round(w * dpr)); env.ph = Math.max(1, Math.round(h * dpr));
      if (canvas.width !== env.pw || canvas.height !== env.ph) { canvas.width = env.pw; canvas.height = env.ph; }
      if (hasGL && !lost) env.gl.viewport(0, 0, env.pw, env.ph);
      invalidate2();
    };
    const render = (t: number, dt: number) => {
      if (!scene || lost || dead) return;
      try {
        env.gl.viewport(0, 0, env.pw, env.ph);
        scene.draw(t, dt, env);
        env.ptr.taps.length = 0;
        if (status0 !== 'on') { status0 = 'on'; setStatus('on'); }
      } catch {
        fail();
      }
    };
    let status0: GLStatus = 'init';
    const fail = () => {
      stop();
      try { scene?.dispose(); } catch { /* ignore */ }
      scene = null;
      status0 = 'off';
      setStatus('off');
    };
    const loop = (now: number) => {
      raf = 0;
      if (!want()) return;
      if (now - last >= minGap) {
        const dt = Math.min(0.1, (now - (last || now)) / 1000);
        last = now;
        render((now - t0) / 1000 + STATIC_T, dt);
      }
      raf = requestAnimationFrame(loop);
    };
    const want = () => !env.reduced && onScreen && !document.hidden && !lost && !!scene && !dead;
    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
    const sync = () => {
      if (want()) { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } } else { stop(); if (env.reduced) invalidate2(); }
    };
    function invalidate2() {
      if (env.reduced || !raf) {
        if (still || dead) return;
        still = requestAnimationFrame(() => { still = 0; if (env.reduced) render(STATIC_T, 0); else if (!raf) render((performance.now() - t0) / 1000 + STATIC_T, 0); });
      }
    }
    inv.current = invalidate2;

    const init = () => {
      try {
        const attrs: WebGLContextAttributes = { alpha: true, premultipliedAlpha: true, antialias: !!o.antialias, depth: !!o.depth, stencil: false, powerPreference: 'default' };
        const gl = (canvas.getContext('webgl2', attrs) || canvas.getContext('webgl', attrs)) as WebGLRenderingContext | null;
        if (!gl) throw new Error('no webgl');
        env.gl = gl; hasGL = true;
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        scene = setupRef.current(env);
        resize();
        sync();
        invalidate2();
      } catch {
        fail();
      }
    };

    const onLost = (e: Event) => { e.preventDefault(); lost = true; scene = null; stop(); };
    const onRestored = () => { lost = false; init(); };
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);

    const onTheme = () => { env.pal = readPalette(wrap); invalidate2(); window.setTimeout(() => { if (!dead) { env.pal = readPalette(wrap); invalidate2(); } }, 150); };
    const mo = new MutationObserver(onTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'style'] });
    const onMq = () => { env.reduced = mqR.matches; env.coarse = mqC.matches; env.pal = readPalette(wrap); sync(); invalidate2(); };
    mqR.addEventListener('change', onMq); mqC.addEventListener('change', onMq); mqD.addEventListener('change', onTheme);

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    const io = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((es) => { onScreen = es.some((e) => e.isIntersecting); sync(); });
    io?.observe(wrap);
    const onVis = () => sync();
    document.addEventListener('visibilitychange', onVis);

    const rel = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      const x = (e.clientX - r.left) / Math.max(1, r.width), y = 1 - (e.clientY - r.top) / Math.max(1, r.height);
      return { x, y, inside: x >= 0 && x <= 1 && y >= 0 && y <= 1 };
    };
    const onMove = (e: PointerEvent) => {
      if (env.coarse || env.reduced || e.pointerType === 'touch') return;
      const p = rel(e);
      env.ptr.x = p.x; env.ptr.y = p.y; env.ptr.inside = p.inside;
    };
    const onDown = (e: PointerEvent) => {
      if (env.reduced) return;
      const p = rel(e);
      if (p.inside) { env.ptr.taps.push({ x: p.x, y: p.y }); if (env.ptr.taps.length > 6) env.ptr.taps.shift(); }
    };
    const onLeave = () => { env.ptr.inside = false; };
    if (o.pointer !== false) {
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('pointerdown', onDown, { passive: true });
      document.documentElement.addEventListener('pointerleave', onLeave);
    }

    t0 = performance.now();
    init();

    return () => {
      dead = true;
      stop();
      if (still) cancelAnimationFrame(still);
      inv.current = () => {};
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      mo.disconnect(); ro.disconnect(); io?.disconnect();
      mqR.removeEventListener('change', onMq); mqC.removeEventListener('change', onMq); mqD.removeEventListener('change', onTheme);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      try { scene?.dispose(); } catch { /* ignore */ }
      scene = null;
    };
  }, [invalidate]);

  return { wrapRef, canvasRef, status, invalidate };
}
