'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart, Button, Delta, Donut, Icon, PageHeader, Panel, Pill, Preview, Progress, Segmented, Shell, Sparkline, Tabs, PALETTE, cx, useWidth, type NavEntry } from './_dash';
import { ACCTS, CATS, MONTHS, SEED, TODAY, acctOf, addDays, balances, dShort, dailyTotal, dueLabel, inOut, money, moneyWhole, monthly, spendBy, type Bill, type Tx } from './_fin';
import { ActionDialog, Drawer, TxTable, type Draft, type Mode, type SortKey } from './_fin-ui';

type TabId = 'all' | 'in' | 'out' | 'pending';
const OTHER = 'color-mix(in srgb, var(--ink, #15130e) 24%, transparent)';
const idNum = (t: Tx) => +t.id.slice(1);

export default function FinanceDashboard({ brand = 'Tarn' }: { brand?: string }) {
  const [txs, setTxs] = useState<Tx[]>(SEED.txs);
  const [bills, setBills] = useState<Bill[]>(SEED.bills);
  const [tab, setTab] = useState<TabId>('all');
  const [q, setQ] = useState(''); const [cat, setCat] = useState('all'); const [acct, setAcct] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'date', dir: -1 });
  const [sel, setSel] = useState<string | null>(null); const [mode, setMode] = useState<Mode | null>(null);
  const [months, setMonths] = useState<'6' | '8'>('8'); const [span, setSpan] = useState<'1' | '3' | '8'>('1');
  const [msg, setMsg] = useState(''); const [active, setActive] = useState('overview');
  const [root, rw] = useWidth<HTMLDivElement>(); const [spk, sw] = useWidth<HTMLDivElement>();
  const drawer = useRef<HTMLElement | null>(null); const inited = useRef(false);
  const wide = rw >= 890;

  useEffect(() => { if (!inited.current && rw > 0) { inited.current = true; if (wide) setSel(SEED.txs.find((t) => t.status === 'pending')?.id ?? null); } }, [rw, wide]);

  const bal = useMemo(() => balances(txs, SEED.opening), [txs]);
  const total = ACCTS.reduce((a, x) => a + bal[x.id]!, 0);
  const daily = useMemo(() => dailyTotal(txs, total, 31), [txs, total]);
  const change = total - daily[0]!; const pct = (change / daily[0]!) * 100;
  const pend = useMemo(() => { let i = 0, o = 0; for (const t of txs) if (t.status === 'pending') { if (t.amt > 0) i += t.amt; else o += t.amt; } return { i, o, n: txs.filter((t) => t.status === 'pending').length }; }, [txs]);
  const { inn, out } = useMemo(() => monthly(txs), [txs]);
  const k = months === '6' ? 6 : 8; const mi = inn.slice(8 - k), mo = out.slice(8 - k);
  const cfIn = mi.reduce((a, b) => a + b, 0), cfOut = mo.reduce((a, b) => a + b, 0);
  const spend = useMemo(() => spendBy(txs, +span), [txs, span]);
  const spendTotal = spend.reduce((a, s) => a + s.value, 0);
  const parts = useMemo(() => { const top = spend.slice(0, 5); const rest = spend.slice(5).reduce((a, s) => a + s.value, 0); return [...top.map((s, i) => ({ ...s, color: PALETTE[i]! })), ...(rest ? [{ label: 'Other', value: rest, color: OTHER }] : [])]; }, [spend]);

  /* transactions: filters -> tab counts -> tab -> sort */
  const base = useMemo(() => {
    const s = q.trim().toLowerCase();
    return txs.filter((t) => (!acct || t.acct === acct) && (cat === 'all' || t.cat === cat) && (!s || `${t.name} ${t.memo} ${t.cat} ${t.ref} ${acctOf(t.acct).name} ${money(t.amt)}`.toLowerCase().includes(s)));
  }, [txs, q, cat, acct]);
  const tabs = [{ id: 'all' as const, label: 'All', count: base.length }, { id: 'in' as const, label: 'Income', count: base.filter((t) => t.kind === 'in').length }, { id: 'out' as const, label: 'Expenses', count: base.filter((t) => t.kind === 'out').length }, { id: 'pending' as const, label: 'Pending', count: base.filter((t) => t.status === 'pending').length }];
  const rows = useMemo(() => {
    const r = base.filter((t) => tab === 'all' || (tab === 'in' ? t.kind === 'in' : tab === 'out' ? t.kind === 'out' : t.status === 'pending'));
    return r.sort((a, b) => sort.dir * (sort.key === 'amt' ? a.amt - b.amt || idNum(a) - idNum(b) : a.date.localeCompare(b.date) || idNum(a) - idNum(b)));
  }, [base, tab, sort]);
  const sum = inOut(rows); const cur = sel ? txs.find((t) => t.id === sel) ?? null : null;
  const filtered = q || cat !== 'all' || acct;

  const say = (m: string) => setMsg(m);
  const patch = (id: string, f: (t: Tx) => Tx) => setTxs((a) => a.map((t) => (t.id === id ? f(t) : t)));
  const approve = (id: string) => { const t = txs.find((x) => x.id === id)!; patch(id, (x) => ({ ...x, status: 'posted', was: undefined, log: [...x.log, `Approved on ${dShort(TODAY)}`] })); say(`${t.name} approved. ${acctOf(t.acct).name} balance ${t.amt > 0 ? 'increased' : 'decreased'} by ${money(Math.abs(t.amt))}.`); };
  const flag = (id: string) => { const t = txs.find((x) => x.id === id)!; if (t.status === 'flagged') { patch(id, (x) => ({ ...x, status: x.was ?? 'pending', was: undefined, log: [...x.log, 'Flag cleared'] })); say(`Flag cleared on ${t.name}.`); } else { patch(id, (x) => ({ ...x, was: x.status, status: 'flagged', log: [...x.log, `Flagged for review on ${dShort(TODAY)}`] })); say(`${t.name} flagged for review.`); } };
  const mk = (n: number, o: Partial<Tx> & Pick<Tx, 'name' | 'amt' | 'acct'>): Tx => ({ id: `t${n}`, date: TODAY, cat: 'Transfer', status: 'posted', kind: o.amt > 0 ? 'in' : 'out', method: 'ACH', ref: `ACH-${70000 + n * 37}`, memo: '', log: [`Created on ${dShort(TODAY)}`], ...o });
  const pay = (b: Bill) => { const n = txs.length + 1; setTxs((a) => [...a, mk(n, { name: b.name, cat: b.cat, acct: 'ops', amt: -b.amt, memo: 'Bill payment', log: [`Paid on ${dShort(TODAY)}`] })]); setBills((a) => a.map((x) => (x.id === b.id ? { ...x, paid: TODAY } : x))); say(`${b.name} paid, ${money(b.amt)} from Operating.`); };
  const submit = (d: Draft) => {
    const c = +d.amt, n = txs.length + 1; let made: Tx[];
    if (d.mode === 'transfer') made = [mk(n, { name: `Transfer to ${acctOf(d.to).name}`, amt: -c, acct: d.from, kind: 'xfer', method: 'Transfer', memo: `To ${acctOf(d.to).name} ••${acctOf(d.to).mask}` }), mk(n + 1, { name: `Transfer from ${acctOf(d.from).name}`, amt: c, acct: d.to, kind: 'xfer', method: 'Transfer', memo: `From ${acctOf(d.from).name} ••${acctOf(d.from).mask}` })];
    else if (d.mode === 'send') made = [mk(n, { name: d.party.trim(), cat: d.cat, amt: -c, acct: d.from, status: 'pending', memo: d.memo || 'Outgoing payment', log: ['Submitted, waiting for approval'] })];
    else made = [mk(n, { name: d.party.trim(), cat: 'Customer payments', amt: c, acct: d.from, status: 'pending', memo: d.memo || 'Payment request', log: ['Request sent, waiting for payment'] })];
    setTxs((a) => [...a, ...made]); setMode(null); setTab('all'); setQ(''); setCat('all'); setAcct(null); setSort({ key: 'date', dir: -1 }); setSel(made[0]!.id);
    say(d.mode === 'transfer' ? `${money(c)} moved to ${acctOf(d.to).name}.` : d.mode === 'send' ? `Payment of ${money(c)} to ${d.party.trim()} is pending approval.` : `Request for ${money(c)} sent to ${d.party.trim()}.`);
  };
  const open = (id: string) => { setSel(id); if (!wide) setTimeout(() => { drawer.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); drawer.current?.focus({ preventScroll: true }); }, 30); };
  const close = () => { const id = sel; setSel(null); setTimeout(() => (root.current?.querySelector(`[data-row="${id}"]`) as HTMLElement | null)?.focus(), 0); };
  const goto = (id: string) => { setActive(id); const el = root.current?.querySelector(`#tf-${id}`) as HTMLElement | null; const r = window.matchMedia('(prefers-reduced-motion: reduce)').matches; el?.scrollIntoView({ block: 'start', behavior: r ? 'auto' : 'smooth' }); };
  const byCategory = (label: string) => { if (label === 'Other') return; setCat(label); setTab('all'); goto('tx'); say(`Showing ${label} transactions.`); };
  const exportCsv = () => {
    try {
      const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
      const body = ['Date,Description,Category,Account,Status,Amount', ...rows.map((t) => [t.date, esc(t.name), esc(t.cat), esc(acctOf(t.acct).name), t.status, (t.amt / 100).toFixed(2)].join(','))].join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' })); a.download = 'transactions.csv'; a.click(); URL.revokeObjectURL(a.href); say(`Exported ${rows.length} transactions.`);
    } catch { say('Export is not available in this view.'); }
  };

  const unpaid = bills.filter((b) => !b.paid); const dueSum = unpaid.reduce((a, b) => a + b.amt, 0);
  const NAV: NavEntry[] = [{ id: 'overview', label: 'Overview', icon: 'home' }, { id: 'accounts', label: 'Accounts', icon: 'dollar' }, { id: 'tx', label: 'Transactions', icon: 'list', badge: pend.n || undefined }, { id: 'bills', label: 'Bills', icon: 'calendar', badge: unpaid.length || undefined }, { id: 'insights', label: 'Insights', icon: 'chart' }];
  const [dollars, cents] = money(total).split('.');
  const sorted = [...bills].sort((a, b) => (a.paid ? 1 : 0) - (b.paid ? 1 : 0) || a.due.localeCompare(b.due));
  const spkTone = change >= 0 ? 'signal' : 'bad';

  return (
    <Shell brand={brand} nav={NAV} active={active} onNav={goto} title="Overview" crumbs={[brand, 'Wren & Pike Studio', 'Overview']} searchHint="Search transactions" user={{ name: 'Mara Okafor', role: 'Owner' }}>
      <div className="tf-wrap" ref={root} id="tf-overview">
        <PageHeader title="Overview" sub={`Wren & Pike Studio · USD · as of ${dShort(TODAY)}, 2026`}><Button icon="file" onClick={exportCsv}>Export CSV</Button></PageHeader>

        <section className="td-panel tf-hero" aria-label="Balance and cash flow">
          <div className="tf-bal">
            <span className="tf-lbl">Total balance <i>·</i> {ACCTS.length} accounts</span>
            <b className="tf-fig" aria-label={money(total)}>{dollars}<span>.{cents}</span></b>
            <div className="tf-chg"><Delta value={pct} /><span>{moneyWhole(change, true)} since {dShort(addDays(TODAY, -30))}</span></div>
            <div className="tf-spk" ref={spk}>{sw > 0 && <Sparkline data={daily} width={sw} height={64} tone={spkTone} />}</div>
            <div className="tf-spk-x"><span>{dShort(addDays(TODAY, -30))}</span><span>Low {moneyWhole(Math.min(...daily))} · High {moneyWhole(Math.max(...daily))}</span><span>Today</span></div>
            <div className="tf-pend"><span>Pending</span><b className="is-in">{moneyWhole(pend.i, true)}</b> in<i>·</i><b>{moneyWhole(pend.o)}</b> out<small>{pend.n} waiting</small></div>
            <div className="tf-acts"><Button variant="primary" icon="send" onClick={() => setMode('send')}>Send</Button><Button icon="arrowdown" onClick={() => setMode('request')}>Request</Button><Button icon="plus" onClick={() => setMode('transfer')}>Transfer</Button></div>
          </div>
          <div className="tf-cf" id="tf-insights">
            <div className="tf-cf-h">
              <div><h2>Cash flow</h2><p>Money in vs out per month, posted</p></div>
              <Segmented label="Months shown" value={months} onChange={setMonths} options={[{ id: '6', label: '6 mo' }, { id: '8', label: '8 mo' }]} />
            </div>
            <div className="tf-net"><div><small>Net, {MONTHS[8 - k]}–{MONTHS[7]}</small><b className={cfIn + cfOut >= 0 ? 'is-in' : undefined}>{moneyWhole(cfIn + cfOut, true)}</b></div><div><small>In</small><b>{moneyWhole(cfIn)}</b></div><div><small>Out</small><b>{moneyWhole(-cfOut)}</b></div><div className="hide-sm"><small>Avg monthly net</small><b>{moneyWhole((cfIn + cfOut) / k, true)}</b></div></div>
            <div className="tf-legend"><span><i className="is-in" />Money in</span><span><i className="is-out" />Money out</span><em>{MONTHS[7]} is month to date</em></div>
            <BarChart ariaLabel={`Money in and out by month, ${MONTHS[8 - k]} to ${MONTHS[7]} 2026`} labels={MONTHS.slice(8 - k)} height={176} format={(v) => `$${v >= 1000 ? Math.round(v / 1000) + 'k' : Math.round(v)}`} series={[{ id: 'in', label: 'Money in', data: mi.map((v) => Math.round(v / 100)), color: 'var(--signal, #0f766e)' }, { id: 'out', label: 'Money out', data: mo.map((v) => Math.round(v / 100)), color: 'color-mix(in srgb, var(--ink, #15130e) 50%, transparent)' }]} />
          </div>
        </section>

        <div className="tf-accts" id="tf-accounts" role="group" aria-label="Accounts, select one to filter transactions">
          {ACCTS.map((a) => (
            <button key={a.id} type="button" className="tf-acct" aria-pressed={acct === a.id} onClick={() => { setAcct(acct === a.id ? null : a.id); say(acct === a.id ? 'Showing all accounts.' : `Showing ${a.name} transactions.`); }}>
              <span className="tf-acct-t"><b>{a.name}</b>{a.primary && <Pill tone="accent" dot={false}>Primary</Pill>}</span>
              <small>{a.type} <span className="td-mono">••{a.mask}</span></small>
              <strong>{money(bal[a.id]!)}</strong>
              <span className="tf-acct-s"><Progress value={bal[a.id]! / total} tone="signal" label={`${a.name} share of total`} /><em>{Math.round((bal[a.id]! / total) * 100)}%</em></span>
            </button>
          ))}
        </div>

        <section className="td-panel tf-tx" id="tf-tx" aria-labelledby="tf-tx-t">
          <header className="td-panel-h"><div><h2 id="tf-tx-t">Transactions</h2><p>{rows.length} shown{filtered ? ' (filtered)' : ''} · click a row for details</p></div></header>
          <Tabs label="Transaction type" value={tab} tabs={tabs} onChange={setTab} />
          <div className="tf-bar">
            <label className="tf-search"><Icon name="search" size={14} /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, memo, amount" aria-label="Search transactions" /></label>
            <label className="tf-select"><span className="td-sr">Category</span><select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category"><option value="all">All categories</option>{CATS.map((c) => <option key={c} value={c}>{c}</option>)}</select><Icon name="down" size={12} /></label>
            {acct && <button type="button" className="tf-chip" onClick={() => setAcct(null)} aria-label={`Remove account filter ${acctOf(acct).name}`}>{acctOf(acct).name} ••{acctOf(acct).mask}<Icon name="x" size={11} /></button>}
            {filtered && <Button variant="ghost" small onClick={() => { setQ(''); setCat('all'); setAcct(null); }}>Clear filters</Button>}
          </div>
          <div className={cx('tf-body', (cur || wide) && 'has-drawer')}>
            <div className="tf-main">
              <TxTable rows={rows} sel={sel} onSel={open} sort={sort} onSort={(key) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: -1 }))} empty={filtered || tab !== 'all' ? 'No transactions match these filters.' : 'No transactions yet.'} />
              <div className="tf-sum"><span>{rows.length} transactions</span><span>In <b className="is-in">{money(sum.i, true)}</b></span><span>Out <b>{money(sum.o)}</b></span><span>Net <b>{money(sum.net, true)}</b></span><small className="hide-sm">Transfers between accounts are not counted</small></div>
            </div>
            {(cur || wide) && <Drawer t={cur} onClose={close} onApprove={approve} onFlag={flag} bodyRef={drawer} />}
          </div>
        </section>

        <div className="tf-row">
          <Panel id="tf-b" title="Upcoming bills" sub={unpaid.length ? `${unpaid.length} due · ${money(dueSum)} from Operating` : 'All caught up'} actions={<span className="tf-avail">Available <b>{money(bal.ops!)}</b></span>}>
            <ul className="tf-bills" id="tf-bills">
              {sorted.map((b) => (
                <li key={b.id} className={cx(b.paid && 'is-paid')}>
                  <span className="tf-bm" aria-hidden="true"><b>{dShort(b.due).split(' ')[0]}</b>{dShort(b.due).split(' ')[1]}</span>
                  <span className="tf-bn"><b>{b.name}</b><small>{b.paid ? `Paid ${dShort(b.paid)}` : dueLabel(b.due)} · {b.cat}</small></span>
                  <span className="tf-ba">{money(b.amt)}</span>
                  {b.paid ? <Pill tone="ok">Paid</Pill> : <Button small disabled={b.amt > bal.ops!} label={`Pay ${b.name}, ${money(b.amt)}`} onClick={() => pay(b)}>Pay</Button>}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel id="tf-c" title="Spend by category" sub={`${span === '1' ? 'October to date' : `Last ${span} months`} · ${moneyWhole(spendTotal)} out`} actions={<Segmented label="Period" value={span} onChange={setSpan} options={[{ id: '1', label: 'Oct' }, { id: '3', label: '3 mo' }, { id: '8', label: '8 mo' }]} />}>
            <div className="tf-spend">
              <Donut ariaLabel={`Spend by category, ${moneyWhole(spendTotal)} total`} size={140} parts={parts.map((p) => ({ ...p, value: Math.round(p.value / 100) }))} center={<><b className="tf-dc">{moneyWhole(spendTotal)}</b><small className="td-muted">spent</small></>} />
              <ul className="tf-legendl">{parts.map((p) => <li key={p.label}><button type="button" disabled={p.label === 'Other'} aria-pressed={cat === p.label} onClick={() => byCategory(p.label)} aria-label={`${p.label}, ${moneyWhole(p.value)}, ${Math.round((p.value / spendTotal) * 100)}%. Show transactions`}><i style={{ background: p.color }} /><span>{p.label}</span><b>{moneyWhole(p.value)}</b><em>{Math.round((p.value / spendTotal) * 100)}%</em></button></li>)}</ul>
            </div>
          </Panel>
        </div>
      </div>
      {mode && <ActionDialog mode={mode} balances={bal} onClose={() => setMode(null)} onSubmit={submit} />}
      <div className="td-sr" role="status" aria-live="polite">{msg}</div>
    </Shell>
  );
}

export function Demo() { return <Preview w={1280} h={150}><FinanceDashboard /></Preview>; }
