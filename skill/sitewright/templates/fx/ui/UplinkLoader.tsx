'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion, watchLive } from './_t2';

export interface UplinkLoaderProps {
  /** Determinate progress, 0-100. When given the loader is controlled and never advances by itself. */
  progress?: number;
  /** Starting progress when uncontrolled (default 0, or 62 under reduced motion so the frame is meaningful). */
  defaultProgress?: number;
  /** Advance by itself when `progress` is not given (default true; always off under reduced motion). */
  autoplay?: boolean;
  /** Stage names; progress is divided evenly between them. */
  steps?: string[];
  /** Heading shown in the panel. */
  title?: string;
  /** Announced and shown when progress reaches 100. */
  doneText?: string;
  onComplete?: () => void;
  className?: string;
  style?: CSSProperties;
}

const STEPS = ['Locating relay', 'Opening channel', 'Verifying keys', 'Syncing manifest', 'Warming caches'];
const SEGMENTS = 24;
const TICKS = 48;

const pad = (n: number, w: number) => String(Math.round(n)).padStart(w, '0');

/** A cinematic secure-connection loader: stepped segmented bar, telemetry ticks, scanline and film grain, a determinate role=progressbar and live status text. */
export default function UplinkLoader({ progress, defaultProgress, autoplay = true, steps = STEPS, title = 'Secure uplink', doneText = 'Channel ready', onComplete, className, style }: UplinkLoaderProps) {
  const reduced = useReducedMotion();
  const controlled = progress !== undefined;
  const [own, setOwn] = useState(defaultProgress ?? 0);
  const root = useRef<HTMLDivElement>(null);
  const live = useRef(true);
  const doneRef = useRef(false);
  const cb = useRef(onComplete);
  useEffect(() => { cb.current = onComplete; });

  useEffect(() => {
    if (defaultProgress === undefined && reduced && !controlled) setOwn(62);
  }, [reduced, controlled, defaultProgress]);
  useEffect(() => {
    const el = root.current;
    const off = el ? watchLive(el, (l) => { live.current = l; }) : undefined;
    return () => off?.();
  }, []);
  useEffect(() => {
    if (controlled || !autoplay || reduced) return;
    let hold = 0;
    const id = setInterval(() => {
      if (!live.current) return;
      setOwn((p) => {
        if (p >= 100) { hold += 1; return hold > 14 ? 0 : 100; }
        hold = 0;
        const stepSize = 100 / steps.length;
        const within = (p % stepSize) / stepSize;
        return Math.min(100, p + 0.7 + (within < 0.8 ? 1.4 : 0.3));
      });
    }, 90);
    return () => clearInterval(id);
  }, [controlled, autoplay, reduced, steps.length]);

  const pct = Math.max(0, Math.min(100, Number.isFinite(progress ?? own) ? (progress ?? own) : 0));
  const done = pct >= 100;
  useEffect(() => {
    if (done && !doneRef.current) cb.current?.();
    doneRef.current = done;
  }, [done]);

  const n = steps.length;
  const idx = Math.min(n - 1, Math.floor((pct / 100) * n));
  const stepName = done ? doneText : steps[idx] ?? '';
  const lit = Math.round((pct / 100) * SEGMENTS);
  const wave = Math.sin(pct / 7);
  const latency = 18 + Math.round(10 * (1 + wave));
  const rate = (2.4 + (pct / 100) * 6.1 + wave * 0.35).toFixed(1);
  const packets = Math.round(pct * 37.4);
  const marker = (pct / 100) * 100;

  return (
    <div ref={root} className={`ui-uplink-loader-root ${done ? 'is-done' : ''} ${className ?? ''}`} style={style}>
      <div className="ui-uplink-loader-grain" aria-hidden="true" />
      <div className="ui-uplink-loader-scan" aria-hidden="true" />
      <span className="ui-uplink-loader-corner is-tl" aria-hidden="true" /><span className="ui-uplink-loader-corner is-tr" aria-hidden="true" />
      <span className="ui-uplink-loader-corner is-bl" aria-hidden="true" /><span className="ui-uplink-loader-corner is-br" aria-hidden="true" />

      <div className="ui-uplink-loader-head">
        <span className="ui-uplink-loader-title"><i aria-hidden="true" />{title}</span>
        <span className="ui-uplink-loader-stage" aria-hidden="true">{pad(Math.min(n, idx + (done ? 0 : 1)), 2)}/{pad(n, 2)}</span>
      </div>

      <div className="ui-uplink-loader-main">
        <div className="ui-uplink-loader-pct" aria-hidden="true">{pad(pct, 3)}<small>%</small></div>
        <div className="ui-uplink-loader-bar" role="progressbar" aria-label={title} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-valuetext={`${Math.round(pct)} percent, ${stepName}`}>
          {Array.from({ length: SEGMENTS }, (_, i) => <span key={i} className={i < lit ? 'is-on' : ''} style={i === lit - 1 && !done ? { opacity: 0.55 + 0.45 * ((pct / 100) * SEGMENTS - (lit - 1)) } : undefined} />)}
        </div>
        <div className="ui-uplink-loader-ruler" aria-hidden="true">
          {Array.from({ length: TICKS }, (_, i) => <span key={i} className={i % 6 === 0 ? 'is-major' : ''} />)}
          <b style={{ left: `${marker}%` }} />
        </div>
      </div>

      <p className="ui-uplink-loader-status" role="status" aria-live="polite"><span className="ui-uplink-loader-prompt" aria-hidden="true">&gt;</span> {stepName}<i className="ui-uplink-loader-caret" aria-hidden="true" /></p>

      <dl className="ui-uplink-loader-telemetry" aria-hidden="true">
        <div><dt>Latency</dt><dd>{latency} ms</dd></div>
        <div><dt>Rate</dt><dd>{rate} MB/s</dd></div>
        <div><dt>Packets</dt><dd>{packets}</dd></div>
      </dl>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-uplink-loader-demo"><UplinkLoader /></div>
  );
}
