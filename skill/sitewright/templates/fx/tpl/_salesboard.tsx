'use client';
// The deals Kanban: pointer drag (mouse, pen, and a grip for touch), keyboard (arrows move focus, Shift + left/right moves the deal,
// Enter opens the move menu) and a menu. Every move goes through onMove, which the page announces in its live region.
import { useEffect, useRef, useState, type KeyboardEvent as RKE, type PointerEvent as RPE } from 'react';
import { Avatar, Icon, cx, fmt } from './_dash';
import { STAGES, closeNote, health, prob, stageLabel, sum, type Deal, type StageId } from './_sales';

interface Drag { id: string; x: number; y: number; ox: number; oy: number; w: number; over: StageId | null }

function Card({ d, drag, lift, onMenu, grip, ...rest }: { d: Deal; drag?: boolean; lift?: boolean; onMenu?: (el: HTMLElement) => void; grip?: boolean } & React.HTMLAttributes<HTMLDivElement> & { tabIndex?: number }) {
  const h = health(d), p = prob(d), won = d.stage === 'won';
  const label = `${d.company}, ${d.title}, ${fmt.c(d.amount)}, ${stageLabel(d.stage)}, ${won ? 'won' : `${p}% probability`}, owner ${d.owner}, ${won ? 'closed' : 'closes'} ${closeNote(d)}, health: ${h.why}`;
  return (
    <div {...rest} className={cx('ts-card', drag && 'is-float', lift && 'is-lift')} data-deal={d.id} role="group" aria-roledescription="deal card" aria-label={label} aria-keyshortcuts="Shift+ArrowLeft Shift+ArrowRight Enter">
      <div className="ts-c1">
        <b title={d.company}>{d.company}</b>
        <span className={cx('ts-health', `is-${h.level}`)} title={h.why} aria-hidden="true" />
        {grip && <span className="ts-grip" aria-hidden="true"><Icon name="list" size={14} /></span>}
        {onMenu && <button type="button" className="ts-more" data-nodrag="" aria-haspopup="menu" aria-label={`Move ${d.company}`} onClick={(e) => onMenu(e.currentTarget)}><Icon name="more" size={16} /></button>}
      </div>
      <span className="ts-title">{d.title}</span>
      <div className="ts-c3"><b>{fmt.c(d.amount)}</b>{won ? <span className="ts-prob is-won"><Icon name="check" size={12} />Won</span> : <span className="ts-prob" title="Win probability"><i style={{ width: `${p}%` }} />{p}%</span>}</div>
      <div className="ts-c4"><Avatar name={d.owner} size={20} /><span>{d.owner.split(' ')[0]}</span><span className={cx('ts-date', h.level === 'bad' && !won && 'is-late')}><Icon name="calendar" size={12} />{closeNote(d)}</span></div>
    </div>
  );
}

