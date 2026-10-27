// Data and arithmetic for the finance dashboard. Everything on screen (balances, the 30-day line, cash flow, spend by category,
// the tallies) is derived from the transaction rows below, so the numbers can never disagree. Amounts are integer cents.
import { seeded } from './_dash';

export type Status = 'posted' | 'pending' | 'flagged';
export type Kind = 'in' | 'out' | 'xfer';
export interface Acct { id: string; name: string; type: string; mask: string; primary?: boolean; target: number }
export interface Tx { id: string; date: string; name: string; cat: string; acct: string; amt: number; status: Status; was?: Status; kind: Kind; method: string; ref: string; memo: string; log: string[] }
export interface Bill { id: string; name: string; due: string; amt: number; cat: string; paid?: string }

export const TODAY = '2026-10-24';
export const MONTHS = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
export const ACCTS: Acct[] = [
  { id: 'ops', name: 'Operating', type: 'Checking', mask: '4821', primary: true, target: 20843187 },
  { id: 'pay', name: 'Payroll', type: 'Checking', mask: '7730', target: 6124013 },
  { id: 'tax', name: 'Tax reserve', type: 'Savings', mask: '1294', target: 4721566 },
  { id: 'sav', name: 'Treasury', type: 'Treasury, 4.2% APY', mask: '9056', target: 15087430 },
];
export const IN_CATS = ['Customer payments', 'Stripe payouts', 'Interest'];
export const OUT_CATS = ['Payroll', 'Contractors', 'Software', 'Marketing', 'Rent & office', 'Travel & meals', 'Taxes & fees'];
export const CATS = [...IN_CATS, ...OUT_CATS, 'Transfer'];

/* ---- money formatting */
const grp = (n: number) => n.toLocaleString('en-US');
export const money = (c: number, sign = false) => `${c < 0 ? '−' : sign && c > 0 ? '+' : ''}$${grp(Math.floor(Math.abs(c) / 100))}.${String(Math.abs(c) % 100).padStart(2, '0')}`;
export const moneyWhole = (c: number, sign = false) => `${c < 0 ? '−' : sign && c > 0 ? '+' : ''}$${grp(Math.round(Math.abs(c) / 100))}`;
export const acctOf = (id: string) => ACCTS.find((a) => a.id === id)!;
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dShort = (iso: string) => `${MON[+iso.slice(5, 7) - 1]} ${+iso.slice(8, 10)}`;
export const dLong = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
export const dayDiff = (a: string, b: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 864e5);
export const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

/* ---- rows */
const counts = (t: Tx) => t.status === 'posted' || (t.status === 'flagged' && t.was === 'posted');
export const isPosted = counts;
export const balances = (txs: Tx[], opening: Record<string, number>) => {
  const b: Record<string, number> = { ...opening };
  for (const t of txs) if (counts(t)) b[t.acct] = (b[t.acct] ?? 0) + t.amt;
  return b;
};

