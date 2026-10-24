'use client';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { encodeQr, QR_MAX_BYTES, utf8 } from './_qr';
import { seeded, usePrefs } from './_d6';
import TreeScene, { type Season } from './_tree3d';

export interface MagicTreeQrProps {
  /** The link or text to encode. Omit it to let the built-in field control the code. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Hide the field (use `value` to drive it). */
  showInput?: boolean;
  /** Hide the download and copy buttons. */
  showActions?: boolean;
  /** Smaller layout for tight spots: the picture and the field sit side by side. */
  compact?: boolean;
  /** Which picture to open on: the scannable flat code, or the tree it grows. Tap the picture to switch. */
  view?: 'qr' | 'tree';
  /** Starting season; the picker changes it. */
  season?: Season;
  className?: string;
}

const QUIET = 4;
const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
const DRIFT = Array.from({ length: 12 }, (_, i) => i);
const PAPER = '#f6f1e4';

function fnv(text: string): number { let h = 2166136261; for (const b of utf8(text)) { h ^= b; h = Math.imul(h, 16777619); } return h >>> 0; }

function hueOf(hex: string): [number, number] {
  const n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
  if (!d) return [0, 0];
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [Math.round((h * 60 + 360) % 360), Math.round((d / (1 - Math.abs(2 * l - 1))) * 100)];
}
function grayOf(h: number, sat: number, l: number): number {
  const sa = sat / 100, ll = l / 100, k = (n: number) => (n + h / 30) % 12, aa = sa * Math.min(ll, 1 - ll);
  const f = (n: number) => 255 * (ll - aa * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))));
  return 0.2126 * f(0) + 0.7152 * f(8) + 0.0722 * f(4);
}
/** One module's colour: hue and saturation vary like leaves, but the brightness is fitted into one narrow dark band so every scanner reads the squares as the same "dark". */
function moduleColor(season: Season, seed: number, r: number, custom: string | null): string {
  let h: number, sat: number;
  if (custom) { const [ch, cs] = hueOf(custom); h = ch; sat = Math.max(40, cs); }
  else if (season === 'spring') { if (r < 0.45) { h = 335 + Math.floor(r * 40); sat = 52; } else { h = 105 + Math.floor(r * 30); sat = 58; } }
  else if (season === 'autumn') { h = 6 + Math.floor(r * 34); sat = 80; }
  else if (season === 'winter') { h = 205 + Math.floor(r * 30); sat = 55; }
  else if (r < 0.18) { h = 70 + Math.floor(r * 40); sat = 50; }
  else { h = 95 + (seed % 25) + Math.floor(r * 25); sat = 80; }
  const target = 48 + (r * 7919 % 1) * 14; // gray 48..62 of 255
  let lo = 4, hi = 60; for (let i = 0; i < 7; i++) { const mid = (lo + hi) / 2; if (grayOf(h, sat, mid) > target) hi = mid; else lo = mid; }
  return `hsl(${h} ${sat}% ${((lo + hi) / 2).toFixed(1)}%)`;
}

