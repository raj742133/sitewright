'use client';
import { useMemo, useState } from 'react';
import { Bars, Mini, money, useMounted, useReducedMotion, type Pt2 } from './_d8';

export interface FinTx { id: string; name: string; category: string; amount: number; date: string }
export interface FinBudget { category: string; spent: number; limit: number }
export interface FinCard { holder: string; last4: string; expiry: string; network?: string }
export interface FinanceDashboardProps {
  title?: string;
  balance?: number;
  change?: number;
  months?: Pt2[];
  transactions?: FinTx[];
  budgets?: FinBudget[];
  card?: FinCard;
  className?: string;
}

const MONTHS: Pt2[] = [
  { label: 'May', a: 5200, b: 3900 }, { label: 'Jun', a: 5200, b: 4350 }, { label: 'Jul', a: 5900, b: 4100 },
  { label: 'Aug', a: 5200, b: 4880 }, { label: 'Sep', a: 6400, b: 4200 }, { label: 'Oct', a: 5200, b: 3760 },
];
const TX: FinTx[] = [
  { id: 't1', name: 'Studio salary', category: 'Income', amount: 5200, date: 'Oct 25' },
  { id: 't2', name: 'Greenfield Market', category: 'Groceries', amount: -86.4, date: 'Oct 24' },
  { id: 't3', name: 'City Transit pass', category: 'Transport', amount: -64, date: 'Oct 23' },
  { id: 't4', name: 'Harbour Bistro', category: 'Dining', amount: -48.2, date: 'Oct 22' },
  { id: 't5', name: 'Freelance invoice 118', category: 'Income', amount: 840, date: 'Oct 21' },
  { id: 't6', name: 'Corner Grocer', category: 'Groceries', amount: -32.75, date: 'Oct 20' },
  { id: 't7', name: 'Ride share', category: 'Transport', amount: -18.9, date: 'Oct 19' },
  { id: 't8', name: 'Ramen Bar', category: 'Dining', amount: -22.5, date: 'Oct 18' },
];
const BUDGETS: FinBudget[] = [
  { category: 'Groceries', spent: 410, limit: 500 }, { category: 'Dining', spent: 285, limit: 250 },
  { category: 'Transport', spent: 132, limit: 220 }, { category: 'Leisure', spent: 96, limit: 180 },
];
const CARD: FinCard = { holder: 'A. Moreau', last4: '4821', expiry: '09/28', network: 'Pay' };
const signed = (n: number) => (n < 0 ? '−' : '+') + money(Math.abs(n)) + (Math.abs(n) % 1 ? '' : '');

/** Personal finance block: balance, income vs expense bars, filterable transactions, budget progress and a card widget with reveal. */
export default function FinanceDashboard({ title = 'Ledger', balance = 18420.55, change = 3.2, months = MONTHS, transactions = TX, budgets = BUDGETS, card = CARD, className }: FinanceDashboardProps) {
  const mounted = useMounted();
  const reduced = useReducedMotion();
  const cats = useMemo(() => ['All', ...Array.from(new Set(transactions.map((t) => t.category)))], [transactions]);
  const [cat, setCat] = useState('All');
  const [show, setShow] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const list = transactions.filter((t) => cat === 'All' || t.category === cat);
  const net = list.reduce((s, t) => s + t.amount, 0);
  return (
    <section className={`ui-finance-dashboard ${className ?? ''}`} aria-label={`${title} finance dashboard`}>
      <div className="ui-finance-dashboard-grid">
        <div className="ui-finance-dashboard-balance">
          <span>Total balance</span>
          <b>{money(Math.floor(balance))}<small>.{String(Math.round((balance % 1) * 100)).padStart(2, '0')}</small></b>
          <em><span aria-hidden="true">▲</span> {change}% this month</em>
          <div className="ui-finance-dashboard-quick">
            <button type="button">Send</button><button type="button">Request</button><button type="button">Top up</button>
          </div>
        </div>
        <section className="ui-finance-dashboard-card ui-finance-dashboard-chart" aria-labelledby="fd-ie">
          <div className="ui-finance-dashboard-row"><h3 id="fd-ie">Income vs expenses</h3>
            <span className="ui-finance-dashboard-legend" aria-hidden="true"><span><i />Income</span><span><i data-s="b" />Expenses</span></span></div>
          <Bars data={months} aName="Income" bName="Expenses" fmt={(n) => money(n)} title="Monthly income and expenses for the last six months" ca="var(--ok, #16a34a)" cb="var(--signal, #f59e0b)" height={160} />
        </section>
        <section className="ui-finance-dashboard-card ui-finance-dashboard-tx" aria-labelledby="fd-tx">
          <h3 id="fd-tx">Transactions</h3>
          <div className="ui-finance-dashboard-chips" role="group" aria-label="Filter by category">
            {cats.map((c) => <button key={c} type="button" aria-pressed={c === cat} onClick={() => setCat(c)}>{c}</button>)}
          </div>
          <ul>
            {list.map((t) => (
              <li key={t.id}>
                <span className="ui-finance-dashboard-ico" aria-hidden="true">{t.name.slice(0, 1)}</span>
                <span className="ui-finance-dashboard-name"><b>{t.name}</b><small>{t.category} · {t.date}</small></span>
                <span className="ui-finance-dashboard-amt" data-in={t.amount > 0 ? 'true' : undefined}>{signed(t.amount)}</span>
              </li>
            ))}
          </ul>
          <p className="ui-finance-dashboard-sum" aria-live="polite">{list.length} transactions, net {signed(net)}</p>
        </section>
        <section className="ui-finance-dashboard-card ui-finance-dashboard-bud" aria-labelledby="fd-bud">
          <h3 id="fd-bud">Budgets</h3>
          <ul>
            {budgets.map((b) => {
              const pct = Math.min(100, Math.round((b.spent / b.limit) * 100));
              const over = b.spent > b.limit;
              return (
                <li key={b.category} data-over={over ? 'true' : undefined}>
                  <div><b>{b.category}</b><span>{money(b.spent)} of {money(b.limit)}{over && <strong> · over by {money(b.spent - b.limit)}</strong>}</span></div>
                  <div className="ui-finance-dashboard-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${b.category} budget used`}><i style={{ width: mounted || reduced ? `${pct}%` : '0%' }} /></div>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="ui-finance-dashboard-cardw" aria-label="Debit card">
          <div className="ui-finance-dashboard-plastic" data-frozen={frozen ? 'true' : undefined}>
            <div className="ui-finance-dashboard-chip" aria-hidden="true" />
            <span className="ui-finance-dashboard-net">{card.network ?? 'Pay'}</span>
            <b aria-live="polite">{show ? `4821 0933 7715 ${card.last4}` : `•••• •••• •••• ${card.last4}`}</b>
            <div><span>{card.holder}</span><span>{show ? card.expiry : '••/••'}</span></div>
            {frozen && <em>Frozen</em>}
          </div>
          <div className="ui-finance-dashboard-cardbtns">
            <button type="button" aria-pressed={show} onClick={() => setShow((s) => !s)}>{show ? 'Hide details' : 'Show details'}</button>
            <button type="button" aria-pressed={frozen} onClick={() => setFrozen((s) => !s)}>{frozen ? 'Unfreeze' : 'Freeze card'}</button>
          </div>
        </section>
      </div>
    </section>
  );
}

export function Demo() {
  return <Mini w={1000}><FinanceDashboard /></Mini>;
}
