'use client';
import { useEffect, useRef, useState } from 'react';
import { Mini, useReducedMotion } from './_shared';

export interface Wind404Suggestion { label: string; href: string }
export interface Wind404PageProps {
  headline?: string;
  homeHref?: string;
  searchHref?: string;
  suggestions?: Wind404Suggestion[];
  className?: string;
}

const SUGGEST: Wind404Suggestion[] = [{ label: 'Pricing', href: '/pricing' }, { label: 'Documentation', href: '/docs' }, { label: 'Contact us', href: '/contact' }, { label: 'Latest news', href: '/blog' }];
/** fixed blade layout, so server and client agree */
const BLADES = Array.from({ length: 46 }, (_, i) => ({ x: 6 + i * 17.2 + ((i * 7) % 5), h: 16 + ((i * 13) % 22), d: (i * 0.37) % 2.4 }));

function Scene() {
  return (
    <svg className="ui-wind-404-page-scene" viewBox="0 0 800 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <g className="ui-wind-404-page-clouds">
        <g className="ui-wind-404-page-cloud" style={{ ['--d' as string]: '0s' }}><ellipse cx="130" cy="70" rx="46" ry="15" /><ellipse cx="160" cy="58" rx="30" ry="16" /><ellipse cx="105" cy="62" rx="26" ry="12" /></g>
        <g className="ui-wind-404-page-cloud" style={{ ['--d' as string]: '-14s' }}><ellipse cx="560" cy="40" rx="52" ry="14" /><ellipse cx="590" cy="28" rx="30" ry="15" /><ellipse cx="530" cy="32" rx="24" ry="11" /></g>
      </g>
      <path className="ui-wind-404-page-hill1" d="M0 150 C 140 90 260 110 380 140 S 640 130 800 100 V260 H0Z" />
      <path className="ui-wind-404-page-hill2" d="M0 190 C 120 150 280 175 420 185 S 680 160 800 175 V260 H0Z" />
      <g transform="translate(610 118)">
        <path d="M-5 100 Q-3 50 -2 22 L4 22 Q6 50 9 100Z" className="ui-wind-404-page-trunk" />
        <g className="ui-wind-404-page-crown"><circle cx="1" cy="0" r="30" /><circle cx="-24" cy="16" r="21" /><circle cx="26" cy="14" r="22" /><circle cx="2" cy="-22" r="18" /></g>
      </g>
      <path className="ui-wind-404-page-hill3" d="M0 224 C 200 200 360 232 520 220 S 720 206 800 214 V260 H0Z" />
      <g className="ui-wind-404-page-grass">
        {BLADES.map((b, i) => <path key={i} style={{ animationDelay: `${-b.d}s`, transformOrigin: `${b.x}px 252px` }} d={`M${b.x} 252 q ${i % 2 ? 4 : -4} ${-b.h / 2} ${i % 3 - 1} ${-b.h}`} />)}
      </g>
    </svg>
  );
}

