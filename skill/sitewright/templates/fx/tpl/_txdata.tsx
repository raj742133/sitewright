// Scripted analyses for the AI assistant dashboard. Every number is computed from the raw rows below, so the chart, the table,
// the headline and the sentences always agree. No network, no model: matching is a keyword score.
import type { ReactNode } from 'react';
import { Delta, fmt, type Col, type IconName, type Series } from './_dash';

export type Row = Record<string, string | number>;
export type TCol = Col<Row> & { csv?: string };
export type ChartSpec =
  | { kind: 'bar' | 'area'; title: string; unit: string; labels: string[]; series: Series[]; format: (v: number) => string; aria: string }
  | { kind: 'donut'; title: string; unit: string; parts: Array<{ label: string; value: number }>; center: { value: string; label: string }; aria: string };
export interface Result {
  id: string; short: string; title: string; period: string; q: string; icon: IconName; keywords: string[]; steps: string[]; reply: string;
  headline: { value: string; label: string; delta?: number; good?: 'up' | 'down' }; summary: string; insights: string[];
  chart: ChartSpec; tableTitle: string; cols: TCol[]; rowKey: string; sources: Array<{ t: string; rows: number }>; sql: string; file: string;
}

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const pc = (v: number, d = 1) => `${v.toFixed(d)}%`;
const usd = (v: number) => (v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : v >= 1e4 ? `$${(v / 1e3).toFixed(1)}k` : `$${Math.round(v).toLocaleString('en-US')}`);
const ax = (v: number) => `$${fmt.k(v)}`;
const by = <T,>(a: T[], f: (x: T) => number) => a.reduce((m, x) => (f(x) > f(m) ? x : m));
const low = <T,>(a: T[], f: (x: T) => number) => a.reduce((m, x) => (f(x) < f(m) ? x : m));
const num = (id: string, label: string, f: (v: number) => string = fmt.n, extra: Partial<TCol> = {}): TCol => ({ id, label, align: 'right', cell: (r) => f(r[id] as number), sort: (a, b) => (a[id] as number) - (b[id] as number), ...extra });
const txt = (id: string, label: string, cell?: (r: Row) => ReactNode, extra: Partial<TCol> = {}): TCol => ({ id, label, cell: cell ?? ((r) => String(r[id])), sort: (a, b) => String(a[id]).localeCompare(String(b[id])), ...extra });
const dlt = (id: string, label: string, good: 'up' | 'down' = 'up'): TCol => num(id, label, undefined, { cell: (r) => <Delta value={r[id] as number} good={good} />, csv: `${label} (%)` });

