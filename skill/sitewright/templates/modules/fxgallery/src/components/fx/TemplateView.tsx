'use client';

import { useEffect, useState } from 'react';
import { TPL_ITEMS } from './tpl/demos';

type Device = 'desktop' | 'tablet' | 'phone';
const WIDTH: Record<Device, string> = { desktop: '100%', tablet: '820px', phone: '390px' };

/**
 * One template at full size: /effects/b/<id>/. Inside an <iframe> (the website's previews) it is just the template, filling the frame and
 * following window.postMessage({ type: 'sitewright-theme' }). Opened on its own it gets a slim bar to go back, switch light/dark and
 * squeeze the frame to a tablet or phone width, which is the real responsive behaviour (the templates answer their own width).
 */
export function TemplateView({ id }: { id: string }) {
  const t = TPL_ITEMS.find((x) => x.id === id);
  const [top, setTop] = useState(false);
  const [device, setDevice] = useState<Device>('desktop');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setTop(window.self === window.top);
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches && !document.documentElement.dataset.theme ? 'dark' : 'light');
    const onMsg = (e: MessageEvent) => {
      const m = e.data as { type?: unknown; theme?: unknown } | null;
      if (m && m.type === 'sitewright-theme' && (m.theme === 'light' || m.theme === 'dark')) { document.documentElement.dataset.theme = m.theme; setTheme(m.theme); }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);
  const flip = () => { const n = theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = n; setTheme(n); };

  if (!t) return null;
  const Full = t.Full;
  return (
    <div className="fxe-tpl" data-embed="b" data-id={id} data-top={top ? '1' : '0'}>
      {top && (
        <div className="fxe-tpl-bar" role="toolbar" aria-label="Preview controls">
          <a className="btn sm" href="/effects/templates/">← All templates</a>
          <b>{t.label}</b>
          <span className="fxe-tpl-sp" />
          <div className="fxe-tpl-seg" role="group" aria-label="Device">
            {(['desktop', 'tablet', 'phone'] as const).map((d) => <button key={d} type="button" aria-pressed={device === d} onClick={() => setDevice(d)}>{d}</button>)}
          </div>
          <button type="button" className="btn sm" onClick={flip} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>{theme === 'dark' ? 'Light' : 'Dark'}</button>
        </div>
      )}
      <div className="fxe-tpl-stage" data-device={device}>
        <div className="fxe-tpl-frame" style={{ width: WIDTH[device] }}><Full /></div>
      </div>
    </div>
  );
}