let seq = 0;
function build(): { txs: Tx[]; opening: Record<string, number>; bills: Bill[] } {
  const r = seeded(2026), rows: Tx[] = [];
  const cents = (lo: number, hi: number, g = 1) => Math.round((lo + r() * (hi - lo)) * g * 100);
  const add = (m: number, day: number, name: string, cat: string, acct: string, amt: number, method: string, memo: string, kind?: Kind, status: Status = 'posted') => {
    const date = `2026-${String(m + 3).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (date > TODAY) return;
    const k = kind ?? (amt > 0 ? 'in' : 'out'); const n = ++seq;
    rows.push({ id: `t${n}`, date, name, cat, acct, amt, status, kind: k, method, memo, ref: `${method === 'Card' ? 'AUTH' : method === 'Wire' ? 'WIR' : method === 'Transfer' ? 'XFR' : 'ACH'}-${(70000 + ((n * 7919) % 29000)).toString()}`, log: [status === 'pending' ? 'Submitted, waiting for approval' : status === 'flagged' ? 'Flagged by the card monitor' : `Posted ${dShort(date)}`] });
  };
  for (let m = 0; m < 8; m++) {
    const g = 1 + m * 0.034, base = 29400 + m * 600;
    add(m, 1, 'Hollis & Park Properties', 'Rent & office', 'ops', -680000, 'ACH', 'Studio lease, Pearl St.');
    add(m, 2, 'Amazon Web Services', 'Software', 'ops', -cents(3600, 4700, g), 'Card', 'Cloud hosting');
    add(m, 3, 'Google Workspace', 'Software', 'ops', -cents(930, 990), 'Card', '24 seats');
    add(m, 4, 'Stripe payout', 'Stripe payouts', 'ops', cents(21000, 27000, g), 'ACH', 'Card sales, 3 days');
    add(m, 5, 'Linear', 'Software', 'ops', -64000, 'Card', 'Team plan');
    add(m, 6, 'Meta Ads', 'Marketing', 'ops', -cents(3200, 6400), 'Card', 'Campaign spend');
    add(m, 9, 'Northwind Design Studio', 'Contractors', 'ops', -cents(4200, 5200), 'ACH', 'Brand and web design');
    add(m, 11, 'Brightline Logistics', 'Customer payments', 'ops', cents(17500, 19500), 'Wire', `Invoice INV-${1040 + m}`);
    add(m, 11, 'Transfer to Payroll', 'Transfer', 'ops', -base * 2 * 100 - 25000, 'Transfer', 'Covers the month\'s runs', 'xfer');
    add(m, 11, 'Transfer from Operating', 'Transfer', 'pay', base * 2 * 100 + 25000, 'Transfer', 'Covers the month\'s runs', 'xfer');
    add(m, 11, 'Transfer to Tax reserve', 'Transfer', 'ops', -800000, 'Transfer', 'Monthly set-aside', 'xfer');
    add(m, 11, 'Transfer from Operating', 'Transfer', 'tax', 800000, 'Transfer', 'Monthly set-aside', 'xfer');
    add(m, 12, 'Delta Air Lines', 'Travel & meals', 'ops', -cents(380, 960), 'Card', 'Client visit');
    add(m, 13, 'Gusto payroll', 'Payroll', 'pay', -base * 100, 'ACH', 'Payroll run, 1 of 2');
    if (m % 2 === 0) add(m, 17, 'Marriott', 'Travel & meals', 'ops', -cents(280, 720), 'Card', 'Two nights');
    add(m, 18, 'Stripe payout', 'Stripe payouts', 'ops', cents(23000, 29000, g), 'ACH', 'Card sales, 3 days');
    add(m, 20, 'Ridgeline Dev Collective', 'Contractors', 'ops', -cents(5200, 7400), 'ACH', 'Sprint invoice');
    add(m, 21, 'Orchard Health Network', 'Customer payments', 'ops', 1450000, 'ACH', 'Monthly retainer');
    add(m, 22, 'Blue Bottle Coffee', 'Travel & meals', 'ops', -cents(48, 130), 'Card', 'Team coffee');
    add(m, 26, 'Comcast Business', 'Rent & office', 'ops', -28900, 'ACH', 'Internet');
    add(m, 26, 'Kestrel Capital', 'Customer payments', 'ops', 900000, 'ACH', 'Advisory retainer');
    add(m, 27, 'Gusto payroll', 'Payroll', 'pay', -base * 100 - 0, 'ACH', 'Payroll run, 2 of 2');
    add(m, 28, 'Stripe payout', 'Stripe payouts', 'ops', cents(20000, 26000, g), 'ACH', 'Card sales, 3 days');
    add(m, 28, 'Treasury interest', 'Interest', 'sav', cents(480, 640), 'ACH', 'Monthly interest');
    add(m, 29, 'Chubb', 'Rent & office', 'ops', -124000, 'ACH', 'Liability insurance');
    if (m === 1 || m === 3 || m === 6) add(m, 15, 'IRS, estimated tax', 'Taxes & fees', 'tax', -cents(17000, 19500), 'ACH', 'Quarterly estimate');
    if (m === 0) add(m, 1, 'Delaware Division of Corporations', 'Taxes & fees', 'ops', -40000, 'ACH', 'Franchise tax');
  }
  add(7, 22, 'PAYPRO*8842', 'Software', 'ops', -38900, 'Card', 'Merchant is not on your vendor list', 'out', 'flagged');
  const f = rows[rows.length - 1]!; f.was = 'pending'; f.log = ['Card authorization, card ending 4417', 'Flagged by the card monitor'];
  add(7, 23, 'Northwind Design Studio', 'Contractors', 'ops', -485000, 'ACH', 'Milestone 2, brand system', 'out', 'pending');
  add(7, 24, 'Stripe payout', 'Stripe payouts', 'ops', 2431055, 'ACH', 'In transit, arrives Mon', 'in', 'pending');
  add(7, 24, 'Delta Air Lines', 'Travel & meals', 'ops', -68430, 'Card', 'Conference flight, hold', 'out', 'pending');
  add(7, 24, 'Meta Ads', 'Marketing', 'ops', -214000, 'Card', 'Q4 campaign top-up', 'out', 'pending');
  // an even tie-break: later rows are newer within a day
  rows.forEach((t, i) => { t.id = `t${i + 1}`; });
  const sum: Record<string, number> = {};
  for (const t of rows) if (counts(t)) sum[t.acct] = (sum[t.acct] ?? 0) + t.amt;
  const opening: Record<string, number> = {};
  for (const a of ACCTS) opening[a.id] = a.target - (sum[a.id] ?? 0);
  const bills: Bill[] = [
    { id: 'b1', name: 'Comcast Business', due: '2026-10-26', amt: 28900, cat: 'Rent & office' },
    { id: 'b2', name: 'Chubb, liability insurance', due: '2026-10-29', amt: 124000, cat: 'Rent & office' },
    { id: 'b3', name: 'Hollis & Park Properties', due: '2026-11-01', amt: 680000, cat: 'Rent & office' },
    { id: 'b4', name: 'Amazon Web Services', due: '2026-11-02', amt: 462318, cat: 'Software' },
    { id: 'b5', name: 'Linear', due: '2026-11-05', amt: 64000, cat: 'Software' },
  ];
  return { txs: rows, opening, bills };
}
export const SEED = build();

/* ---- derived numbers */
export const inOut = (txs: Tx[]) => {
  let i = 0, o = 0;
  for (const t of txs) { if (t.kind === 'in') i += t.amt; else if (t.kind === 'out') o += t.amt; }
  return { i, o, net: i + o };
};
/** End-of-day total balance for the last `n` days, walking back from today's posted balance. */
export function dailyTotal(txs: Tx[], total: number, n: number) {
  const out: number[] = []; let b = total;
  for (let k = 0; k < n; k++) {
    const day = addDays(TODAY, -k); out.unshift(b);
    for (const t of txs) if (counts(t) && t.date === day) b -= t.amt;
  }
  return out;
}
export function monthly(txs: Tx[]) {
  const inn = Array(8).fill(0) as number[], out = Array(8).fill(0) as number[];
  for (const t of txs) {
    if (!counts(t)) continue; const m = +t.date.slice(5, 7) - 3;
    if (t.kind === 'in') inn[m] += t.amt; else if (t.kind === 'out') out[m] -= t.amt;
  }
  return { inn, out };
}
export const spendBy = (txs: Tx[], months: number) => {
  const from = 8 - months, m = new Map<string, number>();
  for (const t of txs) if (counts(t) && t.kind === 'out' && +t.date.slice(5, 7) - 3 >= from) m.set(t.cat, (m.get(t.cat) ?? 0) - t.amt);
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
};
export const dueLabel = (due: string) => { const d = dayDiff(due, TODAY); return d < 0 ? `Overdue ${-d}d` : d === 0 ? 'Due today' : d === 1 ? 'Due tomorrow' : `Due in ${d} days`; };
