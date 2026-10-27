// Derived numbers for the Accounts, Bills and Insights views. Nothing here is stored: it is all computed from the transaction rows
// (and the bill and goal state), so every view agrees with the overview.
import { ACCTS, MON, TODAY, addDays, dayDiff, isPosted, type Acct, type Bill, type Tx } from './_fin';

const pad = (n: number) => String(n).padStart(2, '0');
const mIdx = (iso: string) => +iso.slice(5, 7) - 3; // 0 = Mar ... 7 = Oct
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m is 1-based
export const nextMonth = (iso: string) => { const y = +iso.slice(0, 4), m = +iso.slice(5, 7), d = +iso.slice(8, 10); const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1; return `${ny}-${pad(nm)}-${pad(Math.min(d, daysIn(ny, nm)))}`; };

/* ---- accounts */
export const balAt = (txs: Tx[], bal: Record<string, number>, acct: string, date: string) => { let b = bal[acct]!; for (const t of txs) if (t.acct === acct && isPosted(t) && t.date > date) b -= t.amt; return b; };
/** End-of-day balance of one account for the last `days` days. */
export function acctSeries(txs: Tx[], bal: Record<string, number>, acct: string, days: number) {
  const by = new Map<string, number>(); for (const t of txs) if (t.acct === acct && isPosted(t)) by.set(t.date, (by.get(t.date) ?? 0) + t.amt);
  const out: number[] = []; let b = bal[acct]!;
  for (let k = 0; k < days; k++) { out.unshift(b); b -= by.get(addDays(TODAY, -k)) ?? 0; }
  return out;
}
export const dayLabels = (days: number) => Array.from({ length: days }, (_, i) => { const d = addDays(TODAY, i - days + 1); return `${MON[+d.slice(5, 7) - 1]} ${+d.slice(8, 10)}`; });

export interface Stmt { id: string; label: string; from: string; to: string; open: number; close: number; n: number; ins: number; outs: number; partial: boolean; lines: Tx[] }
export function statements(txs: Tx[], bal: Record<string, number>, acct: string): Stmt[] {
  const out: Stmt[] = [];
  for (let m = 7; m >= 0; m--) {
    const mm = m + 3, from = `2026-${pad(mm)}-01`, end = `2026-${pad(mm)}-${pad(daysIn(2026, mm))}`, to = end > TODAY ? TODAY : end;
    const lines = txs.filter((t) => t.acct === acct && isPosted(t) && t.date >= from && t.date <= to).sort((a, b) => a.date.localeCompare(b.date) || +a.id.slice(1) - +b.id.slice(1));
    out.push({ id: `${acct}-${mm}`, label: `${MONTH_NAMES[mm - 1]} 2026`, from, to, open: balAt(txs, bal, acct, addDays(from, -1)), close: balAt(txs, bal, acct, to), n: lines.length, ins: lines.reduce((a, t) => a + Math.max(0, t.amt), 0), outs: lines.reduce((a, t) => a + Math.min(0, t.amt), 0), partial: end > TODAY, lines });
  }
  return out;
}
export interface Limit { label: string; used: number; cap: number; money: boolean }
export function limits(txs: Tx[], a: Acct): Limit[] {
  const mine = txs.filter((t) => t.acct === a.id && isPosted(t) && t.amt < 0), oct = mine.filter((t) => t.date >= '2026-10-01');
  const sum = (l: Tx[]) => l.reduce((x, t) => x - t.amt, 0);
  if (a.type === 'Checking') return [{ label: 'Sent today', used: sum(mine.filter((t) => t.date === TODAY)), cap: 5000000, money: true }, { label: 'ACH and wires this month', used: sum(oct.filter((t) => t.method === 'ACH' || t.method === 'Wire')), cap: 25000000, money: true }, { label: 'Card spend this month', used: sum(oct.filter((t) => t.method === 'Card')), cap: 2500000, money: true }];
  return [{ label: 'Transfers out this month', used: oct.length, cap: 6, money: false }, { label: 'Sent this month', used: sum(oct), cap: 10000000, money: true }];
}

