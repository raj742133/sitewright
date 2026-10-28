'use client';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useReducedMotion, watchLive } from './_t2';
import { cx } from './_motion-a';

export interface Logo {
  name: string;
  /** Your mark (an svg or img). Omit to show the name as text. */
  node?: ReactNode;
  href?: string;
}

export interface LogoLoopProps {
  logos?: Logo[];
  /** Scroll speed in px per second. */
  speed?: number;
  /** Direction the row travels. up/down make a vertical loop. */
  direction?: 'left' | 'right' | 'up' | 'down';
  /** Space between logos in px. */
  gap?: number;
  /** Height of each logo in px. */
  logoHeight?: number;
  /** Pause while hovered or focused. */
  pauseOnHover?: boolean;
  /** Fade the leading and trailing edges. */
  fade?: boolean;
  /** Show the pause/play button (recommended for anything that moves on its own). */
  pauseButton?: boolean;
  /** Accessible name of the list. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const MARKS: ReactNode[] = [
  <svg key="a" viewBox="0 0 24 24"><circle cx="8" cy="12" r="6" /><circle cx="16" cy="12" r="6" opacity=".55" /></svg>,
  <svg key="b" viewBox="0 0 24 24"><path d="M12 3 22 20H2Z" /><path d="M12 11 17 20H7Z" opacity=".5" /></svg>,
  <svg key="c" viewBox="0 0 24 24"><path d="m12 2 8.7 5v10L12 22l-8.7-5V7Z" /><circle cx="12" cy="12" r="3" opacity=".5" /></svg>,
  <svg key="d" viewBox="0 0 24 24"><path d="m4 5 8 7-8 7V5Zm9 0 8 7-8 7V5Z" /></svg>,
  <svg key="e" viewBox="0 0 24 24"><path d="M5 20C5 10 10 5 20 4c0 10-5 16-15 16Z" /><path d="M5 20 14 11" fill="none" stroke="var(--surface, #fff)" strokeWidth="1.5" /></svg>,
  <svg key="f" viewBox="0 0 24 24"><path d="M2 14c3-6 5-6 8 0s5 6 8 0l4-4v10H2Z" /></svg>,
  <svg key="g" viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" opacity=".5" /><rect x="3" y="13" width="8" height="8" rx="2" opacity=".5" /><rect x="13" y="13" width="8" height="8" rx="2" /></svg>,
  <svg key="h" viewBox="0 0 24 24"><path d="M10.5 2h3v7l6-3.5 1.5 2.6L15 12l6 3.4-1.5 2.6-6-3.5v7h-3v-7l-6 3.5L3 15.4 9 12 3 8.1l1.5-2.6 6 3.5Z" /></svg>,
];
const NAMES = ['Fennelwick', 'Orbital Dune', 'Pebblecraft', 'Lumenfield', 'Kestrel Row', 'Tidemark', 'Ashgrove', 'Nimbus Barn'];
export const SAMPLE_LOGOS: Logo[] = NAMES.map((name, i) => ({ name, node: MARKS[i] }));

function Item({ logo, h }: { logo: Logo; h: number }) {
  const body = (
    <>
      <span className="ui-logo-loop-mark" style={{ height: h, width: h }}>{logo.node}</span>
      <span className="ui-logo-loop-name">{logo.name}</span>
    </>
  );
  return logo.href
    ? <a className="ui-logo-loop-logo" href={logo.href} aria-label={logo.name}>{body}</a>
    : <span className="ui-logo-loop-logo" role="img" aria-label={logo.name}>{body}</span>;
}

/** A seamless, endlessly looping row (or column) of logos. Pauses on hover and focus, off screen and on request; under reduced motion it becomes a plain scrollable row. */
export default function LogoLoop({ logos = SAMPLE_LOGOS, speed = 60, direction = 'left', gap = 48, logoHeight = 28, pauseOnHover = true, fade = true, pauseButton = true, label = 'Logos', className, style }: LogoLoopProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLUListElement>(null);
  const reduced = useReducedMotion();
  const [copies, setCopies] = useState(2);
  const [dur, setDur] = useState(30);
  const [live, setLive] = useState(true);
  const [paused, setPaused] = useState(false);
  const vertical = direction === 'up' || direction === 'down';

  useEffect(() => {
    const root = rootRef.current, set = setRef.current;
    if (!root || !set) return;
    const measure = () => {
      const rs = vertical ? root.clientHeight : root.clientWidth;
      const ss = vertical ? set.offsetHeight : set.offsetWidth;
      if (ss <= 0) return;
      setCopies(Math.max(2, Math.ceil(rs / ss) + 1));
      setDur(Math.max(2, ss / Math.max(1, speed)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root); ro.observe(set);
    const off = watchLive(root, setLive);
    return () => { ro.disconnect(); off(); };
  }, [vertical, speed, gap, logoHeight, logos]);

  const vars = { '--ui-ll-gap': gap + 'px', '--ui-ll-h': logoHeight + 'px', '--ui-ll-dur': dur + 's', '--ui-ll-shift': (100 / copies) + '%', ...style } as CSSProperties;
  const reverse = direction === 'right' || direction === 'down';
  const n = reduced ? 1 : copies;
  return (
    <div ref={rootRef} className={cx('ui-logo-loop', vertical && 'is-vertical', fade && 'has-fade', pauseOnHover && 'pause-hover', className)} style={vars}
      data-running={!reduced && live && !paused ? 'true' : 'false'} data-reverse={reverse ? 'true' : undefined}
      role={reduced ? 'region' : undefined} aria-label={reduced ? label : undefined} tabIndex={reduced ? 0 : undefined}>
      <div className="ui-logo-loop-track">
        {Array.from({ length: n }, (_, c) => (
          <ul key={c} ref={c === 0 ? setRef : undefined} className="ui-logo-loop-set" aria-label={c === 0 ? label : undefined} aria-hidden={c === 0 ? undefined : true} inert={c === 0 ? undefined : true}>
            {logos.map((l, i) => <li key={i}><Item logo={l} h={logoHeight} /></li>)}
          </ul>
        ))}
      </div>
      {pauseButton && !reduced && (
        <button type="button" className="ui-logo-loop-pause" aria-pressed={paused} aria-label={paused ? 'Play logo animation' : 'Pause logo animation'} onClick={() => setPaused((p) => !p)}>
          {paused
            ? <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7-4.5Z" /></svg>
            : <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 1.5h2.5v9H2.5ZM7 1.5h2.5v9H7Z" /></svg>}
        </button>
      )}
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-logo-loop-demo">
      <p className="ui-logo-loop-lede">Trusted by teams who ship</p>
      <LogoLoop speed={56} />
      <LogoLoop speed={38} direction="right" gap={32} logoHeight={22} logos={[...SAMPLE_LOGOS].reverse()} label="More logos" />
    </div>
  );
}
