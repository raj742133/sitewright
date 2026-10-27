'use client';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { AreaChart, Delta, Panel, Segmented, fmt } from './_dash';
import { getAudience, getSite, type CohortSet } from './_an-data';
import { Head, RangeSeg, SearchBox, SplitBar, type ViewProps } from './_an-ui';

type Sort = 'visitors' | 'growth';

function Countries({ rows }: { rows: ReturnType<typeof getAudience>['countries'] }) {
  const [q, setQ] = useState(''); const [sort, setSort] = useState<Sort>('visitors');
  const max = Math.max(...rows.map((r) => r.value)); const total = rows.reduce((a, r) => a + r.value, 0);
  const shown = useMemo(() => {
    const other = rows[rows.length - 1]!; const list = rows.slice(0, -1).filter((r) => !q || r.label.toLowerCase().includes(q.toLowerCase()) || r.code!.toLowerCase() === q.toLowerCase());
    list.sort((a, b) => (sort === 'visitors' ? b.value - a.value : (b.delta ?? 0) - (a.delta ?? 0)));
    return q ? list : [...list, other];
  }, [rows, q, sort]);
  return (
    <Panel id="tau-c" title="Countries" sub={`${fmt.n(total)} visitors`} actions={<Segmented label="Sort countries" value={sort} onChange={setSort} options={[{ id: 'visitors', label: 'Visitors' }, { id: 'growth', label: 'Growth' }]} />}>
      <div className="ta-bar is-tight"><SearchBox value={q} onChange={setQ} label="Search countries" /></div>
      {shown.length === 0 ? <p className="ta-none">No country matches “{q}”.</p> : (
        <ul className="ta-geo">{shown.map((r) => (
          <li key={r.label}><i style={{ width: `${(r.value / max) * 100}%` }} /><kbd>{r.code}</kbd><span>{r.label}</span><b>{fmt.n(r.value)}</b><em>{fmt.p(r.value / total, 1)}</em><Delta value={r.delta ?? 0} /></li>
        ))}</ul>
      )}
    </Panel>
  );
}

function Cohorts({ set, range }: { set: CohortSet; range: string }) {
  const [mode, setMode] = useState<'pct' | 'n'>('pct'); const [cell, setCell] = useState({ r: 0, c: 0 });
  const unit = set.unit === 'week' ? 'Week' : 'Day'; const rows = set.rows;
  const shade = (p: number) => `color-mix(in srgb, var(--primary, #c2410c) ${Math.round(8 + p * 64)}%, var(--raised, #fff))`;
  const move = (e: KeyboardEvent<HTMLTableElement>) => {
    const d = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] }[e.key]; if (!d) return; e.preventDefault();
    const r = Math.max(0, Math.min(rows.length - 1, cell.r + d[0]!)); const c = Math.max(0, Math.min(rows[r]!.ret.length - 1, cell.c + d[1]!));
    const tbl = e.currentTarget; setCell({ r, c }); requestAnimationFrame(() => (tbl.querySelector(`[data-cell="${r}-${c}"]`) as HTMLElement | null)?.focus());
  };
  const cr = rows[Math.min(cell.r, rows.length - 1)]!; const cv = cr.ret[Math.min(cell.c, cr.ret.length - 1)]!;
  return (
    <Panel id="tau-h" title="Cohort retention" sub={`New visitors grouped by their first ${set.unit}, and how many came back (${range} window)`} actions={<Segmented label="Retention values" value={mode} onChange={setMode} options={[{ id: 'pct', label: '% retained' }, { id: 'n', label: 'Visitors' }]} />}>
      <div className="td-tablewrap">
        <table className="ta-heat" role="grid" aria-label={`Retention by ${set.unit}ly cohort`} onKeyDown={move}>
          <thead><tr><th scope="col">Cohort</th><th scope="col" className="r">New</th>{set.cols.map((c, j) => <th key={c} scope="col" className="r" title={`${unit} ${j}`}>{c}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={row.label}><th scope="row">{row.label}</th><td className="r">{fmt.n(row.size)}</td>
                {set.cols.map((c, j) => { const v = row.ret[j]; if (v === undefined) return <td key={c} className="ta-void" />; const p = v / row.size; const on = cell.r === r && cell.c === j;
                  return <td key={c} style={{ background: shade(p) }} className={on ? 'is-on' : undefined}><button type="button" data-cell={`${r}-${j}`} tabIndex={on ? 0 : -1} aria-label={`${row.label} cohort, ${unit.toLowerCase()} ${j}: ${fmt.p(p, 0)}, ${fmt.n(v)} of ${fmt.n(row.size)} visitors`} onFocus={() => setCell({ r, c: j })} onMouseEnter={() => setCell({ r, c: j })}>{mode === 'pct' ? fmt.p(p, 0) : fmt.n(v)}</button></td>; })}
              </tr>
            ))}
          </tbody>
          <tfoot><tr><th scope="row">Average</th><td />{set.cols.map((c, j) => <td key={c} className="r">{fmt.p(set.avg[j]!, 0)}</td>)}</tr></tfoot>
        </table>
      </div>
      <p className="ta-readout" aria-live="off"><b>{cr.label}</b> cohort · {fmt.n(cr.size)} new visitors · {unit.toLowerCase()} {cell.c}: <b>{fmt.p(cv / cr.size, 1)}</b> ({fmt.n(cv)} visitors)</p>
      <div className="ta-ramp" aria-hidden="true"><span>0%</span><i /><span>100%</span></div>
    </Panel>
  );
}

export default function AudienceView({ range, setRange, focus }: ViewProps) {
  const site = getSite(range); const a = getAudience(range); const share = a.retTotal / site.visitors;
  return (
    <>
      <Head title="Audience" sub={`Who visits fieldnote.dev · last ${site.n} days`} focus={focus}><RangeSeg value={range} onChange={setRange} /></Head>
      <div className="ta-row2">
        <Countries rows={a.countries} />
        <Panel id="tau-n" title="New vs returning" sub="Unique visitors per day">
          <div className="ta-nr"><div><small>New</small><b>{fmt.n(a.newTotal)}</b><em>{fmt.p(1 - share, 0)}</em></div><div><small>Returning</small><b>{fmt.n(a.retTotal)}</b><em>{fmt.p(share, 0)}</em></div></div>
          <AreaChart ariaLabel={`New and returning visitors per day over the last ${site.n} days`} labels={site.labels} height={236} stacked series={[{ id: 'n', label: 'New', data: a.newDaily }, { id: 'r', label: 'Returning', data: a.retDaily, color: 'var(--signal, #0f766e)' }]} />
        </Panel>
      </div>
      <div className="ta-row3">
        <Panel id="tau-b" title="Browsers"><SplitBar label="Visitors by browser" parts={a.browsers} /></Panel>
        <Panel id="tau-o" title="Operating systems"><SplitBar label="Visitors by operating system" parts={a.os} /></Panel>
        <Panel id="tau-d" title="Devices"><SplitBar label="Visitors by device" parts={a.devices} /></Panel>
      </div>
      <Cohorts set={a.cohorts} range={`${site.n}-day`} />
    </>
  );
}