/* ---- bills */
const BILLERS: Record<string, string> = { 'Hollis & Park Properties': 'Hollis & Park Properties', 'Amazon Web Services': 'Amazon Web Services', 'Google Workspace': 'Google Workspace', Linear: 'Linear', 'Comcast Business': 'Comcast Business', Chubb: 'Chubb, liability insurance' };
/** Bills paid before today, read straight from the ledger so "Paid" always matches Transactions. */
export const paidHistory = (txs: Tx[]): Bill[] => txs.filter((t) => isPosted(t) && t.kind === 'out' && BILLERS[t.name] && t.date >= '2026-09-01' && t.memo !== 'Bill payment').map((t) => ({ id: `h-${t.id}`, name: BILLERS[t.name]!, due: t.date, amt: -t.amt, cat: t.cat, paid: t.date, tx: t.id }));
export const billStatus = (b: Bill) => b.paid ? 'paid' : b.auto ? 'auto' : b.sched ? 'sched' : 'open';
export function monthGrid(y: number, m: number): string[][] {
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(), lead = (first + 6) % 7, total = Math.ceil((lead + daysIn(y, m)) / 7) * 7;
  const start = `${y}-${pad(m)}-01`; const weeks: string[][] = [];
  for (let i = 0; i < total; i += 7) weeks.push(Array.from({ length: 7 }, (_, k) => addDays(start, i + k - lead)));
  return weeks;
}

