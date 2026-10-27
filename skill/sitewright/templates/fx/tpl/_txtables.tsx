'use client';
// Tables: a schema browser. A list of tables with row counts, and for the selected one its columns, sample rows, relationships,
// the analyses that read it, and a way into Ask with a question already typed.
import { useMemo, useState, type KeyboardEvent } from 'react';
import { Button, Glyph, Pill, Segmented, Table, cx, fmt, type Col } from './_dash';
import { SCHEMA, byName, incoming, outgoing, usedBy, type Column } from './_txschema';
import { Ic, SearchBox, copyText } from './_txui';
import type { Notify } from './_txresults';

export function TablesView({ sel, onSel, onAsk, onResult, notify }: { sel: string; onSel: (t: string) => void; onAsk: (t: string) => void; onResult: (rid: string) => void; notify: Notify }) {
  const [q, setQ] = useState(''); const [sort, setSort] = useState<'name' | 'rows'>('name'); const [pane, setPane] = useState<'list' | 'detail'>('list'); const [cq, setCq] = useState('');
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return SCHEMA.filter((t) => !n || `${t.name} ${t.desc} ${t.cols.map((c) => c.n).join(' ')}`.toLowerCase().includes(n)).sort((a, b) => (sort === 'rows' ? b.rows - a.rows : a.name.localeCompare(b.name)));
  }, [q, sort]);
  const t = byName(sel) ?? SCHEMA[0]!;
  const out = outgoing(t); const inc = incoming(t); const used = usedBy(t.name);
  const cols = useMemo(() => t.cols.filter((c) => !cq.trim() || `${c.n} ${c.t} ${c.d}`.toLowerCase().includes(cq.trim().toLowerCase())), [t, cq]);
  const pick = (n: string) => { onSel(n); setPane('detail'); setCq(''); };
  const key = (e: KeyboardEvent<HTMLUListElement>) => {
    const i = list.findIndex((x) => x.name === t.name); const n = e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? list.length - 1 : -1;
    if (n < 0 || !list.length) return; e.preventDefault(); const nx = list[Math.max(0, Math.min(list.length - 1, n))]!; onSel(nx.name); (e.currentTarget.querySelector(`[data-t="${nx.name}"]`) as HTMLElement | null)?.focus();
  };
  const colDefs: Array<Col<Column>> = [
    { id: 'n', label: 'Column', sort: (a, b) => a.n.localeCompare(b.n), cell: (c) => <span className="tt-cn"><code>{c.n}</code>{c.pk && <Pill tone="accent" dot={false}>PK</Pill>}{c.ref && <Pill tone="info" dot={false}>FK</Pill>}</span> },
    { id: 't', label: 'Type', sort: (a, b) => a.t.localeCompare(b.t), cell: (c) => <code className="tt-ty">{c.t}{c.nul ? ' null' : ''}</code>, hideBelow: 'sm' },
    { id: 'd', label: 'Description', cell: (c) => <span>{c.d}{c.ref && <small className="tt-ref"> References {c.ref}</small>}</span> },
  ];
  return (
    <div className="tt" data-pane={pane}>
      <section className="tt-list" aria-label="Tables">
        <div className="tt-lh"><h1 data-vh tabIndex={-1}>Tables</h1><p>{SCHEMA.length} tables, {fmt.n(SCHEMA.reduce((a, x) => a + x.rows, 0))} rows</p></div>
        <div className="tt-lc"><SearchBox value={q} onChange={setQ} label="Search tables and columns" placeholder="Search tables or columns" /><Segmented label="Sort tables" value={sort} onChange={setSort} options={[{ id: 'name', label: 'Name' }, { id: 'rows', label: 'Rows' }]} /></div>
        <ul role="listbox" aria-label="Tables" onKeyDown={key}>
          {list.map((x) => (
            <li key={x.name} role="option" aria-selected={x.name === t.name} data-t={x.name} tabIndex={x.name === t.name ? 0 : -1} className={cx(x.name === t.name && 'is-sel')} onClick={() => pick(x.name)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(x.name); } }}>
              <Ic name="table" size={14} /><span><code>{x.name}</code><small>{x.desc.split('.')[0]}</small></span><em>{fmt.n(x.rows)}</em>
            </li>
          ))}
          {!list.length && <li className="tt-none" role="presentation">No table or column matches “{q}”.</li>}
        </ul>
      </section>
      <section className="tt-det" aria-label={`Table ${t.name}`} data-scroll>
        <button type="button" className="tv-back tt-back" onClick={() => setPane('list')}><Ic name="back" size={14} />All tables</button>
        <header className="tt-dh">
          <div><h2><code>{t.name}</code></h2><p>{t.desc}</p></div>
          <div className="tt-da"><Button small icon="file" onClick={async () => notify(await copyText(`SELECT * FROM ${t.name} LIMIT 100;`) ? 'Copied a SELECT for ' + t.name : 'Copy is blocked in this browser')}>Copy SELECT</Button><Button variant="primary" small icon="sparkle" onClick={() => onAsk(t.name)}>Ask about this table</Button></div>
        </header>
        <dl className="tt-stats"><div><dt>Rows</dt><dd>{fmt.n(t.rows)}</dd></div><div><dt>Columns</dt><dd>{t.cols.length}</dd></div><div><dt>Size</dt><dd>{t.size}</dd></div><div><dt>Updated</dt><dd>{t.updated}</dd></div></dl>
        <section className="tx-sec" aria-label="Columns">
          <div className="tx-sh"><h3>Columns</h3><SearchBox className="is-sm" value={cq} onChange={setCq} label={`Filter columns of ${t.name}`} placeholder="Filter columns" /></div>
          <Table caption={`Columns of ${t.name}`} cols={colDefs} rows={cols} rowKey={(c) => c.n} empty={`No column matches “${cq}”.`} />
        </section>
        <section className="tx-sec" aria-label="Sample rows">
          <div className="tx-sh"><h3>Sample rows</h3><span>{t.sample.length} of {fmt.n(t.rows)}</span></div>
          <div className="td-tablewrap"><table className="td-table tt-sample"><caption className="td-sr">Sample rows of {t.name}</caption><thead><tr>{t.cols.map((c) => <th key={c.n} scope="col">{c.n}</th>)}</tr></thead><tbody>{t.sample.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}><code>{v}</code></td>)}</tr>)}</tbody></table></div>
        </section>
        <section className="tx-sec" aria-label="Relationships">
          <div className="tx-sh"><h3>Relationships</h3><span>{out.length + inc.length} links</span></div>
          {out.length + inc.length === 0 ? <p className="tt-none">This table has no foreign keys.</p> : (
            <ul className="tt-rel">
              {out.map((o) => <li key={`o${o.col}`}><code>{t.name}.{o.col}</code><Ic name="arrowr" size={13} /><button type="button" onClick={() => pick(o.to)}><code>{o.to}.{o.toCol}</code></button><small>many to one</small></li>)}
              {inc.map((o) => <li key={`i${o.from}${o.col}`}><button type="button" onClick={() => pick(o.from)}><code>{o.from}.{o.col}</code></button><Ic name="arrowr" size={13} /><code>{t.name}.{o.toCol}</code><small>one to many</small></li>)}
            </ul>
          )}
        </section>
        <section className="tx-sec" aria-label="Used by">
          <div className="tx-sh"><h3>Read by analyses</h3><span>{used.length}</span></div>
          {used.length ? <ul className="tx-rows">{used.map((r) => <li key={r.id}><button type="button" onClick={() => onResult(r.id)}><Glyph name={r.icon} size={14} /><span>{r.title}</span><small>{r.period.split(' (')[0]!.split(',')[0]}</small></button></li>)}</ul> : <p className="tt-none">No analysis reads this table yet.</p>}
        </section>
      </section>
    </div>
  );
}
