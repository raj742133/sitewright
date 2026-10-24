'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { Avatar, Mini, useCountUp, useEntry } from './_d7';

export type Col = 'todo' | 'doing' | 'done';
export interface Member { id: string; name: string; capacity?: number }
export interface PCard { id: string; title: string; col: Col; who: string; points: number; tag?: string }
export interface Milestone { id: string; label: string; start: number; end: number; done?: boolean }
export interface Project { id: string; name: string; due: string; members: string[]; cards: PCard[]; milestones: Milestone[] }
export interface ProjectDashboardProps { projects?: Project[]; members?: Member[]; today?: number; weeks?: number }

const COLS: { id: Col; label: string }[] = [{ id: 'todo', label: 'To do' }, { id: 'doing', label: 'In progress' }, { id: 'done', label: 'Done' }];
const MEMBERS: Member[] = [
  { id: 'ana', name: 'Ana Ribeiro', capacity: 10 }, { id: 'ben', name: 'Ben Carter', capacity: 8 },
  { id: 'chi', name: 'Chidi Eze', capacity: 10 }, { id: 'dee', name: 'Dee Park', capacity: 6 },
];
const PROJECTS: Project[] = [
  { id: 'site', name: 'Website relaunch', due: 'Due 12 Dec', members: ['ana', 'ben', 'chi'],
    cards: [
      { id: 'a1', title: 'Wireframe menu page', col: 'done', who: 'ana', points: 3, tag: 'Design' },
      { id: 'a2', title: 'Write product copy', col: 'doing', who: 'ben', points: 5, tag: 'Content' },
      { id: 'a3', title: 'Build checkout flow', col: 'doing', who: 'chi', points: 8, tag: 'Dev' },
      { id: 'a4', title: 'Set up analytics', col: 'todo', who: 'chi', points: 2, tag: 'Dev' },
      { id: 'a5', title: 'Photo shoot schedule', col: 'todo', who: 'ana', points: 3, tag: 'Content' },
      { id: 'a6', title: 'Accessibility audit', col: 'todo', who: 'ben', points: 4, tag: 'QA' },
    ],
    milestones: [{ id: 'g1', label: 'Design sign-off', start: 0, end: 3, done: true }, { id: 'g2', label: 'Build', start: 2, end: 8 }, { id: 'g3', label: 'Content freeze', start: 5, end: 9 }, { id: 'g4', label: 'Launch', start: 9, end: 11 }] },
  { id: 'app', name: 'Loyalty app', due: 'Due 30 Jan', members: ['dee', 'ana', 'chi'],
    cards: [
      { id: 'b1', title: 'Stamp card prototype', col: 'doing', who: 'dee', points: 5, tag: 'Design' },
      { id: 'b2', title: 'Reward rules spec', col: 'done', who: 'ana', points: 2, tag: 'Product' },
      { id: 'b3', title: 'Push notification test', col: 'todo', who: 'chi', points: 3, tag: 'Dev' },
      { id: 'b4', title: 'Pilot with 3 shops', col: 'todo', who: 'dee', points: 5, tag: 'Ops' },
    ],
    milestones: [{ id: 'h1', label: 'Spec', start: 0, end: 2, done: true }, { id: 'h2', label: 'Prototype', start: 2, end: 6 }, { id: 'h3', label: 'Pilot', start: 6, end: 10 }] },
  { id: 'brand', name: 'Brand refresh', due: 'Due 8 Nov', members: ['ben', 'dee'],
    cards: [
      { id: 'c1', title: 'Logo shortlist', col: 'done', who: 'dee', points: 3, tag: 'Design' },
      { id: 'c2', title: 'Colour palette', col: 'done', who: 'dee', points: 2, tag: 'Design' },
      { id: 'c3', title: 'Tone of voice guide', col: 'doing', who: 'ben', points: 4, tag: 'Content' },
    ],
    milestones: [{ id: 'i1', label: 'Concepts', start: 0, end: 4, done: true }, { id: 'i2', label: 'Guidelines', start: 4, end: 8 }] },
];

