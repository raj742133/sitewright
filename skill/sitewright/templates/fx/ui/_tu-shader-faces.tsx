'use client';
import { useEffect, useRef } from 'react';
import { fullscreenScene, GLSL_NOISE2, mix3, useGL } from './_t1';
import { rgba, mix } from './_t2';
import { damp, rng, smooth, useCanvas2D } from './_tu-ui-kit';

/* The animated faces of the shader-buttons set: two fragment-shader faces (plasma, holographic) and three Canvas 2D faces (ignition, particles, tactile). */

export type ShaderVariant = 'plasma' | 'holographic' | 'ignition' | 'particles' | 'tactile';
export interface FaceState { hover: boolean; press: boolean }

const PLASMA = GLSL_NOISE2 + `
uniform float uH,uP;uniform vec3 uA,uB,uBg;uniform vec2 uPtr;varying vec2 vUv;
void main(){
  vec2 p=vUv*vec2(uRes.x/uRes.y,1.);
  float t=uT*(.28+.5*uH);
  vec2 q=p*2.3;
  float a=fbm(q+vec2(t*.6,-t*.4));
  float b=fbm(q*1.25+a*2.3+vec2(-t*.5,t*.3));
  float v=sin(6.2832*(b*1.3+a*.7)+t*2.)*.5+.5;
  vec3 col=mix(uBg,uA,smoothstep(.2,.75,b)*.8);
  col=mix(col,uB,smoothstep(.5,.95,v*b*1.7)*.85);
  col+=pow(v,7.)*.3*(.5+uH);
  vec2 d=(vUv-uPtr)*vec2(uRes.x/uRes.y,1.);
  col+=uB*.4*uH*exp(-dot(d,d)*7.);
  col=mix(uBg,col,.82);
  col*=1.-.22*uP;
  gl_FragColor=vec4(col,1.);
}`;
const HOLO = GLSL_NOISE2 + `
uniform float uH,uP;uniform vec3 uA,uB,uBg;uniform vec2 uPtr;varying vec2 vUv;
void main(){
  vec2 p=vUv*vec2(uRes.x/uRes.y,1.);
  float n=fbm(p*3.+vec2(uT*.08,0.));
  float ang=(vUv.x-uPtr.x)*1.4+(vUv.y-uPtr.y)*.7+n*.55+uT*.05;
  vec3 rainbow=.5+.5*cos(6.2832*(vec3(0.,.33,.67)+ang*1.4));
  float foil=.5+.5*sin((p.x*1.6+p.y*2.2)*18.+n*9.);
  vec3 col=mix(vec3(.86,.88,.92),rainbow,.5+.2*uH);
  col=mix(col,uA,.14);
  col+=(foil-.5)*.12;
  float g=exp(-pow((vUv.x-uPtr.x)*3.2,2.)-pow((vUv.y-uPtr.y)*5.,2.));
  col+=vec3(1.)*g*.35*uH;
  col=mix(col,vec3(1.),.12);
  col*=1.-.12*uP;
  gl_FragColor=vec4(min(col,vec3(1.)),1.);
}`;

/** A WebGL face; when the context is unavailable the sibling CSS gradient (set by the parent via data-gl) takes over. */
export function GlFace({ kind, state, onStatus }: { kind: 'plasma' | 'holographic'; state: FaceState; onStatus: (ok: boolean) => void }) {
  const st = useRef(state);
  st.current = state;
  const { wrapRef, canvasRef, status, invalidate } = useGL((env) => {
    const s = { h: 0, p: 0, px: 0.5, py: 0.5 };
    const dark = (c: [number, number, number], k: number): [number, number, number] => [c[0] * k, c[1] * k, c[2] * k];
    return fullscreenScene(env.gl, kind === 'plasma' ? PLASMA : HOLO, (prog) => (_t, dt, e) => {
      const gl = e.gl;
      const snap = e.reduced ? 0 : dt;
      s.h = damp(s.h, st.current.hover ? 1 : 0, snap, 7);
      s.p = damp(s.p, st.current.press ? 1 : 0, snap, 16);
      const live = e.ptr.inside && !e.coarse;
      s.px = damp(s.px, live ? e.ptr.x : 0.5, snap, 10);
      s.py = damp(s.py, live ? e.ptr.y : 0.5, snap, 10);
      gl.uniform1f(prog.u('uH'), s.h);
      gl.uniform1f(prog.u('uP'), s.p);
      gl.uniform2f(prog.u('uPtr'), s.px, s.py);
      gl.uniform3fv(prog.u('uA'), e.pal.primary);
      gl.uniform3fv(prog.u('uB'), kind === 'plasma' ? e.pal.signal : mix3(e.pal.signal, e.pal.primary, 0.4));
      gl.uniform3fv(prog.u('uBg'), dark(e.pal.primary, 0.1));
    });
  }, { dpr: 1.5, pointer: true });
  useEffect(() => { invalidate(); }, [state.hover, state.press, invalidate]);
  useEffect(() => { if (status !== 'init') onStatus(status === 'on'); }, [status, onStatus]);
  return <div ref={wrapRef} className="ui-shader-buttons-gl"><canvas ref={canvasRef} /></div>;
}

