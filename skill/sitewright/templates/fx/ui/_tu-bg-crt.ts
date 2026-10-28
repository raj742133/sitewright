import type { RGB } from './_t1';

/* Screen contents for CrtScreen: each draws a 320x240 frame to a 2D canvas that the shader uses as a texture. */
export type CrtScreenKind = 'terminal' | 'pattern' | 'static' | 'title';
export const TW = 320, TH = 240;

const css = (c: RGB, a = 1, k = 1) => `rgba(${Math.min(255, Math.round(c[0] * 255 * k))},${Math.min(255, Math.round(c[1] * 255 * k))},${Math.min(255, Math.round(c[2] * 255 * k))},${a})`;
const mixc = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const WHITE: RGB = [1, 1, 1];

const LINES = [
  'NODE-07 BOOT  v2.4.1', 'memory check ......... ok', 'link eth0 ............ up', 'mount /data ......... done',
  '', '> run diagnostics', 'sensors  [##########] 100%', 'uplink   [########..]  81%', 'all systems nominal', '',
  '> sync --all', 'pushed 128 records', 'idle. awaiting input', '> ',
];

export function drawTerminal(c: CanvasRenderingContext2D, t: number, pal: { primary: RGB; signal: RGB }, full: boolean) {
  const ph = mixc(pal.primary, WHITE, 0.62), amb = mixc(pal.signal, WHITE, 0.3);
  c.fillStyle = '#04070b'; c.fillRect(0, 0, TW, TH);
  const g = c.createRadialGradient(TW / 2, TH / 2, 10, TW / 2, TH / 2, 200);
  g.addColorStop(0, css(pal.primary, 0.18)); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, TW, TH);
  c.font = '700 13px ui-monospace, Menlo, Consolas, monospace'; c.textBaseline = 'top';
  const total = LINES.reduce((a, l) => a + l.length + 1, 0), cyc = total + 70;
  let shown = full ? total : Math.floor((t * 34) % cyc);
  if (shown > total) shown = total;
  let y = 12;
  for (const l of LINES) {
    if (shown <= 0) break;
    const part = l.slice(0, shown); shown -= l.length + 1;
    c.fillStyle = css(l.startsWith('>') ? amb : ph, 1); c.fillText(part, 14, y);
    if (shown <= 0 && (full || Math.floor(t * 2.2) % 2 === 0)) { c.fillStyle = css(ph, 1); c.fillRect(14 + c.measureText(part).width + 2, y + 1, 8, 12); }
    y += 15.5;
  }
  c.fillStyle = css(ph, 0.5); c.fillRect(0, 0, TW, 2);
}

export function drawPattern(c: CanvasRenderingContext2D, t: number, pal: { primary: RGB; signal: RGB; ink: RGB }) {
  const bars: RGB[] = [[0.92, 0.92, 0.92], pal.signal, mixc(pal.signal, pal.primary, 0.5), pal.primary, mixc(pal.primary, pal.ink, 0.5), [0.45, 0.45, 0.45], [0.1, 0.1, 0.12]];
  const bw = TW / bars.length;
  bars.forEach((b, i) => { c.fillStyle = css(b); c.fillRect(Math.floor(i * bw), 0, Math.ceil(bw), 150); });
  const rampH = 28;
  for (let i = 0; i < 16; i++) { const v = i / 15; c.fillStyle = css([v, v, v]); c.fillRect(Math.floor((i * TW) / 16), 150, Math.ceil(TW / 16), rampH); }
  c.fillStyle = css(pal.ink, 1, 0.5); c.fillRect(0, 178, TW, TH - 178);
  c.strokeStyle = css(WHITE, 0.7); c.lineWidth = 1;
  for (let x = 0; x <= TW; x += 40) { c.beginPath(); c.moveTo(x + 0.5, 178); c.lineTo(x + 0.5, TH); c.stroke(); }
  for (let y = 178; y <= TH; y += 20) { c.beginPath(); c.moveTo(0, y + 0.5); c.lineTo(TW, y + 0.5); c.stroke(); }
  c.lineWidth = 2; c.strokeStyle = css(WHITE, 0.95);
  c.beginPath(); c.arc(TW / 2, 209, 28, 0, 6.2832); c.stroke();
  c.fillStyle = css(WHITE, 0.9); c.font = '700 11px ui-monospace, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText('CH 03', TW / 2, 209); c.textAlign = 'left';
  const x = ((t * 40) % (TW + 40)) - 20; c.fillStyle = css(WHITE, 0.9); c.fillRect(x, 142, 3, 8);
}

