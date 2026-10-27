'use client';
// The Transactions view: the full ledger with filters, a date range, multi-select with bulk actions, a detail drawer and pending approvals.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Glyph, PageHeader, Segmented, Tabs, cx } from './_dash';
import { ACCTS, CATS, IN_CATS, OUT_CATS, TODAY, acctOf, addDays, inOut, money, type Tx } from './_fin';
import { Ledger, type SortKey } from './_fin-ledger';
import { Drawer } from './_fin-ui';
import { Modal, SearchBox, SelectBox } from './_fin-kit';

export type TxTab = 'all' | 'in' | 'out' | 'xfer' | 'pending' | 'flagged';
export interface TxUi { tab: TxTab; q: string; cat: string; acct: string; from: string; to: string; sel: string | null }
export const TX_UI0: TxUi = { tab: 'all', q: '', cat: 'all', acct: 'all', from: '', to: '', sel: null };
export interface TxActions { approve: (ids: string[]) => void; flag: (id: string) => void; setCat: (ids: string[], cat: string) => void; exportRows: (rows: Tx[], name: string) => void; send: () => void }
const idNum = (t: Tx) => +t.id.slice(1);
const PRESETS: Array<{ id: string; label: string; from: string; to: string }> = [{ id: '7d', label: '7 days', from: addDays(TODAY, -6), to: TODAY }, { id: '30d', label: '30 days', from: addDays(TODAY, -29), to: TODAY }, { id: 'mtd', label: 'October', from: '2026-10-01', to: TODAY }, { id: '90d', label: '90 days', from: addDays(TODAY, -89), to: TODAY }, { id: 'all', label: 'All', from: '', to: '' }];

