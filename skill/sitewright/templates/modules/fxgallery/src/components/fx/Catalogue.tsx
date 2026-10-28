'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { DemoFrame } from './DemoFrame';
import { UI_DEMOS } from './ui/demos';
import { GalleryNav } from './GalleryNav';

const GROUP_LABEL: Record<string, string> = { motion: 'Motion', media: 'Media', cards: 'Cards', charts: 'Charts', inputs: 'Inputs', navigation: 'Navigation', buttons: 'Buttons', hover: 'Hover', text: 'Text', backgrounds: 'Backgrounds', loaders: 'Loaders', feedback: 'Feedback', glass: 'Glass' };
const label = (g: string) => GROUP_LABEL[g] ?? g[0]!.toUpperCase() + g.slice(1);

/** Renders its children only once it has scrolled near the screen: a catalogue of a hundred live demos must not run a hundred at once. */
function Lazy({ children, height }: { children: React.ReactNode; height: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setOn(true); io.disconnect(); } }, { rootMargin: '200px' });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <div ref={ref} style={{ minHeight: height }}>{on ? children : null}</div>;
}

function Copy({ text, what }: { text: string; what: string }) {
  const [done, setDone] = useState(false);
  return <button type="button" className="btn sm" aria-label={`Copy ${what}`} onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); window.setTimeout(() => setDone(false), 1400); } catch { /* clipboard blocked */ } }}>{done ? 'Copied' : 'Copy'}</button>;
}

/** The component browser: groups on the left, search, a grid of small live previews, and an inspector with the import line and the config. */
export function Catalogue() {
  const groups = useMemo(() => Array.from(new Set(UI_DEMOS.map((d) => d.group))), []);
  const [group, setGroup] = useState<string>('all');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => { const h = decodeURIComponent(location.hash.slice(1)); if (h && UI_DEMOS.some((d) => d.id === h)) { setSel(h); setGroup('all'); } }, []);
  const pick = (id: string | null) => { setSel(id); history.replaceState(null, '', id ? `#${id}` : location.pathname + location.search); };
  const list = UI_DEMOS.filter((d) => (group === 'all' || d.group === group) && (!q.trim() || `${d.label} ${d.desc} ${d.use} ${d.source} ${d.id}`.toLowerCase().includes(q.trim().toLowerCase())));
  const cur = sel ? UI_DEMOS.find((d) => d.id === sel) : undefined;
  const name = cur ? cur.label.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c: string) => (c ? c.toUpperCase() : '')) : '';
  return (
    <div className="fxg">
      <GalleryNav active="components" />
      <div className="fxc">
        <aside className="fxc-side" aria-label="Component groups">
          <label className="fxc-search"><span className="fxg-sr">Search components</span><input type="search" placeholder={`Search ${UI_DEMOS.length} components`} value={q} onChange={(e) => setQ(e.target.value)} /></label>
          <ul>
            {['all', ...groups].map((g) => {
              const n = g === 'all' ? UI_DEMOS.length : UI_DEMOS.filter((d) => d.group === g).length;
              return <li key={g}><button type="button" aria-pressed={group === g} onClick={() => setGroup(g)}>{g === 'all' ? 'All components' : label(g)}<span>{n}</span></button></li>;
            })}
          </ul>
        </aside>
        <main className="fxc-main">
          <div className="fxc-head"><h1>{group === 'all' ? 'Components' : label(group)}</h1><p className="muted">{list.length} of {UI_DEMOS.length}. Each is one file, no extra library. Select one for the import line and the config.</p></div>
          {list.length === 0 && <p className="fxc-none">Nothing matches “{q}”. <button type="button" className="btn sm" onClick={() => { setQ(''); setGroup('all'); }}>Clear</button></p>}
          <div className="fxc-grid">
            {list.map((d) => (
              <button key={d.id} type="button" className="fxc-tile" aria-pressed={sel === d.id} onClick={() => pick(sel === d.id ? null : d.id)}>
                <span className="fxc-stage"><Lazy height={150}><DemoFrame className="fxc-demo"><d.Demo /></DemoFrame></Lazy></span>
                <span className="fxc-name"><b>{d.label}</b><small>{label(d.group)}</small></span>
              </button>
            ))}
          </div>
        </main>
        {cur && (
          <aside className="fxc-insp" aria-label={`${cur.label} details`}>
            <div className="fxc-insp-h"><div><p className="eyebrow">{label(cur.group)} · {cur.source}</p><h2>{cur.label}</h2></div><button type="button" className="btn sm" onClick={() => pick(null)} aria-label="Close details">Close</button></div>
            <div className="fxc-big"><DemoFrame className="fxc-demo"><cur.Demo /></DemoFrame></div>
            <p>{cur.desc}</p>
            <p className="muted small"><b>Use it for.</b> {cur.use}</p>
            <div className="fxc-code"><div><span>Import</span><Copy what="import line" text={`import { ${name} } from '@/components/fx/ui';`} /></div><pre>{`import { ${name} } from '@/components/fx/ui';`}</pre></div>
            <div className="fxc-code"><div><span>site.json</span><Copy what="config" text={`"effects": { "components": ["${cur.id}"] }`} /></div><pre>{`"effects": { "components": ["${cur.id}"] }`}</pre></div>
            <a className="btn primary" href={`/effects/c/${cur.id}/`}>Open full screen</a>
          </aside>
        )}
      </div>
    </div>
  );
}