/* ---------------------------------------------------------------- 1. revenue by region, Q3 2026 */
const REG: Array<[string, number, number, number]> = [['North America', 14980, 1842300, 1659800], ['Europe', 10720, 1236900, 1138100], ['Asia Pacific', 6240, 684500, 548900], ['Latin America', 3110, 291400, 276300], ['Middle East & Africa', 1630, 158700, 143500]];
const revRows: Row[] = REG.map(([region, orders, revenue, prev]) => ({ region, orders, revenue, share: 0, aov: revenue / orders, qoq: (revenue / prev - 1) * 100 }));
const revTot = sum(REG.map((r) => r[2])), revPrev = sum(REG.map((r) => r[3])), revOrders = sum(REG.map((r) => r[1]));
revRows.forEach((r) => { r.share = ((r.revenue as number) / revTot) * 100; });
const rTop = by(revRows, (r) => r.revenue as number), rFast = by(revRows, (r) => r.qoq as number), rLowA = low(revRows, (r) => r.aov as number), rHiA = by(revRows, (r) => r.aov as number);
const revenue: Result = {
  id: 'revenue', short: 'Revenue by region', title: 'Revenue by region', period: 'Q3 2026 (Jul 1 to Sep 30), compared with Q2', q: 'Show revenue by region', icon: 'globe',
  keywords: ['revenue', 'by region', 'region', 'sales', 'geograph', 'earnings'], steps: ['Reading orders table', 'Joining regions', 'Grouping by region', 'Comparing with Q2'],
  reply: `Q3 revenue was ${usd(revTot)}, up ${pc((revTot / revPrev - 1) * 100)} on Q2. ${rTop.region} is the largest region at ${usd(rTop.revenue as number)}, and ${rFast.region} grew fastest at ${pc(rFast.qoq as number)}.`,
  headline: { value: usd(revTot), label: 'Total revenue, Q3 2026', delta: (revTot / revPrev - 1) * 100 },
  summary: `Across ${fmt.n(revOrders)} orders, revenue came to ${usd(revTot)} against ${usd(revPrev)} in Q2. Growth was broad: every region is up, but the mix is moving slowly towards Asia Pacific.`,
  insights: [`${rTop.region} brings in ${pc(rTop.share as number)} of revenue (${usd(rTop.revenue as number)}).`, `${rFast.region} grew ${pc(rFast.qoq as number)} on Q2, against ${pc(low(revRows, (r) => r.qoq as number).qoq as number)} for ${low(revRows, (r) => r.qoq as number).region}.`, `Average order value is highest in ${rHiA.region} (${usd(rHiA.aov as number)}) and lowest in ${rLowA.region} (${usd(rLowA.aov as number)}).`],
  chart: { kind: 'bar', title: 'Revenue by region', unit: 'USD', labels: REG.map((r) => r[0].replace('Middle East & Africa', 'MEA')), series: [{ id: 'rev', label: 'Revenue', data: REG.map((r) => r[2]) }], format: ax, aria: 'Revenue by region, Q3 2026' },
  tableTitle: 'By region', rowKey: 'region', file: 'revenue-by-region-q3-2026',
  cols: [txt('region', 'Region'), num('orders', 'Orders', undefined, { hideBelow: 'sm' }), num('revenue', 'Revenue', fmt.c, { csv: 'Revenue (USD)' }), num('share', 'Share', (v) => pc(v), { hideBelow: 'sm', csv: 'Share (%)' }), num('aov', 'Avg order', (v) => `$${v.toFixed(2)}`, { hideBelow: 'md', csv: 'Avg order (USD)' }), dlt('qoq', 'vs Q2')],
  sources: [{ t: 'orders', rows: 36680 }, { t: 'regions', rows: 5 }],
  sql: `-- Revenue by region, Q3 2026 vs Q2 2026\nSELECT r.name AS region,\n       COUNT(*) AS orders,\n       SUM(o.total_usd) AS revenue,\n       SUM(o.total_usd) / SUM(SUM(o.total_usd)) OVER () AS share\nFROM orders o\nJOIN regions r ON r.id = o.region_id\nWHERE o.status = 'paid'\n  AND o.placed_at >= '2026-07-01'\n  AND o.placed_at <  '2026-10-01'\nGROUP BY r.name\nORDER BY revenue DESC;`,
};