export function Board({ deals, onMove }: { deals: Deal[]; onMove: (id: string, to: StageId) => void }) {
  const [active, setActive] = useState(''); const [drag, setDrag] = useState<Drag | null>(null); const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null); const cols = useRef<Partial<Record<StageId, HTMLElement | null>>>({}); const menuRef = useRef<HTMLDivElement>(null); const refocus = useRef<string | null>(null);
  const by = (s: StageId) => deals.filter((d) => d.stage === s);
  const tabId = deals.some((d) => d.id === active) ? active : (STAGES.map((s) => by(s.id)[0]).find(Boolean)?.id ?? '');

  useEffect(() => { // a moved card is a new element in another column: give it focus back
    if (!refocus.current) return; const el = boardRef.current?.querySelector<HTMLElement>(`[data-deal="${refocus.current}"]`); refocus.current = null; el?.focus();
  }, [deals]);
  useEffect(() => {
    if (!menu) return; menuRef.current?.querySelector<HTMLElement>('button:not(:disabled)')?.focus({ preventScroll: true });
    const away = (e: PointerEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(null); }; const close = (e?: Event) => { if (e?.target instanceof Node && menuRef.current?.contains(e.target)) return; setMenu(null); };
    window.addEventListener('pointerdown', away); window.addEventListener('resize', close); window.addEventListener('scroll', close, true);
    return () => { window.removeEventListener('pointerdown', away); window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true); };
  }, [menu]);

  const move = (id: string, to: StageId) => { refocus.current = id; setMenu(null); onMove(id, to); };
  const stageAt = (x: number, y: number): StageId | null => { for (const s of STAGES) { const r = cols.current[s.id]?.getBoundingClientRect(); if (r && x >= r.left && x <= r.right && y >= r.top - 40 && y <= r.bottom + 40) return s.id; } return null; };

  const begin = (e: RPE<HTMLDivElement>, d: Deal) => {
    const t = e.target as HTMLElement; if (e.button !== 0 || t.closest('[data-nodrag]') || (e.pointerType === 'touch' && !t.closest('.ts-grip'))) return;
    const r = e.currentTarget.getBoundingClientRect(); const g = { sx: e.clientX, sy: e.clientY, on: false, over: null as StageId | null };
    const stop = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel); window.removeEventListener('keydown', esc); };
    const mv = (ev: PointerEvent) => {
      if (!g.on) { if (Math.hypot(ev.clientX - g.sx, ev.clientY - g.sy) < 5) return; g.on = true; }
      const b = boardRef.current; if (b) { const br = b.getBoundingClientRect(); if (ev.clientX > br.right - 56) b.scrollLeft += 16; else if (ev.clientX < br.left + 56) b.scrollLeft -= 16; }
      g.over = stageAt(ev.clientX, ev.clientY); setDrag({ id: d.id, x: ev.clientX, y: ev.clientY, ox: e.clientX - r.left, oy: e.clientY - r.top, w: r.width, over: g.over });
    };
    const up = () => { stop(); if (!g.on) return; setDrag(null); if (g.over && g.over !== d.stage) move(d.id, g.over); };
    const cancel = () => { stop(); setDrag(null); };
    const esc = (ev: KeyboardEvent) => { if (ev.key === 'Escape') cancel(); };
    window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cancel); window.addEventListener('keydown', esc);
  };

  const openMenu = (id: string, el: HTMLElement) => { const r = el.getBoundingClientRect(); setMenu({ id, x: Math.max(8, Math.min(r.right - 188, window.innerWidth - 196)), y: Math.min(r.bottom + 4, window.innerHeight - 236) }); };
  const key = (e: RKE<HTMLDivElement>, d: Deal) => {
    if (e.target !== e.currentTarget) return;
    const si = STAGES.findIndex((s) => s.id === d.stage); const k = e.key;
    if (k === 'Enter' || k === ' ' || k === 'ContextMenu' || k === 'm') { e.preventDefault(); openMenu(d.id, e.currentTarget); return; }
    if (e.shiftKey && (k === 'ArrowLeft' || k === 'ArrowRight')) { e.preventDefault(); const ns = STAGES[si + (k === 'ArrowRight' ? 1 : -1)]; if (ns) move(d.id, ns.id); return; }
    const row = by(d.stage).indexOf(d); let target: Deal | undefined;
    if (k === 'ArrowDown') target = by(d.stage)[row + 1]; else if (k === 'ArrowUp') target = by(d.stage)[row - 1];
    else if (k === 'ArrowLeft' || k === 'ArrowRight') { for (let c = si + (k === 'ArrowRight' ? 1 : -1); c >= 0 && c < STAGES.length && !target; c += k === 'ArrowRight' ? 1 : -1) { const l = by(STAGES[c]!.id); target = l[Math.min(row, l.length - 1)]; } }
    else return;
    e.preventDefault(); if (target) boardRef.current?.querySelector<HTMLElement>(`[data-deal="${target.id}"]`)?.focus();
  };
  const menuKey = (e: RKE<HTMLDivElement>) => {
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled)')]; const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); const id = menu?.id; setMenu(null); if (id) boardRef.current?.querySelector<HTMLElement>(`[data-deal="${id}"]`)?.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus(); } else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
  };
  const dragged = drag ? deals.find((d) => d.id === drag.id) : undefined; const menuDeal = menu ? deals.find((d) => d.id === menu.id) : undefined;

  return (
    <>
      <div className={cx('ts-board', drag && 'is-drag')} ref={boardRef} role="group" aria-label="Deals by stage">
        {STAGES.map((s) => { const ds = by(s.id); return (
          <div key={s.id} ref={(el) => { cols.current[s.id] = el; }} role="group" aria-label={`${s.label}: ${ds.length} ${ds.length === 1 ? 'deal' : 'deals'}, ${fmt.c(sum(ds))}`} className={cx('ts-col', drag && 'is-target', drag?.over === s.id && 'is-over')}>
            <header className="ts-colh">
              <div><i className={`ts-sd is-${s.id}`} aria-hidden="true" /><h3>{s.label}</h3><span className="ts-n">{ds.length}</span></div>
              <p><b>{fmt.c(sum(ds))}</b><small>{s.id === 'won' ? 'closed' : `${s.p}% stage`}</small></p>
            </header>
            <ul className="ts-list">
              {ds.map((d) => <li key={d.id}><Card d={d} grip lift={drag?.id === d.id} tabIndex={d.id === tabId ? 0 : -1} onFocus={() => setActive(d.id)} onPointerDown={(e) => begin(e, d)} onKeyDown={(e) => key(e, d)} onMenu={(el) => openMenu(d.id, el)} /></li>)}
              {ds.length === 0 && <li className="ts-none">{drag ? 'Drop here' : 'No deals in this stage'}</li>}
            </ul>
          </div>); })}
      </div>
      {drag && dragged && <div className="ts-ghost" style={{ left: drag.x - drag.ox, top: drag.y - drag.oy, width: drag.w }} aria-hidden="true"><Card d={dragged} drag /></div>}
      {menu && menuDeal && (
        <div className="ts-menu" ref={menuRef} role="menu" aria-label={`Move ${menuDeal.company} to`} style={{ left: menu.x, top: menu.y }} onKeyDown={menuKey}>
          <p>Move to stage</p>
          {STAGES.map((s) => <button key={s.id} type="button" role="menuitem" disabled={s.id === menuDeal.stage} onClick={() => move(menuDeal.id, s.id)}><i className={`ts-sd is-${s.id}`} aria-hidden="true" />{s.label}{s.id === menuDeal.stage && <Icon name="check" size={13} />}</button>)}
        </div>
      )}
    </>
  );
}
