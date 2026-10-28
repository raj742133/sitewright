import { css, layer, mixc, ridgePath, rng, scale, type Env, type RGB } from './_tu-three-kit';

/* Night-temple scene pieces: sky, ridges, mist strips, the hall + pagoda terrace, stone steps with lanterns, pines and a wet foreground. */

export interface NightTones { sky0: RGB; sky1: RGB; ridge: RGB[]; mist: RGB; moon: RGB; lamp: RGB; body: RGB; roof: RGB; trim: RGB }
export function nightTones(env: Env): NightTones {
  const p = env.pal, k = env.dark ? 1 : 1.12, base: RGB = [0.02, 0.03, 0.06];
  const sky0 = mixc(base, p.primary, 0.14 * k), sky1 = mixc(base, p.primary, 0.42 * k);
  return {
    sky0, sky1, ridge: [0.5, 0.32, 0.18, 0.09].map((m) => mixc(mixc(base, p.primary, 0.1), sky1, m)),
    mist: mixc(sky1, [0.8, 0.85, 0.95], 0.35), moon: mixc([1, 1, 0.92], p.signal, 0.12), lamp: mixc(p.signal, [1, 0.95, 0.8], 0.3),
    body: mixc(base, p.primary, 0.05), roof: mixc(base, p.primary, 0.08), trim: mixc(base, p.signal, 0.25),
  };
}
export function hall(c: CanvasRenderingContext2D, x: number, by: number, H: number, T: NightTones, lamp: number, t: number) {
  const w = H * 0.62, bh = H * 0.13;
  c.fillStyle = css(T.trim); c.fillRect(x - w * 0.6, by - H * 0.03, w * 1.2, H * 0.03);
  c.fillStyle = css(T.body); c.fillRect(x - w / 2, by - H * 0.03 - bh, w, bh);
  for (let i = 0; i < 5; i++) { const wx = x - w * 0.4 + i * w * 0.2; c.fillStyle = css(T.lamp, lamp * (0.75 + 0.25 * Math.sin(t * 4 + i * 2.3) * Math.sin(t * 2.9 + i))); c.fillRect(wx - w * 0.04, by - H * 0.03 - bh * 0.8, w * 0.08, bh * 0.6); }
  const yt = by - H * 0.03 - bh, rw = w * 1.45, rh = H * 0.13;
  c.fillStyle = css(T.roof); c.beginPath(); c.moveTo(x - rw / 2, yt - rh * 0.1); c.quadraticCurveTo(x - rw * 0.3, yt + rh * 0.1, x - w * 0.5, yt + 2); c.lineTo(x + w * 0.5, yt + 2); c.quadraticCurveTo(x + rw * 0.3, yt + rh * 0.1, x + rw / 2, yt - rh * 0.1);
  c.quadraticCurveTo(x + rw * 0.3, yt - rh * 0.5, x + w * 0.22, yt - rh); c.lineTo(x - w * 0.22, yt - rh); c.quadraticCurveTo(x - rw * 0.3, yt - rh * 0.5, x - rw / 2, yt - rh * 0.1); c.closePath(); c.fill();
  c.fillStyle = css(T.trim); c.fillRect(x - w * 0.24, yt - rh - H * 0.012, w * 0.48, H * 0.014);
}
export function pine(c: CanvasRenderingContext2D, x: number, by: number, h: number, col: RGB) {
  c.fillStyle = css(col); c.fillRect(x - h * 0.02, by - h * 0.2, h * 0.04, h * 0.2);
  for (let i = 0; i < 6; i++) { const y = by - h * (0.12 + i * 0.15), w = h * 0.3 * (1 - i * 0.14); c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x, y - h * 0.1, x + w, y); c.lineTo(x, y - h * 0.2); c.closePath(); c.fill(); }
}
/** Static background (sky, stars, moon, ridges, terrace, pines) in one cached layer. */
export function paintNight(env: Env, T: NightTones): HTMLCanvasElement {
  const { w, h, dpr } = env;
  return layer(w, h, dpr, (c) => {
    const g = c.createLinearGradient(0, 0, 0, h * 0.8); g.addColorStop(0, css(T.sky0)); g.addColorStop(1, css(T.sky1)); c.fillStyle = g; c.fillRect(0, 0, w, h);
    const r = rng(3);
    for (let i = 0; i < 70; i++) { c.fillStyle = css([1, 1, 1], 0.15 + r() * 0.5); const s = r() < 0.15 ? 2 : 1; c.fillRect(r() * w, r() * h * 0.5, s, s); }
    const mx = w * 0.2, my = h * 0.2, mr = Math.min(w, h) * 0.055;
    const gl = c.createRadialGradient(mx, my, 0, mx, my, mr * 6); gl.addColorStop(0, css(T.moon, 0.35)); gl.addColorStop(1, css(T.moon, 0)); c.fillStyle = gl; c.fillRect(0, 0, w, h);
    c.fillStyle = css(T.moon, 0.95); c.beginPath(); c.arc(mx, my, mr, 0, 6.3); c.fill();
    c.fillStyle = css(T.sky1, 0.5); c.beginPath(); c.arc(mx + mr * 0.35, my - mr * 0.15, mr * 0.85, 0, 6.3); c.fill();
    const px = w * 0.64;
    [0.6, 0.68].forEach((y, i) => { c.fillStyle = css(T.ridge[i]!); ridgePath(c, w, h, h * y, h * (0.16 - i * 0.02), 10 + i); c.fill(); });
    const by = h * 0.585, H = h * 0.48, mg = c.createLinearGradient(px - H, by, px + H * 0.8, h);
    mg.addColorStop(0, css(mixc(T.ridge[2]!, T.moon, 0.06))); mg.addColorStop(1, css(T.ridge[3]!)); c.fillStyle = mg;
    c.beginPath(); c.moveTo(px - w * 0.7, h); c.bezierCurveTo(px - w * 0.3, h * 0.82, px - H * 0.9, by + h * 0.12, px - H * 0.62, by + h * 0.02);
    c.lineTo(px - H * 0.55, by); c.lineTo(px + H * 0.62, by); c.bezierCurveTo(px + H * 0.7, by + h * 0.08, px + w * 0.25, h * 0.8, px + w * 0.6, h); c.closePath(); c.fill();
    c.fillStyle = css(scale(T.ridge[3]!, 0.8)); c.fillRect(px - H * 0.55, by - 2, H * 1.17, 4);
  });
}
