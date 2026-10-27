'use client';
import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { clampDpr, mix, rgba, watchLive, watchPalette, useReducedMotion, type Palette } from './_t2';

export interface GlobeCity { name: string; lat: number; lon: number }
export interface GlobeArcsProps {
  cities?: GlobeCity[];
  /** Pairs of indexes into cities. */
  arcs?: [number, number][];
  className?: string;
}
const CITIES: GlobeCity[] = [
  { name: 'San Francisco', lat: 37.8, lon: -122.4 }, { name: 'New York', lat: 40.7, lon: -74 }, { name: 'London', lat: 51.5, lon: -0.1 },
  { name: 'Lagos', lat: 6.5, lon: 3.4 }, { name: 'Dubai', lat: 25.2, lon: 55.3 }, { name: 'Singapore', lat: 1.35, lon: 103.8 },
  { name: 'Tokyo', lat: 35.7, lon: 139.7 }, { name: 'Sydney', lat: -33.9, lon: 151.2 }, { name: 'Sao Paulo', lat: -23.5, lon: -46.6 },
];
const ARCS: [number, number][] = [[0, 1], [1, 2], [2, 4], [4, 5], [5, 6], [6, 0], [2, 3], [1, 8], [5, 7], [3, 8]];

/* Hand-made coarse land mask: 18 latitude bands (90N..90S, 10 degrees each) as column ranges of 10-degree longitude cells (-180..180). */
const LAND: [number, number][][] = [
  [[14, 15]], [[7, 10], [12, 15], [19, 19], [27, 31]], [[0, 0], [1, 11], [13, 14], [16, 16], [18, 35]], [[3, 12], [17, 35]], [[5, 12], [17, 32]],
  [[5, 11], [17, 32]], [[6, 10], [17, 31]], [[8, 11], [17, 23], [25, 30]], [[10, 12], [17, 22], [28, 30]], [[10, 14], [19, 22], [27, 30], [32, 34]],
  [[11, 14], [19, 22], [30, 33]], [[11, 13], [19, 21], [29, 33]], [[11, 12], [20, 21], [29, 33], [34, 35]], [[11, 11], [32, 32], [34, 35]], [[11, 11]],
  [[11, 12]], [[0, 35]], [[0, 35]],
];
const GRID = LAND.map((r) => { const row = new Array<number>(36).fill(0); r.forEach(([a, b]) => { for (let c = a; c <= b; c++) row[c] = 1; }); return row; });
function landAt(lat: number, lon: number): boolean {
  const u = (lon + 180) / 10 - 0.5, v = (90 - lat) / 10 - 0.5;
  const i0 = Math.floor(u), j0 = Math.floor(v), fu = u - i0, fv = v - j0;
  const g = (i: number, j: number) => GRID[Math.max(0, Math.min(17, j))]?.[((i % 36) + 36) % 36] ?? 0;
  const t = g(i0, j0) * (1 - fu) * (1 - fv) + g(i0 + 1, j0) * fu * (1 - fv) + g(i0, j0 + 1) * (1 - fu) * fv + g(i0 + 1, j0 + 1) * fu * fv;
  return t > 0.5;
}
type V3 = [number, number, number];
const toVec = (lat: number, lon: number, r = 1): V3 => { const p = (lat * Math.PI) / 180, l = (lon * Math.PI) / 180; return [r * Math.cos(p) * Math.sin(l), r * Math.sin(p), r * Math.cos(p) * Math.cos(l)]; };
let dotCache: V3[] | null = null;
function dots(): V3[] {
  if (dotCache) return dotCache;
  const out: V3[] = [];
  for (let lat = -84; lat <= 84; lat += 2.9) {
    const step = 2.9 / Math.max(0.12, Math.cos((lat * Math.PI) / 180));
    for (let lon = -180; lon < 180; lon += step) if (landAt(lat, lon)) out.push(toVec(lat, lon));
  }
  return (dotCache = out);
}
function arcPoints(a: GlobeCity, b: GlobeCity): V3[] {
  const p = toVec(a.lat, a.lon), q = toVec(b.lat, b.lon);
  const dot = Math.max(-1, Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2]));
  const om = Math.acos(dot), so = Math.sin(om) || 1, lift = 0.06 + 0.3 * (om / Math.PI);
  const pts: V3[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40, s1 = Math.sin((1 - t) * om) / so, s2 = Math.sin(t * om) / so, h = 1 + lift * Math.sin(Math.PI * t);
    pts.push([(p[0] * s1 + q[0] * s2) * h, (p[1] * s1 + q[1] * s2) * h, (p[2] * s1 + q[2] * s2) * h]);
  }
  return pts;
}
const HOME = { lon: -0.35, lat: 0.4 };

