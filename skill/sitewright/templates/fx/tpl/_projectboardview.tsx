'use client';
// The Board view: a full-height kanban with WIP limits, swimlanes by assignee, quick-add, drag and keyboard moves.
import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { Avatar, Button, Glyph, Segmented, cx } from './_dash';
import { EPICS, LABELS, PEOPLE, STATUSES, StatusIcon, pts, type Status, type Task } from './_project';
import { Card, NewTask, Share, useOutside } from './_projectboard';
import { NOFILTER, stLabel, type Store } from './_projectstore';

interface Grp { key: string; who: string | null | undefined; name: string; role: string }
const FLAT: Grp = { key: '*', who: undefined, name: 'All tasks', role: '' };
const wipState = (n: number, lim: number) => (!lim ? 'none' : n > lim ? 'over' : n === lim ? 'at' : 'ok');

function WipEdit({ st, n, lim, set }: { st: Status; n: number; lim: number; set: (n: number) => void }) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null); const btn = useRef<HTMLButtonElement>(null); const state = wipState(n, lim);
  useOutside(ref, open, () => setOpen(false));
  return (
    <div className="tp-wip" ref={ref} onKeyDown={(e) => { if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); btn.current?.focus(); } }}>
      <button ref={btn} type="button" className={cx('tp-n', `is-${state}`)} aria-haspopup="dialog" aria-expanded={open} aria-label={`${stLabel(st)}: ${n} tasks${lim ? `, WIP limit ${lim}${state === 'over' ? ', over the limit' : ''}` : ', no WIP limit'}. Edit limit`} onClick={() => setOpen(!open)}>
        {n}{lim > 0 && <span>/{lim}</span>}{state === 'over' && <Glyph name="up" size={11} />}</button>
      {open && (
        <div className="tp-pop tp-wippop" role="dialog" aria-label={`WIP limit for ${stLabel(st)}`}>
          <b>WIP limit · {stLabel(st)}</b><p>A soft cap on work in this column. Moves past it still work, but are flagged.</p>
          <div className="tp-step"><button type="button" className="td-btn is-icon" aria-label="Lower limit" disabled={lim <= 1} onClick={() => set(lim - 1)}>−</button>
            <output aria-live="polite">{lim || 'None'}</output><button type="button" className="td-btn is-icon" aria-label="Raise limit" disabled={lim >= 20} onClick={() => set(lim ? lim + 1 : Math.max(n, 3))}>+</button>
            <Button small variant="ghost" disabled={!lim} onClick={() => set(0)}>No limit</Button></div>
        </div>)}
    </div>
  );
}

function QuickAdd({ st, who, open, setOpen, add }: { st: Status; who: string | null | undefined; open: boolean; setOpen: (o: boolean) => void; add: (title: string) => void }) {
  const [v, setV] = useState(''); const [bad, setBad] = useState(false); const id = `tp-qa-${st}-${(who ?? 'x').replace(/\W/g, '')}`;
  if (!open) return <button type="button" className="tp-qabtn" onClick={() => setOpen(true)} aria-label={`Quick add a task to ${stLabel(st)}${who ? ` for ${who}` : ''}`}><Glyph name="plus" size={14} />Add task</button>;
  return (
    <form className="tp-qa" noValidate onSubmit={(e) => { e.preventDefault(); if (!v.trim()) { setBad(true); return; } add(v.trim()); setV(''); setBad(false); }} onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } }}>
      <input autoFocus value={v} maxLength={90} placeholder="Task title" aria-label={`New task in ${stLabel(st)}`} aria-invalid={bad} aria-describedby={id} onChange={(e) => { setV(e.target.value); setBad(false); }} />
      <small id={id} className={cx(bad && 'is-bad')} role={bad ? 'alert' : undefined}>{bad ? 'Type a title first.' : 'Enter adds, Esc closes'}</small>
    </form>
  );
}

