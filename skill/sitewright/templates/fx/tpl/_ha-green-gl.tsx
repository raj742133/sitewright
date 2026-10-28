'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { onTheme, useCanvasLoop, useThemeVars, readVars } from './_ha-kit';

/* The living background of the Hollowfern page: a domain-warped noise field that reads as drifting moss and light, in WebGL.
   Without WebGL (or after a lost context) a Canvas 2D version of drifting soft blobs takes over. Colours come from --hg-c0..c3. */

const VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 r; uniform float t; uniform vec2 m; uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3;
float h(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*n(p); p=p*2.03+vec2(7.1,3.7); a*=.5; } return s; }
void main(){
  vec2 uv=gl_FragCoord.xy/r; vec2 p=(gl_FragCoord.xy-.5*r)/min(r.x,r.y);
  float T=t*.045;
  vec2 q=vec2(fbm(p*1.5+vec2(0.,T)), fbm(p*1.5+vec2(5.2,1.3)-T));
  vec2 w=vec2(fbm(p*2.1+3.*q+vec2(1.7,9.2)+T*2.), fbm(p*2.1+3.*q+vec2(8.3,2.8)-T*1.5));
  float f=fbm(p*2.+4.*w);
  vec2 d2=p-m; f+=.22*exp(-dot(d2,d2)*7.);
  float cells=smoothstep(.45,.8,n(p*16.+w*3.));
  vec3 col=mix(c0,c1,smoothstep(.18,.55,f));
  col=mix(col,c2,smoothstep(.5,.88,f)*.85);
  col=mix(col,c3,cells*smoothstep(.5,.95,f)*.3);
  float sh=pow(max(0.,sin((p.x+p.y*.4)*4.5+T*9.)),10.)*.07*(1.-uv.y);
  col+=c3*sh;
  col*=1.-.4*dot(uv-.5,uv-.5)*2.;
  gl_FragColor=vec4(col,1.);
}`;

const rgb = (hex: string, fb: [number, number, number]): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return fb;
  const v = parseInt(m[1]!, 16);
  return [(v >> 16) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
};
const NAMES = ['hg-c0', 'hg-c1', 'hg-c2', 'hg-c3'];
const FB: [number, number, number][] = [[0.9, 0.94, 0.86], [0.8, 0.88, 0.69], [0.6, 0.74, 0.49], [1, 0.97, 0.84]];

/** WebGL moss field; calls onFail if it cannot run so the page can fall back */
function Gl({ root, reduced, onFail }: { root: RefObject<HTMLElement | null>; reduced: boolean; onFail: () => void }) {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = cv.current, host = root.current;
    if (!c || !host) return;
    const gl = c.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' }) as WebGLRenderingContext | null;
    if (!gl) { onFail(); return; }
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS), prog = gl.createProgram()!;
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl.deleteProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs); onFail(); return; }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n: string) => gl.getUniformLocation(prog, n);
    const uR = U('r'), uT = U('t'), uM = U('m'), uC = NAMES.map((_, i) => U('c' + i));
    const ptr = { x: 0.2, y: 0.1, tx: 0.2, ty: 0.1 };
    let raf = 0, t = 0, last = 0, inView = true, vis = !document.hidden, lost = false;
    const colours = () => { const v = readVars(host, NAMES); NAMES.forEach((n, i) => { const k = rgb(v[n] ?? '', FB[i]!); gl.uniform3f(uC[i]!, k[0], k[1], k[2]); }); };
    const fit = () => {
      const r = c.getBoundingClientRect(), s = 0.55;
      c.width = Math.max(2, Math.round(r.width * s)); c.height = Math.max(2, Math.round(r.height * s));
      gl.viewport(0, 0, c.width, c.height); gl.uniform2f(uR, c.width, c.height);
    };
    const draw = () => { gl.uniform1f(uT, t); gl.uniform2f(uM, ptr.x, ptr.y); gl.drawArrays(gl.TRIANGLES, 0, 3); };
    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now; t += dt;
      ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 3); ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 3);
      draw();
      if (inView && vis && !reduced && !lost) raf = requestAnimationFrame(frame);
    };
    const start = () => { if (raf || lost) return; if (reduced) { t = 7; draw(); return; } if (inView && vis) { last = 0; raf = requestAnimationFrame(frame); } };
    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
    const move = (e: PointerEvent) => { const r = c.getBoundingClientRect(); const k = Math.min(r.width, r.height); ptr.tx = (e.clientX - r.left - r.width / 2) / k; ptr.ty = -(e.clientY - r.top - r.height / 2) / k; };
    colours(); fit(); t = 7; draw(); start();
    const ro = new ResizeObserver(() => { fit(); if (!raf) draw(); }); ro.observe(c);
    const io = new IntersectionObserver((es) => { inView = es[es.length - 1]?.isIntersecting ?? true; inView && vis ? start() : stop(); }); io.observe(c);
    const onVis = () => { vis = !document.hidden; vis && inView ? start() : stop(); };
    const onLost = (e: Event) => { e.preventDefault(); lost = true; stop(); onFail(); };
    document.addEventListener('visibilitychange', onVis);
    c.addEventListener('webglcontextlost', onLost);
    if (!reduced) window.addEventListener('pointermove', move, { passive: true });
    const off = onTheme(() => requestAnimationFrame(() => { colours(); if (!raf) draw(); }));
    return () => {
      stop(); ro.disconnect(); io.disconnect(); off();
      document.removeEventListener('visibilitychange', onVis); c.removeEventListener('webglcontextlost', onLost); window.removeEventListener('pointermove', move);
      gl.deleteBuffer(buf); gl.deleteProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [root, reduced, onFail]);
  return <canvas ref={cv} className="hlg-ground" aria-hidden="true" />;
}

/** Canvas 2D stand-in: soft blobs in the same four colours, drifting on slow orbits */
function Soft({ root, reduced }: { root: RefObject<HTMLElement | null>; reduced: boolean }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const [pal, rev] = useThemeVars(root, NAMES);
  useCanvasLoop(cv, reduced, (ctx, { w, h }, t) => {
    const c = NAMES.map((n) => pal.current[n] || '#9db98a');
    ctx.fillStyle = c[0]!; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) {
      const x = w * (0.5 + 0.46 * Math.sin(t * 0.07 * (1 + i * 0.13) + i * 1.9));
      const y = h * (0.5 + 0.42 * Math.cos(t * 0.06 * (1 + i * 0.1) + i * 2.7));
      const r = Math.max(w, h) * (0.16 + (i % 4) * 0.04);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, c[1 + (i % 3)]!); g.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.55; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    ctx.globalAlpha = 1;
  }, rev);
  return <canvas ref={cv} className="hlg-ground" aria-hidden="true" />;
}

export function LivingGround({ root, reduced }: { root: RefObject<HTMLElement | null>; reduced: boolean }) {
  const [mode, setMode] = useState<'gl' | 'soft'>('gl');
  const fail = useRef(() => setMode('soft')).current;
  return mode === 'gl' ? <Gl root={root} reduced={reduced} onFail={fail} /> : <Soft root={root} reduced={reduced} />;
}