/* ---- insights */
export const SPEND_CATS = ['Payroll', 'Contractors', 'Software', 'Marketing', 'Rent & office', 'Travel & meals', 'Taxes & fees'];
/** Posted expenses by category and month (index 0 = Mar ... 7 = Oct), in cents. */
export function catByMonth(txs: Tx[]) {
  const m = new Map<string, number[]>();
  for (const t of txs) if (isPosted(t) && t.kind === 'out') { const a = m.get(t.cat) ?? (m.set(t.cat, Array(8).fill(0)), m.get(t.cat)!); a[mIdx(t.date)]! -= t.amt; }
  return m;
}
/** Spend for the first `day` days of a month. */
export function spendDays(txs: Tx[], month: number, day: number) {
  const m = new Map<string, number>(); const p = `2026-${pad(month)}-`;
  for (const t of txs) if (isPosted(t) && t.kind === 'out' && t.date.startsWith(p) && +t.date.slice(8, 10) <= day) m.set(t.cat, (m.get(t.cat) ?? 0) - t.amt);
  return m;
}
export interface Merchant { name: string; cat: string; n: number; total: number; last: string }
export function merchants(txs: Tx[], months: number): Merchant[] {
  const m = new Map<string, Merchant>();
  for (const t of txs) if (isPosted(t) && t.kind === 'out' && mIdx(t.date) >= 8 - months) { const x = m.get(t.name) ?? { name: t.name, cat: t.cat, n: 0, total: 0, last: t.date }; x.n++; x.total -= t.amt; if (t.date > x.last) x.last = t.date; m.set(t.name, x); }
  return [...m.values()].sort((a, b) => b.total - a.total);
}
export interface Sub { name: string; cat: string; kind: 'Subscription' | 'Bill'; last: number; lastDate: string; next: string; amts: number[]; change: number }
/** A charge from the same merchant, about once a month, for a steady amount: that is a subscription or a standing bill. */
export function detectSubs(txs: Tx[]): Sub[] {
  const g = new Map<string, Tx[]>();
  for (const t of txs) if (isPosted(t) && t.kind === 'out') { const l = g.get(t.name) ?? (g.set(t.name, []), g.get(t.name)!); l.push(t); }
  const out: Sub[] = [];
  for (const [name, l] of g) {
    const months = new Set(l.map((t) => mIdx(t.date)));
    if (months.size < 5 || l.length > months.size * 1.25) continue;
    l.sort((a, b) => a.date.localeCompare(b.date) || +a.id.slice(1) - +b.id.slice(1));
    const amts = l.map((t) => -t.amt), mean = amts.reduce((a, b) => a + b, 0) / amts.length, sd = Math.sqrt(amts.reduce((a, b) => a + (b - mean) ** 2, 0) / amts.length);
    if (sd / mean > 0.18) continue;
    const n = amts.length, last = l[n - 1]!;
    const steady = n >= 4 && amts[n - 2] === amts[n - 3] && amts[n - 3] === amts[n - 4];
    out.push({ name, cat: last.cat, kind: last.cat === 'Software' ? 'Subscription' : 'Bill', last: amts[n - 1]!, lastDate: last.date, next: nextMonth(last.date), amts, change: steady && amts[n - 1] !== amts[n - 2] ? (amts[n - 1]! - amts[n - 2]!) / amts[n - 2]! : 0 });
  }
  return out.sort((a, b) => b.last - a.last);
}
export interface Alert { id: string; tone: 'bad' | 'warn' | 'info'; title: string; detail: string; q?: string; cat?: string }
export function alerts(txs: Tx[], subs: Sub[], fmt: (c: number) => string): Alert[] {
  const out: Alert[] = [];
  for (const t of txs) if (t.status === 'flagged') out.push({ id: `new:${t.id}`, tone: 'bad', title: `${t.name} is not on your vendor list`, detail: `${fmt(-t.amt)} on card ending 4417, held for review.`, q: t.name });
  for (const s of subs) if (s.change > 0.05) out.push({ id: `price:${s.name}`, tone: 'warn', title: `${s.name} went up ${Math.round(s.change * 100)}%`, detail: `${fmt(s.amts[s.amts.length - 2]!)} to ${fmt(s.last)} a month, ${fmt((s.last - s.amts[s.amts.length - 2]!) * 12)} more a year.`, q: s.name });
  const byM = catByMonth(txs), day = +TODAY.slice(8, 10), frac = day / daysIn(2026, 10);
  for (const [cat, a] of byM) {
    const avg = a.slice(1, 7).reduce((x, y) => x + y, 0) / 6 * frac, now = a[7]!;
    if (now > avg * 1.35 && now - avg >= 50000) out.push({ id: `spike:${cat}`, tone: 'info', title: `${cat} is ${Math.round((now / avg - 1) * 100)}% above its usual pace`, detail: `${fmt(now)} so far in October against about ${fmt(avg)} for the same days in a typical month.`, cat });
  }
  return out;
}

/* ---- savings goals */
export interface Goal { id: string; name: string; target: number; by: string; acct: string | null; saved: number }
export const GOALS: Goal[] = [
  { id: 'g1', name: 'Q4 estimated tax', target: 5200000, by: '2027-01-15', acct: 'tax', saved: 0 },
  { id: 'g2', name: 'Six-month runway', target: 20000000, by: '2027-06-30', acct: 'sav', saved: 0 },
  { id: 'g3', name: 'Studio equipment', target: 1500000, by: '2027-03-31', acct: null, saved: 640000 },
];
export function goalInfo(g: Goal, txs: Tx[], bal: Record<string, number>) {
  const cur = g.acct ? bal[g.acct]! : g.saved, left = Math.max(0, g.target - cur);
  const months = Math.max(1, dayDiff(g.by, TODAY) / 30.4), need = left / months;
  const pace = g.acct ? (cur - balAt(txs, bal, g.acct, addDays(TODAY, -90))) / 3 : null;
  const state = cur >= g.target ? 'done' : pace === null ? 'manual' : pace >= need ? 'on' : 'behind';
  return { cur, left, need, pace, pct: Math.min(1, cur / g.target), state, days: dayDiff(g.by, TODAY) } as const;
}
export const acctName = (id: string) => ACCTS.find((a) => a.id === id)?.name ?? '';
