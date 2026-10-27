'use client';
// Orders: status tabs, filters, sortable table with a due-date column, and a detail drawer with line items and the start / ready / ship actions.
import { useMemo, useState, type RefObject } from 'react';
import { Button, Empty, Kpi, Pill, Tabs, cx, fmt } from './_dash';
import { NEXT, dateLabel, money, stationName } from './_ops';
import { CUSTOMERS, STATUS_LABEL, isLate, units, value, type D, type Ops, type Order } from './_opsstate';
import { Grid, Modal, SearchBox, Select, StatusPill, ViewHeader, dueInfo, type GCol } from './_opsui';

type Tab = 'open' | 'new' | 'production' | 'ready' | 'shipped' | 'late';
const kind = (o: Order) => (isLate(o) ? 'late' : o.status);
export const nextAction = (o: Order) => (o.status === 'new' ? 'Start' : o.status === 'production' ? 'Mark ready' : o.status === 'ready' ? 'Ship' : null);
export function runAction(o: Order, ops: Ops) { if (o.status === 'new') ops.A.start(o.id); else if (o.status === 'production') ops.A.ready(o.id); else if (o.status === 'ready') ops.A.ship(o.id); }

export function OrderDrawer({ id, ops, onClose }: { id: string; ops: Ops; onClose: () => void }) {
  const o = ops.s.orders.find((x) => x.id === id); if (!o) return null;
  const due = dueInfo(o.due, o.status === 'shipped'), act = nextAction(o), nx = o.stage ? NEXT[o.stage] : null;
  const blocked = o.stage ? !!ops.s.blocks[o.stage] || ops.s.crew[o.stage].length === 0 : false;
  const steps = [['Placed', dateLabel(o.placed), true], ['Started', o.status === 'new' ? 'Not started' : 'In queue', o.status !== 'new'], ['Ready', o.status === 'ready' || o.status === 'shipped' ? 'Packed' : 'Pending', o.status === 'ready' || o.status === 'shipped'], ['Shipped', o.shippedOn !== undefined ? dateLabel(o.shippedOn) : 'Pending', o.status === 'shipped']] as const;
  return (
    <Modal drawer id="to-ord" title={`${o.id} · ${o.customer}`} sub={`${units(o)} units · ${money(value(o))}`} onClose={onClose}
      footer={<>
        <span className="to-foot-n">{blocked && o.stage ? `${stationName(o.stage)} is blocked` : ''}</span>
        {o.status === 'production' && nx && <Button disabled={blocked} onClick={() => ops.A.advance(o.id)}>Move to {stationName(nx)}</Button>}
        {act && <Button variant="primary" onClick={() => runAction(o, ops)}>{act}</Button>}
      </>}>
      <div className="to-meta">
        <div><span>Status</span><StatusPill status={kind(o)} />{isLate(o) && <Pill tone="neutral" dot={false}>{STATUS_LABEL[o.status]}</Pill>}</div>
        <div><span>Due</span><b>{dateLabel(o.due)}</b><Pill tone={due.tone}>{due.label}</Pill></div>
        <div><span>Station</span><b>{o.stage ? stationName(o.stage) : o.status === 'new' ? 'Not queued' : o.status === 'ready' ? 'Dispatch bay' : 'Gone'}</b></div>
      </div>
      <ol className="to-steps" aria-label="Order progress">{steps.map(([n, t, done]) => <li key={n} className={cx(done && 'is-done')}><i aria-hidden="true" /><b>{n}</b><small>{t}</small></li>)}</ol>
      <h3 className="to-h3">Line items</h3>
      <table className="td-table to-lines"><caption className="td-sr">Line items of {o.id}</caption>
        <thead><tr><th scope="col">Model</th><th scope="col" className="is-r">Qty</th><th scope="col" className="is-r hide-sm">Unit</th><th scope="col" className="is-r">Total</th></tr></thead>
        <tbody>{o.lines.map((l) => <tr key={l.model}><td>{l.model}</td><td className="is-r">{l.qty}</td><td className="is-r hide-sm td-muted">{money(l.price)}</td><td className="is-r">{money(l.qty * l.price)}</td></tr>)}</tbody>
        <tfoot><tr><td>Total</td><td className="is-r">{units(o)}</td><td className="hide-sm" /><td className="is-r">{money(value(o))}</td></tr></tfoot>
      </table>
      {o.note && <p className="to-note-l"><b>Note</b>{o.note}</p>}
    </Modal>
  );
}

