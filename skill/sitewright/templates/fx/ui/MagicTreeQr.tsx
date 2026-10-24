'use client';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { encodeQr, QR_MAX_BYTES, utf8 } from './_qr';
import { seeded, usePrefs } from './_d6';

export interface MagicTreeQrProps {
  /** The link or text to encode. Omit it to let the built-in field control the code. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Hide the field (use `value` to drive it). */
  showInput?: boolean;
  /** Hide the download and copy buttons. */
  showActions?: boolean;
  /** Smaller layout for tight spots: the code and the field sit side by side. */
  compact?: boolean;
  /** Starting season; the picker changes it. */
  season?: Season;
  className?: string;
}

const QUIET = 4;
const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
type Season = (typeof SEASONS)[number];
const DRIFT = Array.from({ length: 12 }, (_, i) => i);

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l * 100];
  const sat = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [Math.round(((h * 60) + 360) % 360), Math.round(sat * 100), l * 100];
}
/** Leaf colour for one module. Always dark enough to scan on the white card, whatever the season or the picked colour. */
function leafColor(season: Season, seed: number, r: number, custom: string | null): string {
  if (custom) { const [h, sa] = hexToHsl(custom); return `hsl(${h} ${Math.max(35, sa)}% ${22 + Math.floor(r * 12)}%)`; }
  const base = 95 + (seed % 85);
  if (season === 'spring') return r < 0.5 ? `hsl(${335 + Math.floor(r * 30)} 52% ${34 + Math.floor(r * 8)}%)` : `hsl(${105 + Math.floor(r * 30)} 45% ${26 + Math.floor(r * 8)}%)`;
  if (season === 'autumn') return `hsl(${8 + Math.floor(r * 36)} 78% ${30 + Math.floor(r * 8)}%)`;
  if (season === 'winter') return `hsl(${205 + Math.floor(r * 30)} 52% ${24 + Math.floor(r * 14)}%)`;
  return `hsl(${base} 55% ${20 + Math.floor(r * 12)}%)`;
}

function fnv(text: string): number { let h = 2166136261; for (const b of utf8(text)) { h ^= b; h = Math.imul(h, 16777619); } return h >>> 0; }

/** A tree drawn from the link's fingerprint: same link, same tree; any other link, a different one. */
function treePaths(seed: number, size: number): string[] {
  const rnd = seeded(seed);
  const out: string[] = [];
  const walk = (x: number, y: number, a: number, len: number, lvl: number) => {
    const ex = x + Math.sin(a) * len, ey = y - Math.cos(a) * len;
    out.push(`M${x.toFixed(1)} ${y.toFixed(1)}L${ex.toFixed(1)} ${ey.toFixed(1)}`);
    if (lvl >= 6) return;
    const kids = rnd() < 0.2 ? 3 : 2;
    for (let i = 0; i < kids; i++) walk(ex, ey, a + (kids === 2 ? (i ? 1 : -1) : i - 1) * (0.3 + rnd() * 0.4), len * (0.72 + rnd() * 0.1), lvl + 1);
  };
  walk(size / 2, size - QUIET * 0.6, (rnd() - 0.5) * 0.2, size * 0.2, 0);
  return out;
}