/* ---------------------------------------------------------------- 2. monthly active users */
const MAU = [41200, 42800, 44100, 45900, 47300, 49800, 52600, 54100, 57300, 60900, 63400, 66200];
const MON = ["Nov '25", "Dec '25", "Jan '26", "Feb '26", "Mar '26", "Apr '26", "May '26", "Jun '26", "Jul '26", "Aug '26", "Sep '26", "Oct '26"];
const mauRows: Row[] = MAU.map((v, i) => ({ month: MON[i]!, mau: v, adds: i ? v - MAU[i - 1]! : 0, mom: i ? (v / MAU[i - 1]! - 1) * 100 : 0, i })).slice(1).reverse();
const mJump = by(mauRows, (r) => r.adds as number), mLast = MAU[11]! / MAU[10]! - 1, mAll = MAU[11]! / MAU[0]! - 1;
const mauR: Result = {
  id: 'mau', short: 'Monthly active users', title: 'Monthly active users', period: 'Nov 2025 to Oct 2026, month-end', q: 'Monthly active users trend', icon: 'users',
  keywords: ['monthly active', 'active users', 'active user', 'mau', 'user growth', 'users trend', 'growth', 'engagement'], steps: ['Reading events table', 'Counting distinct users per month', 'Smoothing month-end values', 'Checking growth rate'],
  reply: `Monthly active users reached ${fmt.n(MAU[11]!)} in October, ${pc(mLast * 100)} more than September and ${pc(mAll * 100, 0)} above November. Growth sped up from July.`,
  headline: { value: fmt.n(MAU[11]!), label: 'Active users, Oct 2026', delta: mLast * 100 },
  summary: `Active users climbed from ${fmt.n(MAU[0]!)} to ${fmt.n(MAU[11]!)} in twelve months, adding ${fmt.n(MAU[11]! - MAU[0]!)}. The curve is steeper in the second half of the year than in the first.`,
  insights: [`${mJump.month} was the biggest month: +${fmt.n(mJump.adds as number)} users (${pc(mJump.mom as number)}).`, `From Nov to Jun it averaged +${fmt.n(Math.round((MAU[7]! - MAU[0]!) / 7))} users a month; since then it is +${fmt.n(Math.round((MAU[11]! - MAU[7]!) / 4))}.`, `Month-over-month growth never fell below ${pc(low(mauRows, (r) => r.mom as number).mom as number)}.`],
  chart: { kind: 'area', title: 'Monthly active users', unit: 'users', labels: MON, series: [{ id: 'mau', label: 'Active users', data: MAU }], format: fmt.k, aria: 'Monthly active users, November 2025 to October 2026' },
  tableTitle: 'By month', rowKey: 'month', file: 'monthly-active-users',
  cols: [txt('month', 'Month'), num('mau', 'Active users'), num('adds', 'Net adds', (v) => `+${fmt.n(v)}`, { hideBelow: 'sm' }), dlt('mom', 'MoM')],
  sources: [{ t: 'events', rows: 3204118 }, { t: 'customers', rows: 12904 }],
  sql: `-- Distinct users with at least one event, per calendar month\nSELECT date_trunc('month', e.occurred_at) AS month,\n       COUNT(DISTINCT e.user_id) AS mau\nFROM events e\nWHERE e.occurred_at >= '2025-11-01'\n  AND e.occurred_at <  '2026-11-01'\n  AND e.type IN ('session_start', 'order_placed')\nGROUP BY 1\nORDER BY 1;`,
};

