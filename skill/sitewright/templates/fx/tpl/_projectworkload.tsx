'use client';
// The Workload view: planned points per person per week against capacity, as a heatmap or bars. Pick a person to see their tasks and reassign to rebalance.
import { useState } from 'react';
import { Avatar, Button, Glyph, Kpi, Panel, Segmented, cx } from './_dash';
import { PEOPLE, StatusIcon, pts, short, type Task } from './_project';
import { TODAY, WL_N, WL_WEEKS, allocate, dn, range, ptoNote, weekCap } from './_projectdata';
import type { Store } from './_projectstore';

const UN = 'Unassigned';
const NOW_W = Math.floor((dn(TODAY) - 7) / 7) + 1; // first week that is still ahead of us (Oct 26)
type Mode = 'heat' | 'bars'; type Scope = 'all' | 'open';
interface Cell { load: number; cap: number; tasks: Array<{ t: Task; n: number }> }
const lvl = (c: Cell, w: number) => (c.cap === 0 ? (c.load ? 'over' : 'off') : w < NOW_W ? 'past' : c.load > c.cap ? 'over' : c.load / c.cap >= 0.9 ? 'high' : c.load / c.cap >= 0.5 ? 'mid' : c.load ? 'low' : 'zero');

export function WorkloadView({ s, heading }: { s: Store; heading: React.RefObject<HTMLHeadingElement | null> }) {
  const [mode, setMode] = useState<Mode>('heat'); const [scope, setScope] = useState<Scope>('all'); const [pct, setPct] = useState(false);
  const [sel, setSel] = useState<string>('Aiko Tanaka'); const [wk, setWk] = useState<number | null>(null);
  const all = s.data.all.filter((t) => scope === 'all' || t.status !== 'done');
  const names = [...PEOPLE.map((p) => p.name), ...(all.some((t) => !t.who) ? [UN] : [])];
  const grid: Record<string, Cell[]> = Object.fromEntries(names.map((n) => [n, Array.from({ length: WL_N }, (_, w): Cell => ({ load: 0, cap: n === UN ? 0 : weekCap(n, w), tasks: [] }))]));
  for (const t of all) { const row = grid[t.who ?? UN]; if (!row) continue; allocate(t).forEach((n, w) => { if (n) { row[w]!.load += n; row[w]!.tasks.push({ t, n }); } }); }
  const sprintOf = (n: string) => s.tasks.filter((t) => (t.who ?? UN) === n && (scope === 'all' || t.status !== 'done'));
  const total = (n: string) => grid[n]!.reduce((a, c) => a + c.load, 0);
  const over = names.flatMap((n) => grid[n]!.map((c, w) => (n !== UN && w >= NOW_W && c.load > c.cap ? { n, w, c } : null)).filter(Boolean) as Array<{ n: string; w: number; c: Cell }>);
  const maxLoad = Math.max(...names.flatMap((n) => grid[n]!.map((c) => Math.max(c.load, c.cap))), 1);
  const teamCap = (w: number) => PEOPLE.reduce((a, p) => a + weekCap(p.name, w), 0), teamLoad = (w: number) => names.reduce((a, n) => a + grid[n]![w]!.load, 0);
  const sp14 = pts(s.tasks), sp14cap = PEOPLE.reduce((a, p) => a + p.cap, 0), unp = pts(all.filter((t) => !t.who));
  const person = names.includes(sel) ? sel : names[0]!; const row = grid[person]!; const pp = PEOPLE.find((p) => p.name === person);
  const list = [...row.flatMap((c, w) => (wk === null || wk === w ? c.tasks.map((x) => ({ ...x, w })) : []))].reduce<Array<{ t: Task; n: number; weeks: number[] }>>((a, x) => { const f = a.find((y) => y.t.id === x.t.id); if (f) { f.n += x.n; f.weeks.push(x.w); } else a.push({ t: x.t, n: x.n, weeks: [x.w] }); return a; }, []).sort((a, b) => a.t.from!.localeCompare(b.t.from!));
  const free = (n: string, weeks: number[]) => Math.min(...weeks.map((w) => weekCap(n, w) - grid[n]![w]!.load));
  const reassign = (t: Task, who: string | null) => { s.patch(t.id, { who }, `${t.id} reassigned to ${who ?? 'nobody'}`); };
  const tip = (() => {
    const worst = over.slice().sort((a, b) => b.c.load - b.c.cap - (a.c.load - a.c.cap))[0]; if (!worst) return null;
    const cand = worst.c.tasks.filter((x) => x.t.status !== 'done' && x.n >= worst.c.load - worst.c.cap).sort((a, b) => a.n - b.n)[0] ?? worst.c.tasks.filter((x) => x.t.status !== 'done').sort((a, b) => b.n - a.n)[0];
    if (!cand) return null; const alt = PEOPLE.filter((p) => p.name !== worst.n).map((p) => ({ p, f: free(p.name, allocate(cand.t).flatMap((n, w) => (n ? [w] : []))) })).sort((a, b) => b.f - a.f)[0];
    return alt && alt.f >= 1 ? { ...worst, t: cand.t, to: alt.p.name, f: alt.f } : null;
  })();
  const cellTxt = (c: Cell) => (pct ? (c.cap ? `${Math.round((c.load / c.cap) * 100)}%` : c.load ? `${c.load}` : '–') : `${c.load}`);

  return (
    <div className="tp-root tp-wv">
      <div className="tp-vh"><div><h1 ref={heading} tabIndex={-1}>Workload</h1><p>Planned points per person per week against capacity · 19 Oct to 6 Dec</p></div>
        <div className="td-ph-a"><Segmented label="Show" value={scope} onChange={setScope} options={[{ id: 'all', label: 'All work' }, { id: 'open', label: 'Open work' }]} /><Segmented label="Cell value" value={pct ? 'pct' : 'pts'} onChange={(v) => setPct(v === 'pct')} options={[{ id: 'pts', label: 'Points' }, { id: 'pct', label: '% of capacity' }]} /><Segmented label="Chart style" value={mode} onChange={setMode} options={[{ id: 'heat', label: 'Heatmap' }, { id: 'bars', label: 'Bars' }]} /></div></div>
      <div className="td-kpis tp-kp">
        <Kpi label="Sprint 14 planned" value={`${sp14} / ${sp14cap} pts`} hint={`${s.tasks.length} tasks, the same as the Board`} />
        <Kpi label="Overbooked person-weeks" value={String(over.length)} hint={over.length ? `Next: ${over[0]!.n.split(' ')[0]}, week of ${short(WL_WEEKS[over[0]!.w]!)}` : 'Everyone is within capacity'} />
        <Kpi label="This week free" value={`${Math.max(0, teamCap(NOW_W) - teamLoad(NOW_W))} pts`} hint={`${teamLoad(NOW_W)} of ${teamCap(NOW_W)} pts, week of ${short(WL_WEEKS[NOW_W]!)}`} />
        <Kpi label="Unassigned" value={`${unp} pts`} hint={unp ? 'Needs an owner' : 'Every task has an owner'} />
      </div>
      {tip && <div className="tp-tipbar" role="status"><Glyph name="sparkle" size={15} /><span><b>{tip.n}</b> is {tip.c.load - tip.c.cap} pts over in the week of {short(WL_WEEKS[tip.w]!)}. Move <b>{tip.t.id}</b> to <b>{tip.to}</b> ({tip.f} pts free)?</span><Button small variant="primary" onClick={() => { reassign(tip.t, tip.to); setSel(tip.n); }}>Reassign</Button></div>}
      <div className="tp-wsplit">
        <Panel id="tp-wh" title="Capacity by week" sub={mode === 'heat' ? 'Darker means fuller. Red means over capacity.' : 'Bar height is planned points. The tick is capacity.'} flush actions={<span className="tp-legend tp-hl"><i className="is-low" />Under<i className="is-mid" />Good<i className="is-high" />Near<i className="is-over" />Over</span>}>
          <div className="tp-hscroll"><table className="tp-heat">
            <caption className="td-sr">Planned points per person per week</caption>
            <thead><tr><th scope="col">Person</th>{WL_WEEKS.map((d, w) => <th key={d} scope="col" className={cx(w < NOW_W && 'is-past')}>{short(d)}</th>)}<th scope="col" className="is-sum">Sprint 14</th><th scope="col" className="is-sum">Total</th></tr></thead>
            <tbody>{names.map((n) => { const p = PEOPLE.find((x) => x.name === n); const sp = sprintOf(n); const spp = pts(sp); return (
              <tr key={n} className={cx(person === n && 'is-sel')}>
                <th scope="row"><button type="button" aria-pressed={person === n} aria-label={`${n}: show tasks`} onClick={() => { setSel(n); setWk(null); }}>{n === UN ? <span className="tp-unas"><Glyph name="users" size={12} /></span> : <Avatar name={n} size={24} />}<span><b>{n}</b><small>{p?.role ?? 'Needs an owner'}</small></span></button></th>
                {grid[n]!.map((c, w) => { const l = lvl(c, w); const note = ptoNote(n, w); return (
                  <td key={w}><button type="button" className={cx('tp-hc', `is-${l}`, person === n && wk === w && 'is-pick')} onClick={() => { setSel(n); setWk(wk === w && person === n ? null : w); }} style={mode === 'bars' ? ({ ['--h' as string]: `${(c.load / maxLoad) * 100}%`, ['--c' as string]: `${(c.cap / maxLoad) * 100}%` }) : undefined}
                    aria-label={`${n}, week of ${short(WL_WEEKS[w]!)}: ${c.load} of ${c.cap} points${note ? `, ${note}` : ''}${l === 'over' ? ', over capacity' : ''}`} title={`${c.load} of ${c.cap} pts${note ? ` · ${note}` : ''}`}>
                    {mode === 'bars' && <><i className="tp-hb" /><i className="tp-hcap" /></>}<span>{l === 'off' ? 'OOO' : cellTxt(c)}</span>{l === 'over' && <Glyph name="up" size={11} />}</button></td>); })}
                <td className="is-sum"><b>{spp}</b>{p && <span> / {p.cap}</span>}{p && spp > p.cap && <em> over</em>}</td><td className="is-sum"><b>{total(n)}</b></td></tr>); })}</tbody>
            <tfoot><tr><th scope="row">Team</th>{Array.from({ length: WL_N }, (_, w) => <td key={w} className={cx(w < NOW_W && 'is-past')}><b>{teamLoad(w)}</b><span> / {teamCap(w)}</span></td>)}<td className="is-sum"><b>{sp14}</b><span> / {sp14cap}</span></td><td className="is-sum"><b>{names.reduce((a, n) => a + total(n), 0)}</b></td></tr></tfoot>
          </table></div>
          <p className="tp-wfoot">Points are spread over each task's working days. Past weeks show work done. The Sprint 14 column equals the Board's {sp14} points{scope === 'open' ? ' for open work' : ''}.</p>
        </Panel>
        <Panel id="tp-wd" title={person} sub={`${pp?.role ?? 'Needs an owner'} · ${total(person)} pts planned${pp ? ` · ${pp.cap} pt sprint capacity` : ''}`} actions={wk !== null ? <Button small variant="ghost" onClick={() => setWk(null)}>All weeks</Button> : undefined}>
          <p className="tp-wdsub">{wk === null ? 'All planned tasks' : `Week of ${short(WL_WEEKS[wk]!)}`} · {list.length} {list.length === 1 ? 'task' : 'tasks'}</p>
          {list.length === 0 ? <div className="tp-none">Nothing planned{wk !== null ? ' this week' : ''}</div> : (
            <ul className="tp-wtasks">{list.map(({ t, n }) => { const weeks = allocate(t).flatMap((x, w) => (x ? [w] : [])); return (
              <li key={t.id}><div className="tp-wt1"><StatusIcon s={t.status} /><button type="button" className="tp-link" onClick={() => s.setOpenId(t.id)}><span className="tp-id">{t.id}</span>{t.title}</button><span className="tp-est" title="Estimate">{t.est}</span></div>
                <div className="tp-wt2"><span>{range(t)}{wk !== null || n !== t.est ? ` · ${n} of ${t.est} pts here` : ''}</span>
                  <select aria-label={`Reassign ${t.id}`} value={t.who ?? ''} disabled={t.status === 'done'} onChange={(e) => reassign(t, e.target.value || null)}>
                    <option value="">Unassigned</option>{PEOPLE.map((p) => { const f = free(p.name, weeks); return <option key={p.name} value={p.name}>{p.name}{p.name === t.who ? ' (current)' : ` · ${f >= 0 ? `${f} free` : `${-f} over`}`}</option>; })}</select></div></li>); })}</ul>)}
        </Panel>
      </div>
    </div>
  );
}
