'use client';
// The read-only views of the project dashboard: burndown, sprint summary, timeline and workload. They all derive from the live task list.
import { useState } from 'react';
import { AreaChart, Avatar, Icon, Panel, Progress, cx, useWidth } from './_dash';
import { COMMIT, DAY_LABELS, EPICS, MILESTONES, PEOPLE, SPRINTS, TODAY_IDX, TODAY_PCT, WEEKS, burndown, pctOf, pts, short, sprintStats, type Task } from './_project';

const pt = (v: number) => `${Math.round(v * 10) / 10} pts`;

export function Burndown({ tasks }: { tasks: Task[] }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const { ideal, actual, s } = burndown(tasks);
  const tx = 40 + Math.max(10, w - 48) * (TODAY_IDX / 10);
  return (
    <Panel id="tp-bd" title="Burndown" sub="Story points remaining, 10 working days (19 to 30 Oct)" actions={<span className="tp-legend"><i />Remaining<i className="is-ideal" />Ideal</span>}>
      <div className="tp-bd" ref={ref}>
        <AreaChart ariaLabel={`Burndown: ${pt(s.remaining)} remaining today against an ideal of ${pt(s.ideal)}`} labels={DAY_LABELS.map((l, i) => (i === TODAY_IDX ? 'Today, Sat 24' : l))} height={188} format={(v) => String(Math.round(v))} tipFormat={pt}
          series={[{ id: 'actual', label: 'Remaining', data: actual }, { id: 'ideal', label: 'Ideal', data: ideal, color: 'color-mix(in srgb, var(--ink, #15130e) 38%, transparent)' }]} />
        {w > 0 && <><div className="tp-future" style={{ left: tx }} aria-hidden="true" /><div className="tp-today" style={{ left: tx }} aria-hidden="true"><span>Today</span></div>
          <div className="tp-ann" aria-hidden="true">{s.carry === 0 ? 'Projected to finish by Fri 30' : <>Projected <b>{pt(s.carry)}</b> left on Fri 30</>}</div></>}
      </div>
    </Panel>
  );
}

export function Summary({ tasks }: { tasks: Task[] }) {
  const s = sprintStats(tasks); const prog = s.by('progress').length + s.by('review').length;
  const cells = [{ l: 'Done', n: s.by('done').length, p: s.doneP, c: 'ok' }, { l: 'In progress', n: prog, p: pts(s.by('progress')) + pts(s.by('review')), c: 'prog' }, { l: 'Blocked', n: s.blocked.length, p: pts(s.blocked), c: 'bad' }];
  return (
    <Panel id="tp-sm" title="Sprint 14" sub="Mon 19 to Fri 30 Oct · 5 days left">
      <div className="tp-sum">
        {cells.map((c) => <div key={c.l} className={cx('tp-sumc', `is-${c.c}`, c.c === 'bad' && c.n > 0 && 'is-hot')}><span>{c.l}</span><b>{c.n}</b><small>{c.p} pts</small></div>)}
      </div>
      <div className="tp-sumbar"><div className="tp-sumbar-t"><span>Points completed</span><b>{s.doneP} / {s.total}</b></div><Progress value={s.total ? s.doneP / s.total : 0} tone="ok" label="Points completed" /></div>
      <dl className="tp-kv">
        <div><dt>To do</dt><dd>{s.by('todo').length} tasks · {pts(s.by('todo'))} pts</dd></div>
        <div><dt>Velocity</dt><dd>{s.v.toFixed(1)} pts / day</dd></div>
        <div><dt>Scope change</dt><dd className={cx(s.scope > 0 && 'is-warn')}>{s.scope > 0 ? `+${s.scope}` : s.scope} pts since start</dd></div>
        <div><dt>Forecast</dt><dd className={cx(s.carry > 0 ? 'is-warn' : 'is-ok')}>{s.carry > 0 ? `${pt(s.carry)} carry over` : 'Sprint completes'}</dd></div>
      </dl>
    </Panel>
  );
}