/* ---------------------------------------------------------------- 3. top customers */
const CUS: Array<[string, string, number, number, string]> = [['Halvorsen Outdoor Co', 'North America', 142, 186400, 'Oct 22'], ['Kestrel Trail Supply', 'North America', 118, 161900, 'Oct 23'], ['Brightwater Camps', 'Europe', 97, 139200, 'Oct 20'], ['Ordway & Pike', 'Europe', 88, 121700, 'Oct 24'], ['Lindqvist Expeditions', 'Europe', 61, 108300, 'Oct 17'], ['Northgate Rentals', 'North America', 104, 96800, 'Oct 24'], ['Marlow Field Stores', 'Asia Pacific', 73, 88500, 'Oct 19'], ['Tamsin Alder Studio', 'Asia Pacific', 49, 71200, 'Oct 15']];
const TTM = 15240000, cTot = sum(CUS.map((c) => c[3])), cOrd = sum(CUS.map((c) => c[2]));
const cusRows: Row[] = CUS.map(([name, region, orders, rev, last]) => ({ name, region, orders, revenue: rev, aov: rev / orders, share: (rev / TTM) * 100, last }));
const cAov = by(cusRows, (r) => r.aov as number), cLow = low(cusRows, (r) => r.aov as number);
const customers: Result = {
  id: 'customers', short: 'Top customers', title: 'Top customers by revenue', period: 'Last 12 months (Nov 2025 to Oct 2026)', q: 'Who are our top customers?', icon: 'star',
  keywords: ['top customers', 'best customers', 'biggest customers', 'top accounts', 'top buyers', 'highest spending', 'spend the most', 'most valuable', 'largest accounts'], steps: ['Reading customers table', 'Joining orders', 'Ranking by revenue', 'Checking last order dates'],
  reply: `${CUS[0]![0]} is the top customer with ${usd(CUS[0]![3])}, followed by ${CUS[1]![0]} (${usd(CUS[1]![3])}). The top eight together bring in ${usd(cTot)}, ${pc((cTot / TTM) * 100)} of trailing revenue.`,
  headline: { value: usd(cTot), label: `Top 8 customers, ${pc((cTot / TTM) * 100)} of revenue` },
  summary: `The top eight accounts placed ${fmt.n(cOrd)} orders worth ${usd(cTot)} over twelve months. Revenue is spread thinly: no single customer is above ${pc(((CUS[0]![3]) / TTM) * 100)} of the total, so the business is not dependent on one account.`,
  insights: [`${cAov.name} has the largest average order (${usd(cAov.aov as number)}) with only ${cAov.orders} orders.`, `${cLow.name} has the smallest average order (${usd(cLow.aov as number)}) across ${cLow.orders} orders.`, `Three of the eight are in North America, three in Europe, two in Asia Pacific. All ordered in the last ten days.`],
  chart: { kind: 'bar', title: 'Revenue per customer', unit: 'USD', labels: CUS.map((c) => c[0].split(' ')[0]!), series: [{ id: 'rev', label: 'Revenue', data: CUS.map((c) => c[3]) }], format: ax, aria: 'Revenue for the top eight customers' },
  tableTitle: 'Ranked', rowKey: 'name', file: 'top-customers-12-months',
  cols: [txt('name', 'Customer', (r) => <b>{r.name}</b>), txt('region', 'Region', undefined, { hideBelow: 'md' }), num('orders', 'Orders', undefined, { hideBelow: 'sm' }), num('revenue', 'Revenue', fmt.c, { csv: 'Revenue (USD)' }), num('share', 'Share', (v) => pc(v), { hideBelow: 'sm', csv: 'Share of revenue (%)' }), txt('last', 'Last order', undefined, { hideBelow: 'md' })],
  sources: [{ t: 'customers', rows: 12904 }, { t: 'orders', rows: 48210 }],
  sql: `-- Top 8 customers by paid revenue, trailing 12 months\nSELECT c.name,\n       r.name AS region,\n       COUNT(*) AS orders,\n       SUM(o.total_usd) AS revenue,\n       MAX(o.placed_at) AS last_order\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nJOIN regions r ON r.id = c.region_id\nWHERE o.status = 'paid'\n  AND o.placed_at >= '2025-11-01'\nGROUP BY c.name, r.name\nORDER BY revenue DESC\nLIMIT 8;`,
};