const SHIP = ['....##....', '...####...', '..######..', '.###..###.', '####..####', '##......##'];
export function drawTitle(c: CanvasRenderingContext2D, t: number, pal: { primary: RGB; signal: RGB; ink: RGB }, full: boolean) {
  const sky = c.createLinearGradient(0, 0, 0, TH);
  sky.addColorStop(0, css(mixc(pal.ink, [0, 0, 0], 0.7))); sky.addColorStop(0.62, css(mixc(pal.primary, [0, 0, 0], 0.6))); sky.addColorStop(1, css(mixc(pal.signal, [0, 0, 0], 0.5)));
  c.fillStyle = sky; c.fillRect(0, 0, TW, TH);
  for (let i = 0; i < 40; i++) { const x = (i * 97) % TW, y = (i * 53) % 130; c.fillStyle = css(WHITE, (i % 3 ? 0.5 : 1)); const tw = Math.floor(t * 3 + i) % 4 === 0 ? 0 : 1; if (tw) c.fillRect(x, y, 2, 2); }
  c.fillStyle = css(pal.signal, 1); c.fillRect(250, 34, 20, 20); c.fillStyle = css(mixc(pal.signal, WHITE, 0.5)); c.fillRect(254, 36, 8, 8);
  c.fillStyle = css(mixc(pal.primary, [0, 0, 0], 0.5)); c.beginPath(); c.moveTo(0, 170);
  for (let x = 0; x <= TW; x += 16) c.lineTo(x, 150 - Math.abs(Math.sin(x * 0.045 + 1)) * 34);
  c.lineTo(TW, 170); c.fill();
  c.fillStyle = css(mixc(pal.ink, [0, 0, 0], 0.6)); c.fillRect(0, 168, TW, TH - 168);
  const off = full ? 0 : (t * 60) % 40;
  c.strokeStyle = css(pal.signal, 0.9); c.lineWidth = 2;
  for (let i = -8; i <= 8; i++) { c.beginPath(); c.moveTo(TW / 2 + i * 6, 168); c.lineTo(TW / 2 + i * 44, TH); c.stroke(); }
  for (let i = 0; i < 5; i++) { const y = 168 + ((i * 18 + off * 0.5) % 72); c.beginPath(); c.moveTo(0, y); c.lineTo(TW, y); c.stroke(); }
  c.font = '800 38px ui-monospace, Menlo, monospace'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
  c.fillStyle = css([0, 0, 0], 0.85); c.fillText('NEON LANE', TW / 2 + 3, 79); c.fillText('NEON LANE', TW / 2 + 3, 82);
  c.fillStyle = css(mixc(pal.signal, WHITE, 0.55)); c.fillText('NEON LANE', TW / 2, 76);
  c.font = '700 12px ui-monospace, monospace'; c.fillStyle = css(WHITE, 0.9); c.fillText('1 PLAYER  -  HI 048200', TW / 2, 100);
  if (full || Math.floor(t * 1.8) % 2 === 0) { c.font = '800 14px ui-monospace, monospace'; c.fillStyle = css(WHITE); c.fillText('PRESS START', TW / 2, 134); }
  c.textAlign = 'left';
  const sx = TW / 2 - 25 + (full ? 0 : Math.sin(t * 1.4) * 30), sy = 188 + (full ? 0 : Math.cos(t * 2.1) * 3);
  SHIP.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') { c.fillStyle = css(j < 2 ? WHITE : mixc(pal.primary, WHITE, 0.4)); c.fillRect(sx + i * 5, sy + j * 5, 5, 5); } }));
}
