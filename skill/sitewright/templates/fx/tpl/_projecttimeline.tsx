'use client';
// The Timeline view: a Gantt-style roadmap of epics and tasks with week/month zoom, a today line, milestones and dependency arrows.
// Drag a bar (or its edges) or use the keyboard to shift dates; everything feeds the board and the workload.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Avatar, Button, Glyph, Segmented, cx } from './_dash';
import { EPICS, MILESTONES, SPRINTS, short, type Task } from './_project';
import { DEPS, TODAY, addDays, dn, epicStat, range, slack } from './_projectdata';
import type { Store } from './_projectstore';

const DAYS = 63, RH = 34, EH = 40; // Oct 12 to Dec 13
type Zoom = 'week' | 'month';
type Row = { kind: 'epic'; id: string; h: number } | { kind: 'task'; id: string; h: number };
interface Drag { id: string; kind: 'move' | 'start' | 'end'; x0: number; d: number; moved: boolean }
const MON = ['Oct', 'Nov', 'Dec'];

export function TimelineView({ s, heading, onBoard }: { s: Store; heading: React.RefObject<HTMLHeadingElement | null>; onBoard: (epic: string) => void }) {
  const [zoom, setZoom] = useState<Zoom>('week'); const [open, setOpen] = useState<string[]>(['co']); const [deps, setDeps] = useState(true); const [hl, setHl] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null); const [tip, setTip] = useState<{ x: number; y: number; lines: string[] } | null>(null);
  const scroller = useRef<HTMLDivElement>(null); const pxd = zoom === 'week' ? 28 : 11; const W = DAYS * pxd;
  const all = s.data.all; const px = (d: string | number) => (typeof d === 'number' ? d : dn(d)) * pxd;

  const stats = useMemo(() => Object.fromEntries(s.data.epics.map((e) => [e.id, epicStat(e, all)])), [s.data.epics, all]);
  const rows: Row[] = useMemo(() => s.data.epics.flatMap((e) => [{ kind: 'epic', id: e.id, h: EH } as Row, ...(open.includes(e.id) ? stats[e.id]!.mine.slice().sort((a, b) => a.from!.localeCompare(b.from!) || a.id.localeCompare(b.id)).map((t) => ({ kind: 'task', id: t.id, h: RH }) as Row) : [])]), [s.data.epics, open, stats]);
  const ys = useMemo(() => { let y = 0; return rows.map((r) => { const t = y; y += r.h; return t; }); }, [rows]);
  const H = rows.reduce((a, r) => a + r.h, 0);
  const task = (id: string) => all.find((t) => t.id === id)!;
  /** Dates as shown right now, including a bar that is being dragged. */
  const span = (id: string, kind: 'epic' | 'task') => {
    if (kind === 'epic') { const e = stats[id]!; const d = drag?.id === id ? drag.d : 0; return { from: addDays(e.from, d), to: addDays(e.to, d) }; }
    const t = task(id); const e = stats[t.epic]!; const ed = drag?.id === t.epic ? drag.d : 0; const d = drag?.id === id ? drag : null; void e;
    return { from: addDays(t.from!, ed + (d && d.kind !== 'end' ? d.d : 0)), to: addDays(t.to!, ed + (d && d.kind !== 'start' ? d.d : 0)) };
  };
  const rowOf = (taskId: string) => { const i = rows.findIndex((r) => r.kind === 'task' && r.id === taskId); if (i >= 0) return i; return rows.findIndex((r) => r.kind === 'epic' && r.id === task(taskId).epic); };

  useLayoutEffect(() => { const el = scroller.current; if (el) el.scrollLeft = Math.max(0, px(TODAY) - el.clientWidth * 0.3); }, [zoom]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { s.focusId.current = null; }, [s.focusId]);

  const toggle = (id: string) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  const down = (e: PointerEvent<HTMLElement>, id: string, kind: Drag['kind']) => { if (e.button !== 0) return; e.currentTarget.setPointerCapture(e.pointerId); setDrag({ id, kind, x0: e.clientX, d: 0, moved: false }); };
  const mv = (e: PointerEvent<HTMLElement>) => { if (!drag) return; const d = Math.round((e.clientX - drag.x0) / pxd); if (d !== drag.d || (!drag.moved && Math.abs(e.clientX - drag.x0) > 4)) setDrag({ ...drag, d, moved: drag.moved || Math.abs(e.clientX - drag.x0) > 4 }); };
  const up = (e: PointerEvent<HTMLElement>, kind: 'epic' | 'task') => {
    if (!drag) return; const g = drag; setDrag(null); try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* released */ }
    if (!g.moved) { if (kind === 'epic') toggle(g.id); else s.setOpenId(g.id); return; }
    if (kind === 'epic') s.shiftEpic(g.id, g.d); else s.shiftTask(g.id, g.kind === 'end' ? 0 : g.d, g.kind === 'start' ? 0 : g.d);
  };
  const key = (e: KeyboardEvent<HTMLElement>, id: string, kind: 'epic' | 'task') => {
    const k = e.key; const i = rows.findIndex((r) => r.id === id && r.kind === kind);
    if (k === 'ArrowUp' || k === 'ArrowDown') { e.preventDefault(); const r = rows[i + (k === 'ArrowUp' ? -1 : 1)]; if (r) scroller.current?.querySelector<HTMLElement>(`[data-bar="${r.kind}:${r.id}"]`)?.focus(); return; }
    if (k === 'ArrowLeft' || k === 'ArrowRight') {
      e.preventDefault(); const d = (k === 'ArrowLeft' ? -1 : 1) * (e.shiftKey ? 7 : 1);
      if (kind === 'epic') { s.shiftEpic(id, d); return; } if (e.altKey) s.shiftTask(id, 0, d); else s.shiftTask(id, d, d); return;
    }
    if (k === 'Enter' || k === ' ') { e.preventDefault(); if (kind === 'epic') toggle(id); else s.setOpenId(id); }
  };
  useEffect(() => { const id = s.focusId.current; if (id) { s.focusId.current = null; scroller.current?.querySelector<HTMLElement>(`[data-bar="task:${id}"]`)?.focus(); } }, [s.data, s.focusId]);
  const showTip = (e: { currentTarget: HTMLElement }, lines: string[]) => { const r = e.currentTarget.getBoundingClientRect(); const p = scroller.current!.getBoundingClientRect(); setTip({ x: Math.max(8, Math.min(p.width - 250, r.left - p.left)), y: r.bottom - p.top + 6, lines }); };

  const weeks = Array.from({ length: DAYS / 7 }, (_, i) => i * 7);
  const arrows = deps ? DEPS.flatMap(([a, b]) => {
    const ra = rowOf(a), rb = rowOf(b); if (ra < 0 || rb < 0 || ra === rb) return [];
    const ta = task(a), tb = task(b); const sa = rows[ra]!.kind === 'epic' ? span(ta.epic, 'epic') : span(a, 'task'); const sb = rows[rb]!.kind === 'epic' ? span(tb.epic, 'epic') : span(b, 'task');
    const x1 = px(dn(sa.to) + 1), x2 = px(sb.from), y1 = ys[ra]! + rows[ra]!.h / 2, y2 = ys[rb]! + rows[rb]!.h / 2; const g = 8; const ym = y1 + (y2 > y1 ? 1 : -1) * (rows[ra]!.h / 2 + 1);
    const d = x2 >= x1 + 2 * g ? `M${x1} ${y1}H${x1 + g}V${y2}H${x2}` : `M${x1} ${y1}H${x1 + g}V${ym}H${x2 - g}V${y2}H${x2}`;
    return [{ k: `${a}>${b}`, d, bad: dn(tb.from!) <= dn(ta.to!) && dn(sb.from) <= dn(sa.to), on: hl === a || hl === b || hl === ta.epic && rows[ra]!.kind === 'epic' }];
  }) : [];
  const broken = DEPS.filter(([a, b]) => slack(task(a), task(b)) < 0).length;
  const barLabel = (t: Task, sp: { from: string; to: string }) => { const bs = slack0(t.id); return `${t.id}, ${t.title}. ${range(sp)}. ${t.who ?? 'Unassigned'}, ${t.est} points.${bs}` };
  const slack0 = (id: string) => { const pre = DEPS.filter(([, b]) => b === id).map(([a]) => a), post = DEPS.filter(([a]) => a === id).map(([, b]) => b); return `${pre.length ? ` Depends on ${pre.join(', ')}.` : ''}${post.length ? ` Blocks ${post.join(', ')}.` : ''}${DEPS.some(([a, b]) => b === id && slack(task(a), task(b)) < 0) ? ' Starts before a dependency finishes.' : ''}`; };

  return (
    <div className="tp-root tp-tv">
      <div className="tp-vh">
        <div><h1 ref={heading} tabIndex={-1}>Timeline</h1><p>Roadmap to launch on Fri 4 Dec · {s.data.epics.length} epics, {all.length} tasks · {broken ? <b className="tp-warn">{broken} dependency conflict{broken > 1 ? 's' : ''}</b> : 'no dependency conflicts'}</p></div>
        <div className="td-ph-a">
          <Segmented label="Zoom" value={zoom} onChange={setZoom} options={[{ id: 'week', label: 'Week' }, { id: 'month', label: 'Month' }]} />
          <Button icon="calendar" onClick={() => { const el = scroller.current; if (el) el.scrollTo({ left: Math.max(0, px(TODAY) - el.clientWidth * 0.3), behavior: 'smooth' }); }}>Today</Button>
          <Button onClick={() => setOpen(open.length ? [] : s.data.epics.map((e) => e.id))}>{open.length ? 'Collapse all' : 'Expand all'}</Button>
          <label className="tp-chk"><input type="checkbox" checked={deps} onChange={(e) => setDeps(e.target.checked)} />Dependencies</label>
        </div>
      </div>
      <div className="tp-gantt" style={{ ['--lw' as string]: undefined }}>
        <div className="tp-gl" aria-hidden={false}>
          <div className="tp-gl-h" style={{ height: 96 }}><span>Epic / task</span></div>
          {rows.map((r) => r.kind === 'epic' ? (() => { const e = s.data.epics.find((x) => x.id === r.id)!; const st = stats[e.id]!; const on = open.includes(e.id); return (
            <div key={`e${e.id}`} className="tp-gr is-epic" style={{ height: r.h }}><button type="button" aria-expanded={on} aria-label={`${e.name}, ${st.p}% done, ${st.mine.length} tasks. ${on ? 'Collapse' : 'Expand'}`} onClick={() => toggle(e.id)}><Glyph name={on ? 'down' : 'chevron'} size={14} /><Avatar name={e.who} size={20} /><span>{e.name}</span></button>
              <button type="button" className="td-iconbtn tp-gfil" aria-label={`Show ${e.name} on the board`} title="Show on board" onClick={() => onBoard(e.id)}><Glyph name="filter" size={13} /></button></div>); })() : (
            <div key={r.id} className="tp-gr" style={{ height: r.h }}><button type="button" onClick={() => s.setOpenId(r.id)} aria-label={`Open ${r.id}`}><span className="tp-id">{r.id.slice(4)}</span><span>{task(r.id).title}</span></button></div>))}
        </div>
        <div className="tp-gs" ref={scroller} onScroll={() => setTip(null)}>
          <div className="tp-gc" style={{ width: W }}>
            <div className="tp-gh" style={{ height: 96 }}>
              <div className="tp-gh-r" style={{ top: 0 }}>{MON.map((m, i) => { const a = [0, 20, 51][i]!, b = [20, 51, DAYS][i]!; return <span key={m} style={{ left: a * pxd, width: (b - a) * pxd }}>{m} 2026</span>; })}</div>
              <div className="tp-gh-r" style={{ top: 24 }}>{SPRINTS.map((sp) => <span key={sp.n} className={cx('tp-sp', sp.n === 14 && 'is-now')} style={{ left: px(sp.a), width: (dn(sp.b) - dn(sp.a)) * pxd }}>Sprint {sp.n}</span>)}</div>
              <div className="tp-gh-r" style={{ top: 48 }}>{weeks.map((d) => <span key={d} className="tp-wkl" style={{ left: d * pxd, width: 7 * pxd }}>{zoom === 'week' ? short(addDays('2026-10-12', d)) : d % 14 === 0 ? short(addDays('2026-10-12', d)).replace(/ .*/, '') && short(addDays('2026-10-12', d)) : ''}</span>)}</div>
              <div className="tp-gh-r tp-ms-r" style={{ top: 70 }}>{MILESTONES.map((m) => <button key={m.id} type="button" className="tp-ms" style={{ left: px(dn(m.d) + 0.5) }} aria-label={`Milestone ${m.label}, ${short(m.d)}`} onFocus={(e) => showTip(e, [m.label, short(m.d)])} onBlur={() => setTip(null)} onPointerEnter={(e) => showTip(e, [m.label, short(m.d)])} onPointerLeave={() => setTip(null)}><i />{zoom === 'week' && <span>{m.label}</span>}</button>)}</div>
            </div>
            <div className="tp-gb" style={{ height: H }}>
              {weeks.map((d) => <i key={d} className="tp-vl" style={{ left: d * pxd }} />)}
              {weeks.map((d) => <i key={`w${d}`} className="tp-we" style={{ left: (d + 5) * pxd, width: 2 * pxd }} />)}
              <i className="tp-band" style={{ left: px('2026-10-19'), width: 14 * pxd }} />
              {MILESTONES.map((m) => <i key={m.id} className="tp-mline" style={{ left: px(dn(m.d) + 0.5) }} />)}
              {rows.map((r, i) => <i key={`r${r.kind}${r.id}`} className={cx('tp-rl', r.kind === 'epic' && 'is-epic')} style={{ top: ys[i], height: r.h }} />)}
              <i className="tp-today" style={{ left: px(dn(TODAY) + 0.5) }}><span>Today</span></i>
              <svg className="tp-deps" width={W} height={H} aria-hidden="true"><defs><marker id="tp-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" fill="currentColor" /></marker></defs>
                {arrows.map((a) => <path key={a.k} d={a.d} className={cx('tp-dep', a.bad && 'is-bad', a.on && 'is-on')} markerEnd="url(#tp-ar)" />)}</svg>
              {rows.map((r, i) => {
                const isE = r.kind === 'epic'; const t = isE ? null : task(r.id); const sp = span(r.id, r.kind); const e = isE ? stats[r.id]! : null; const w = (dn(sp.to) - dn(sp.from) + 1) * pxd; const dr = drag?.id === r.id && drag.moved;
                const lines = isE ? [s.data.epics.find((x) => x.id === r.id)!.name, `${range(sp)} · ${e!.p}% done`, `${e!.done} of ${e!.mine.length} tasks done`] : [`${t!.id} ${t!.title}`, `${range(sp)} · ${t!.est} pts`, t!.who ?? 'Unassigned'];
                const label = isE ? `${lines.join('. ')}. ${open.includes(r.id) ? 'Expanded' : 'Collapsed'}. Arrow keys shift all dates.` : `${barLabel(t!, sp)} Left and right arrows shift dates, Alt with arrows changes the end, Enter opens details.`;
                return (
                  <div key={`b${r.kind}${r.id}`} className={cx('tp-bar2', isE ? 'is-epic' : `is-${t!.status}`, t?.blocked && 'is-blocked', dr && 'is-drag')} style={{ left: px(sp.from), width: w, top: ys[i]! + (isE ? 9 : 6), height: isE ? 22 : 22 }} data-bar={`${r.kind}:${r.id}`} role="button" tabIndex={0} aria-label={label}
                    onPointerDown={(e) => { if (!(e.target as HTMLElement).dataset.h) down(e, r.id, 'move'); }} onPointerMove={mv} onPointerUp={(e) => up(e, r.kind)} onPointerCancel={() => setDrag(null)} onKeyDown={(e) => key(e, r.id, r.kind)}
                    onFocus={(e) => { setHl(r.id); showTip(e, lines); }} onBlur={() => { setHl(null); setTip(null); }} onPointerEnter={(e) => { setHl(r.id); if (!drag) showTip(e, lines); }} onPointerLeave={() => { if (!drag) { setHl(null); setTip(null); } }}>
                    {isE && <i className="tp-fill2" style={{ width: `${e!.p}%` }} />}
                    {!isE && <b data-h="start" className="tp-hd is-l" onPointerDown={(ev) => { ev.stopPropagation(); down(ev, r.id, 'start'); }} aria-hidden="true" />}
                    <span>{isE ? `${e!.p}%` : t!.title}</span>
                    {!isE && <b data-h="end" className="tp-hd is-r" onPointerDown={(ev) => { ev.stopPropagation(); down(ev, r.id, 'end'); }} aria-hidden="true" />}
                  </div>);
              })}
            </div>
            {tip && !drag && <div className="tp-gtip" style={{ left: tip.x + (scroller.current?.scrollLeft ?? 0), top: tip.y + 96 > 0 ? tip.y : 0 }} aria-hidden="true"><b>{tip.lines[0]}</b>{tip.lines.slice(1).map((l) => <span key={l}>{l}</span>)}</div>}
          </div>
        </div>
      </div>
      <p className="tp-tl-foot"><span className="tp-legend"><i className="is-dia" />Milestone<i className="is-today" />Today<i className="is-sprint" />Sprint 14</span>
        <span className="hide-sm"><kbd>←</kbd><kbd>→</kbd> shift a day <kbd>Shift</kbd> a week <kbd>Alt</kbd> end date <kbd>↑</kbd><kbd>↓</kbd> next bar <kbd>Enter</kbd> details. Drag bars or their edges. Red arrows mark conflicts.</span></p>
    </div>
  );
}