/* ---------------------------------------------------------------- 4. churn by plan */
const PLAN: Array<[string, number, number, number]> = [['Starter', 4820, 301, 19], ['Plus', 2960, 118, 49], ['Team', 1240, 31, 129], ['Enterprise', 186, 2, 1150]];
const chRows: Row[] = PLAN.map(([plan, start, churned, arpa]) => ({ plan, start, churned, rate: (churned / start) * 100, mrr: churned * arpa }));
const chStart = sum(PLAN.map((p) => p[1])), chN = sum(PLAN.map((p) => p[2])), chMrr = sum(chRows.map((r) => r.mrr as number));
const cS = chRows[0]!, cP = by(chRows, (r) => r.mrr as number), cE = chRows[3]!;
const churn: Result = {
  id: 'churn', short: 'Churn by plan', title: 'Churn by plan', period: 'Last 30 days (Sep 25 to Oct 24)', q: 'Which plan has the highest churn?', icon: 'arrowdown',
  keywords: ['churn', 'cancel', 'retention', 'unsubscribe', 'downgrade', 'by plan', 'subscription'], steps: ['Reading subscriptions table', 'Finding cancellations', 'Grouping by plan', 'Valuing lost MRR'],
  reply: `${chN} of ${fmt.n(chStart)} subscribers churned in the last 30 days (${pc((chN / chStart) * 100)}). Starter churns most at ${pc(cS.rate as number)}, almost six times the Enterprise rate of ${pc(cE.rate as number)}.`,
  headline: { value: pc((chN / chStart) * 100), label: `Monthly churn, ${chN} subscribers`, delta: -0.4, good: 'down' },
  summary: `Of ${fmt.n(chStart)} subscribers at the start of the period, ${chN} cancelled, taking ${fmt.c(chMrr)} of monthly recurring revenue with them. Churn falls steadily as plan price rises.`,
  insights: [`Starter is ${pc(((cS.churned as number) / chN) * 100, 0)} of churned accounts but only ${pc(((cS.mrr as number) / chMrr) * 100, 0)} of lost MRR.`, `${cP.plan} loses the most revenue: ${fmt.c(cP.mrr as number)} a month from ${cP.churned} accounts.`, `Enterprise lost ${cE.churned} accounts (${pc(cE.rate as number)}), worth ${fmt.c(cE.mrr as number)} of MRR.`],
  chart: { kind: 'donut', title: 'Churned subscribers by plan', unit: 'subscribers', parts: PLAN.map((p) => ({ label: p[0], value: p[2] })), center: { value: String(chN), label: 'churned' }, aria: 'Churned subscribers by plan' },
  tableTitle: 'By plan', rowKey: 'plan', file: 'churn-by-plan-30-days',
  cols: [txt('plan', 'Plan'), num('start', 'Subscribers', undefined, { hideBelow: 'sm' }), num('churned', 'Churned'), num('rate', 'Churn rate', (v) => pc(v), { csv: 'Churn rate (%)' }), num('mrr', 'MRR lost', fmt.c, { hideBelow: 'sm', csv: 'MRR lost (USD)' })],
  sources: [{ t: 'subscriptions', rows: 9206 }, { t: 'plans', rows: 4 }],
  sql: `-- Cancellations in the last 30 days, by plan\nSELECT p.name AS plan,\n       COUNT(*) FILTER (WHERE s.started_at < '2026-09-25') AS subscribers,\n       COUNT(*) FILTER (WHERE s.cancelled_at >= '2026-09-25') AS churned,\n       SUM(p.monthly_price) FILTER (WHERE s.cancelled_at >= '2026-09-25') AS mrr_lost\nFROM subscriptions s\nJOIN plans p ON p.id = s.plan_id\nGROUP BY p.name\nORDER BY churned DESC;`,
};

