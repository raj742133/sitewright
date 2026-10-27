'use client';
// Deals: every deal in one dense table. Search, stage tabs, owner and close-date filters, sortable columns, multi-select with bulk
// move and reassign, and a row opens the deal drawer.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Button, Empty, Glyph, Panel, Pill, Tabs, cx } from './_dash';
import { REPS, closeNote, csv, daysTo, health, prob, sum, type Deal, type StageId } from './_sales';
import { useCfg } from './_sales-store';
import { HealthDot, StagePill, ViewHead, type Ops } from './_sales-ui';

type SortId = 'company' | 'stage' | 'amount' | 'prob' | 'owner' | 'close' | 'health';
const WHEN: Array<{ id: string; label: string; f: (d: Deal) => boolean }> = [
  { id: 'any', label: 'Any close date', f: () => true }, { id: 'late', label: 'Overdue', f: (d) => d.stage !== 'won' && daysTo(d.close) < 0 },
  { id: 'week', label: 'Next 7 days', f: (d) => d.stage !== 'won' && daysTo(d.close) >= 0 && daysTo(d.close) <= 7 }, { id: 'oct', label: 'October', f: (d) => d.close.startsWith('2026-10') },
  { id: 'nov', label: 'November', f: (d) => d.close.startsWith('2026-11') }, { id: 'dec', label: 'December', f: (d) => d.close.startsWith('2026-12') },
];
const HRANK = { bad: 0, warn: 1, ok: 2 };