export function TransactionsView({ txs, ui, setUi, act, wide }: { txs: Tx[]; ui: TxUi; setUi: (p: Partial<TxUi>) => void; act: TxActions; wide: boolean }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'date', dir: -1 });
  const [checked, setChecked] = useState<Set<string>>(new Set()); const [bulk, setBulk] = useState(''); const [limit, setLimit] = useState(60);
  const [confirm, setConfirm] = useState(false);
  const drawer = useRef<HTMLElement | null>(null); const wrap = useRef<HTMLDivElement>(null);
  const { tab, q, cat, acct, from, to, sel } = ui;
  const bad = !!from && !!to && from > to;
  const preset = PRESETS.find((p) => p.from === from && p.to === to)?.id ?? 'custom';

  const base = useMemo(() => {
    const s = q.trim().toLowerCase();
    return txs.filter((t) => (acct === 'all' || t.acct === acct) && (cat === 'all' || t.cat === cat) && !bad && (!from || t.date >= from) && (!to || t.date <= to) && (!s || `${t.name} ${t.memo} ${t.cat} ${t.ref} ${acctOf(t.acct).name} ${money(t.amt)}`.toLowerCase().includes(s)));
  }, [txs, q, cat, acct, from, to, bad]);
  const match = (t: Tx, k: TxTab) => k === 'all' || (k === 'in' ? t.kind === 'in' : k === 'out' ? t.kind === 'out' : k === 'xfer' ? t.kind === 'xfer' : t.status === k);
  const tabs = (['all', 'in', 'out', 'xfer', 'pending', 'flagged'] as const).map((id) => ({ id, label: { all: 'All', in: 'Income', out: 'Expenses', xfer: 'Transfers', pending: 'Pending', flagged: 'Flagged' }[id], count: base.filter((t) => match(t, id)).length }));
  const rows = useMemo(() => base.filter((t) => match(t, tab)).sort((a, b) => sort.dir * (sort.key === 'amt' ? a.amt - b.amt || idNum(a) - idNum(b) : a.date.localeCompare(b.date) || idNum(a) - idNum(b))), [base, tab, sort]);
  const shown = rows.slice(0, limit);
  const chosen = rows.filter((t) => checked.has(t.id));
  const sum = inOut(rows), csum = inOut(chosen);
  const cur = sel ? txs.find((t) => t.id === sel) ?? null : null;
  const filterKey = `${tab}|${q}|${cat}|${acct}|${from}|${to}`;
  useEffect(() => { setLimit(60); }, [filterKey]);
  const filtered = !!q || cat !== 'all' || acct !== 'all' || !!from || !!to;
  const pend = txs.filter((t) => t.status === 'pending'), pendSum = inOut(pend);
  const chosenPend = chosen.filter((t) => t.status === 'pending');

  const open = (id: string) => { setUi({ sel: id }); if (!wide) setTimeout(() => drawer.current?.focus({ preventScroll: true }), 30); };
  const close = () => { const id = sel; setUi({ sel: null }); setTimeout(() => (wrap.current?.querySelector(`[data-row="${id}"]`) as HTMLElement | null)?.focus(), 0); };
  const clearAll = () => setUi({ q: '', cat: 'all', acct: 'all', from: '', to: '', tab: 'all' });
  const check = (id: string, on: boolean) => setChecked((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });
  const applyBulk = () => { if (!bulk) return; act.setCat(chosen.map((t) => t.id), bulk); setBulk(''); };
  const catOpts = [{ group: 'Income', items: IN_CATS.map((c) => [c, c] as [string, string]) }, { group: 'Expenses', items: OUT_CATS.map((c) => [c, c] as [string, string]) }];

  return (
    <div className="tf-wrap tf-txv" ref={wrap}>
      <PageHeader title="Transactions" sub={`${txs.length} transactions since Mar 1, 2026 · ${rows.length} shown`}>
        <Button icon="file" onClick={() => act.exportRows(chosen.length ? chosen : rows, 'transactions.csv')}>{chosen.length ? `Export ${chosen.length} selected` : 'Export CSV'}</Button>
        <Button variant="primary" icon="send" onClick={act.send}>New payment</Button>
      </PageHeader>

      {pend.length > 0 && (
        <section className="tf-approvals" aria-label="Pending approvals">
          <span className="tf-ap-i"><Glyph name="clock" size={16} /></span>
          <div><b>{pend.length} {pend.length === 1 ? 'payment is' : 'payments are'} waiting for approval</b><small>{money(pendSum.o)} out · {money(pendSum.i, true)} in transit. Approved items move the account balances.</small></div>
          <div className="tf-ap-a"><Button small onClick={() => setUi({ tab: 'pending', sel: null })}>Review</Button><Button small variant="primary" icon="check" onClick={() => setConfirm(true)}>Approve all</Button></div>
        </section>
      )}

      <section className="td-panel tf-tx" aria-label="Transaction ledger">
        <Tabs label="Transaction type" value={tab} tabs={tabs} onChange={(t) => setUi({ tab: t })} />
        <div className="tf-bar">
          <SearchBox value={q} onChange={(v) => setUi({ q: v })} placeholder="Search name, memo, reference, amount" label="Search transactions" />
          <SelectBox label="Filter by category" value={cat} onChange={(v) => setUi({ cat: v })} options={[['all', 'All categories'], ...CATS.map((c) => [c, c] as [string, string])]} />
          <SelectBox label="Filter by account" value={acct} onChange={(v) => setUi({ acct: v })} options={[['all', 'All accounts'], ...ACCTS.map((a) => [a.id, `${a.name} ••${a.mask}`] as [string, string])]} />
          {filtered && <Button variant="ghost" small onClick={clearAll}>Clear filters</Button>}
        </div>
        <div className="tf-bar tf-dates">
          <Segmented label="Date range" value={preset} onChange={(id) => { const p = PRESETS.find((x) => x.id === id)!; setUi({ from: p.from, to: p.to }); }} options={PRESETS.map((p) => ({ id: p.id, label: p.label }))} />
          <label className="tf-date-in"><span>From</span><input type="date" value={from} max={to || undefined} onChange={(e) => setUi({ from: e.target.value })} aria-invalid={bad || undefined} aria-describedby={bad ? 'tf-range-e' : undefined} /></label>
          <label className="tf-date-in"><span>To</span><input type="date" value={to} min={from || undefined} onChange={(e) => setUi({ to: e.target.value })} aria-invalid={bad || undefined} aria-describedby={bad ? 'tf-range-e' : undefined} /></label>
          {bad && <small id="tf-range-e" className="tf-fe" role="alert">The start date is after the end date.</small>}
        </div>
        {chosen.length > 0 && (
          <div className="tf-bulk" role="region" aria-label="Bulk actions">
            <b>{chosen.length} selected</b><span className="tf-bulk-n">net {money(csum.net, true)}</span>
            <SelectBox label="Categorise selected as" value={bulk} onChange={setBulk} options={[['', 'Categorise as...'], ...catOpts]} />
            <Button small disabled={!bulk} onClick={applyBulk}>Apply</Button>
            <Button small icon="file" onClick={() => act.exportRows(chosen, 'selected-transactions.csv')}>Export</Button>
            {chosenPend.length > 0 && <Button small icon="check" onClick={() => act.approve(chosenPend.map((t) => t.id))}>Approve {chosenPend.length}</Button>}
            <Button small variant="ghost" onClick={() => setChecked(new Set())}>Clear</Button>
          </div>
        )}
        <div className={cx('tf-body', wide && 'has-drawer')}>
          <div className="tf-main">
            <Ledger rows={shown} sel={sel} onOpen={open} sort={sort} onSort={(key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: -1 }))} checked={checked} onCheck={check} onCheckAll={(on) => setChecked(on ? new Set(rows.map((r) => r.id)) : new Set())} empty={filtered || tab !== 'all' ? 'No transactions match these filters.' : 'No transactions yet.'} />
            {rows.length > limit && <button type="button" className="tf-more" onClick={() => setLimit((l) => l + 60)}>Show {Math.min(60, rows.length - limit)} more ({rows.length - limit} not shown)</button>}
            <div className="tf-sum"><span>{rows.length} transactions</span><span>In <b className="is-in">{money(sum.i, true)}</b></span><span>Out <b>{money(sum.o)}</b></span><span>Net <b>{money(sum.net, true)}</b></span><small className="hide-sm">Transfers between accounts are not counted</small></div>
          </div>
          {wide && <Drawer t={cur} onClose={close} onApprove={(id) => act.approve([id])} onFlag={act.flag} onCat={(id, c) => act.setCat([id], c)} bodyRef={drawer} />}
        </div>
      </section>
      {!wide && cur && <><div className="tf-sheet-scrim" onClick={close} /><Drawer sheet t={cur} onClose={close} onApprove={(id) => act.approve([id])} onFlag={act.flag} onCat={(id, c) => act.setCat([id], c)} bodyRef={drawer} /></>}
      {confirm && (
        <Modal id="tf-appr" title="Approve all pending?" onClose={() => setConfirm(false)}>
          <p className="tf-hint">{pend.length} items will post today. Operating, Payroll and the other balances change right away: <b>{money(pendSum.o)}</b> out and <b>{money(pendSum.i, true)}</b> in. You can undo this from the message that follows.</p>
          <ul className="tf-mini">{pend.map((t) => <li key={t.id}><span>{t.name}</span><b>{money(t.amt, t.kind === 'in')}</b></li>)}</ul>
          <div className="tf-dlg-a"><Button onClick={() => setConfirm(false)}>Cancel</Button><Button variant="primary" icon="check" onClick={() => { setConfirm(false); act.approve(pend.map((t) => t.id)); }}>Approve {pend.length}</Button></div>
        </Modal>
      )}
    </div>
  );
}