/** A 404 page where the headline's letters bend away from the pointer like wind (per-letter springs), with gentle automatic gusts on touch. */
export default function Wind404Page({ headline = 'Nothing at this address but the wind.', homeHref = '/', searchHref = '/search', suggestions = SUGGEST, className }: Wind404PageProps) {
  const reduced = useReducedMotion();
  const root = useRef<HTMLDivElement>(null);
  const letters = useRef<(HTMLSpanElement | null)[]>([]);
  const [q, setQ] = useState('');
  const words = headline.split(' ');
  let n = 0;
  const shown = q.trim() ? suggestions.filter((s) => s.label.toLowerCase().includes(q.trim().toLowerCase())) : suggestions;

  useEffect(() => {
    const host = root.current;
    if (!host || reduced) return;
    const els = letters.current.filter((x): x is HTMLSpanElement => !!x);
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    const pos = els.map(() => ({ x: 0, y: 0 }));
    const ang = els.map(() => 0), vel = els.map(() => 0);
    const p = { x: 0, y: 0, on: false, sp: 0, t: 0 };
    let raf = 0, last = 0, visible = true, alive = true;
    const measure = () => {
      const r = host.getBoundingClientRect();
      els.forEach((el, i) => {
        const b = el.getBoundingClientRect();
        pos[i] = { x: b.left + b.width / 2 - r.left, y: b.top + b.height / 2 - r.top };
      });
    };
    const frame = (t: number) => {
      raf = 0;
      if (!alive || !visible || document.hidden) { last = 0; return; }
      const dt = Math.min(0.033, last ? (t - last) / 1000 : 0.016);
      last = t;
      p.sp *= 0.92;
      const strength = 26 + Math.min(22, p.sp * 0.04);
      for (let i = 0; i < els.length; i++) {
        const gust = Math.sin(t / 1100 + pos[i]!.x / 110) * (coarse ? 9 : 1.6) + Math.sin(t / 470 + i * 0.9) * (coarse ? 3 : 0.6);
        let target = gust;
        if (p.on) {
          const dx = pos[i]!.x - p.x, dy = pos[i]!.y - p.y;
          target += (dx >= 0 ? 1 : -1) * strength * Math.exp(-Math.hypot(dx, dy * 1.4) / 150);
        }
        vel[i] = vel[i]! + ((target - ang[i]!) * 110 - vel[i]! * 9) * dt;
        ang[i] = ang[i]! + vel[i]! * dt;
        els[i]!.style.transform = `rotate(${ang[i]!.toFixed(2)}deg)`;
      }
      raf = requestAnimationFrame(frame);
    };
    const run = () => { if (!raf && alive && visible && !document.hidden) raf = requestAnimationFrame(frame); };
    const move = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      p.sp = Math.max(p.sp, Math.hypot(x - p.x, y - p.y) * 60);
      p.x = x; p.y = y; p.on = true;
    };
    const leave = () => { p.on = false; };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    const io = new IntersectionObserver((en) => { visible = !!en[0]?.isIntersecting; if (visible) { measure(); run(); } });
    io.observe(host);
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerleave', leave);
    host.addEventListener('pointerup', leave);
    document.addEventListener('visibilitychange', run);
    run();
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
      host.removeEventListener('pointerup', leave);
      document.removeEventListener('visibilitychange', run);
      els.forEach((el) => { el.style.transform = ''; });
    };
  }, [reduced, headline]);

  return (
    <div ref={root} className={`ui-wind-404-page ${className ?? ''}`}>
      <Scene />
      <div className="ui-wind-404-page-body">
        <p className="ui-wind-404-page-code">Error 404</p>
        <h1 aria-label={headline}>
          {words.map((w, wi) => (
            <span key={wi} className="ui-wind-404-page-word" aria-hidden="true">
              {Array.from(w).map((ch) => { const idx = n++; return <span key={idx} ref={(el) => { letters.current[idx] = el; }} className="ui-wind-404-page-ch">{ch}</span>; })}
              {wi < words.length - 1 ? ' ' : ''}
            </span>
          ))}
        </h1>
        <p className="ui-wind-404-page-sub">The page you were after has blown away, or never lived here. Move your pointer across the words if you like, then pick a way back.</p>
        <div className="ui-wind-404-page-actions">
          <a className="ui-wind-404-page-home" href={homeHref}>Back home</a>
          <form action={searchHref} method="get" role="search" onSubmit={(e) => { if (!q.trim()) e.preventDefault(); }}>
            <label htmlFor="w404-q" className="ui-wind-404-page-sr">Search this site</label>
            <input id="w404-q" name="q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the site" autoComplete="off" />
            <button type="submit">Search</button>
          </form>
        </div>
        <p className="ui-wind-404-page-try" id="w404-try">{shown.length ? 'Were you looking for' : 'No quick match. Press Search to look through the whole site.'}</p>
        <ul aria-labelledby="w404-try" className="ui-wind-404-page-sug">
          {shown.map((s) => <li key={s.href}><a href={s.href}>{s.label}</a></li>)}
        </ul>
      </div>
    </div>
  );
}

export function Demo() {
  return <Mini w={900}><Wind404Page /></Mini>;
}
