'use client';
import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from 'react';
import { AvatarStack, Button, Glyph, Pill, Preview, Shell, useReducedMotion, type NavEntry } from './_dash';
import { COMMIT, EPICS, INITIAL, LABELS, PEOPLE, STATUSES, StatusIcon, pts, sprintStats, type Status, type Task } from './_project';
import { Card, NewTask, Share, type Draft } from './_projectboard';
import { Burndown, Summary, Timeline, Workload } from './_projectviews';

const NAV: NavEntry[] = [{ id: 'top', label: 'Overview', icon: 'grid' }, { id: 'board', label: 'Board', icon: 'list' }, { id: 'tl', label: 'Timeline', icon: 'calendar' }, { id: 'wl', label: 'Workload', icon: 'users' }];
const EPIC_OF: Record<string, string> = { Design: 'ds', Frontend: 'ca', Backend: 'co', Bug: 'ca', Content: 'lr', Infra: 'lr' };
const label = (s: Status) => STATUSES.find((x) => x.id === s)!.label;

export default function ProjectDashboard({ brand = 'Northwind' }: { brand?: string }) {
  const [tasks, setTasks] = useState<Task[]>(INITIAL);
  const [q, setQ] = useState(''); const [who, setWho] = useState('all'); const [lab, setLab] = useState(''); const [epic, setEpic] = useState('');
  const [form, setForm] = useState<Status | null>(null); const [menu, setMenu] = useState<string | null>(null); const [act, setAct] = useState('');
  const [drag, setDrag] = useState<string | null>(null); const [over, setOver] = useState<{ s: Status; before: string | null } | null>(null);
  const [live, setLive] = useState(''); const [toast, setToast] = useState<{ text: string; undo: Task[] } | null>(null); const [nav, setNav] = useState('top');
  const root = useRef<HTMLDivElement>(null); const focusId = useRef<string | null>(null); const reduced = useReducedMotion();

  const stats = useMemo(() => sprintStats(tasks), [tasks]);
  const vis = useMemo(() => tasks.filter((t) => (!q || `${t.id} ${t.title}`.toLowerCase().includes(q.trim().toLowerCase())) && (who === 'all' || (who === 'none' ? !t.who : t.who === who)) && (!lab || t.labels.includes(lab)) && (!epic || t.epic === epic)), [tasks, q, who, lab, epic]);
  const lanes = STATUSES.map((s) => ({ ...s, all: tasks.filter((t) => t.status === s.id), vis: vis.filter((t) => t.status === s.id) }));
  const filtered = !!(q || who !== 'all' || lab || epic); const actId = vis.some((t) => t.id === act) ? act : vis[0]?.id;
  const nextId = `WEB-${Math.max(156, ...tasks.map((t) => Number(t.id.slice(4)))) + 1}`;

  useEffect(() => { const id = focusId.current; if (!id) return; focusId.current = null; root.current?.querySelector<HTMLElement>(`[data-tid="${id}"]`)?.focus(); }, [tasks, menu]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 7000); return () => clearTimeout(t); }, [toast]);

  const commit = (next: Task[], text: string) => { setToast({ text, undo: tasks }); setLive(text); setTasks(next); };
  const move = (id: string, status: Status, before: string | null) => {
    const t = tasks.find((x) => x.id === id); if (!t) return; const rest = tasks.filter((x) => x.id !== id);
    let i = before ? rest.findIndex((x) => x.id === before) : -1;
    if (i < 0) { let last = -1; rest.forEach((x, k) => { if (x.status === status) last = k; }); i = last + 1; }
    const next = [...rest.slice(0, i), { ...t, status, blocked: status === 'done' ? undefined : t.blocked }, ...rest.slice(i)];
    if (next.every((x, k) => x === tasks[k] || (x.id === tasks[k]!.id && x.status === tasks[k]!.status))) return;
    focusId.current = id; commit(next, t.status === status ? `${id} reordered in ${label(status)}` : `${id} moved to ${label(status)}`);
  };
  const patch = (id: string, p: Partial<Task>, text: string) => { focusId.current = id; commit(tasks.map((t) => (t.id === id ? { ...t, ...p } : t)), text); };
  const focusCard = (id?: string) => { if (id) root.current?.querySelector<HTMLElement>(`[data-tid="${id}"]`)?.focus(); };
  const add = (d: Draft) => {
    const t: Task = { id: nextId, title: d.title, status: d.status, pri: d.pri, who: d.who, labels: [d.label], est: d.est, epic: epic || EPIC_OF[d.label] || 'ca', fresh: true };
    const first = tasks.findIndex((x) => x.status === d.status); const next = first < 0 ? [...tasks, t] : [...tasks.slice(0, first), t, ...tasks.slice(first)];
    setQ(''); setWho('all'); setLab(''); setEpic(''); setForm(null); focusId.current = t.id; commit(next, `${t.id} created in ${label(d.status)}`);
    setTimeout(() => setTasks((x) => x.map((y) => (y.id === t.id ? { ...y, fresh: false } : y))), 2600);
  };

  const onKey = (e: KeyboardEvent<HTMLElement>, t: Task) => {
    if (e.target !== e.currentTarget) return; const k = e.key; const si = STATUSES.findIndex((s) => s.id === t.status); const col = lanes[si]!.vis; const ri = col.findIndex((x) => x.id === t.id);
    if (e.altKey && (k === 'ArrowUp' || k === 'ArrowDown')) { e.preventDefault(); const nb = col[ri + (k === 'ArrowUp' ? -1 : 1)]; if (nb) move(t.id, t.status, k === 'ArrowUp' ? nb.id : col[ri + 2]?.id ?? null); return; }
    if (e.altKey && (k === 'ArrowLeft' || k === 'ArrowRight')) { e.preventDefault(); const to = STATUSES[si + (k === 'ArrowLeft' ? -1 : 1)]; if (to) move(t.id, to.id, null); return; }
    if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); focusCard(col[ri + (k === 'ArrowUp' ? -1 : 1)]?.id); return; }
    if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); const d = k === 'ArrowLeft' ? -1 : 1; for (let c = si + d; c >= 0 && c < 4; c += d) { const l = lanes[c]!.vis; if (l.length) { focusCard(l[Math.min(ri, l.length - 1)]!.id); return; } } return; }
    if (k === 'Enter' || k === ' ') { e.preventDefault(); setMenu(t.id); return; }
    if (/^[1-4]$/.test(k) && !e.ctrlKey && !e.metaKey) { const to = STATUSES[Number(k) - 1]!; if (to.id !== t.status) move(t.id, to.id, null); }
  };
  const onOver = (e: DragEvent<HTMLElement>, s: Status) => {
    if (!drag) return; e.preventDefault(); let before: string | null = null;
    for (const el of e.currentTarget.querySelectorAll<HTMLElement>('[data-tid]')) { if (el.dataset.tid === drag) continue; const r = el.getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { before = el.dataset.tid!; break; } }
    setOver((o) => (o && o.s === s && o.before === before ? o : { s, before }));
  };
  const go = (id: string) => { setNav(id); document.getElementById(`tp-sec-${id}`)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); };
  const open = stats.open.length;
  const nav2 = NAV.map((n) => (n.id === 'board' ? { ...n, badge: open } : n));
  const pct = Math.round((stats.total ? stats.doneP / stats.total : 0) * 100);

  return (
    <Shell brand={brand} nav={nav2} active={nav} onNav={go} title="Storefront relaunch" crumbs={[brand, 'Projects', 'Storefront relaunch']} searchHint="Search tasks" user={{ name: 'Priya Raman', role: 'Product' }}>
      <div ref={root} className="tp-root" id="tp-sec-top">
        <div className="tp-head">
          <div className="td-ph">
            <div className="tp-ph"><h1><span className="tp-key">WEB</span>Storefront relaunch</h1>
              <div className="tp-meta"><Pill tone={stats.tone}>{stats.label}</Pill><span><Glyph name="calendar" size={14} />Due Fri 4 Dec 2026</span><span className="tp-sep" aria-hidden="true" /><AvatarStack names={PEOPLE.map((p) => p.name)} max={5} /><span className="hide-sm">{PEOPLE.length} members</span></div></div>
            <div className="td-ph-a"><Share onCopied={(ok) => { setLive(ok ? 'Project link copied' : 'Select the link and copy it'); }} /><Button variant="primary" icon="plus" onClick={() => { setForm('todo'); }}>New task</Button></div>
          </div>
          <div className="tp-sprint"><span className="tp-spl"><b>Sprint 14</b><span className="hide-sm">19 to 30 Oct</span></span>
            <div className="tp-spbar" role="progressbar" aria-label="Sprint points completed" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i className={`is-${stats.tone}`} style={{ width: `${pct}%` }} /><u title="Today: 5 of 10 working days gone" /></div>
            <span className="tp-spt"><b>{stats.doneP}</b> of {stats.total} pts · {pct}%</span><span className="tp-spt hide-sm">Day 5 of 10</span></div>
        </div>
        <div className="tp-top"><Burndown tasks={tasks} /><Summary tasks={tasks} /></div>

        <section className="tp-board" id="tp-sec-board" aria-labelledby="tp-bt">
          <div className="tp-bh"><h2 id="tp-bt">Board</h2><span className="tp-count">{vis.length}{filtered ? ` of ${tasks.length}` : ''} tasks · {pts(vis)} pts</span>
            <span className="tp-keys hide-md"><kbd>↑↓←→</kbd> focus <kbd>Alt</kbd>+<kbd>↑↓</kbd> reorder <kbd>Alt</kbd>+<kbd>←→</kbd> or <kbd>1</kbd>–<kbd>4</kbd> move <kbd>Enter</kbd> menu</span></div>
          <p id="tp-kbd" className="td-sr">Task card. Arrow keys move focus between cards. Alt with arrow keys moves or reorders the card. Keys 1 to 4 set the status. Enter opens the card menu.</p>
          <div className="tp-tools" role="search">
            <label className="tp-search"><Glyph name="search" size={14} /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks or IDs" aria-label="Search tasks" /></label>
            <select className="tp-sel" value={who} onChange={(e) => setWho(e.target.value)} aria-label="Filter by assignee"><option value="all">All assignees</option>{PEOPLE.map((p) => <option key={p.name}>{p.name}</option>)}<option value="none">Unassigned</option></select>
            <select className="tp-sel" value={lab} onChange={(e) => setLab(e.target.value)} aria-label="Filter by label"><option value="">All labels</option>{LABELS.map((l) => <option key={l}>{l}</option>)}</select>
            {epic && <button type="button" className="tp-chip" onClick={() => setEpic('')} aria-label="Clear epic filter">Epic: {EPICS.find((x) => x.id === epic)?.name}<Glyph name="x" size={12} /></button>}
            <button type="button" className="td-btn is-ghost is-sm" disabled={!filtered} onClick={() => { setQ(''); setWho('all'); setLab(''); setEpic(''); }}>Clear filters</button>
          </div>
          {form && <NewTask initial={form} nextId={nextId} onAdd={add} onCancel={() => setForm(null)} />}
          <div className="tp-lanes">
            {lanes.map((l) => (
              <section key={l.id} className={`tp-lane${over?.s === l.id ? ' is-over' : ''}`} aria-label={`${l.label}, ${l.vis.length} tasks`} onDragOver={(e) => onOver(e, l.id)} onDrop={(e) => { e.preventDefault(); if (drag && over) move(drag, over.s, over.before); setDrag(null); setOver(null); }}>
                <header className="tp-lh"><StatusIcon s={l.id} /><h3>{l.label}</h3><span className="tp-n">{filtered ? `${l.vis.length}/${l.all.length}` : l.all.length}</span><span className="tp-p">{pts(l.vis)} pts</span>
                  <button type="button" className="tp-add" aria-label={`Add a task to ${l.label}`} onClick={() => setForm(l.id)}><Glyph name="plus" size={15} /></button></header>
                <ul className={`tp-cards${over?.s === l.id && over.before === null ? ' is-end' : ''}`}>
                  {l.vis.map((t) => <Card key={t.id} t={t} active={t.id === actId} dragging={drag === t.id} dropBefore={over?.s === l.id && over.before === t.id && drag !== t.id} menuOpen={menu === t.id} onFocus={() => setAct(t.id)} onKey={(e) => onKey(e, t)}
                    onMenu={(o, back) => { setMenu(o ? t.id : null); if (back) focusId.current = t.id; }} onStatus={(s) => move(t.id, s, null)} onAssign={(w) => patch(t.id, { who: w }, `${t.id} assigned to ${w ?? 'nobody'}`)} onBlock={() => patch(t.id, t.blocked ? { blocked: undefined } : { blocked: 'Flagged as blocked' }, t.blocked ? `${t.id} unblocked` : `${t.id} flagged as blocked`)}
                    onDragStart={(e) => { setDrag(t.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', t.id); }} onDragEnd={() => { setDrag(null); setOver(null); }} />)}
                  {l.vis.length === 0 && <li className="tp-none">{filtered && l.all.length ? 'No matching tasks' : drag ? 'Drop here' : 'Nothing here yet'}</li>}
                </ul>
              </section>
            ))}
          </div>
          <div className="tp-toastwrap" aria-hidden={!toast}>{toast && <div className="tp-toast"><span>{toast.text}</span><button type="button" onClick={() => { setTasks(toast.undo); setLive('Change undone'); setToast(null); }}>Undo</button></div>}</div>
        </section>

        <div className="tp-bottom"><div id="tp-sec-tl"><Timeline tasks={tasks} epic={epic} onEpic={setEpic} /></div><div id="tp-sec-wl"><Workload tasks={tasks} /></div></div>
        <div className="td-sr" role="status" aria-live="polite">{live}</div>
      </div>
    </Shell>
  );
}

export function Demo() { return <Preview w={1280} h={150}><ProjectDashboard /></Preview>; }
