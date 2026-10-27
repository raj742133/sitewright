'use client';
// The Overview: balance and cash flow, accounts, a recent-transactions preview, the bills due soon and spend by category.
import { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart, Button, Delta, Donut, PageHeader, Panel, Pill, Progress, Segmented, Sparkline, PALETTE, cx } from './_dash';
import { ACCTS, MONTHS, TODAY, addDays, dShort, dailyTotal, dueLabel, money, moneyWhole, monthly, spendBy, type Bill, type Tx } from './_fin';
import { Ledger } from './_fin-ledger';
import type { Mode } from './_fin-ui';

const OTHER = 'color-mix(in srgb, var(--ink, #15130e) 24%, transparent)';
export interface OverProps { txs: Tx[]; bills: Bill[]; bal: Record<string, number>; total: number; compose: (m: Mode) => void; goAcct: (id: string) => void; goTx: (id: string | null, tab?: 'pending') => void; goBills: () => void; goCat: (c: string) => void; pay: (b: Bill) => void; exportCsv: () => void }

export function OverviewView({ txs, bills, bal, total, compose, goAcct, goTx, goBills, goCat, pay, exportCsv }: OverProps) {
  const [months, setMonths] = useState<'6' | '8'>('8'); const [span, setSpan] = useState<'1' | '3' | '8'>('1');
  const spk = useRef<HTMLDivElement>(null); const [box, setBox] = useState({ w: 0, h: 64 });
  useEffect(() => { const el = spk.current; if (!el) return; const f = () => setBox({ w: Math.round(el.clientWidth), h: Math.max(64, Math.min(150, Math.round(el.clientHeight))) }); f(); const ro = new ResizeObserver(f); ro.observe(el); return () => ro.disconnect(); }, []);
  const daily = useMemo(() => dailyTotal(txs, total, 31), [txs, total]);
  const change = total - daily[0]!; const pct = (change / daily[0]!) * 100;
  const pend = useMemo(() => { let i = 0, o = 0, n = 0; for (const t of txs) if (t.status === 'pending') { n++; if (t.amt > 0) i += t.amt; else o += t.amt; } return { i, o, n }; }, [txs]);
  const { inn, out } = useMemo(() => monthly(txs), [txs]);
  const k = months === '6' ? 6 : 8; const mi = inn.slice(8 - k), mo = out.slice(8 - k);
  const cfIn = mi.reduce((a, b) => a + b, 0), cfOut = mo.reduce((a, b) => a + b, 0), cfNet = cfIn - cfOut;
  const spend = useMemo(() => spendBy(txs, +span), [txs, span]); const spendTotal = spend.reduce((a, s) => a + s.value, 0);
  const parts = useMemo(() => { const top = spend.slice(0, 5); const rest = spend.slice(5).reduce((a, s) => a + s.value, 0); return [...top.map((s, i) => ({ ...s, color: PALETTE[i]! })), ...(rest ? [{ label: 'Other', value: rest, color: OTHER }] : [])]; }, [spend]);
  const recent = useMemo(() => [...txs].sort((a, b) => b.date.localeCompare(a.date) || +b.id.slice(1) - +a.id.slice(1)).slice(0, 8), [txs]);
  const horizon = addDays(TODAY, 14);
  const soon = bills.filter((b) => (!b.paid && b.due <= horizon) || b.paid === TODAY).sort((a, b) => (a.paid ? 1 : 0) - (b.paid ? 1 : 0) || a.due.localeCompare(b.due));
  const dueRows = soon.filter((b) => !b.paid), dueSum = dueRows.reduce((a, b) => a + b.amt, 0);
  const [dollars, cents] = money(total).split('.'); const spkTone = change >= 0 ? 'signal' : 'bad';
  return (
    <div className="tf-wrap">
      <PageHeader title="Overview" sub={`Wren & Pike Studio · USD · as of ${dShort(TODAY)}, 2026`}><Button icon="file" onClick={exportCsv}>Export CSV</Button></PageHeader>

        <section className="td-panel tf-hero" aria-label="Balance and cash flow">
          <div className="tf-bal">
            <span className="tf-lbl">Total balance <i>·</i> {ACCTS.length} accounts</span>
            <b className="tf-fig" aria-label={money(total)}>{dollars}<span>.{cents}</span></b>
            <div className="tf-chg"><Delta value={pct} /><span>{moneyWhole(change, true)} since {dShort(addDays(TODAY, -30))}</span></div>
            <div className="tf-spk" ref={spk}>{box.w > 0 && <Sparkline data={daily} width={box.w} height={box.h} tone={spkTone} />}</div>
            <div className="tf-spk-x"><span>{dShort(addDays(TODAY, -30))}</span><span>Low {moneyWhole(Math.min(...daily))} · High {moneyWhole(Math.max(...daily))}</span><span>Today</span></div>
            <div className="tf-pend"><span>Pending</span><b className="is-in">{moneyWhole(pend.i, true)}</b> in<i>·</i><b>{moneyWhole(pend.o)}</b> out<small>{pend.n} waiting</small></div>
            <div className="tf-acts"><Button variant="primary" icon="send" onClick={() => compose('send')}>Send</Button><Button icon="arrowdown" onClick={() => compose('request')}>Request</Button><Button icon="plus" onClick={() => compose('transfer')}>Transfer</Button></div>
          </div>
          <div className="tf-cf">
            <div className="tf-cf-h">
              <div><h2>Cash flow</h2><p>Money in vs out per month, posted</p></div>
              <Segmented label="Months shown" value={months} onChange={setMonths} options={[{ id: '6', label: '6 mo' }, { id: '8', label: '8 mo' }]} />
            </div>
            <div className="tf-net"><div><small>Net, {MONTHS[8 - k]}–{MONTHS[7]}</small><b className={cfNet >= 0 ? 'is-in' : undefined}>{moneyWhole(cfNet, true)}</b></div><div><small>In</small><b>{moneyWhole(cfIn)}</b></div><div><small>Out</small><b>{moneyWhole(cfOut)}</b></div><div className="hide-md"><small>Avg monthly net</small><b>{moneyWhole(cfNet / k, true)}</b></div></div>
            <div className="tf-legend"><span><i className="is-in" />Money in</span><span><i className="is-out" />Money out</span><em>{MONTHS[7]} is month to date</em></div>
            <BarChart ariaLabel={`Money in and out by month, ${MONTHS[8 - k]} to ${MONTHS[7]} 2026`} labels={MONTHS.slice(8 - k)} height={176} format={(v) => `$${v >= 1000 ? Math.round(v / 1000) + 'k' : Math.round(v)}`} series={[{ id: 'in', label: 'Money in', data: mi.map((v) => Math.round(v / 100)), color: 'var(--signal, #0f766e)' }, { id: 'out', label: 'Money out', data: mo.map((v) => Math.round(v / 100)), color: 'color-mix(in srgb, var(--ink, #15130e) 50%, transparent)' }]} />
          </div>
        </section>


        <div className="tf-accts" role="group" aria-label="Accounts, select one to open it">
          {ACCTS.map((a) => (
            <button key={a.id} type="button" className="tf-acct" onClick={() => goAcct(a.id)} aria-label={`${a.name}, ${money(bal[a.id]!)}. Open account`}>
              <span className="tf-acct-t"><b>{a.name}</b>{a.primary && <Pill tone="accent" dot={false}>Primary</Pill>}</span>
              <small>{a.type} <span className="td-mono">••{a.mask}</span></small>
              <strong>{money(bal[a.id]!)}</strong>
              <span className="tf-acct-s"><Progress value={bal[a.id]! / total} tone="signal" label={`${a.name} share of total`} /><em>{Math.round((bal[a.id]! / total) * 100)}%</em></span>
            </button>
          ))}
        </div>

        <section className="td-panel tf-tx" aria-labelledby="tf-tx-t">
          <header className="td-panel-h"><div><h2 id="tf-tx-t">Recent transactions</h2><p>Latest {recent.length} of {txs.length} · click a row to open it</p></div><div className="td-panel-a">{pend.n > 0 && <Button small onClick={() => goTx(null, 'pending')}>{pend.n} pending approval</Button>}<Button small variant="ghost" onClick={() => goTx(null)}>View all</Button></div></header>
          <div className="tf-prev"><Ledger rows={recent} sel={null} onOpen={(id) => goTx(id)} empty="No transactions yet." caption="Recent transactions" /></div>
        </section>

        <div className="tf-row">
          <Panel id="tf-b" title="Bills due soon" sub={dueRows.length ? `${dueRows.length} due by ${dShort(horizon)} · ${money(dueSum)} from Operating` : 'All caught up'} actions={<Button small variant="ghost" onClick={goBills}>All bills</Button>}>
            <ul className="tf-bills" id="tf-bills">
              {soon.map((b) => (
                <li key={b.id} className={cx(b.paid && 'is-paid')}>
                  <span className="tf-bm" aria-hidden="true"><b>{dShort(b.due).split(' ')[0]}</b>{dShort(b.due).split(' ')[1]}</span>
                  <span className="tf-bn"><b>{b.name}</b><small>{b.paid ? `Paid ${dShort(b.paid)}` : b.auto ? `Autopay · ${dueLabel(b.due).toLowerCase()}` : b.sched ? `Scheduled ${dShort(b.sched)}` : dueLabel(b.due)} · {b.cat}</small></span>
                  <span className="tf-ba">{money(b.amt)}</span>
                  {b.paid ? <Pill tone="ok">Paid</Pill> : <Button small disabled={b.amt > bal.ops!} label={`Pay ${b.name}, ${money(b.amt)}`} onClick={() => pay(b)}>Pay</Button>}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel id="tf-c" title="Spend by category" sub={`${span === '1' ? 'October to date' : `Last ${span} months`} · ${moneyWhole(spendTotal)} out`} actions={<Segmented label="Period" value={span} onChange={setSpan} options={[{ id: '1', label: 'Oct' }, { id: '3', label: '3 mo' }, { id: '8', label: '8 mo' }]} />}>
            <div className="tf-spend">
              <Donut ariaLabel={`Spend by category, ${moneyWhole(spendTotal)} total`} size={140} parts={parts.map((p) => ({ ...p, value: Math.round(p.value / 100) }))} center={<><b className="tf-dc">{moneyWhole(spendTotal)}</b><small className="td-muted">spent</small></>} />
              <ul className="tf-legendl">{parts.map((p) => <li key={p.label}><button type="button" disabled={p.label === 'Other'} onClick={() => goCat(p.label)} aria-label={`${p.label}, ${moneyWhole(p.value)}, ${Math.round((p.value / spendTotal) * 100)}%. Show transactions`}><i style={{ background: p.color }} /><span>{p.label}</span><b>{moneyWhole(p.value)}</b><em>{Math.round((p.value / spendTotal) * 100)}%</em></button></li>)}</ul>
            </div>
          </Panel>
        </div>
    </div>
  );
}