export function BoardView({ s, heading }: { s: Store; heading: React.RefObject<HTMLHeadingElement | null> }) {
  const { tasks, filters: f, group } = s; const root = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState<string | null>(null); const [act, setAct] = useState(''); const [form, setForm] = useState<Status | null>(null); const [qa, setQa] = useState<string | null>(null);
  const [drag, setDrag] = useState<string | null>(null); const [over, setOver] = useState<{ cell: string; before: string | null } | null>(null); const [fold, setFold] = useState<string[]>([]);
  const set = (p: Partial<typeof f>) => s.setFilters({ ...f, ...p });
  const filtered = !!(f.q || f.who !== 'all' || f.lab || f.epic);
  const vis = useMemo(() => tasks.filter((t) => (!f.q || `${t.id} ${t.title}`.toLowerCase().includes(f.q.trim().toLowerCase())) && (f.who === 'all' || (f.who === 'none' ? !t.who : t.who === f.who)) && (!f.lab || t.labels.includes(f.lab)) && (!f.epic || t.epic === f.epic)), [tasks, f]);
  const groups: Grp[] = useMemo(() => (group === 'who' ? [...PEOPLE.map((p) => ({ key: p.name, who: p.name as string | null, name: p.name, role: p.role })), { key: 'none', who: null, name: 'Unassigned', role: 'Needs an owner' }].filter((g) => !filtered || vis.some((t) => t.who === g.who)) : [FLAT]), [group, filtered, vis]);
  const cell = (g: Grp, st: Status) => vis.filter((t) => t.status === st && (g.who === undefined || t.who === g.who));
  const actId = vis.some((t) => t.id === act) ? act : vis[0]?.id;

  useEffect(() => { const id = s.focusId.current; if (!id) return; s.focusId.current = null; root.current?.querySelector<HTMLElement>(`[data-tid="${id}"]`)?.focus(); }, [s.data, menu, s.focusId]);
  const focusCard = (id?: string) => { if (id) root.current?.querySelector<HTMLElement>(`[data-tid="${id}"]`)?.focus(); };

  const onKey = (e: KeyboardEvent<HTMLElement>, t: Task) => {
    if (e.target !== e.currentTarget) return; const k = e.key; const si = STATUSES.findIndex((x) => x.id === t.status); const gi = Math.max(0, groups.findIndex((g) => g.who === undefined || g.who === t.who));
    const col = cell(groups[gi]!, t.status); const ri = col.findIndex((x) => x.id === t.id);
    if (e.altKey && e.shiftKey && (k === 'ArrowUp' || k === 'ArrowDown')) { e.preventDefault(); const g = groups[gi + (k === 'ArrowUp' ? -1 : 1)]; if (g && g.who !== undefined) s.move(t.id, t.status, null, g.who); return; }
    if (e.altKey && (k === 'ArrowUp' || k === 'ArrowDown')) { e.preventDefault(); const nb = col[ri + (k === 'ArrowUp' ? -1 : 1)]; if (nb) s.move(t.id, t.status, k === 'ArrowUp' ? nb.id : col[ri + 2]?.id ?? null); return; }
    if (e.altKey && (k === 'ArrowLeft' || k === 'ArrowRight')) { e.preventDefault(); const to = STATUSES[si + (k === 'ArrowLeft' ? -1 : 1)]; if (to) s.move(t.id, to.id, null); return; }
    if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); const d = k === 'ArrowUp' ? -1 : 1; const nb = col[ri + d]; if (nb) { focusCard(nb.id); return; } for (let g = gi + d; g >= 0 && g < groups.length; g += d) { const l = cell(groups[g]!, t.status); if (l.length) { focusCard(l[d > 0 ? 0 : l.length - 1]!.id); return; } } return; }
    if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); const d = k === 'ArrowLeft' ? -1 : 1; for (let c = si + d; c >= 0 && c < 4; c += d) { const l = cell(groups[gi]!, STATUSES[c]!.id); if (l.length) { focusCard(l[Math.min(ri, l.length - 1)]!.id); return; } } return; }
    if (k === 'Enter') { e.preventDefault(); s.setOpenId(t.id); return; }
    if (k === ' ') { e.preventDefault(); setMenu(t.id); return; }
    if (/^[1-4]$/.test(k) && !e.ctrlKey && !e.metaKey && !e.altKey) { const to = STATUSES[Number(k) - 1]!; if (to.id !== t.status) s.move(t.id, to.id, null); }
  };
  const onOver = (e: DragEvent<HTMLElement>, key: string) => {
    if (!drag) return; e.preventDefault(); let before: string | null = null;
    for (const el of e.currentTarget.querySelectorAll<HTMLElement>('[data-tid]')) { if (el.dataset.tid === drag) continue; const r = el.getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { before = el.dataset.tid!; break; } }
    setOver((o) => (o && o.cell === key && o.before === before ? o : { cell: key, before }));
  };
  const quick = (title: string, st: Status, g: Grp) => {
    const who = g.who !== undefined ? g.who : f.who === 'all' || f.who === 'none' ? null : f.who;
    s.add({ title, status: st, who, pri: 'med', label: f.lab || 'Frontend', est: 2 }, { keepFocus: true });
  };
  const total = pts(vis);
  const stat = (st: Status) => { const all = tasks.filter((t) => t.status === st); return { n: all.length, p: pts(all) }; };

  return (
    <div ref={root} className="tp-root tp-fill tp-bv">
      <div className="tp-vh">
        <div><h1 ref={heading} tabIndex={-1}>Board</h1><p>Sprint 14 · 19 to 30 Oct · {filtered ? `${vis.length} of ${tasks.length}` : tasks.length} tasks · {total} pts</p></div>
        <div className="td-ph-a"><Segmented label="Group board by" value={group} onChange={s.setGroup} options={[{ id: 'status', label: 'Status only' }, { id: 'who', label: 'By assignee' }]} /><Share onCopied={(ok) => s.setLive(ok ? 'Project link copied' : 'Select the link and copy it')} /><Button variant="primary" icon="plus" onClick={() => setForm('todo')}>New task</Button></div>
      </div>
      <div className="tp-tools" role="search">
        <label className="tp-search"><Glyph name="search" size={14} /><input type="search" value={f.q} onChange={(e) => set({ q: e.target.value })} placeholder="Search tasks or IDs" aria-label="Search tasks" /></label>
        <select className="tp-sel" value={f.who} onChange={(e) => set({ who: e.target.value })} aria-label="Filter by assignee"><option value="all">All assignees</option>{PEOPLE.map((p) => <option key={p.name}>{p.name}</option>)}<option value="none">Unassigned</option></select>
        <select className="tp-sel" value={f.lab} onChange={(e) => set({ lab: e.target.value })} aria-label="Filter by label"><option value="">All labels</option>{LABELS.map((l) => <option key={l}>{l}</option>)}</select>
        {f.epic && <button type="button" className="tp-chip" onClick={() => set({ epic: '' })} aria-label="Clear epic filter">Epic: {EPICS.find((x) => x.id === f.epic)?.name}<Glyph name="x" size={12} /></button>}
        <button type="button" className="td-btn is-ghost is-sm" disabled={!filtered} onClick={() => s.setFilters(NOFILTER)}>Clear filters</button>
        <span className="tp-keys hide-md"><kbd>↑↓←→</kbd> focus <kbd>Alt</kbd>+<kbd>↑↓←→</kbd> move <kbd>1</kbd>–<kbd>4</kbd> status <kbd>Enter</kbd> details <kbd>Space</kbd> menu</span>
      </div>
      <p id="tp-kbd" className="td-sr">Task card. Arrow keys move focus between cards. Alt with arrow keys moves or reorders the card; with Shift it changes the assignee lane. Keys 1 to 4 set the status. Enter opens details, Space opens the card menu.</p>
      {form && <NewTask initial={form} nextId={s.nextId} onAdd={(d) => { setForm(null); s.setFilters(NOFILTER); s.add(d); }} onCancel={() => setForm(null)} />}
      <div className={cx('tp-bscroll', group === 'who' && 'is-lanes')} tabIndex={-1}>
        <div className="tp-bgrid">
          {STATUSES.map((st) => { const { n, p } = stat(st.id); const lim = s.wip[st.id]; const state = wipState(n, lim); return (
            <header key={st.id} className={cx('tp-ch', `is-${state}`)}><StatusIcon s={st.id} /><h2>{st.label}</h2><WipEdit st={st.id} n={n} lim={lim} set={(v) => s.setWip(st.id, v)} />
              <span className="tp-p">{p} pts{state === 'over' && <b className="tp-overtxt"> · over limit</b>}</span>
              <button type="button" className="tp-add" aria-label={`Quick add a task to ${stLabel(st.id)}`} onClick={() => setQa(`${groups[0]!.key}|${st.id}`)}><Glyph name="plus" size={15} /></button></header>); })}
          {groups.map((g) => {
            const mine = g.who === undefined ? [] : tasks.filter((t) => t.who === g.who); const person = PEOPLE.find((p) => p.name === g.name); const closed = fold.includes(g.key);
            return (
              <div key={g.key} className="tp-grp">
                {g.who !== undefined && (
                  <div className="tp-gh"><button type="button" aria-expanded={!closed} aria-label={`${g.name}, ${mine.length} tasks. ${closed ? 'Expand' : 'Collapse'} lane`} onClick={() => setFold(closed ? fold.filter((x) => x !== g.key) : [...fold, g.key])}><Glyph name={closed ? 'chevron' : 'down'} size={14} />
                    {g.who ? <Avatar name={g.name} size={22} /> : <span className="tp-unas is-sm"><Glyph name="users" size={11} /></span>}<b>{g.name}</b><span>{g.role}</span></button>
                    <span className={cx('tp-gp', person && pts(mine) > person.cap && 'is-bad')}>{mine.length} tasks · {pts(mine)}{person ? ` / ${person.cap}` : ''} pts</span></div>)}
                {!closed && STATUSES.map((st) => {
                  const key = `${g.key}|${st.id}`; const list = cell(g, st.id); const o = over?.cell === key;
                  return (
                    <section key={st.id} data-cell={key} className={cx('tp-lane', o && 'is-over', `is-${wipState(stat(st.id).n, s.wip[st.id])}`)} aria-label={`${g.who !== undefined ? `${g.name}, ` : ''}${st.label}, ${list.length} tasks`}
                      onDragOver={(e) => onOver(e, key)} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver((x) => (x?.cell === key ? null : x)); }} onDrop={(e) => { e.preventDefault(); if (drag && over) s.move(drag, st.id, over.before, g.who); setDrag(null); setOver(null); }}>
                      <ul className={cx('tp-cards', o && over!.before === null && 'is-end')}>
                        {list.map((t) => <Card key={t.id} t={t} active={t.id === actId} dragging={drag === t.id} dropBefore={o && over!.before === t.id && drag !== t.id} menuOpen={menu === t.id} onFocus={() => setAct(t.id)} onKey={(e) => onKey(e, t)} onOpen={() => s.setOpenId(t.id)}
                          onMenu={(op, back) => { setMenu(op ? t.id : null); if (back) s.focusId.current = t.id; }} onStatus={(x) => s.move(t.id, x, null)} onAssign={(w) => s.patch(t.id, { who: w }, `${t.id} assigned to ${w ?? 'nobody'}`)} onBlock={() => s.patch(t.id, t.blocked ? { blocked: undefined } : { blocked: 'Flagged as blocked' }, t.blocked ? `${t.id} unblocked` : `${t.id} flagged as blocked`)}
                          onDragStart={(e) => { setDrag(t.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', t.id); }} onDragEnd={() => { setDrag(null); setOver(null); }} />)}
                        {list.length === 0 && <li className="tp-none">{filtered ? 'No matching tasks' : drag ? 'Drop here' : 'Nothing here yet'}</li>}
                      </ul>
                      <QuickAdd st={st.id} who={g.who} open={qa === key} setOpen={(x) => setQa(x ? key : null)} add={(title) => quick(title, st.id, g)} />
                    </section>);
                })}
              </div>);
          })}
          {groups.length === 0 && <div className="tp-gempty"><b>No lanes to show</b><p>Nobody matches these filters.</p></div>}
        </div>
      </div>
    </div>
  );
}