/* ---------------------------------------------------------------- 5. conversion funnel */
const FUN: Array<[string, number]> = [['Visited site', 184200], ['Viewed a product', 96400], ['Added to cart', 31500], ['Started checkout', 18900], ['Purchased', 12600]];
const fRows: Row[] = FUN.map(([stage, users], i) => ({ stage, users, step: i ? (users / FUN[i - 1]![1]) * 100 : 100, overall: (users / FUN[0]![1]) * 100, lost: i ? FUN[i - 1]![1] - users : 0 }));
const fWorst = low(fRows.slice(1), (r) => r.step as number), fBest = by(fRows.slice(1), (r) => r.step as number);
const funnel: Result = {
  id: 'funnel', short: 'Conversion funnel', title: 'Conversion funnel', period: 'Last 30 days (Sep 25 to Oct 24)', q: 'Show the conversion funnel', icon: 'filter',
  keywords: ['funnel', 'conversion', 'convert', 'checkout', 'drop off', 'drop-off', 'abandon', 'add to cart'], steps: ['Reading sessions table', 'Counting users at each step', 'Computing step conversion', 'Finding the biggest drop'],
  reply: `${pc(fRows[4]!.overall as number, 2)} of ${fmt.n(FUN[0]![1])} visitors bought. The weakest step is from product page to cart, where ${pc(100 - (fWorst.step as number))} of shoppers leave.`,
  headline: { value: pc(fRows[4]!.overall as number, 2), label: `Visit to purchase, ${fmt.n(FUN[4]![1])} orders`, delta: 0.3 },
  summary: `Out of ${fmt.n(FUN[0]![1])} visits, ${fmt.n(FUN[4]![1])} ended in a purchase. The funnel is healthy at the bottom (${pc(fBest.step as number, 0)} of people who start checkout finish it) and leaks at the top.`,
  insights: [`${fWorst.stage}: only ${pc(fWorst.step as number)} of product viewers continue (${fmt.n(fWorst.lost as number)} lost), the weakest step.`, `${fBest.stage} converts best at ${pc(fBest.step as number)} of the step before.`, `Cart to purchase is ${pc((FUN[4]![1] / FUN[2]![1]) * 100)}: ${fmt.n(FUN[2]![1] - FUN[4]![1])} carts were abandoned.`],
  chart: { kind: 'bar', title: 'Users at each step', unit: 'users', labels: ['Visit', 'Product', 'Cart', 'Checkout', 'Purchase'], series: [{ id: 'u', label: 'Users', data: FUN.map((f) => f[1]) }], format: fmt.k, aria: 'Users at each funnel step' },
  tableTitle: 'By step', rowKey: 'stage', file: 'conversion-funnel-30-days',
  cols: [txt('stage', 'Step'), num('users', 'Users'), num('step', 'From previous', (v) => pc(v), { hideBelow: 'sm', csv: 'From previous step (%)' }), num('overall', 'Overall', (v) => pc(v, 2), { csv: 'Overall (%)' }), num('lost', 'Lost', (v) => (v ? `−${fmt.n(v)}` : '—'), { hideBelow: 'md' })],
  sources: [{ t: 'sessions', rows: 184200 }, { t: 'events', rows: 3204118 }],
  sql: `-- Distinct sessions reaching each step, last 30 days\nSELECT step,\n       COUNT(DISTINCT session_id) AS users\nFROM (\n  SELECT session_id, 1 AS n, 'Visited site' AS step FROM sessions\n  UNION ALL\n  SELECT session_id, 2, 'Viewed a product' FROM events WHERE type = 'product_view'\n  UNION ALL\n  SELECT session_id, 3, 'Added to cart' FROM events WHERE type = 'cart_add'\n  UNION ALL\n  SELECT session_id, 4, 'Started checkout' FROM events WHERE type = 'checkout_start'\n  UNION ALL\n  SELECT session_id, 5, 'Purchased' FROM events WHERE type = 'order_placed'\n) s\nWHERE occurred_at >= '2026-09-25'\nGROUP BY step, n\nORDER BY n;`,
};