export default function ProjectDashboard({ projects = PROJECTS, members = MEMBERS, today = 4, weeks = 12 }: ProjectDashboardProps) {
  const root = useRef<HTMLDivElement>(null);
  const [pid, setPid] = useState(projects[0]?.id ?? '');
  const { shown, cls } = useEntry(root, pid);
  const [boards, setBoards] = useState<Record<string, PCard[]>>(() => Object.fromEntries(projects.map((p) => [p.id, p.cards])));
  const [ms, setMs] = useState<Record<string, Milestone[]>>(() => Object.fromEntries(projects.map((p) => [p.id, p.milestones])));
  const [note, setNote] = useState('');
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number; over: Col | null } | null>(null);
  const focusId = useRef<string | null>(null);
  const start = useRef({ x: 0, y: 0 });
  const proj = projects.find((p) => p.id === pid) ?? projects[0]!;
  const cards = boards[proj.id] ?? [];
  const miles = ms[proj.id] ?? [];
  const byId = (id: string) => members.find((m) => m.id === id);
  const done = cards.filter((c) => c.col === 'done').length;
  const pct = cards.length ? Math.round((done / cards.length) * 100) : 0;
  const pctShown = useCountUp(pct, shown, 900);

  useEffect(() => {
    if (!focusId.current) return;
    root.current?.querySelector<HTMLElement>(`[data-card="${focusId.current}"]`)?.focus();
    focusId.current = null;
  });

  const move = (id: string, to: Col, index?: number) => {
    const c = cards.find((x) => x.id === id);
    if (!c) return;
    setBoards((b) => {
      const rest = (b[proj.id] ?? []).filter((x) => x.id !== id);
      const moved = { ...c, col: to };
      if (index === undefined) return { ...b, [proj.id]: [...rest, moved] };
      const colIdx = rest.map((x, i) => (x.col === to ? i : -1)).filter((i) => i >= 0);
      const at = index >= colIdx.length ? (colIdx.length ? colIdx[colIdx.length - 1]! + 1 : rest.length) : colIdx[index]!;
      return { ...b, [proj.id]: [...rest.slice(0, at), moved, ...rest.slice(at)] };
    });
    focusId.current = id;
    if (to !== c.col) setNote(`Moved ${c.title} to ${COLS.find((k) => k.id === to)!.label}`);
  };
  const shift = (c: PCard, dir: -1 | 1) => {
    const i = COLS.findIndex((k) => k.id === c.col) + dir;
    if (i >= 0 && i < COLS.length) move(c.id, COLS[i]!.id);
  };
  const onKey = (e: KeyboardEvent<HTMLLIElement>, c: PCard) => {
    if (e.target !== e.currentTarget) return;
    const inCol = cards.filter((x) => x.col === c.col);
    const i = inCol.findIndex((x) => x.id === c.id);
    if (e.key === 'ArrowLeft') shift(c, -1);
    else if (e.key === 'ArrowRight') shift(c, 1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const d = e.key === 'ArrowUp' ? -1 : 1;
      if (e.altKey) { if (inCol[i + d]) { move(c.id, c.col, i + d); setNote(`${c.title} is now position ${i + d + 1}`); } }
      else { const n = inCol[i + d]; if (n) root.current?.querySelector<HTMLElement>(`[data-card="${n.id}"]`)?.focus(); }
    } else return;
    e.preventDefault();
  };
  const onDown = (e: PointerEvent<HTMLElement>, c: PCard) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    setDrag({ id: c.id, dx: 0, dy: 0, over: c.col });
  };
  const overCol = (x: number, y: number): Col | null => {
    for (const el of Array.from(root.current?.querySelectorAll<HTMLElement>('[data-col]') ?? [])) {
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return el.dataset.col as Col;
    }
    return null;
  };
  const onMove = (e: PointerEvent<HTMLElement>) => { if (drag) setDrag({ ...drag, dx: e.clientX - start.current.x, dy: e.clientY - start.current.y, over: overCol(e.clientX, e.clientY) }); };
  const onUp = () => { if (drag?.over) move(drag.id, drag.over); setDrag(null); };

  const load = useMemo(() => members.filter((m) => proj.members.includes(m.id)).map((m) => ({ m, v: cards.filter((c) => c.who === m.id && c.col !== 'done').reduce((a, c) => a + c.points, 0) })), [members, proj, cards]);
  const R = 42, C = 2 * Math.PI * R;

  return (
    <div ref={root} className={'ui-project-dashboard' + cls}>
      <nav className="ui-project-dashboard-side" aria-label="Projects">
        <p className="ui-project-dashboard-k">Projects</p>
        {projects.map((p) => {
          const b = boards[p.id] ?? [];
          const v = b.length ? Math.round((b.filter((c) => c.col === 'done').length / b.length) * 100) : 0;
          return (
            <button key={p.id} type="button" className="ui-project-dashboard-proj" aria-current={p.id === proj.id ? 'page' : undefined} onClick={() => setPid(p.id)}>
              <span>{p.name}</span><small>{v}%</small>
              <i style={{ '--w': v + '%' } as CSSProperties} aria-hidden="true" />
            </button>
          );
        })}
      </nav>
      <div className="ui-project-dashboard-main">
        <header className="ui-project-dashboard-head">
          <div><h2>{proj.name}</h2><p>{proj.due} · {cards.length} tasks</p></div>
          <ul className="ui-project-dashboard-stack" aria-label={'Team: ' + proj.members.map((m) => byId(m)?.name).join(', ')}>
            {proj.members.map((m) => <li key={m} title={byId(m)?.name}><Avatar name={byId(m)?.name ?? m} size={32} style={{ boxShadow: '0 0 0 2px var(--raised, #fff)' }} /></li>)}
          </ul>
        </header>
        <div className="ui-project-dashboard-sum" key={proj.id}>
          <section className="ui-project-dashboard-card ui-project-dashboard-ring" aria-label="Progress">
            <svg viewBox="0 0 100 100" role="img" aria-label={`${pct}% complete, ${done} of ${cards.length} tasks done`}>
              <circle cx="50" cy="50" r={R} className="ui-project-dashboard-rtrack" />
              <circle cx="50" cy="50" r={R} className="ui-project-dashboard-rarc" strokeDasharray={`${(pct / 100) * C} ${C}`} transform="rotate(-90 50 50)" />
              <text x="50" y="55" textAnchor="middle">{Math.round(pctShown)}%</text>
            </svg>
            <p className="ui-project-dashboard-k">{done} of {cards.length} done</p>
          </section>
          <section className="ui-project-dashboard-card ui-project-dashboard-gantt" aria-label="Milestones">
            <p className="ui-project-dashboard-k">Milestones</p>
            <div className="ui-project-dashboard-gbody" style={{ '--weeks': weeks, '--today': today } as CSSProperties}>
              <span className="ui-project-dashboard-today" aria-hidden="true"><em>Today</em></span>
              {miles.map((m, i) => (
                <div className="ui-project-dashboard-grow" key={m.id}>
                  <button type="button" aria-pressed={!!m.done} aria-label={`${m.label}, weeks ${m.start + 1} to ${m.end}, ${m.done ? 'complete' : 'open'}. Toggle complete.`}
                    onClick={() => setMs((s) => ({ ...s, [proj.id]: (s[proj.id] ?? []).map((x) => (x.id === m.id ? { ...x, done: !x.done } : x)) }))}
                    style={{ left: (m.start / weeks) * 100 + '%', width: ((m.end - m.start) / weeks) * 100 + '%', '--d': i * 110 + 'ms' } as CSSProperties}>{m.label}</button>
                </div>
              ))}
            </div>
          </section>
          <section className="ui-project-dashboard-card ui-project-dashboard-work" aria-label="Workload">
            <p className="ui-project-dashboard-k">Workload (open points)</p>
            <ul>
              {load.map(({ m, v }, i) => {
                const cap = m.capacity ?? 10;
                return (
                  <li key={m.id}><Avatar name={m.name} size={22} /><span className="ui-project-dashboard-wn">{m.name.split(' ')[0]}</span>
                    <div className={'ui-project-dashboard-wbar' + (v > cap ? ' is-over' : '')} role="meter" aria-valuemin={0} aria-valuemax={cap} aria-valuenow={Math.min(v, cap)} aria-valuetext={`${v} of ${cap} points`} aria-label={m.name}><i style={{ width: Math.min(100, (v / cap) * 100) + '%', '--d': i * 90 + 'ms' } as CSSProperties} /></div>
                    <small>{v}/{cap}</small></li>
                );
              })}
            </ul>
          </section>
        </div>
        <p className="ui-project-dashboard-hint" id="ui-project-dashboard-hint">Tip: focus a card, then use Left/Right to change column, Up/Down to move between cards, Alt+Up/Down to reorder. Drag with the grip.</p>
        <div className="ui-project-dashboard-board" key={'b' + proj.id}>
          {COLS.map((col, ci) => {
            const list = cards.filter((c) => c.col === col.id);
            return (
              <section key={col.id} data-col={col.id} className={'ui-project-dashboard-col' + (drag?.over === col.id ? ' is-over' : '')} aria-label={`${col.label}, ${list.length} tasks`} style={{ '--ci': ci } as CSSProperties}>
                <h3>{col.label} <span>{list.length}</span></h3>
                <ul>
                  {list.map((c, i) => {
                    const dragging = drag?.id === c.id;
                    return (
                      <li key={c.id} data-card={c.id} tabIndex={0} className={'ui-project-dashboard-task' + (dragging ? ' is-dragging' : '')} aria-describedby="ui-project-dashboard-hint"
                        aria-label={`${c.title}, ${byId(c.who)?.name ?? ''}, ${c.points} points, in ${col.label}`}
                        style={{ '--ti': i, transform: dragging ? `translate(${drag.dx}px, ${drag.dy}px) rotate(2deg)` : undefined } as CSSProperties} onKeyDown={(e) => onKey(e, c)}>
                        <div className="ui-project-dashboard-ttop">
                          <span className="ui-project-dashboard-grip" aria-hidden="true" onPointerDown={(e) => onDown(e, c)} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={() => setDrag(null)}>
                            <svg viewBox="0 0 10 16" width="10" height="16"><g fill="currentColor"><circle cx="3" cy="3" r="1.3" /><circle cx="7" cy="3" r="1.3" /><circle cx="3" cy="8" r="1.3" /><circle cx="7" cy="8" r="1.3" /><circle cx="3" cy="13" r="1.3" /><circle cx="7" cy="13" r="1.3" /></g></svg>
                          </span>
                          <b>{c.title}</b>
                        </div>
                        <div className="ui-project-dashboard-tmeta">
                          {c.tag && <span className="ui-project-dashboard-tag">{c.tag}</span>}
                          <span className="ui-project-dashboard-pts">{c.points} pts</span>
                          <Avatar name={byId(c.who)?.name ?? c.who} size={22} />
                          <span className="ui-project-dashboard-mv">
                            <button type="button" disabled={ci === 0} onClick={() => shift(c, -1)} aria-label={`Move ${c.title} to ${COLS[ci - 1]?.label ?? ''}`}>&#8592;</button>
                            <button type="button" disabled={ci === COLS.length - 1} onClick={() => shift(c, 1)} aria-label={`Move ${c.title} to ${COLS[ci + 1]?.label ?? ''}`}>&#8594;</button>
                          </span>
                        </div>
                      </li>
                    );
                  })}
                  {list.length === 0 && <li className="ui-project-dashboard-none">Drop a task here</li>}
                </ul>
              </section>
            );
          })}
        </div>
        <p className="ui-project-dashboard-sr" role="status" aria-live="polite">{note}</p>
      </div>
    </div>
  );
}

export function Demo() {
  return <Mini width={1000} height={150}><ProjectDashboard /></Mini>;
}