/** A dotted globe on a 2D canvas with an own orthographic projection and animated arcs. Drag to spin with inertia; arrow keys rotate, Home resets. Fills its parent. */
export default function GlobeArcs({ cities = CITIES, arcs = ARCS, className }: GlobeArcsProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  const st = useRef({ lon: HOME.lon, lat: HOME.lat, v: 0, drag: false, px: 0, py: 0, lt: 0, w: 0, h: 0, live: true, reduced: false, draw: () => {} });
  const dataRef = useRef({ cities, arcs });
  useEffect(() => { dataRef.current = { cities, arcs }; }, [cities, arcs]);
  useEffect(() => { st.current.reduced = reduced; st.current.draw(); }, [reduced]);

  useEffect(() => {
    const canvas = cv.current, el = wrap.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !el || !ctx) return;
    const s = st.current;
    let pal: Palette | null = null, raf = 0, last = 0, dpr = 1, arcCache: { key: string; pts: V3[][] } = { key: '', pts: [] };
    const land = dots();

    const draw = (now = 1500) => {
      if (!pal || !s.w) return;
      const { cities: cs, arcs: as } = dataRef.current;
      const key = JSON.stringify([cs, as]);
      if (arcCache.key !== key) arcCache = { key, pts: as.map(([a, b]) => (cs[a] && cs[b] ? arcPoints(cs[a], cs[b]) : [])) };
      const W = s.w * dpr, H = s.h * dpr, R = Math.min(W, H) * 0.4, cx = W / 2, cy = H / 2;
      const cl = Math.cos(s.lon), sl = Math.sin(s.lon), ct = Math.cos(s.lat), stt = Math.sin(s.lat);
      const proj = (v: V3): V3 => { const x = v[0] * cl - v[2] * sl, z1 = v[0] * sl + v[2] * cl; return [x, v[1] * ct - z1 * stt, v[1] * stt + z1 * ct]; };
      ctx.clearRect(0, 0, W, H);
      const glow = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.25);
      glow.addColorStop(0, rgba(pal.primary, 0.22)); glow.addColorStop(1, rgba(pal.primary, 0));
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, 7); ctx.fill();
      const body = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      body.addColorStop(0, rgba(mix(pal.raised, pal.primary, 0.12), 1)); body.addColorStop(1, rgba(mix(pal.surface, pal.primary, 0.3), 1));
      ctx.fillStyle = body; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
      ctx.strokeStyle = rgba(pal.muted, 0.5); ctx.lineWidth = dpr; ctx.stroke();
      const ds = Math.max(1.3 * dpr, R * 0.021);
      const dotCol = mix(pal.ink, pal.primary, 0.35);
      for (const v of land) {
        const p = proj(v);
        if (p[2] <= 0) continue;
        ctx.globalAlpha = 0.18 + 0.72 * p[2];
        ctx.fillStyle = rgba(dotCol, 1);
        ctx.fillRect(cx + p[0] * R - ds / 2, cy - p[1] * R - ds / 2, ds, ds);
      }
      ctx.globalAlpha = 1;
      const vis = (p: V3) => p[2] > 0 || p[0] * p[0] + p[1] * p[1] > 1;
      const sec = now / 1000;
      arcCache.pts.forEach((pts, ai) => {
        if (pts.length < 2) return;
        const pp = pts.map(proj);
        ctx.lineWidth = dpr; ctx.strokeStyle = rgba(pal!.signal, 0.28); ctx.beginPath();
        let pen = false;
        pp.forEach((p, i) => { if (!vis(p)) { pen = false; return; } const X = cx + p[0] * R, Y = cy - p[1] * R; if (pen) ctx.lineTo(X, Y); else { ctx.moveTo(X, Y); pen = true; } void i; });
        ctx.stroke();
        const prog = ((sec / (3 + (ai % 4) * 0.5) + ai * 0.37) % 1) * 1.35, head = Math.min(1, prog), tail = Math.max(0, prog - 0.3);
        const i0 = Math.floor(tail * 40), i1 = Math.floor(head * 40);
        for (let i = i0; i < i1; i++) {
          const a = pp[i], b = pp[i + 1];
          if (!a || !b || !vis(a) || !vis(b)) continue;
          ctx.strokeStyle = rgba(pal!.signal, 0.2 + 0.8 * ((i - i0) / Math.max(1, i1 - i0)));
          ctx.lineWidth = 1.8 * dpr; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx + a[0] * R, cy - a[1] * R); ctx.lineTo(cx + b[0] * R, cy - b[1] * R); ctx.stroke();
        }
        const hp = pp[i1];
        if (prog < 1.3 && hp && vis(hp)) { ctx.fillStyle = rgba(pal!.signal, 1); ctx.beginPath(); ctx.arc(cx + hp[0] * R, cy - hp[1] * R, 2.4 * dpr, 0, 7); ctx.fill(); }
      });
      cs.forEach((c, ci) => {
        const p = proj(toVec(c.lat, c.lon));
        if (p[2] <= 0.02) return;
        const X = cx + p[0] * R, Y = cy - p[1] * R, ph = (sec * 0.6 + ci * 0.31) % 1;
        ctx.strokeStyle = rgba(pal!.primary, (1 - ph) * 0.8); ctx.lineWidth = dpr; ctx.beginPath(); ctx.arc(X, Y, (2 + ph * 7) * dpr, 0, 7); ctx.stroke();
        ctx.fillStyle = rgba(pal!.primary, 1); ctx.beginPath(); ctx.arc(X, Y, 2.6 * dpr, 0, 7); ctx.fill();
        ctx.strokeStyle = rgba(pal!.raised, 1); ctx.lineWidth = dpr; ctx.stroke();
      });
    };
    const frame = (t: number) => {
      raf = 0;
      const dt = Math.min(0.05, (t - (last || t)) / 1000); last = t;
      if (!s.drag) { s.v += ((s.reduced ? 0 : 0.2) - s.v) * (1 - Math.exp(-dt * 1.4)); s.lon += s.v * dt; }
      draw(t);
      if (s.live && !s.reduced) raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf && s.live && !s.reduced) { last = 0; raf = requestAnimationFrame(frame); } };
    s.draw = () => { if (s.reduced || !s.live) draw(); else start(); };

    const ro = new ResizeObserver(() => {
      dpr = clampDpr(); s.w = el.clientWidth; s.h = el.clientHeight;
      canvas.width = Math.max(1, Math.round(s.w * dpr)); canvas.height = Math.max(1, Math.round(s.h * dpr)); draw(s.reduced ? 1500 : performance.now());
    });
    ro.observe(el);
    const offP = watchPalette(el, (p) => { pal = p; draw(s.reduced ? 1500 : performance.now()); });
    const offL = watchLive(el, (l) => { s.live = l; if (l) start(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } });
    start();
    return () => { if (raf) cancelAnimationFrame(raf); ro.disconnect(); offP(); offL(); s.draw = () => {}; };
  }, [reduced]);

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    Object.assign(st.current, { drag: true, px: e.clientX, py: e.clientY, lt: e.timeStamp });
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const s = st.current;
    if (!s.drag) return;
    const R = Math.min(s.w, s.h) * 0.4, dt = Math.max(1, e.timeStamp - s.lt), dx = (e.clientX - s.px) / R;
    s.lon -= dx; s.v = s.v * 0.5 + (-dx / dt) * 1000 * 0.5;
    if (e.pointerType !== 'touch') s.lat = Math.max(-1.1, Math.min(1.1, s.lat + (e.clientY - s.py) / R));
    s.px = e.clientX; s.py = e.clientY; s.lt = e.timeStamp;
    s.draw();
  };
  const up = () => { const s = st.current; s.drag = false; if (s.reduced) s.v = 0; s.draw(); };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const s = st.current;
    if (e.key === 'ArrowLeft') { s.lon -= 0.2; s.v = s.reduced ? 0 : -0.9; }
    else if (e.key === 'ArrowRight') { s.lon += 0.2; s.v = s.reduced ? 0 : 0.9; }
    else if (e.key === 'ArrowUp') s.lat = Math.min(1.1, s.lat + 0.12);
    else if (e.key === 'ArrowDown') s.lat = Math.max(-1.1, s.lat - 0.12);
    else if (e.key === 'Home') { s.lon = HOME.lon; s.lat = HOME.lat; s.v = 0; }
    else return;
    e.preventDefault(); s.draw();
  };
  const names = cities.map((c) => c.name).join(', ');
  return (
    <div ref={wrap} className={`ui-globe-arcs-root ${className ?? ''}`} tabIndex={0} role="img"
      aria-label={`Rotating dotted globe with animated arcs between ${names}. Drag or use the arrow keys to rotate, Home to reset.`}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}>
      <canvas ref={cv} aria-hidden="true" />
    </div>
  );
}

export function Demo() {
  return <GlobeArcs />;
}
