import type { Palette } from './_t1';

/** Draws a bold, detail-rich pattern (diagonal bands, a grid, rings) in the host palette; ripples read well over it. */
export function paintPattern(c: HTMLCanvasElement, pal: Palette) {
  const W = c.width, H = c.height;
  const ctx = c.getContext('2d');
  if (!ctx) return;
  const css = (v: number[], a = 1) => `rgba(${Math.round(v[0]! * 255)},${Math.round(v[1]! * 255)},${Math.round(v[2]! * 255)},${a})`;
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, css(pal.surface));
  bg.addColorStop(1, css(pal.raised));
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.rotate(-0.42);
  const bands = [pal.primary, pal.signal, pal.primary];
  bands.forEach((b, i) => { ctx.fillStyle = css(b, i === 1 ? 0.9 : 0.85); ctx.fillRect(-W, -H * 0.5 + i * H * 0.36 - H * 0.12, W * 2, H * 0.17); });
  ctx.restore();
  ctx.lineWidth = 2;
  ctx.strokeStyle = css(pal.ink, 0.28);
  for (let x = 0; x <= W; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y <= H; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.lineWidth = 5;
  for (let r = 60; r < 260; r += 44) { ctx.strokeStyle = css(pal.ink, 0.5); ctx.beginPath(); ctx.arc(W * 0.7, H * 0.38, r, 0, Math.PI * 2); ctx.stroke(); }
  ctx.fillStyle = css(pal.surface); ctx.beginPath(); ctx.arc(W * 0.7, H * 0.38, 34, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = css(pal.ink, 0.9);
  ctx.fillRect(W * 0.08, H * 0.72, W * 0.3, 14);
  ctx.fillRect(W * 0.08, H * 0.72 + 30, W * 0.2, 14);
}
