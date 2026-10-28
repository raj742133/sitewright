'use client';
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { clampDpr, readPalette, useReducedMotion, watchLive, watchPalette, mix, type Palette } from './_t2';
import { MESHES, rotate, type Mesh, type V3 } from './_inputs-mesh';
import { clampN } from './_inputs-ui';

export interface ModelViewerProps {
  /** Initial shape. */
  shape?: 'cube' | 'gem' | 'lowPoly';
  /** Slowly spin while idle. */
  autoRotate?: boolean;
  /** Show the shape picker and zoom buttons. */
  controls?: boolean;
  className?: string;
  style?: CSSProperties;
}

const SHAPES: { key: 'cube' | 'gem' | 'lowPoly'; label: string }[] = [{ key: 'cube', label: 'Cube' }, { key: 'gem', label: 'Gem' }, { key: 'lowPoly', label: 'Low-poly' }];
const LIGHT: V3 = (() => { const v: V3 = [-0.45, 0.75, 0.55]; const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l]; })();

/** A tiny model viewer: a shape built in code, flat-shaded on a 2D canvas. Drag to orbit, wheel or +/- to zoom, arrow keys orbit, Home resets. */
export default function ModelViewer({ shape = 'gem', autoRotate = true, controls = true, className, style }: ModelViewerProps) {
  const reduced = useReducedMotion();
  const [key, setKey] = useState(shape);
  const [zoomUi, setZoomUi] = useState(1);
  const root = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const st = useRef({ yaw: 0.6, pitch: 0.35, vy: 0, vp: 0, zoom: 1, drag: false, lx: 0, ly: 0, idle: 0 });
  const api = useRef<{ wake: () => void; mesh: (m: Mesh) => void; draw: () => void } | null>(null);
  const opts = useRef({ autoRotate, reduced });
  opts.current = { autoRotate, reduced };

  useEffect(() => { api.current?.mesh(MESHES[key]()); }, [key]);
  useEffect(() => {
    const el = root.current, c = cv.current;
    if (!el || !c) return;
    const g = c.getContext('2d');
    if (!g) return;
    let mesh = MESHES[key]();
    let pal: Palette = readPalette(el);
    let W = 0, H = 0, dpr = 1, raf = 0, live = true, last = 0;
    const size = () => { W = c.clientWidth; H = c.clientHeight; dpr = clampDpr(); c.width = Math.max(1, Math.round(W * dpr)); c.height = Math.max(1, Math.round(H * dpr)); };
    const draw = () => {
      const s = st.current;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      const scale = Math.min(W, H) * 0.34 * s.zoom, cx = W / 2, cy = H / 2 + 4;
      // ground shadow
      g.save(); g.translate(cx, cy + scale * 1.18); g.scale(1, 0.18);
      const grd = g.createRadialGradient(0, 0, 0, 0, 0, scale);
      grd.addColorStop(0, `rgba(0,0,0,0.35)`); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(0, 0, scale, 0, Math.PI * 2); g.fill(); g.restore();
      const tv = mesh.verts.map((v) => rotate(v, s.yaw, s.pitch));
      const items: { f: number[]; z: number; shade: number }[] = [];
      mesh.faces.forEach((f, fi) => {
        const a = tv[f[0]!]!, b = tv[f[1]!]!, d = tv[f[2]!]!;
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        if (nz <= 0.0) return; // facing away (camera looks down -z; rotate keeps +z toward viewer)
        const z = f.reduce((m, i) => m + tv[i]![2], 0) / f.length;
        const lam = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
        const spec = Math.pow(Math.max(0, nz * 0.6 + ny * 0.8), 18) * (mesh.name === 'Gem' ? 0.9 : 0.35);
        items.push({ f, z, shade: Math.min(1, 0.18 + lam * 0.82 + spec + (fi % 3) * 0.015) });
      });
      items.sort((p, q) => p.z - q.z);
      const dark: [number, number, number] = [12, 14, 24];
      const base = mix(pal.primary, pal.signal, mesh.name === 'Gem' ? 0.15 : mesh.name === 'Cube' ? 0.5 : 0.8);
      for (const it of items) {
        g.beginPath();
        it.f.forEach((i, k) => { const p = tv[i]!; const persp = 3.2 / (3.2 - p[2] * 0.9); const x = cx + p[0] * scale * persp, y = cy - p[1] * scale * persp; k ? g.lineTo(x, y) : g.moveTo(x, y); });
        g.closePath();
        const col = it.shade < 0.55 ? mix(dark, base, it.shade / 0.55) : mix(base, [255, 255, 255], (it.shade - 0.55) / 0.45 * 0.85);
        g.fillStyle = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`;
        g.fill();
        g.strokeStyle = mesh.name === 'Gem' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.28)'; g.lineWidth = 1; g.lineJoin = 'round'; g.stroke();
      }
    };
    const frame = (t: number) => {
      raf = 0;
      const s = st.current, o = opts.current;
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016); last = t;
      let moving = false;
      if (!s.drag) {
        if (Math.abs(s.vy) > 1e-4 || Math.abs(s.vp) > 1e-4) { s.yaw += s.vy; s.pitch = clampN(s.pitch + s.vp, -1.45, 1.45); s.vy *= o.reduced ? 0 : 0.93; s.vp *= o.reduced ? 0 : 0.93; moving = true; }
        if (o.autoRotate && !o.reduced) { s.yaw += dt * 0.55; moving = true; }
      }
      draw();
      if (live && (moving || s.drag)) raf = requestAnimationFrame(frame);
    };
    const wake = () => { if (!raf && live) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    api.current = { wake, draw, mesh: (m) => { mesh = m; wake(); draw(); } };
    size(); draw();
    const ro = new ResizeObserver(() => { size(); draw(); });
    ro.observe(c);
    const offP = watchPalette(el, (p) => { pal = p; draw(); });
    const offL = watchLive(el, (l) => { live = l; if (l) wake(); else if (raf) { cancelAnimationFrame(raf); raf = 0; } });
    wake();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); offP(); offL(); api.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { api.current?.wake(); }, [autoRotate, reduced]);

  const zoomBy = (f: number) => { st.current.zoom = clampN(st.current.zoom * f, 0.55, 2.2); setZoomUi(st.current.zoom); api.current?.draw(); api.current?.wake(); };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const s = st.current; s.drag = true; s.lx = e.clientX; s.ly = e.clientY; s.vy = s.vp = 0; api.current?.wake();
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const s = st.current; if (!s.drag) return;
    const dx = (e.clientX - s.lx) * 0.01, dy = (e.clientY - s.ly) * 0.01;
    s.lx = e.clientX; s.ly = e.clientY;
    s.yaw += dx; s.pitch = clampN(s.pitch + dy, -1.45, 1.45); s.vy = dx; s.vp = dy;
    api.current?.draw();
  };
  const up = () => { st.current.drag = false; api.current?.wake(); };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const s = st.current; const k = e.key;
    if (k === 'ArrowLeft') s.vy -= 0.06; else if (k === 'ArrowRight') s.vy += 0.06;
    else if (k === 'ArrowUp') s.vp -= 0.05; else if (k === 'ArrowDown') s.vp += 0.05;
    else if (k === '+' || k === '=') zoomBy(1.15); else if (k === '-' || k === '_') zoomBy(1 / 1.15);
    else if (k === 'Home') { s.yaw = 0.6; s.pitch = 0.35; s.vy = s.vp = 0; s.zoom = 1; setZoomUi(1); api.current?.draw(); }
    else return;
    e.preventDefault();
    if (k.startsWith('Arrow') && opts.current.reduced) { s.yaw += s.vy * 3; s.pitch = clampN(s.pitch + s.vp * 3, -1.45, 1.45); s.vy = s.vp = 0; api.current?.draw(); }
    api.current?.wake();
  };
  return (
    <div ref={root} className={`ui-model-viewer-root ${className ?? ''}`} style={style}>
      <div className="ui-model-viewer-stage" tabIndex={0} role="group" aria-roledescription="3D model viewer" aria-label={`${SHAPES.find((s) => s.key === key)?.label ?? ''} model. Drag or use arrow keys to orbit, plus and minus to zoom, Home to reset.`}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={onKey}
        onWheel={(e) => { zoomBy(e.deltaY < 0 ? 1.08 : 1 / 1.08); }}>
        <canvas ref={cv} className="ui-model-viewer-canvas" role="img" aria-label="Rendered 3D shape" />
      </div>
      {controls && (
        <div className="ui-model-viewer-bar">
          <div role="radiogroup" aria-label="Shape" className="ui-model-viewer-shapes">
            {SHAPES.map((s) => <button key={s.key} type="button" role="radio" aria-checked={key === s.key} className={key === s.key ? 'is-on' : ''} onClick={() => setKey(s.key)}>{s.label}</button>)}
          </div>
          <div className="ui-model-viewer-zoom">
            <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.2)}>-</button>
            <span aria-live="polite">{Math.round(zoomUi * 100)}%</span>
            <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.2)}>+</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Demo() {
  return <ModelViewer />;
}
