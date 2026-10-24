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
  className?: string;
}

const QUIET = 4;

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

/** Turns a link into a scannable QR code whose dots are leaves on a tree grown from that link. Real QR encoding (byte mode, level M, up to 213 bytes), no dependency. Download as SVG or PNG. */
export default function MagicTreeQr({ value, defaultValue = 'https://sitewright-skill.vercel.app', onChange, showInput = true, showActions = true, compact = false, className }: MagicTreeQrProps) {
  const id = useId();
  const [typed, setTyped] = useState(defaultValue);
  const [debounced, setDebounced] = useState(defaultValue);
  const [note, setNote] = useState('');
  const { reduced } = usePrefs();
  const svgRef = useRef<SVGSVGElement>(null);
  const text = value ?? debounced;

  useEffect(() => { if (value !== undefined) return; const t = window.setTimeout(() => setDebounced(typed), 200); return () => window.clearTimeout(t); }, [typed, value]);

  const bytes = useMemo(() => utf8(text).length, [text]);
  const qr = useMemo(() => (text.trim() ? encodeQr(text) : null), [text]);
  const seed = useMemo(() => fnv(text), [text]);
  const art = useMemo(() => {
    if (!qr) return null;
    const rnd = seeded(seed ^ 0x9e3779b9);
    const hue = 95 + (seed % 85); // greens through teals; every link gets its own shade
    const dots: Array<{ x: number; y: number; r: number; rot: number; leaf: boolean; l: number; d: number }> = [];
    const maxD = Math.hypot(qr.size / 2, qr.size);
    for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++) {
      if (!qr.modules[y]![x]) continue;
      const inFinder = (x < 8 && y < 8) || (x >= qr.size - 8 && y < 8) || (x < 8 && y >= qr.size - 8);
      if (inFinder) continue;
      const leaf = rnd() < 0.35;
      dots.push({ x, y, r: 0.5, rot: Math.floor(rnd() * 180), leaf, l: 20 + Math.floor(rnd() * 12), d: Math.hypot(x - qr.size / 2, y - qr.size) / maxD });
    }
    return { hue, dots, branches: treePaths(seed, qr.size + QUIET * 2) };
  }, [qr, seed]);

  const fingerprint = text.trim() ? seed.toString(16).toUpperCase().padStart(8, '0').slice(0, 4) : '----';
  const tooLong = bytes > QR_MAX_BYTES;
  const problem = !text.trim() ? 'Paste a link to grow its tree.' : tooLong ? `That is ${bytes} bytes; one code holds up to ${QR_MAX_BYTES}.` : '';

  const serialise = () => { const s = svgRef.current; if (!s) return ''; const c = s.cloneNode(true) as SVGSVGElement; c.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); c.removeAttribute('class'); c.querySelectorAll('[style]').forEach((e) => e.removeAttribute('style')); return new TextEncoder().encode(c.outerHTML).length ? c.outerHTML : ''; };
  const save = (blob: Blob, name: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
  const downloadSvg = () => { const s = serialise(); if (!s) return; save(new Blob([s], { type: 'image/svg+xml' }), `tree-qr-${fingerprint}.svg`); setNote('SVG saved.'); };
  const downloadPng = () => {
    const s = serialise(); if (!s) return;
    const img = new Image(); const url = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' }));
    img.onload = () => { const px = 1024, cv = document.createElement('canvas'); cv.width = cv.height = px; const g = cv.getContext('2d'); if (!g) return; g.drawImage(img, 0, 0, px, px); URL.revokeObjectURL(url); cv.toBlob((b) => { if (b) { save(b, `tree-qr-${fingerprint}.png`); setNote('PNG saved.'); } }, 'image/png'); };
    img.onerror = () => { URL.revokeObjectURL(url); setNote('Could not make the PNG; try the SVG.'); };
    img.src = url;
  };
  const copy = async () => { try { await navigator.clipboard.writeText(text); setNote('Link copied.'); } catch { setNote('Copy is blocked here; select the field instead.'); } };

  const total = qr ? qr.size + QUIET * 2 : 0;
  const finder = (fx: number, fy: number) => (
    <g key={`${fx}-${fy}`} className="ui-magic-tree-qr-finder">
      <rect x={fx + 0.5} y={fy + 0.5} width={6} height={6} rx={1.6} fill="none" stroke="#3b2a1d" strokeWidth={1} />
      <rect x={fx + 2} y={fy + 2} width={3} height={3} rx={1} fill="#3b2a1d" />
    </g>
  );

  return (
    <div className={`ui-magic-tree-qr${compact ? ' is-compact' : ''}${className ? ' ' + className : ''}`}>
      <figure className="ui-magic-tree-qr-fig">
        {qr && art ? (
          <svg ref={svgRef} key={text} viewBox={`0 0 ${total} ${total}`} role="img" aria-label={`QR code for ${text}. Scan it to open the link.`} className={`ui-magic-tree-qr-svg${reduced ? ' is-static' : ''}`} shapeRendering="geometricPrecision">
            <rect width={total} height={total} rx={2} fill="#ffffff" />
            <g transform={`translate(0 0)`} stroke={`hsl(${art.hue} 40% 45%)`} strokeWidth={0.7} strokeLinecap="round" opacity={0.09} fill="none">{art.branches.map((d, i) => <path key={i} d={d} />)}</g>
            <g transform={`translate(${QUIET} ${QUIET})`}>
              {finder(0, 0)}{finder(qr.size - 7, 0)}{finder(0, qr.size - 7)}
              {art.dots.map((d, i) => (
                <g key={i} className="ui-magic-tree-qr-dot" style={{ animationDelay: `${(d.d * 1.2).toFixed(2)}s` }}>
                  {d.leaf
                    ? <path d={`M${d.x} ${d.y + 0.5}A0.5 0.5 0 0 1 ${d.x + 0.5} ${d.y}H${d.x + 0.92}Q${d.x + 1} ${d.y} ${d.x + 1} ${d.y + 0.08}V${d.y + 0.5}A0.5 0.5 0 0 1 ${d.x + 0.5} ${d.y + 1}H${d.x + 0.08}Q${d.x} ${d.y + 1} ${d.x} ${d.y + 0.92}Z`} fill={`hsl(${art.hue} 55% ${d.l}%)`} transform={d.rot > 90 ? `rotate(90 ${d.x + 0.5} ${d.y + 0.5})` : undefined} />
                    : <rect x={d.x} y={d.y} width={1} height={1} rx={0.34} fill={`hsl(${art.hue} 55% ${d.l}%)`} />}
                </g>
              ))}
            </g>
          </svg>
        ) : (
          <div className="ui-magic-tree-qr-empty" role="img" aria-label="No code yet"><span aria-hidden="true">🌱</span></div>
        )}
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
