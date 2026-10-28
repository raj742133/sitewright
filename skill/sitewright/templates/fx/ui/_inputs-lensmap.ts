'use client';
/** Builds a displacement map (PNG data URL) for a rounded-rect lens: neutral grey in the middle, radial push near the rim. */
export function lensMap(w: number, h: number, radius: number, bezel: number): string {
  if (typeof document === 'undefined' || w < 2 || h < 2) return '';
  const c = document.createElement('canvas');
  c.width = Math.round(w); c.height = Math.round(h);
  const g = c.getContext('2d');
  if (!g) return '';
  const img = g.createImageData(c.width, c.height);
  const r = Math.min(radius, w / 2, h / 2);
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    // signed distance to the rounded rect edge (negative inside)
    const px = Math.abs(x + 0.5 - w / 2) - (w / 2 - r), py = Math.abs(y + 0.5 - h / 2) - (h / 2 - r);
    const sd = Math.hypot(Math.max(px, 0), Math.max(py, 0)) + Math.min(Math.max(px, py), 0) - r;
    const depth = -sd; // distance inside the rim
    let dx = 0, dy = 0;
    if (depth >= 0 && depth < bezel) {
      const t = 1 - depth / bezel;
      const m = t * t * (3 - 2 * t); // strongest at the rim
      // direction toward the centre of the shape (gradient of sd, negated)
      const sx = Math.sign(x + 0.5 - w / 2), sy = Math.sign(y + 0.5 - h / 2);
      let nx = px > 0 ? px * sx : 0, ny = py > 0 ? py * sy : 0;
      if (px <= 0 && py <= 0) { if (px > py) { nx = sx; ny = 0; } else { nx = 0; ny = sy; } }
      const l = Math.hypot(nx, ny) || 1;
      dx = -(nx / l) * m; dy = -(ny / l) * m;
    }
    const i = (y * c.width + x) * 4;
    img.data[i] = 128 + dx * 127; img.data[i + 1] = 128 + dy * 127; img.data[i + 2] = 128; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  try { return c.toDataURL('image/png'); } catch { return ''; }
}
