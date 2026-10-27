'use client';
// Pieces of the assistant workspace: the result panel (chart, table, summary, sources, query, export) and its empty state.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AreaChart, BarChart, Button, Donut, Glyph, Table, cx, fmt, useReducedMotion } from './_dash';
import { RESULT_ROWS, type Result } from './_txdata';
import { Ic, copyText, useTyped } from './_txui';

const SQL_RE = /(--[^\n]*|'[^']*'|\b(?:SELECT|FROM|JOIN|ON|WHERE|AND|GROUP BY|ORDER BY|LIMIT|AS|COUNT|SUM|AVG|MAX|DISTINCT|FILTER|OVER|DESC|IN|UNION ALL)\b|\b\d[\d.]*\b)/g;
function Sql({ code }: { code: string }) {
  return <code>{code.split(SQL_RE).map((p, i) => (i % 2 === 0 ? p : <span key={i} className={p.startsWith('--') ? 'tx-c' : p.startsWith("'") ? 'tx-s' : /^\d/.test(p) ? 'tx-n' : 'tx-k'}>{p}</span>))}</code>;
}
const q = (v: string | number) => (typeof v === 'number' ? String(v) : /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
export function toCsv(res: Result) {
  const rows = RESULT_ROWS[res.id]!;
  return [res.cols.map((c) => q(c.csv ?? c.label)).join(','), ...rows.map((r) => res.cols.map((c) => q(typeof r[c.id] === 'number' ? Math.round((r[c.id] as number) * 100) / 100 : r[c.id]!)).join(','))].join('\n') + '\n';
}
function download(res: Result) {
  const url = URL.createObjectURL(new Blob([toCsv(res)], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `${res.file}.csv`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** A button that flips its label for a moment after it worked. */
function useFlash(ms = 1800): [boolean, () => void] {
  const [on, setOn] = useState(false); const t = useRef(0);
  useEffect(() => () => window.clearTimeout(t.current), []);
  return [on, () => { setOn(true); window.clearTimeout(t.current); t.current = window.setTimeout(() => setOn(false), ms); }];
}

function ChartBlock({ c }: { c: Result['chart'] }) {
  return (
    <section className="tx-sec" aria-label={c.title}>
      <div className="tx-sh"><h3>{c.title}</h3><span>{c.unit}</span></div>
      {c.kind === 'area' && <AreaChart ariaLabel={c.aria} labels={c.labels} series={c.series} format={c.format} height={200} />}
      {c.kind === 'bar' && <BarChart ariaLabel={c.aria} labels={c.labels} series={c.series} format={c.format} height={200} />}
      {c.kind === 'donut' && <Donut ariaLabel={c.aria} parts={c.parts} size={140} center={<><b className="tx-donut-n">{c.center.value}</b><small className="td-muted">{c.center.label}</small></>} />}
    </section>
  );
}

export function ResultView({ res, seen, bare, actions, saved, onSave }: { res: Result; seen?: Set<string>; bare?: boolean; actions?: ReactNode; saved?: boolean; onSave?: () => void }) {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(true); const [copied, flashCopy] = useFlash(); const [exported, flashExp] = useFlash();
  const [fresh] = useState(() => !!seen && !seen.has(res.id));
  useEffect(() => { seen?.add(res.id); }, [seen, res.id]);
  const ty = useTyped(res.summary, fresh, reduced, 14);
  const rows = RESULT_ROWS[res.id]!; const h = res.headline;
  const acts = (
    <div className="tx-ra">
      {actions}
      {onSave && <button type="button" className={cx('td-btn is-sm', saved && 'tx-saved')} aria-pressed={saved} onClick={onSave}><Ic name="bookmark" size={14} fill={saved} />{saved ? 'Saved to Results' : 'Save to Results'}</button>}
      <Button icon="file" small onClick={() => { download(res); flashExp(); }}>{exported ? 'Exported' : 'Export CSV'}</Button>
    </div>
  );
  return (
    <div className="tx-rv">
      <header className={cx('tx-rh', bare && 'is-bare')}>
        {bare ? <p>{res.period}</p> : <div><h2>{res.title}</h2><p>{res.period}</p></div>}
        {acts}
      </header>
      <div className="tx-band">
        <div className="tx-head"><span>{h.label}</span><b>{h.value}</b>{h.delta !== undefined && <small className={cx('tx-d', (h.delta >= 0) === ((h.good ?? 'up') === 'up') ? 'is-good' : 'is-bad')}><Glyph name={h.delta >= 0 ? 'up' : 'arrowdown'} size={11} />{Math.abs(h.delta).toFixed(1)}%</small>}</div>
        <div className="tx-sum"><h3 className="td-sr">Summary</h3>
          <p aria-busy={!ty.done}>{ty.text}{!ty.done && <i className="tx-caret" aria-hidden="true" />}</p>
          <ul className={cx(!ty.done && 'is-wait')}>{res.insights.map((t) => <li key={t}>{t}</li>)}</ul></div>
      </div>
      <ChartBlock c={res.chart} />
      <section className="tx-sec" aria-label={`${res.tableTitle} table`}>
        <div className="tx-sh"><h3>{res.tableTitle}</h3><span>{rows.length} rows, click a header to sort</span></div>
        <Table caption={`${res.title}: ${res.tableTitle}`} cols={res.cols} rows={rows} rowKey={(r) => String(r[res.rowKey])} />
      </section>
      <section className="tx-sec tx-foot" aria-label="Sources and query">
        <div className="tx-src"><span className="tx-lab">Sources</span>{res.sources.map((s) => <span key={s.t} className="tx-tag"><Glyph name="layers" size={12} /><code>{s.t}</code><em>{fmt.n(s.rows)} rows</em></span>)}</div>
        <div className="tx-qrow">
          <button type="button" className="tx-qt" aria-expanded={open} aria-controls={`tx-q-${res.id}`} onClick={() => setOpen((o) => !o)}><Glyph name="chevron" size={13} className={cx('tx-chev', open && 'is-open')} />Query<span>SQL, {res.sql.split('\n').length} lines</span></button>
          <button type="button" className="td-btn is-sm is-ghost" onClick={async () => { if (await copyText(res.sql)) flashCopy(); }}><Ic name={copied ? 'check' : 'copy'} size={13} />{copied ? 'Copied' : 'Copy query'}</button>
        </div>
        {open && (
          <div className="tx-code" id={`tx-q-${res.id}`}>
            <div className="tx-code-h"><span>read-only · demo warehouse</span></div>
            <pre tabIndex={0} aria-label="SQL query"><Sql code={res.sql} /></pre>
          </div>
        )}
        <span className="td-sr" role="status">{copied ? 'Query copied to clipboard' : exported ? `Exported ${rows.length} rows as CSV` : ''}</span>
      </section>
    </div>
  );
}

export function Skeleton({ step }: { step: string }) {
  return (
    <div className="tx-rv tx-sk" aria-hidden="true">
      <div className="tx-sk-l" style={{ width: '38%', height: 20 }} /><div className="tx-sk-l" style={{ width: '24%' }} />
      <div className="tx-sk-b"><div className="tx-sk-l" style={{ width: 120, height: 32 }} /><div style={{ flex: 1, display: 'grid', gap: 8 }}><div className="tx-sk-l" /><div className="tx-sk-l" style={{ width: '88%' }} /><div className="tx-sk-l" style={{ width: '70%' }} /></div></div>
      <div className="tx-sk-l" style={{ height: 180 }} /><div className="tx-sk-l" /><div className="tx-sk-l" /><div className="tx-sk-l" />
      <p className="tx-sk-s"><i />{step}…</p>
    </div>
  );
}
