'use client';
import { useMemo, useRef, type CSSProperties, type PointerEvent } from 'react';
import { latheLines, rosette, waveBand, wrap } from './_tu-guilloche';

export interface EngravedCertificateProps {
  title?: string;
  recipient?: string;
  /** The line of citation under the name; wraps onto up to three lines. */
  citation?: string;
  issuer?: string;
  date?: string;
  serial?: string;
  /** Draw the engraved lines in once on mount (default true). Never runs under reduced motion. */
  engrave?: boolean;
  className?: string;
  style?: CSSProperties;
}

const W = 1000, H = 707;

/** An engraved certificate drawn entirely in SVG: a woven guilloche border, a rosette watermark and seal, lathe-line paper and set type. Scales to its parent; a soft sheen follows the pointer. */
export default function EngravedCertificate({
  title = 'Certificate of Distinction', recipient = 'Alder Winterbourne', citation = 'in recognition of patient, exacting work keeping the Harbourlight Commons lit through four long winters',
  issuer = 'The Gilded Meridian Guild', date = 'Sealed the fourteenth of March', serial = 'No. 0042 · 7781', engrave = true, className, style,
}: EngravedCertificateProps) {
  const ref = useRef<HTMLDivElement>(null);
  const geo = useMemo(() => {
    const m = 26, t = 30;
    const L = m + t, R = W - m - t, T = m + t, B = H - m - t;
    const bands = [
      ...waveBand(L, m + t / 2, R, m + t / 2, 9, 34, 5, 0),
      ...waveBand(L, H - m - t / 2, R, H - m - t / 2, 9, 34, 5, 1),
      ...waveBand(m + t / 2, T, m + t / 2, B, 9, 24, 5, 2),
      ...waveBand(W - m - t / 2, T, W - m - t / 2, B, 9, 24, 5, 3),
    ];
    const corners = [[m + t / 2, m + t / 2], [W - m - t / 2, m + t / 2], [m + t / 2, H - m - t / 2], [W - m - t / 2, H - m - t / 2]].map(([x, y]) => rosette(x!, y!, 24, 20, 7, 11, 500));
    return {
      bands, corners, L, R, T, B,
      lathe: latheLines(L + 10, T + 10, R - 10, B - 10, 46),
      wm: [rosette(500, 354, 262, 100, 23, 62, 2200), rosette(500, 354, 190, 100, 37, 48, 1800), rosette(500, 354, 110, 60, 23, 34, 1200)],
      seal: [rosette(500, 604, 58, 60, 23, 38, 1100), rosette(500, 604, 38, 40, 11, 26, 700)],
    };
  }, []);
  const lines = wrap(citation, 52).slice(0, 3);
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--engraved-certificate-gx', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
    el.style.setProperty('--engraved-certificate-gy', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
  };
  const cls = engrave ? 'ui-engraved-certificate-draw' : '';
  return (
    <div ref={ref} className={`ui-engraved-certificate-root ${className ?? ''}`} style={style} onPointerMove={onMove} role="img" aria-label={`${title}. Awarded to ${recipient}, ${citation}. ${issuer}. ${date}. ${serial}.`}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" className="ui-engraved-certificate-svg">
        <rect x="0" y="0" width={W} height={H} rx="8" className="ui-engraved-certificate-paper" />
        <g className="ui-engraved-certificate-lathe">{geo.lathe.map((d, i) => <path key={i} d={d} />)}</g>
        <g className={`ui-engraved-certificate-wm ${cls}`}>{geo.wm.map((d, i) => <path key={i} d={d} pathLength={1} />)}</g>
        <rect x="26" y="26" width={W - 52} height={H - 52} className="ui-engraved-certificate-edge" />
        <rect x={geo.L} y={geo.T} width={geo.R - geo.L} height={geo.B - geo.T} className="ui-engraved-certificate-edge" />
        <g className={`ui-engraved-certificate-band ${cls}`}>{geo.bands.map((d, i) => <path key={i} d={d} pathLength={1} />)}</g>
        <g className="ui-engraved-certificate-corner">{geo.corners.map((d, i) => <path key={i} d={d} />)}</g>
        <g className="ui-engraved-certificate-type">
          <text x="500" y="128" className="ui-engraved-certificate-issuer">{issuer.toUpperCase()}</text>
          <path d="M360 146h280" className="ui-engraved-certificate-rule" />
          <text x="500" y="204" className="ui-engraved-certificate-title">{title}</text>
          <text x="500" y="258" className="ui-engraved-certificate-small">This certifies that</text>
          <text x="500" y="332" className="ui-engraved-certificate-name">{recipient}</text>
          <path d="M290 352h420" className="ui-engraved-certificate-rule" />
          {lines.map((l, i) => <text key={i} x="500" y={398 + i * 30} className="ui-engraved-certificate-cite">{l}</text>)}
          <text x="166" y="624" className="ui-engraved-certificate-meta" textAnchor="start">{date}</text>
          <path d="M166 596h210" className="ui-engraved-certificate-rule" />
          <text x="834" y="624" className="ui-engraved-certificate-meta" textAnchor="end">{serial}</text>
          <path d="M624 596h210" className="ui-engraved-certificate-rule" />
        </g>
        <circle cx="500" cy="604" r="66" className="ui-engraved-certificate-sealbg" />
        <g className="ui-engraved-certificate-seal">{geo.seal.map((d, i) => <path key={i} d={d} />)}<circle cx="500" cy="604" r="64" /><circle cx="500" cy="604" r="14" className="ui-engraved-certificate-hub" /></g>
      </svg>
    </div>
  );
}

export function Demo() {
  return <div className="ui-engraved-certificate-demo"><EngravedCertificate /></div>;
}