/** Paste a link and get a real, scannable QR code that is also a tree: tap the picture to switch between the flat code (coloured like leaves) and an isometric tree standing on a slab whose tiles are the code. Pick a season or your own colours. Byte-mode QR, level M, up to 213 bytes, built in with no dependency. Download as SVG or PNG. */
export default function MagicTreeQr({ value, defaultValue = 'https://sitewright-skill.vercel.app', onChange, showInput = true, showActions = true, compact = false, view: firstView = 'qr', season: firstSeason = 'summer', className }: MagicTreeQrProps) {
  const id = useId();
  const [typed, setTyped] = useState(defaultValue);
  const [debounced, setDebounced] = useState(defaultValue);
  const [note, setNote] = useState('');
  const [season, setSeason] = useState<Season>(firstSeason);
  const [leaf, setLeaf] = useState<string | null>(null);
  const [trunk, setTrunk] = useState('#6b4a33');
  const [view, setView] = useState(firstView);
  const [turning, setTurning] = useState(false);
  const turnTimer = useRef(0);
  const { reduced } = usePrefs();
  const flatRef = useRef<SVGSVGElement>(null);
  const text = value ?? debounced;

  useEffect(() => { if (value !== undefined) return; const t = window.setTimeout(() => setDebounced(typed), 200); return () => window.clearTimeout(t); }, [typed, value]);

  const bytes = useMemo(() => utf8(text).length, [text]);
  const qr = useMemo(() => (text.trim() ? encodeQr(text) : null), [text]);
  const seed = useMemo(() => fnv(text), [text]);
  const cells = useMemo(() => {
    if (!qr) return [];
    const rnd = seeded(seed ^ 0x9e3779b9); const out: Array<{ x: number; y: number; c: string; d: number }> = [];
    const maxD = Math.hypot(qr.size, qr.size);
    for (let y = 0; y < qr.size; y++) for (let x = 0; x < qr.size; x++) if (qr.modules[y]![x]) out.push({ x, y, c: moduleColor(season, seed, rnd(), leaf), d: Math.hypot(x, qr.size - y) / maxD });
    return out;
  }, [qr, seed, season, leaf]);

  const fingerprint = text.trim() ? seed.toString(16).toUpperCase().padStart(8, '0').slice(0, 4) : '----';
  const tooLong = bytes > QR_MAX_BYTES;
  const problem = !text.trim() ? 'Paste a link to grow its tree.' : tooLong ? `That is ${bytes} bytes; one code holds up to ${QR_MAX_BYTES}.` : '';
  const total = qr ? qr.size + QUIET * 2 : 0;

  const serialise = () => { const s = flatRef.current; if (!s) return ''; const c = s.cloneNode(true) as SVGSVGElement; c.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); c.removeAttribute('class'); c.querySelectorAll('[style]').forEach((e) => e.removeAttribute('style')); return c.outerHTML; };
  const save = (blob: Blob, name: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
  const downloadSvg = () => { const s = serialise(); if (!s) return; save(new Blob([s], { type: 'image/svg+xml' }), `tree-qr-${fingerprint}.svg`); setNote('SVG saved.'); };
  const downloadPng = () => {
    const s = serialise(); if (!s) return;
    const img = new Image(); const url = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' }));
    img.onload = () => { const px = 1024, cv = document.createElement('canvas'); cv.width = cv.height = px; const g = cv.getContext('2d'); if (!g) return; g.fillStyle = PAPER; g.fillRect(0, 0, px, px); g.drawImage(img, 0, 0, px, px); URL.revokeObjectURL(url); cv.toBlob((b) => { if (b) { save(b, `tree-qr-${fingerprint}.png`); setNote('PNG saved.'); } }, 'image/png'); };
    img.onerror = () => { URL.revokeObjectURL(url); setNote('Could not make the PNG; try the SVG.'); };
    img.src = url;
  };
  const copy = async () => { try { await navigator.clipboard.writeText(text); setNote('Link copied.'); } catch { setNote('Copy is blocked here; select the field instead.'); } };
  const turn = () => { setTurning(true); window.clearTimeout(turnTimer.current); turnTimer.current = window.setTimeout(() => setTurning(false), 900); };
  useEffect(() => () => window.clearTimeout(turnTimer.current), []);
  const flip = () => setView((v) => (v === 'qr' ? 'tree' : 'qr'));

  return (
    <div className={`ui-magic-tree-qr${compact ? ' is-compact' : ''}${className ? ' ' + className : ''}`}>
      <figure className="ui-magic-tree-qr-fig">
        <div className={`ui-magic-tree-qr-stage is-${view}${turning && !reduced ? ' is-turning' : ''}`} onClick={qr ? flip : undefined}>
          {!reduced && view === 'tree' && season !== 'summer' && <div className={`ui-magic-tree-qr-drift is-${season}`} aria-hidden="true">{DRIFT.map((i) => <i key={`${season}-${i}`} style={{ ['--i' as string]: i }} />)}</div>}
          {qr ? (
            <>
              <svg ref={flatRef} key={`${text}-${season}-${leaf}`} viewBox={`0 0 ${total} ${total}`} role="img" aria-label={`QR code for ${text}. Scan it to open the link.`} aria-hidden={view === 'tree'} className={`ui-magic-tree-qr-svg${reduced ? ' is-static' : ''}`} shapeRendering="crispEdges">
                <rect width={total} height={total} fill={PAPER} />
                <g transform={`translate(${QUIET} ${QUIET})`}>
                  {cells.map((c) => <rect key={`${c.x}-${c.y}`} className="ui-magic-tree-qr-dot" x={c.x} y={c.y} width={1.02} height={1.02} fill={c.c} style={{ animationDelay: `${(c.d * 0.9).toFixed(2)}s` }} />)}
                </g>
              </svg>
              <div className="ui-magic-tree-qr-treewrap" aria-hidden={view === 'qr'}>
                <TreeScene key={`${text}-${season}-${leaf}`} qr={qr} seed={seed} season={season} leaf={leaf} trunk={trunk} animate={!reduced && view === 'tree'} />
              </div>
            </>
          ) : (
            <div className="ui-magic-tree-qr-empty" role="img" aria-label="No code yet"><span aria-hidden="true">🌱</span></div>
          )}
        </div>
        {qr && <button type="button" className="ui-magic-tree-qr-flip" onClick={flip} aria-pressed={view === 'tree'}>{view === 'qr' ? 'Tap to see the tree' : 'Tap the tree to see the QR code'}</button>}
        <figcaption>Tree <b>{fingerprint}</b>{qr ? ` · ${qr.size}×${qr.size}` : ''}</figcaption>
      </figure>
      <div className="ui-magic-tree-qr-side">
        {showInput && (
          <div className="ui-magic-tree-qr-field">
            <label htmlFor={`${id}-in`}>Link or text</label>
            <input id={`${id}-in`} type="text" inputMode="url" autoComplete="off" spellCheck={false} value={typed} placeholder="https://your-link.com" aria-invalid={Boolean(problem) && (typed.trim() === '' || tooLong)} aria-describedby={`${id}-msg`}
              onChange={(e) => { setTyped(e.target.value); onChange?.(e.target.value); setNote(''); }} />
          </div>
        )}
        {!compact && (
          <div className="ui-magic-tree-qr-style">
            <div role="group" aria-label="Season" className="ui-magic-tree-qr-seasons">
              {SEASONS.map((n) => <button key={n} type="button" aria-pressed={season === n} onClick={() => { if (n !== season) { setSeason(n); turn(); } }}>{n}</button>)}
            </div>
            <label className="ui-magic-tree-qr-swatch">Leaves <input type="color" value={leaf ?? '#2f7d3a'} onChange={(e) => { setLeaf(e.target.value); turn(); }} /></label>
            <label className="ui-magic-tree-qr-swatch">Trunk <input type="color" value={trunk} onChange={(e) => setTrunk(e.target.value)} /></label>
            {leaf && <button type="button" className="ui-magic-tree-qr-reset" onClick={() => { setLeaf(null); setTrunk('#6b4a33'); }}>Reset colours</button>}
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
  return <div style={{ width: '100%', display: 'grid', placeItems: 'center', padding: '4px' }}><MagicTreeQr compact showActions={false} view="tree" defaultValue="https://sitewright.dev" /></div>;
}
