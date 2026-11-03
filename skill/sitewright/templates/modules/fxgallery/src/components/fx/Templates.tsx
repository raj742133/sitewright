'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { TPL_ITEMS } from './tpl/demos';
import { GalleryNav } from './GalleryNav';

const GROUPS: Record<string, string> = { dashboard: 'Dashboards', page: 'Pages', brand: 'Brand' };

/* Live previews are expensive (canvases, WebGL, filters), so only a few run at once: a preview starts when it is on screen and a slot is free,
   and stops when it scrolls away. The slot passes to the next card waiting. */
const MAX_LIVE = 4;
let live = 0;
const waiting = new Set<() => void>();
function acquire(start: () => void): boolean {
  if (live < MAX_LIVE) { live++; start(); return true; }
  waiting.add(start);
  return false;
}
function release() {
  live = Math.max(0, live - 1);
  const next = waiting.values().next().value as (() => void) | undefined;
  if (next) { waiting.delete(next); live++; next(); }
}

/** A template running at 1280px wide inside a 16:10 card, scaled down to fit. Mounted only while it is on screen (and a slot is free), and inert: it is a picture here. */
function Shot({ Full }: { Full: React.ComponentType }) {
  const box = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  const [s, setS] = useState(0.3);
  useEffect(() => {
    const el = box.current; if (!el) return;
    let holding = false;
    const start = () => { holding = true; setOn(true); };
    const stop = () => { waiting.delete(start); setOn(false); if (holding) { holding = false; release(); } };
    const fit = () => setS(el.clientWidth / 1280);
    fit();
    const ro = new ResizeObserver(fit); ro.observe(el);
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) acquire(start); else stop(); }, { rootMargin: '120px' });
    io.observe(el);
    return () => { ro.disconnect(); io.disconnect(); stop(); };
  }, []);
  return <div ref={box} className="fxt-shot" aria-hidden="true">{on ? <div inert className="fxt-shot-in" style={{ transform: `scale(${s})`, height: 800 }}><Full /></div> : null}</div>;
}

/** The templates gallery: whole screens, each previewed at real size, each opening in a full-screen viewer with a device switch. */
export function Templates() {
  const [group, setGroup] = useState('all');
  const groups = Array.from(new Set(TPL_ITEMS.map((t) => t.group)));
  const list = TPL_ITEMS.filter((t) => group === 'all' || t.group === group);
  return (
    <div className="fxg">
      <GalleryNav active="templates" />
      <main className="fxt">
        <div className="fxc-head"><h1>Templates</h1><p className="muted">Whole screens to start from: dashboards, pages and a brand board. They answer their own width, so the full-screen view can be squeezed to a tablet or a phone. Not components: choose them with <code>effects.templates</code> or <code>--templates</code>.</p></div>
        <div className="fxg-chips" role="group" aria-label="Template type">
          {['all', ...groups].map((g) => <button key={g} type="button" className="fxg-chip" aria-pressed={group === g} onClick={() => setGroup(g)}>{g === 'all' ? `All ${TPL_ITEMS.length}` : GROUPS[g] ?? g}</button>)}
        </div>
        <div className="fxt-grid">
          {list.map((t) => (
            <article key={t.id} className="fxt-card">
              <Link href={`/effects/b/${t.id}/`} className="fxt-link" prefetch={false} aria-label={`Open ${t.label} full screen`}><Shot Full={t.Full} /></Link>
              <div className="fxt-meta">
                <div><h2>{t.label}</h2><p className="muted small">{t.desc}</p></div>
                <div className="fxt-act"><span className="fxt-tag">{GROUPS[t.group] ?? t.group}</span><Link className="btn sm primary" href={`/effects/b/${t.id}/`} prefetch={false}>Open full screen</Link></div>
              </div>
              <p className="muted small"><b>Use it for.</b> {t.use}</p>
              <code className="fxt-code">&quot;effects&quot;: {'{'} &quot;templates&quot;: [&quot;{t.id}&quot;] {'}'}</code>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