export function Timeline({ tasks, epic, onEpic }: { tasks: Task[]; epic: string; onEpic: (id: string) => void }) {
  const [tip, setTip] = useState<{ key: string; c: number; below?: boolean; lines: string[] } | null>(null);
  const tipEl = (key: string) => tip?.key === key && <div className={cx('tp-tip', tip.below && 'is-below')} style={{ left: `${Math.max(14, Math.min(86, tip.c))}%` }} aria-hidden="true"><b>{tip.lines[0]}</b>{tip.lines.slice(1).map((l) => <span key={l}>{l}</span>)}</div>;
  const hov = (key: string, c: number, lines: string[], below?: boolean) => ({ onPointerEnter: () => setTip({ key, c, lines, below }), onPointerLeave: () => setTip(null), onFocus: () => setTip({ key, c, lines, below }), onBlur: () => setTip(null) });
  return (
    <Panel id="tp-tl" title="Timeline" sub="8 weeks, 12 Oct to 6 Dec · select an epic to filter the board" flush actions={<span className="tp-legend"><i className="is-dia" />Milestone<i className="is-sprint" />This sprint</span>}>
      <div className="tp-tlscroll"><div className="tp-tl">
        <div className="tp-tlplane" aria-hidden="true">
          {WEEKS.map((_, i) => <i key={i} className="tp-wk" style={{ left: `${(i / 8) * 100}%` }} />)}
          <i className="tp-band" style={{ left: `${pctOf('2026-10-19')}%`, width: `${pctOf('2026-11-02') - pctOf('2026-10-19')}%` }} />
          <i className="tp-tline" style={{ left: `${TODAY_PCT}%` }} />
        </div>
        <div className="tp-tlrow is-head"><div className="tp-tlname">Sprint</div><div className="tp-tltrack">{SPRINTS.map((sp) => <span key={sp.n} className={cx('tp-sp', sp.n === 14 && 'is-now')} style={{ left: `${pctOf(sp.a)}%`, width: `${pctOf(sp.b) - pctOf(sp.a)}%` }}>S{sp.n}</span>)}</div></div>
        <div className="tp-tlrow is-head"><div className="tp-tlname">Week of</div><div className="tp-tltrack">{WEEKS.map((l, i) => <span key={l} className="tp-wl" style={{ left: `${(i / 8) * 100}%` }}>{l}</span>)}<span className="tp-todaylab" style={{ left: `${TODAY_PCT}%` }}>Today</span></div></div>
        <div className="tp-tlrow is-ms"><div className="tp-tlname">Milestones</div><div className="tp-tltrack">
          {MILESTONES.map((m) => <button key={m.id} type="button" className={cx('tp-ms', pctOf(m.d) > 80 && 'is-flip')} style={{ left: `${pctOf(m.d, true) - 0.9}%` }} aria-label={`${m.label}, ${short(m.d)}`} {...hov(m.id, pctOf(m.d), [m.label, short(m.d)], true)}><i /><span>{m.label}</span></button>)}
          {MILESTONES.map((m) => tipEl(m.id))}</div></div>
        {EPICS.map((e) => {
          const mine = tasks.filter((t) => t.epic === e.id); const done = pts(mine.filter((t) => t.status === 'done'));
          const p = Math.round(((e.pre[0]! + done) / (e.pre[1]! + pts(mine))) * 100); const l = pctOf(e.from), r = pctOf(e.to, true);
          const lines = [e.name, `${short(e.from)} to ${short(e.to)} · ${p}% done`, `Sprint 14: ${mine.filter((t) => t.status === 'done').length} of ${mine.length} tasks done`, `Owner: ${e.who}`];
          return (
            <div key={e.id} className={cx('tp-tlrow', epic === e.id && 'is-on')}><div className="tp-tlname"><Avatar name={e.who} size={20} /><span>{e.name}</span></div>
              <div className="tp-tltrack"><button type="button" className="tp-bar" style={{ left: `${l}%`, width: `${r - l}%` }} aria-pressed={epic === e.id} aria-label={`${lines.join('. ')}. ${epic === e.id ? 'Showing on board' : 'Filter board by this epic'}`} onClick={() => onEpic(epic === e.id ? '' : e.id)} {...hov(e.id, (l + r) / 2, lines)}><i style={{ width: `${p}%` }} /><span>{p}%</span></button>{tipEl(e.id)}</div></div>
          );
        })}
      </div></div>
    </Panel>
  );
}

export function Workload({ tasks }: { tasks: Task[] }) {
  const rows = [...PEOPLE.map((p) => ({ name: p.name, role: p.role, cap: p.cap })), ...(tasks.some((t) => !t.who) ? [{ name: 'Unassigned', role: 'Needs an owner', cap: 0 }] : [])].map((p) => {
    const mine = tasks.filter((t) => (t.who ?? 'Unassigned') === p.name); const done = pts(mine.filter((t) => t.status === 'done')), all = pts(mine);
    return { ...p, done, rest: all - done, all, over: p.cap > 0 ? all - p.cap : all };
  });
  const scale = Math.max(...rows.map((r) => Math.max(r.cap, r.all)), 1) * 1.08; const overN = rows.filter((r) => r.over > 0 && r.name !== 'Unassigned').length;
  return (
    <Panel id="tp-wl" title="Workload" sub={`Assigned points against sprint capacity · ${overN} over`} actions={<span className="tp-legend"><i className="is-done" />Done<i className="is-rest" />To go<i className="is-cap" />Capacity</span>}>
      <ul className="tp-wlist">
        {rows.map((r) => (
          <li key={r.name} className={cx(r.over > 0 && 'is-over')} aria-label={`${r.name}: ${r.all} of ${r.cap} points${r.over > 0 ? `, ${r.over} over capacity` : ''}`}>
            {r.name === 'Unassigned' ? <span className="tp-unas" aria-hidden="true"><Icon name="users" size={13} /></span> : <Avatar name={r.name} size={24} />}
            <div className="tp-wn"><b>{r.name}</b><small>{r.role}</small></div>
            <div className="tp-wtrack" aria-hidden="true"><i className="tp-wd" style={{ width: `${(r.done / scale) * 100}%` }} /><i className="tp-wr" style={{ left: `${(r.done / scale) * 100}%`, width: `${(r.rest / scale) * 100}%` }} />{r.cap > 0 && <i className="tp-wc" style={{ left: `${(r.cap / scale) * 100}%` }} />}</div>
            <div className="tp-wv"><b>{r.all}{r.cap > 0 && <span> / {r.cap}</span>}</b><small>{r.name === 'Unassigned' ? 'pts' : r.over > 0 ? `${r.over} over` : `${-r.over} free`}</small></div>
          </li>
        ))}
      </ul>
      <p className="tp-wfoot">Commitment at sprint start was {COMMIT} pts. Reassign a card from its menu to rebalance.</p>
    </Panel>
  );
}