/** Turns a link into a scannable QR code whose dots are leaves on a tree grown from that link. Real QR encoding (byte mode, level M, up to 213 bytes), no dependency. Pick a season (spring blossom, summer, autumn, snowy winter) or your own leaf and trunk colours; it tilts toward the pointer. Download as SVG or PNG. */
export default function MagicTreeQr({ value, defaultValue = 'https://sitewright-skill.vercel.app', onChange, showInput = true, showActions = true, compact = false, season: firstSeason = 'summer', className }: MagicTreeQrProps) {
  const id = useId();
  const [typed, setTyped] = useState(defaultValue);
  const [debounced, setDebounced] = useState(defaultValue);
  const [note, setNote] = useState('');
  const [season, setSeason] = useState<Season>(firstSeason);
  const [leaf, setLeaf] = useState<string | null>(null);
  const [trunk, setTrunk] = useState('#3b2a1d');
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const { reduced, coarse } = usePrefs();
  const svgRef = useRef<SVGSVGElement>(null);
  const text = value ?? debounced;

  useEffect(() => { if (value !== undefined) return; const t = window.setTimeout(() => setDebounced(typed), 200); return () => window.clearTimeout(t); }, [typed, value]);

  const bytes = useMemo(() => utf8(text).length, [text]);
  const qr = useMemo(() => (text.trim() ? encodeQr(text) : null), [text]);
  const seed = useMemo(() => fnv(text), [text]);
  const leafCustom = leaf;
  const art = useMemo(() => {
    if (!qr) return null;
    const rnd = seeded(seed ^ 0x9e3779b9);
    const hue = 95 + (seed % 85); // greens through teals; every link gets its own shade
    const dots: Array<{ x: number; y: number; r: number; rot: number; leaf: boolean; col: string; d: number }> = [];
    const custom = leafCustom; const maxD = Math.hypot(qr.size / 2, qr.size);
    for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++) {
      if (!qr.modules[y]![x]) continue;
      const inFinder = (x < 8 && y < 8) || (x >= qr.size - 8 && y < 8) || (x < 8 && y >= qr.size - 8);
      if (inFinder) continue;
      const leaf = rnd() < 0.35; const leaf0 = custom;
      dots.push({ x, y, r: 0.5, rot: Math.floor(rnd() * 180), leaf, col: leafColor(season, seed, rnd(), leaf0), d: Math.hypot(x - qr.size / 2, y - qr.size) / maxD });
    }
    return { hue, dots, branches: treePaths(seed, qr.size + QUIET * 2) };
  }, [qr, seed, season, leafCustom]);

  const fingerprint = text.trim() ? seed.toString(16).toUpperCase().padStart(8, '0').slice(0, 4) : '----';
  const tooLong = bytes > QR_MAX_BYTES;
  const problem = !text.trim() ? 'Paste a link to grow its tree.' : tooLong ? `That is ${bytes} bytes; one code holds up to ${QR_MAX_BYTES}.` : '';

  const serialise = () => { const s = svgRef.current; if (!s) return ''; const c = s.cloneNode(true) as SVGSVGElement; c.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); c.removeAttribute('class'); c.querySelectorAll('[style]').forEach((e) => e.removeAttribute('style')); return new TextEncoder().encode(c.outerHTML).length ? c.outerHTML : ''; };
  const save = (blob: Blob, name: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
  const downloadSvg = () => { const s = serialise(); if (!s) return; save(new Blob([s], { type: 'image/svg+xml' }), `tree-qr-${fingerprint}.svg`); setNote('SVG saved.'); };
  const downloadPng = () => {
    const s = serialise(); if (!s) return;
    const img = new Image(); const url = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' }));
    img.onload = () => { const px = 1024, cv = document.createElement('canvas'); const ph = Math.round((px * (total + trunkH)) / total); cv.width = px; cv.height = ph; const g = cv.getContext('2d'); if (!g) return; g.fillStyle = '#ffffff'; g.fillRect(0, 0, px, ph); g.drawImage(img, 0, 0, px, ph); URL.revokeObjectURL(url); cv.toBlob((b) => { if (b) { save(b, `tree-qr-${fingerprint}.png`); setNote('PNG saved.'); } }, 'image/png'); };
    img.onerror = () => { URL.revokeObjectURL(url); setNote('Could not make the PNG; try the SVG.'); };
    img.src = url;
  };
  const copy = async () => { try { await navigator.clipboard.writeText(text); setNote('Link copied.'); } catch { setNote('Copy is blocked here; select the field instead.'); } };

  const total = qr ? qr.size + QUIET * 2 : 0;
  const trunkH = Math.round(total * 0.3);
  const finder = (fx: number, fy: number) => (
    <g key={`${fx}-${fy}`} className="ui-magic-tree-qr-finder">
      <rect x={fx + 0.5} y={fy + 0.5} width={6} height={6} rx={1.6} fill="none" stroke={trunk} strokeWidth={1} />
      <rect x={fx + 2} y={fy + 2} width={3} height={3} rx={1} fill={trunk} />
    </g>
  );

  return (
    <div className={`ui-magic-tree-qr${compact ? ' is-compact' : ''}${className ? ' ' + className : ''}`}>
      <figure className="ui-magic-tree-qr-fig">
        <div className="ui-magic-tree-qr-stage" style={tilt.x || tilt.y ? { transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` } : undefined}
          onPointerMove={(e) => { if (reduced || coarse || e.pointerType === 'touch') return; const r = e.currentTarget.getBoundingClientRect(); setTilt({ x: -((e.clientY - r.top) / r.height - 0.5) * 12, y: ((e.clientX - r.left) / r.width - 0.5) * 14 }); }}
          onPointerLeave={() => setTilt({ x: 0, y: 0 })}>
        {!reduced && season !== 'summer' && <div className={`ui-magic-tree-qr-drift is-${season}`} aria-hidden="true">{DRIFT.map((i) => <i key={`${season}-${i}`} style={{ ['--i' as string]: i }} />)}</div>}
        {qr && art ? (
          <svg ref={svgRef} key={text} viewBox={`0 0 ${total} ${total + trunkH}`} role="img" aria-label={`QR code for ${text}. Scan it to open the link.`} className={`ui-magic-tree-qr-svg${reduced ? ' is-static' : ''}`} shapeRendering="geometricPrecision">
            <ellipse cx={total / 2} cy={total + trunkH - 1.2} rx={total * 0.22} ry={1.4} fill={trunk} opacity={0.18} />
            <path d={`M${total / 2 - 2.6} ${total + trunkH - 1.5}C${total / 2 - 1.2} ${total + trunkH * 0.55} ${total / 2 - 1.6} ${total + 3} ${total / 2 - 1.8} ${total - 1}H${total / 2 + 1.8}C${total / 2 + 1.6} ${total + 3} ${total / 2 + 1.2} ${total + trunkH * 0.55} ${total / 2 + 2.6} ${total + trunkH - 1.5}Z`} fill={trunk} />
            <rect width={total} height={total} rx={2} fill="#ffffff" />
            <g transform={`translate(0 0)`} stroke={leaf ? leaf : `hsl(${art.hue} 40% 45%)`} strokeWidth={0.7} strokeLinecap="round" opacity={0.09} fill="none">{art.branches.map((d, i) => <path key={i} d={d} />)}</g>
            <g transform={`translate(${QUIET} ${QUIET})`}>
              {finder(0, 0)}{finder(qr.size - 7, 0)}{finder(0, qr.size - 7)}
              {art.dots.map((d, i) => (
                <g key={i} className="ui-magic-tree-qr-dot" style={{ animationDelay: `${(d.d * 1.2).toFixed(2)}s` }}>
                  {d.leaf
                    ? <path d={`M${d.x} ${d.y + 0.5}A0.5 0.5 0 0 1 ${d.x + 0.5} ${d.y}H${d.x + 0.92}Q${d.x + 1} ${d.y} ${d.x + 1} ${d.y + 0.08}V${d.y + 0.5}A0.5 0.5 0 0 1 ${d.x + 0.5} ${d.y + 1}H${d.x + 0.08}Q${d.x} ${d.y + 1} ${d.x} ${d.y + 0.92}Z`} fill={d.col} transform={d.rot > 90 ? `rotate(90 ${d.x + 0.5} ${d.y + 0.5})` : undefined} />
                    : <rect x={d.x} y={d.y} width={1} height={1} rx={0.34} fill={d.col} />}
                </g>
              ))}
            </g>
          </svg>
        ) : (
          <div className="ui-magic-tree-qr-empty" role="img" aria-label="No code yet"><span aria-hidden="true">🌱</span></div>
        )}
        </div>
        <figcaption>Tree <b>{fingerprint}</b>{qr ? ` · ${qr.size}×${qr.size}` : ''}</figcaption>
      </figure>
      <div className="ui-magic-tree-qr-side">
        {showInput && (
          <div className="ui-magic-tree-qr-field">
            <label htmlFor={`${id}-in`}>Link or text</label>
            <input id={`${id}-in`} type="text" inputMode="url" autoComplete="off" spellCheck={false} value={typed} placeholder="https://your-link.com" aria-invalid={Boolean(problem) && Boolean(typed.trim() === '' || tooLong)} aria-describedby={`${id}-msg`}
              onChange={(e) => { setTyped(e.target.value); onChange?.(e.target.value); setNote(''); }} />
          </div>
        )}
        {!compact && (
          <div className="ui-magic-tree-qr-style">
            <div role="group" aria-label="Season" className="ui-magic-tree-qr-seasons">
              {SEASONS.map((n) => <button key={n} type="button" aria-pressed={season === n} onClick={() => setSeason(n)}>{n}</button>)}
            </div>
            <label className="ui-magic-tree-qr-swatch">Leaves <input type="color" value={leaf ?? '#2f7d3a'} onChange={(e) => setLeaf(e.target.value)} /></label>
            <label className="ui-magic-tree-qr-swatch">Trunk <input type="color" value={trunk} onChange={(e) => setTrunk(e.target.value)} /></label>
            {leaf && <button type="button" className="ui-magic-tree-qr-reset" onClick={() => { setLeaf(null); setTrunk('#3b2a1d'); }}>Reset colours</button>}
          </div>
        )}
        <p id={`${id}-msg`} className="ui-magic-tree-qr-msg" role={problem && tooLong ? 'alert' : 'status'} aria-live="polite">{problem || note || 'Every link grows its own tree.'}</p>
        {showActions && (
          <div className="ui-magic-tree-qr-actions">
            <button type="button" onClick={downloadPng} disabled={!qr}>PNG</button>
            <button type="button" onClick={downloadSvg} disabled={!qr}>SVG</button>
            <button type="button" onClick={copy} disabled={!text.trim()}>Copy link</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Demo() {
  return <div style={{ width: '100%', display: 'grid', placeItems: 'center', padding: '8px 4px' }}><MagicTreeQr compact showActions={false} defaultValue="https://sitewright.dev" /></div>;
}