export function OrdersView({ ops, d, hRef, open, setOpen }: { ops: Ops; d: D; hRef: RefObject<HTMLHeadingElement | null>; open: string | null; setOpen: (id: string) => void }) {
  const [tab, setTab] = useState<Tab>('open'); const [q, setQ] = useState(''); const [cust, setCust] = useState('all'); const [win, setWin] = useState<'any' | 'late' | 'today' | '3' | '7'>('any');
  const all = ops.s.orders;
  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: 'open', label: 'Open', count: d.open.length }, { id: 'new', label: 'New', count: all.filter((o) => o.status === 'new').length }, { id: 'production', label: 'In production', count: all.filter((o) => o.status === 'production').length },
    { id: 'ready', label: 'Ready', count: all.filter((o) => o.status === 'ready').length }, { id: 'shipped', label: 'Shipped', count: all.filter((o) => o.status === 'shipped').length }, { id: 'late', label: 'Late', count: d.late.length },
  ];
  const rows = useMemo(() => all.filter((o) => (tab === 'open' ? o.status !== 'shipped' : tab === 'late' ? isLate(o) : o.status === tab) && (cust === 'all' || o.customer === cust)
    && (win === 'any' || (o.status !== 'shipped' && (win === 'late' ? o.due < 0 : win === 'today' ? o.due === 0 : o.due >= 0 && o.due <= Number(win))))
    && (!q.trim() || `${o.id} ${o.customer} ${o.lines.map((l) => l.model).join(' ')}`.toLowerCase().includes(q.trim().toLowerCase()))), [all, tab, cust, win, q]);
  const filtered = tab !== 'open' || q || cust !== 'all' || win !== 'any';
  const cols: Array<GCol<Order>> = [
    { id: 'id', label: 'Order', sort: (a, b) => a.id.localeCompare(b.id), cell: (o) => <div className="td-cellmain"><div><button type="button" className="to-link" onClick={() => setOpen(o.id)} aria-label={`Open order ${o.id}, ${o.customer}`}><b>{o.id}</b></button><small>{o.customer}</small></div></div> },
    { id: 'items', label: 'Items', hide: 'md', cell: (o) => <span className="td-muted">{o.lines.map((l) => `${l.qty} ${l.model}`).join(', ').slice(0, 44)}</span> },
    { id: 'units', label: 'Units', right: true, hide: 'sm', sort: (a, b) => units(a) - units(b), cell: (o) => units(o) },
    { id: 'value', label: 'Value', right: true, hide: 'md', sort: (a, b) => value(a) - value(b), cell: (o) => money(value(o)) },
    { id: 'due', label: 'Due', sort: (a, b) => a.due - b.due, cell: (o) => { const i = dueInfo(o.due, o.status === 'shipped'); return <span className="to-due"><span>{dateLabel(o.due)}</span><Pill tone={i.tone} dot={false}>{o.status === 'shipped' ? (o.shippedOn! > o.due ? 'Shipped late' : 'On time') : i.label}</Pill></span>; } },
    { id: 'status', label: 'Status', sort: (a, b) => a.status.localeCompare(b.status), cell: (o) => <StatusPill status={kind(o)} /> },
    { id: 'stage', label: 'Station', hide: 'sm', cell: (o) => <span className="td-muted">{o.stage ? stationName(o.stage) : '–'}</span> },
    { id: 'act', label: 'Action', right: true, cell: (o) => { const a = nextAction(o); return a ? <Button small variant={o.status === 'ready' ? 'primary' : 'default'} label={`${a} ${o.id}`} onClick={() => runAction(o, ops)}>{a}</Button> : <span className="td-muted">Done</span>; } },
  ];
  const openValue = d.open.reduce((a, o) => a + value(o), 0);
  return (
    <>
      <ViewHeader hRef={hRef} title="Orders" sub={`${d.open.length} open · ${d.late.length} late · ${fmt.n(d.dueToday)} units due today`} />
      <div className="td-kpis">
        <Kpi label="Open orders" value={String(d.open.length)} hint={`${fmt.n(d.open.reduce((a, o) => a + units(o), 0))} units`} />
        <Kpi label="Late" value={String(d.late.length)} goodWhen="down" hint={d.late.length ? `${fmt.n(d.late.reduce((a, o) => a + units(o), 0))} units past due` : 'nothing past due'} tone="signal" />
        <Kpi label="In production" value={fmt.n(d.stations.reduce((a, s) => a + s.q, 0))} hint={`units across ${d.stations.filter((s) => s.q > 0).length} stations`} />
        <Kpi label="Open order value" value={money(openValue)} hint={`${fmt.p(d.onTime)} shipped on time`} tone="signal" />
      </div>
      <section className="td-panel" aria-label="Order list">
        <div className="to-tabbar"><Tabs label="Order status" value={tab} tabs={tabs} onChange={setTab} /></div>
        <div className="to-bar-t to-bar-f">
          <SearchBox value={q} onChange={setQ} label="Search orders" placeholder="Search orders" />
          <Select label="Customer" value={cust} onChange={setCust} options={[{ id: 'all', label: 'All customers' }, ...[...CUSTOMERS].sort().map((c) => ({ id: c, label: c }))]} />
          <Select label="Due window" value={win} onChange={setWin} options={[{ id: 'any', label: 'Any due date' }, { id: 'late', label: 'Overdue' }, { id: 'today', label: 'Due today' }, { id: '3', label: 'Next 3 days' }, { id: '7', label: 'Next 7 days' }]} />
          {filtered && <Button variant="ghost" small onClick={() => { setTab('open'); setQ(''); setCust('all'); setWin('any'); }}>Clear filters</Button>}
          <span className="to-sel" role="status">{rows.length} of {all.length} orders · {fmt.n(rows.reduce((a, o) => a + units(o), 0))} units</span>
        </div>
        <Grid cols={cols} rows={rows} rowKey={(o) => o.id} selected={open} caption={`Orders, ${rows.length} shown. Column headers sort the table.`} initial={{ id: 'due', dir: 1 }}
          empty={<Empty title="No orders match" text="Try another status tab, or clear the filters." />} />
      </section>
    </>
  );
}