interface Ember { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number }
interface Star { x: number; y: number; vx: number; vy: number; r: number; ph: number }

/** Canvas 2D faces: ignition (rising embers), particles (a constellation that gathers at the pointer), tactile (grain, brushed plate and a moving specular). */
export function CanvasFace({ kind, state }: { kind: 'ignition' | 'particles' | 'tactile'; state: FaceState }) {
  const st = useRef(state);
  st.current = state;
  const mem = useRef<{ h: number; p: number; px: number; py: number; embers: Ember[]; stars: Star[]; grain: [number, number, number][]; rnd: () => number; burst: number; wasP: boolean } | null>(null);
  const { canvasRef } = useCanvas2D((e) => {
    const { ctx, w, h, pal } = e;
    if (!mem.current) {
      const rnd = rng(kind.length * 977 + 13);
      const grain: [number, number, number][] = [];
      for (let i = 0; i < 260; i++) grain.push([rnd(), rnd(), rnd()]);
      const stars: Star[] = [];
      for (let i = 0; i < 34; i++) stars.push({ x: rnd(), y: rnd(), vx: (rnd() - 0.5) * 0.02, vy: (rnd() - 0.5) * 0.04, r: 0.6 + rnd() * 1.3, ph: rnd() * 6.28 });
      mem.current = { h: 0, p: 0, px: 0.5, py: 0.5, embers: [], stars, grain, rnd, burst: 0, wasP: false };
    }
    const m = mem.current;
    const snap = e.reduced ? 0 : e.dt;
    m.h = damp(m.h, st.current.hover ? 1 : 0, snap, 7);
    m.p = damp(m.p, st.current.press ? 1 : 0, snap, 16);
    const live = e.ptr.inside && !e.coarse;
    m.px = damp(m.px, live ? e.ptr.x : 0.5, snap, 10);
    m.py = damp(m.py, live ? e.ptr.y : 0.5, snap, 10);
    const dt = e.dt;
    const P = pal.primary, S = pal.signal;
    if (kind === 'ignition') {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, rgba(mix(P, [0, 0, 0], 0.88), 1));
      g.addColorStop(1, rgba(mix(P, [0, 0, 0], 0.62), 1));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      const heat = 0.35 + 0.65 * m.h;
      if (st.current.press && !m.wasP) m.burst = 1;
      m.wasP = st.current.press;
      m.burst = Math.max(0, m.burst - dt * 2.4);
      // static frame needs embers too: pre-warm once
      if (dt === 0 && m.embers.length === 0) for (let i = 0; i < 26; i++) m.embers.push({ x: m.rnd() * w, y: h * (0.2 + m.rnd() * 0.8), vx: 0, vy: 0, life: m.rnd() * 0.8, max: 1, r: 0.8 + m.rnd() * 1.8 });
      const rate = (18 + 60 * m.h + 160 * m.burst) * dt;
      for (let n = m.rnd() < rate % 1 ? 1 : 0, i = 0; i < Math.floor(rate) + n && m.embers.length < 120; i++) {
        const rr = m.rnd;
        m.embers.push({ x: rr() * w, y: h + 2, vx: (rr() - 0.5) * 14, vy: -(24 + rr() * 50) * (0.6 + heat), life: 0, max: 0.9 + rr() * 0.9, r: 0.8 + rr() * 1.8 });
      }
      ctx.globalCompositeOperation = 'lighter';
      const fl = ctx.createRadialGradient(w / 2, h * 1.25, 2, w / 2, h * 1.25, w * 0.55);
      fl.addColorStop(0, rgba(S, 0.75 * heat + 0.25 * m.burst)); fl.addColorStop(0.5, rgba(mix(S, P, 0.6), 0.28 * heat)); fl.addColorStop(1, rgba(P, 0));
      ctx.fillStyle = fl; ctx.fillRect(0, 0, w, h);
      for (let i = m.embers.length - 1; i >= 0; i--) {
        const b = m.embers[i]!;
        b.life += dt / b.max;
        b.x += (b.vx + Math.sin(b.life * 9 + b.y * 0.05) * 9) * dt; b.y += b.vy * dt;
        if (b.life >= 1) { m.embers.splice(i, 1); continue; }
        const a = Math.sin(Math.min(1, b.life) * Math.PI);
        ctx.fillStyle = rgba(mix(S, [255, 255, 255], 0.35 * (1 - b.life)), 0.9 * a);
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (1 - b.life * 0.4), 0, 6.283); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    } else if (kind === 'particles') {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, rgba(mix(P, [0, 0, 0], 0.9), 1)); g.addColorStop(1, rgba(mix(P, [0, 0, 0], 0.7), 1));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      const tx = m.px * w, ty = m.py * h;
      const pts = m.stars.map((s) => {
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.x < -0.05) s.x = 1.05; if (s.x > 1.05) s.x = -0.05; if (s.y < -0.1) s.y = 1.1; if (s.y > 1.1) s.y = -0.1;
        let x = s.x * w, y = s.y * h;
        const k = m.h * 0.38;
        x += (tx - x) * k * (1 - smooth(0, w * 0.6, Math.hypot(tx - x, ty - y)) * 0.5);
        y += (ty - y) * k * 0.6;
        return { x, y, r: s.r * (1 + 0.5 * m.h), a: 0.55 + 0.45 * Math.sin(e.t * 1.7 + s.ph) };
      });
      ctx.lineWidth = 0.7;
      const reach = 34 + 26 * m.h;
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i]!, b = pts[j]!;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < reach) { ctx.strokeStyle = rgba(mix(S, [255, 255, 255], 0.5), (1 - d / reach) * (0.25 + 0.4 * m.h)); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
      for (const p of pts) {
        ctx.fillStyle = rgba(mix(S, [255, 255, 255], 0.7), p.a);
        ctx.shadowColor = rgba(S, 0.9); ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      }
      ctx.shadowBlur = 0;
    } else {
      const pr = 1 - m.p * 0.5;
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, rgba(pal.raised, 1)); g.addColorStop(1, rgba(mix(pal.raised, pal.ink, 0.1 + 0.05 * m.p), 1));
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = rgba(pal.ink, 0.05);
      for (let y = 1; y < h; y += 3) ctx.fillRect(0, y, w, 1);
      for (const [gx, gy, ga] of m.grain) { ctx.fillStyle = rgba(ga > 0.5 ? [255, 255, 255] : pal.ink, 0.06 + ga * 0.08); ctx.fillRect(gx * w, gy * h, 1.2, 1.2); }
      const sx = (live ? m.px : 0.3 + 0.15 * Math.sin(e.t * 0.5) * (e.reduced ? 0 : 1)) * w;
      const sp = ctx.createLinearGradient(sx - w * 0.35, 0, sx + w * 0.35, 0);
      sp.addColorStop(0, 'rgba(255,255,255,0)'); sp.addColorStop(0.5, `rgba(255,255,255,${0.5 * pr})`); sp.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sp; ctx.fillRect(0, 0, w, h * 0.5);
      const ins = ctx.createLinearGradient(0, 0, 0, h);
      ins.addColorStop(0, `rgba(0,0,0,${0.18 * m.p})`); ins.addColorStop(0.2, 'rgba(0,0,0,0)'); ins.addColorStop(0.85, 'rgba(0,0,0,0)'); ins.addColorStop(1, `rgba(0,0,0,${0.22 * (1 - m.p)})`);
      ctx.fillStyle = ins; ctx.fillRect(0, 0, w, h);
      // status LED
      const lx = 16, ly = h / 2;
      ctx.fillStyle = rgba(pal.ink, 0.25); ctx.beginPath(); ctx.arc(lx, ly, 4.5, 0, 6.283); ctx.fill();
      ctx.shadowColor = rgba(P, 0.9); ctx.shadowBlur = 10 * m.h;
      ctx.fillStyle = rgba(mix(mix(pal.muted, [255, 255, 255], 0.2), P, m.h), 1); ctx.beginPath(); ctx.arc(lx, ly, 3, 0, 6.283); ctx.fill(); ctx.shadowBlur = 0;
    }
  }, { animate: true, staticT: kind === 'particles' ? 2.4 : 1.6 });
  return <canvas ref={canvasRef} className="ui-shader-buttons-cv" />;
}