/* ---------------------------------------------------------------- 6. delayed orders */
const DAYS = [6, 7, 5, 8, 9, 7, 6, 9, 11, 13, 12, 14, 17, 19];
const DL = DAYS.map((_, i) => new Date(Date.UTC(2026, 9, 11 + i)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }));
const CAR: Array<[string, number, number, number]> = [['Swiftline', 5920, 61, 2.1], ['Corvid Freight', 3310, 38, 3.4], ['Harbor Post', 2140, 27, 2.6], ['Pinegate Express', 1980, 17, 1.8]];
const dTot = sum(DAYS), dShip = sum(CAR.map((c) => c[1])), dAvg = sum(CAR.map((c) => c[2] * c[3])) / dTot;
const dRows: Row[] = CAR.map(([carrier, shipped, delayed, late]) => ({ carrier, shipped, delayed, rate: (delayed / shipped) * 100, late }));
const dRate = by(dRows, (r) => r.rate as number), dLate = by(dRows, (r) => r.late as number), last3 = sum(DAYS.slice(-3));
const delayed: Result = {
  id: 'delayed', short: 'Delayed orders', title: 'Delayed orders', period: 'Oct 11 to Oct 24, 2026 (14 days)', q: 'Which orders are delayed?', icon: 'truck',
  keywords: ['delayed', 'delay', 'late', 'shipping', 'shipment', 'carrier', 'on time', 'on-time', 'delivery', 'overdue'], steps: ['Reading shipments table', 'Comparing promised and actual dates', 'Grouping by carrier', 'Spotting the trend'],
  reply: `${dTot} of ${fmt.n(dShip)} shipped orders arrived late in the last 14 days (${pc((dTot / dShip) * 100, 2)}), averaging ${dAvg.toFixed(1)} days past the promise. The last three days alone account for ${last3}.`,
  headline: { value: String(dTot), label: `Delayed orders, ${pc((dTot / dShip) * 100, 2)} of shipped`, delta: 38.7, good: 'down' },
  summary: `${dTot} orders missed their promised date out of ${fmt.n(dShip)} shipped since Oct 11. Daily delays doubled over the fortnight, rising from ${DAYS[0]} a day to ${DAYS[13]} yesterday, which points to a recent cause, not a steady background rate.`,
  insights: [`${pc((last3 / dTot) * 100, 0)} of all delays (${last3} orders) happened in the last three days.`, `${dRate.carrier} has the highest delay rate at ${pc(dRate.rate as number, 2)}; ${dLate.carrier} runs latest at ${(dLate.late as number).toFixed(1)} days on average.`, `${CAR[0]![0]} carries ${pc((CAR[0]![2] / dTot) * 100, 0)} of delays simply because it ships ${pc((CAR[0]![1] / dShip) * 100, 0)} of volume.`],
  chart: { kind: 'area', title: 'Delayed orders per day', unit: 'orders', labels: DL, series: [{ id: 'd', label: 'Delayed orders', data: DAYS, color: 'var(--critical, #b32d18)' }], format: (v) => String(Math.round(v)), aria: 'Delayed orders per day, October 11 to 24' },
  tableTitle: 'By carrier', rowKey: 'carrier', file: 'delayed-orders-14-days',
  cols: [txt('carrier', 'Carrier'), num('shipped', 'Shipped', undefined, { hideBelow: 'sm' }), num('delayed', 'Delayed'), num('rate', 'Delay rate', (v) => pc(v, 2), { csv: 'Delay rate (%)' }), num('late', 'Avg days late', (v) => v.toFixed(1), { hideBelow: 'md' })],
  sources: [{ t: 'shipments', rows: 47980 }, { t: 'orders', rows: 48210 }],
  sql: `-- Orders delivered after the promised date, last 14 days\nSELECT s.carrier,\n       COUNT(*) AS shipped,\n       COUNT(*) FILTER (WHERE s.delivered_at > o.promised_at) AS delayed,\n       AVG(s.delivered_at - o.promised_at) FILTER (WHERE s.delivered_at > o.promised_at) AS avg_days_late\nFROM shipments s\nJOIN orders o ON o.id = s.order_id\nWHERE s.shipped_at >= '2026-10-11'\nGROUP BY s.carrier\nORDER BY delayed DESC;`,
};
export const RESULTS: Result[] = [revenue, mauR, customers, churn, funnel, delayed];
export const RESULT_ROWS: Record<string, Row[]> = { revenue: revRows, mau: mauRows, customers: cusRows, churn: chRows, funnel: fRows, delayed: dRows };

/** Keyword score: longer phrases weigh more, so "top customers" beats a stray "customers". */
export function match(q: string): { kind: 'result'; res: Result } | { kind: 'hello' } | { kind: 'fallback' } {
  const s = q.toLowerCase();
  let best: Result | null = null, bs = 0;
  for (const r of RESULTS) { let sc = 0; for (const k of r.keywords) if (new RegExp(`\\b${k.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}`).test(s)) sc += k.length; if (sc > bs) { bs = sc; best = r; } }
  if (best) return { kind: 'result', res: best };
  return /^\s*(hi|hello|hey|good (morning|afternoon))\b/.test(s) ? { kind: 'hello' } : { kind: 'fallback' };
}
export const related = (id: string) => { const i = RESULTS.findIndex((r) => r.id === id); return [1, 2, 3].map((k) => RESULTS[(i + k) % RESULTS.length]!); };