export function DealsView({ ops, headRef }: { ops: Ops; headRef: React.Ref<HTMLHeadingElement> }) {
  const { cfg, fm } = useCfg(); const { deals } = ops;
  const [q, setQ] = useState(''); const [stage, setStage] = useState<'all' | StageId>('all'); const [owner, setOwner] = useState('all'); const [when, setWhen] = useState('any');
  const [sort, setSort] = useState<{ id: SortId; dir: 1 | -1 } | null>({ id: 'close', dir: 1 }); const [sel, setSel] = useState<string[]>([]);
  const all = useRef<HTMLInputElement>(null);
  const sIdx = (s: StageId) => cfg.stages.findIndex((x) => x.id === s);
  const base = useMemo(() => deals.filter((d) => (owner === 'all' || d.owner === owner) && WHEN.find((w) => w.id === when)!.f(d) && (!q.trim() || `${d.company} ${d.title} ${d.owner}`.toLowerCase().includes(q.trim().toLowerCase()))), [deals, owner, when, q]);
  const rows = useMemo(() => {
    const r = base.filter((d) => stage === 'all' || d.stage === stage); if (!sort) return r;
    const cmp: Record<SortId, (a: Deal, b: Deal) => number> = {
      company: (a, b) => a.company.localeCompare(b.company), stage: (a, b) => sIdx(a.stage) - sIdx(b.stage), amount: (a, b) => a.amount - b.amount, prob: (a, b) => prob(a, cfg.stages) - prob(b, cfg.stages),
      owner: (a, b) => a.owner.localeCompare(b.owner), close: (a, b) => a.close.localeCompare(b.close), health: (a, b) => HRANK[health(a).level] - HRANK[health(b).level],
    };
    return [...r].sort((a, b) => cmp[sort.id](a, b) * sort.dir || a.company.localeCompare(b.company));
  }, [base, stage, sort, cfg.stages]); // eslint-disable-line react-hooks/exhaustive-deps
  const ids = rows.map((r) => r.id); const picked = sel.filter((i) => ids.includes(i)); const allOn = ids.length > 0 && picked.length === ids.length;
  useEffect(() => { if (all.current) all.current.indeterminate = picked.length > 0 && !allOn; }, [picked.length, allOn]);
  const filtered = q.trim() !== '' || stage !== 'all' || owner !== 'all' || when !== 'any';
  const clear = () => { setQ(''); setStage('all'); setOwner('all'); setWhen('any'); };
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const open = rows.filter((d) => d.stage !== 'won'); const weighted = sum(open, (d) => (d.amount * prob(d, cfg.stages)) / 100);
  const bulk = deals.filter((d) => picked.includes(d.id));
  const exportCsv = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv(rows, cfg.stages)], { type: 'text/csv' })); a.download = 'deals-q4-2026.csv'; a.click(); URL.revokeObjectURL(a.href); ops.announce(`Exported ${rows.length} deals to CSV`); };
  const th = (id: SortId, label: string, cls = '', align?: 'right') => (
    <th scope="col" className={cx(cls, align && 'is-r')} aria-sort={sort?.id === id ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => setSort((s) => (s?.id === id ? (s.dir === 1 ? { id, dir: -1 } : null) : { id, dir: 1 }))}>{label}<Glyph name="down" size={11} className={cx('td-sortic', sort?.id === id && 'is-on', sort?.id === id && sort.dir === 1 && 'is-asc')} /></button>
    </th>
  );
  const counts = (s: 'all' | StageId) => (s === 'all' ? base.length : base.filter((d) => d.stage === s).length);

  return (
    <>
      <ViewHead ref={headRef} title="Deals" sub={`${deals.length} deals · ${fm.m(sum(deals.filter((d) => d.stage !== 'won')))} open · ${fm.m(sum(deals.filter((d) => d.stage === 'won')))} won this quarter`}>
        <Button icon="file" onClick={exportCsv}>Export CSV</Button>
      </ViewHead>
      <Panel id="tv-dl" flush>
        <div className="tv-tabs"><Tabs label="Filter by stage" value={stage} onChange={setStage} tabs={[{ id: 'all', label: 'All', count: counts('all') }, ...cfg.stages.map((s) => ({ id: s.id as 'all' | StageId, label: s.label, count: counts(s.id) }))]} /></div>
        <div className="tv-tools" role="search" aria-label="Filter deals">
          <label className="ts-search"><span className="td-sr">Search deals</span><Glyph name="search" size={14} /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company, deal or owner" /></label>
          <label className="ts-select"><span className="td-sr">Owner</span><Glyph name="users" size={14} /><select value={owner} onChange={(e) => setOwner(e.target.value)}><option value="all">All owners</option>{REPS.map((r) => <option key={r.name}>{r.name}</option>)}</select><Glyph name="down" size={12} /></label>
          <label className="ts-select"><span className="td-sr">Close date</span><Glyph name="calendar" size={14} /><select value={when} onChange={(e) => setWhen(e.target.value)}>{WHEN.map((w) => <option key={w.id} value={w.id}>{w.label}</option>)}</select><Glyph name="down" size={12} /></label>
          {filtered && <Button variant="ghost" small icon="x" onClick={clear}>Clear</Button>}
          <span className="tv-grow" />
          <span className="ts-count" role="status" aria-live="polite">{rows.length} of {deals.length} deals</span>
        </div>
        {picked.length > 0 && (
          <div className="tv-bulk" role="region" aria-label="Bulk actions">
            <b>{picked.length} selected</b><span className="td-muted">{fm.m(sum(bulk))}</span>
            <label className="tv-mini"><span className="td-sr">Move selected deals to stage</span><select value="" onChange={(e) => { if (e.target.value) { ops.moveDeals(picked, e.target.value as StageId); } }}><option value="">Move to stage…</option>{cfg.stages.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
            <label className="tv-mini"><span className="td-sr">Reassign selected deals to</span><select value="" onChange={(e) => { if (e.target.value) { ops.reassign(picked, e.target.value); } }}><option value="">Reassign to…</option>{REPS.map((r) => <option key={r.name}>{r.name}</option>)}</select></label>
            <Button variant="ghost" small onClick={() => setSel([])}>Clear selection</Button>
          </div>
        )}
        <div className="td-tablewrap tv-wrap">
          <table className="td-table tv-table">
            <caption className="td-sr">All deals. Column headers sort. Select rows for bulk actions.</caption>
            <thead><tr>
              <th scope="col" className="tv-ck" onClick={(e) => { if (e.target === e.currentTarget) setSel(allOn ? [] : ids); }}><input ref={all} type="checkbox" aria-label="Select all shown deals" checked={allOn} onChange={() => setSel(allOn ? [] : ids)} /></th>
              {th('company', 'Deal')}{th('stage', 'Stage')}{th('amount', 'Amount', '', 'right')}{th('prob', 'Win %', 'hide-md', 'right')}{th('owner', 'Owner', 'hide-sm')}{th('close', 'Close date', 'hide-sm')}{th('health', 'Health', 'hide-md')}
            </tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={8} className="td-none"><Empty title="No deals match" text="Try another stage, owner or date, or clear the filters." /><Button onClick={clear}>Clear filters</Button></td></tr>}
              {rows.map((d) => { const h = health(d); const on = picked.includes(d.id); return (
                <tr key={d.id} className={cx('is-click', on && 'is-sel')} onClick={() => ops.openDeal(d.id)}>
                  <td className="tv-ck" onClick={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) toggle(d.id); }}><input type="checkbox" checked={on} onChange={() => toggle(d.id)} aria-label={`Select ${d.company}`} /></td>
                  <td><button type="button" className="tv-open" onClick={(e) => { e.stopPropagation(); ops.openDeal(d.id); }} aria-label={`Open ${d.company}, ${d.title}`}><b>{d.company}</b><small>{d.title}</small></button></td>
                  <td><StagePill id={d.stage} /></td>
                  <td className="is-r tv-amt">{d.amount >= cfg.large && <span className="tv-large" title={`At or above the ${fm.m(cfg.large)} large-deal threshold`}>Large</span>}{fm.m(d.amount)}</td>
                  <td className="is-r hide-md td-muted">{d.stage === 'won' ? '100%' : `${prob(d, cfg.stages)}%`}</td>
                  <td className="hide-sm"><span className="tv-own"><Avatar name={d.owner} size={20} />{d.owner}</span></td>
                  <td className={cx('hide-sm', h.level === 'bad' && d.stage !== 'won' && daysTo(d.close) < 0 && 'tv-late')}>{closeNote(d)}</td>
                  <td className="hide-md"><HealthDot d={d} /> <span className="tv-hwhy">{h.level === 'ok' ? 'On track' : h.level === 'warn' ? 'Needs a nudge' : 'At risk'}</span></td>
                </tr>); })}
            </tbody>
            {rows.length > 0 && <tfoot><tr><td /><td><b>{rows.length} {rows.length === 1 ? 'deal' : 'deals'}</b></td><td className="td-muted">{open.length} open</td><td className="is-r tv-amt">{fm.m(sum(rows))}</td><td className="is-r hide-md td-muted" colSpan={1} /><td className="hide-sm td-muted" colSpan={2}>{fm.m(weighted)} weighted open</td><td className="hide-md" /></tr></tfoot>}
          </table>
        </div>
      </Panel>
      {sel.length > picked.length && <Pill>{sel.length - picked.length} selected deals hidden by filters</Pill>}
    </>
  );
}
