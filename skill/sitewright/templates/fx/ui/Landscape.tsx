'use client';
import { useState, type CSSProperties } from 'react';
import { Chips } from './_tu-three-chips';
import { clamp, css, hash1, mixc, rainStreaks, useScene, WHITE, type Env } from './_tu-three-kit';
import { LAND_TIMES, LAND_WEATHER, look, lightning, paintScatter, paintSky, pathX, renderTerrain, type LandTime, type LandWeather, type Look } from './_tu-three-land';

export interface LandscapeProps {
  /** Time of day: sunrise, noon, sunset or night (default 'sunset'). */
  time?: LandTime;
  /** Weather: clear, rain, storm (with lightning), snow or fog (default 'clear'). */
  weather?: LandWeather;
  /** Camera drift speed in world units per second (default 0.9; 0 holds still). */
  speed?: number;
  className?: string;
  style?: CSSProperties;
}
interface State { L: Look; sky: HTMLCanvasElement; scroll: number; tv: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null; img: ImageData; RW: number; RH: number }

const frame = (speed: number, wx: LandWeather) => (c: CanvasRenderingContext2D, env: Env, s: State) => {
  const { w, h, t, px, py, dt } = env, L = s.L, hy = h * (0.46 + py * 0.03);
  if (!env.reduced) s.scroll += dt * speed;
  const scroll = env.reduced ? 12 : s.scroll + 12;
  c.drawImage(s.sky, 0, 0, w, h);
  const fl = wx === 'storm' ? lightning(c, env, hy) : 0;
  if (fl) { c.fillStyle = css(WHITE, fl * 0.25); c.fillRect(0, 0, w, h); }
  const camX = pathX(scroll) + px * 3.5;
  renderTerrain(s.img.data, s.RW, s.RH, env, L, wx, scroll, camX, hy / h);
  s.ctx?.putImageData(s.img, 0, 0);
  c.imageSmoothingEnabled = true; c.drawImage(s.tv, 0, 0, w, h);
  paintScatter(c, env, L, wx, scroll, camX, hy);
  const fogC = mixc(L.hor, L.top, 0.15);
  if (wx === 'fog') for (let i = 0; i < 3; i++) { const y = hy + h * (0.05 + i * 0.12), g = c.createLinearGradient(0, y - h * 0.12, 0, y + h * 0.12); g.addColorStop(0, css(fogC, 0)); g.addColorStop(0.5, css(fogC, 0.38)); g.addColorStop(1, css(fogC, 0)); c.fillStyle = g; c.fillRect(((t * (4 + i * 3)) % 40) - 40, y - h * 0.12, w + 40, h * 0.24); }
  const n = Math.round(Math.min(1.6, w / 500 + 0.4) * (wx === 'storm' ? 230 : wx === 'rain' ? 130 : 0));
  if (n) { rainStreaks(c, w, h, t, n, { speed: wx === 'storm' ? 700 : 520, len: wx === 'storm' ? 20 : 14, slant: wx === 'storm' ? 0.4 : 0.15, color: 'rgba(205,220,255,.22)' }); }
  if (wx === 'snow') {
    const k = Math.round(Math.min(1.6, w / 500 + 0.4) * 110);
    c.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = 0; i < k; i++) { const sz = 0.8 + hash1(i + 4) * 2, y = ((hash1(i) * h + t * (22 + sz * 14)) % (h + 10)) - 5, x = hash1(i + 1) * w + Math.sin(t * 0.8 + i) * 12 + t * 6; c.beginPath(); c.arc(((x % w) + w) % w, y, sz, 0, 6.3); c.fill(); }
  }
  const vg = c.createRadialGradient(w / 2, h * 0.5, Math.min(w, h) * 0.4, w / 2, h * 0.5, Math.max(w, h) * 0.8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${L.light < 0.4 ? 0.4 : 0.22})`); c.fillStyle = vg; c.fillRect(0, 0, w, h);
};

/**
 * A procedural landscape drawn as a pseudo-3D heightfield (painter's rows, no WebGL): rolling valley with a winding track, far mountains with snow caps,
 * grass tufts and stones, a sky for the chosen `time` and live `weather` (rain, storm with lightning, snow, fog). The pointer pans and tilts the camera.
 * Decorative (aria-hidden); fills its parent; one still frame with reduced motion.
 */
export default function Landscape({ time = 'sunset', weather = 'clear', speed = 0.9, className, style }: LandscapeProps) {
  const tm = LAND_TIMES.includes(time) ? time : 'sunset', wx = LAND_WEATHER.includes(weather) ? weather : 'clear';
  const { wrapRef, canvasRef } = useScene<State>((env) => { const L = look(env, tm, wx), RW = Math.round(clamp(env.w / 2.2, 120, 380)), RH = Math.max(60, Math.round((RW * env.h) / env.w)), tv = document.createElement('canvas'); tv.width = RW; tv.height = RH; const ctx = tv.getContext('2d'); return { L, sky: paintSky(env, L, wx), scroll: 0, tv, ctx, img: new ImageData(RW, RH), RW, RH }; }, frame(speed, wx), { key: tm + wx, fps: 30, maxPixels: 1.0e6 });
  return (
    <div ref={wrapRef} className={'ui-landscape' + (className ? ' ' + className : '')} style={style} data-time={tm} data-weather={wx} aria-hidden="true">
      <canvas ref={canvasRef} className="ui-landscape-canvas" />
    </div>
  );
}

export function Demo() {
  const [tm, setTm] = useState<LandTime>('sunset');
  const [wx, setWx] = useState<LandWeather>('clear');
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 150, overflow: 'hidden', borderRadius: 'var(--radius, 12px)' }}>
      <Landscape time={tm} weather={wx} />
      <div className="ui-landscape-bar">
        <Chips prefix="ui-landscape" label="Time of day" value={tm} options={LAND_TIMES} onChange={setTm} />
        <Chips prefix="ui-landscape" label="Weather" value={wx} options={LAND_WEATHER} onChange={setWx} />
      </div>
    </div>
  );
}
