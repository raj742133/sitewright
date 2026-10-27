// The demo warehouse behind the assistant: eight tables with typed columns, descriptions, relationships and a few real-looking rows.
// Row counts here are table totals; the "rows" on an analysis' sources are the rows that query scanned.
import { RESULTS } from './_txdata';

export interface Column { n: string; t: string; d: string; pk?: boolean; ref?: string; nul?: boolean }
export interface TableDef { name: string; rows: number; desc: string; size: string; updated: string; cols: Column[]; sample: string[][] }

const T0 = 'Today, 06:00';
export const SCHEMA: TableDef[] = [
  { name: 'orders', rows: 48210, desc: 'One row per order, with USD totals and the delivery date promised at checkout.', size: '38 MB', updated: T0,
    cols: [{ n: 'id', t: 'bigint', d: 'Order number', pk: true }, { n: 'customer_id', t: 'bigint', d: 'Account that placed the order', ref: 'customers.id' }, { n: 'region_id', t: 'int', d: 'Sales region the order is booked to', ref: 'regions.id' }, { n: 'status', t: 'text', d: 'paid, pending, refunded or cancelled' }, { n: 'total_usd', t: 'numeric(12,2)', d: 'Order total in US dollars, tax included' }, { n: 'placed_at', t: 'timestamptz', d: 'When the customer paid' }, { n: 'promised_at', t: 'timestamptz', d: 'Delivery date shown at checkout' }],
    sample: [['204811', '1042', '1', 'paid', '412.50', '2026-10-24 08:41', '2026-10-29'], ['204810', '2975', '2', 'paid', '1,284.00', '2026-10-24 08:12', '2026-10-30'], ['204809', '3318', '3', 'pending', '96.80', '2026-10-24 07:55', '2026-11-04'], ['204808', '1187', '1', 'paid', '738.25', '2026-10-24 07:30', '2026-10-28']] },
  { name: 'customers', rows: 12904, desc: 'Accounts that have ordered or subscribed, with their home region.', size: '2.1 MB', updated: T0,
    cols: [{ n: 'id', t: 'bigint', d: 'Customer number', pk: true }, { n: 'name', t: 'text', d: 'Account name as it appears on invoices' }, { n: 'region_id', t: 'int', d: 'Home sales region', ref: 'regions.id' }, { n: 'segment', t: 'text', d: 'Retail, rental, camp or studio' }, { n: 'created_at', t: 'date', d: 'First order or sign-up date' }],
    sample: [['1042', 'Halvorsen Outdoor Co', '1', 'Retail', '2021-03-09'], ['1187', 'Kestrel Trail Supply', '1', 'Retail', '2021-08-22'], ['2310', 'Brightwater Camps', '2', 'Camp', '2022-02-14'], ['2975', 'Ordway & Pike', '2', 'Retail', '2022-11-03']] },
  { name: 'regions', rows: 5, desc: 'The five sales regions used in every revenue report.', size: '8 kB', updated: 'Jan 12, 2026',
    cols: [{ n: 'id', t: 'int', d: 'Region number', pk: true }, { n: 'name', t: 'text', d: 'Name used in reports' }, { n: 'code', t: 'text', d: 'Short code' }, { n: 'timezone', t: 'text', d: 'Zone that defines a region’s day' }],
    sample: [['1', 'North America', 'NA', 'America/New_York'], ['2', 'Europe', 'EU', 'Europe/Berlin'], ['3', 'Asia Pacific', 'APAC', 'Asia/Singapore'], ['4', 'Latin America', 'LATAM', 'America/Sao_Paulo'], ['5', 'Middle East & Africa', 'MEA', 'Asia/Dubai']] },
  { name: 'events', rows: 3204118, desc: 'Product and storefront events, one row each, used for activity and funnels.', size: '1.1 GB', updated: T0,
    cols: [{ n: 'id', t: 'bigint', d: 'Event number', pk: true }, { n: 'user_id', t: 'bigint', d: 'Signed-in customer, if known', ref: 'customers.id', nul: true }, { n: 'session_id', t: 'bigint', d: 'Visit the event belongs to', ref: 'sessions.id' }, { n: 'type', t: 'text', d: 'session_start, product_view, cart_add, checkout_start or order_placed' }, { n: 'occurred_at', t: 'timestamptz', d: 'Event time, UTC' }, { n: 'props', t: 'jsonb', d: 'Details such as product SKU or cart value' }],
    sample: [['88120441', '1042', '9120377', 'product_view', '2026-10-24 08:40:12', '{"sku":"TR-210"}'], ['88120442', '1042', '9120377', 'cart_add', '2026-10-24 08:40:51', '{"sku":"TR-210","qty":2}'], ['88120443', '—', '9120378', 'session_start', '2026-10-24 08:41:03', '{"src":"search"}'], ['88120444', '1042', '9120377', 'order_placed', '2026-10-24 08:41:30', '{"order":204811}']] },
  { name: 'sessions', rows: 902350, desc: 'One row per visit to the storefront, anonymous or signed in.', size: '96 MB', updated: T0,
    cols: [{ n: 'id', t: 'bigint', d: 'Visit number', pk: true }, { n: 'customer_id', t: 'bigint', d: 'Signed-in customer, if any', ref: 'customers.id', nul: true }, { n: 'started_at', t: 'timestamptz', d: 'First event time' }, { n: 'device', t: 'text', d: 'desktop, mobile or tablet' }, { n: 'source', t: 'text', d: 'direct, search, email, social or referral' }],
    sample: [['9120377', '1042', '2026-10-24 08:38:44', 'desktop', 'email'], ['9120378', '—', '2026-10-24 08:41:03', 'mobile', 'search'], ['9120379', '2310', '2026-10-24 08:44:19', 'desktop', 'direct'], ['9120380', '—', '2026-10-24 08:47:52', 'tablet', 'social']] },
  { name: 'subscriptions', rows: 9206, desc: 'Plan, start and cancel dates for every subscriber.', size: '1.3 MB', updated: T0,
    cols: [{ n: 'id', t: 'bigint', d: 'Subscription number', pk: true }, { n: 'customer_id', t: 'bigint', d: 'Subscribing account', ref: 'customers.id' }, { n: 'plan_id', t: 'int', d: 'Current plan', ref: 'plans.id' }, { n: 'started_at', t: 'date', d: 'First billing day' }, { n: 'cancelled_at', t: 'date', d: 'Day the subscription ended; empty while active', nul: true }],
    sample: [['70412', '1042', '4', '2022-01-05', '—'], ['70413', '2310', '3', '2023-06-18', '—'], ['70414', '3318', '1', '2026-09-02', '2026-10-11'], ['70415', '1187', '4', '2022-04-27', '—']] },
  { name: 'plans', rows: 4, desc: 'The four subscription plans and their monthly price.', size: '8 kB', updated: 'Mar 3, 2026',
    cols: [{ n: 'id', t: 'int', d: 'Plan number', pk: true }, { n: 'name', t: 'text', d: 'Starter, Plus, Team or Enterprise' }, { n: 'monthly_price', t: 'numeric(8,2)', d: 'List price per month, USD' }],
    sample: [['1', 'Starter', '19.00'], ['2', 'Plus', '49.00'], ['3', 'Team', '129.00'], ['4', 'Enterprise', '1,150.00']] },
  { name: 'shipments', rows: 47980, desc: 'Carrier, ship date and delivery date for each shipped order.', size: '6.8 MB', updated: T0,
    cols: [{ n: 'id', t: 'bigint', d: 'Shipment number', pk: true }, { n: 'order_id', t: 'bigint', d: 'Order being delivered', ref: 'orders.id' }, { n: 'carrier', t: 'text', d: 'Swiftline, Corvid Freight, Harbor Post or Pinegate Express' }, { n: 'shipped_at', t: 'timestamptz', d: 'Handed to the carrier' }, { n: 'delivered_at', t: 'timestamptz', d: 'Delivered; empty while in transit', nul: true }],
    sample: [['311902', '204790', 'Swiftline', '2026-10-23 16:20', '—'], ['311903', '204791', 'Corvid Freight', '2026-10-23 16:45', '—'], ['311890', '204755', 'Harbor Post', '2026-10-22 11:05', '2026-10-24 09:12'], ['311881', '204741', 'Pinegate Express', '2026-10-21 14:30', '2026-10-23 10:48']] },
];
export const TABLE_ROWS = SCHEMA.reduce((a, t) => a + t.rows, 0);
export const byName = (n: string) => SCHEMA.find((t) => t.name === n);
export const outgoing = (t: TableDef) => t.cols.filter((c) => c.ref).map((c) => ({ col: c.n, to: c.ref!.split('.')[0]!, toCol: c.ref!.split('.')[1]! }));
export const incoming = (t: TableDef) => SCHEMA.flatMap((o) => o.cols.filter((c) => c.ref?.startsWith(`${t.name}.`)).map((c) => ({ from: o.name, col: c.n, toCol: c.ref!.split('.')[1]! })));
/** Saved-able analyses whose query reads this table. */
export const usedBy = (name: string) => RESULTS.filter((r) => r.sources.some((s) => s.t === name));
export const TABLE_RE = new RegExp(`\\b(${SCHEMA.map((t) => t.name).join('|')})\\b`, 'i');
export function tableAnswer(name: string) {
  const t = byName(name)!; const out = outgoing(t); const inc = incoming(t); const used = usedBy(name);
  const joins = out.length ? `It joins to ${out.map((o) => `${o.to} through ${o.col}`).join(' and ')}.` : inc.length ? `Other tables point at it: ${[...new Set(inc.map((i) => i.from))].join(', ')}.` : '';
  return `${t.name} has ${t.rows.toLocaleString('en-US')} rows and ${t.cols.length} columns: ${t.desc.charAt(0).toLowerCase()}${t.desc.slice(1)} ${joins} ${used.length ? `${used.length} analys${used.length === 1 ? 'is reads' : 'es read'} it, such as ${used[0]!.title.toLowerCase()}.` : ''}`.replace(/\s+/g, ' ').trim();
}
