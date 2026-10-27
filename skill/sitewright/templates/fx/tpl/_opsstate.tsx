'use client';
// The single source of truth for every view: the seed orders and purchase orders, the reducer-like actions, and the derived numbers
// (queues, throughput, KPIs, nav badges). Overview, Orders, Production, Inventory, Suppliers, Reports and Settings all read this.
import { useRef, useState } from 'react';
import { seeded } from './_dash';
import { DEFAULT_THRESHOLDS, NEXT, PARTS, STATION_DEFS, SUPPLIERS, TODAY, dayLabel, lead, stationName, type LiveStation, type Part, type StationId, type Thresholds } from './_ops';

export type OrderStatus = 'new' | 'production' | 'ready' | 'shipped';
export interface Line { model: string; qty: number; price: number }
export interface Order { id: string; customer: string; due: number; status: OrderStatus; stage: StationId | null; lines: Line[]; note: string; placed: number; shippedOn?: number }
export interface PO { id: string; supplier: string; sku: string; qty: number; unit: number; placed: number; due: number; note: string; status: 'open' | 'received'; chased: boolean }
export interface StationCfg { cap: number; start: string; end: string }
export interface Plant { weekday: number; sat: number; sun: number }
export interface Block { reason: string; since: string }
export interface S {
  orders: Order[]; pos: PO[]; reorder: Record<string, number>; received: Record<string, number>; ordered: Record<string, number>;
  blocks: Partial<Record<StationId, Block>>; crew: Record<StationId, string[]>; cfg: Record<StationId, StationCfg>; plant: Plant; thr: Thresholds;
  ship: { total: number; ok: number; units: number }; poSeq: number;
}
export interface Toast { id: number; msg: string; undo?: () => void }

export const MODELS = [{ model: 'Roadster R2', price: 1180 }, { model: 'Gravel GX', price: 1340 }, { model: 'City Step', price: 760 }, { model: 'Tourer 650b', price: 1090 }, { model: 'Kids 20', price: 420 }];
export const CUSTOMERS = ['Pedal & Pine', 'Harbour Cycles', 'Velo Nord', 'Brightside Bikes', 'Crankhouse', 'Tern Valley Sports', 'Open Road Co-op', 'Lowtide Cycles', 'Alder & Rim', 'Fieldwork Outfitters', 'Cadence Club', 'Summit Row'];
export const units = (o: Order) => o.lines.reduce((a, l) => a + l.qty, 0);
export const value = (o: Order) => o.lines.reduce((a, l) => a + l.qty * l.price, 0);
export const isLate = (o: Order) => o.status !== 'shipped' && o.due < 0;
export const STATUS_LABEL: Record<OrderStatus, string> = { new: 'New', production: 'In production', ready: 'Ready', shipped: 'Shipped' };
export const DAY_DEMAND = [96, 44, 132, 146, 168, 151, 139, 88, 41, 127];

type Raw = [OrderStatus, StationId | null, number, number, string];
function buildOrders(): Order[] {
  const r = seeded(77);
  const raw: Raw[] = [
    ['production', 'frames', 8, 2, 'Fit sticker set B'], ['production', 'frames', 6, 3, ''], ['production', 'wheels', 12, 1, ''], ['production', 'wheels', 10, 2, 'Tubeless valves'],
    ['production', 'drivetrain', 16, -1, 'Waiting on 11-speed chains'], ['production', 'drivetrain', 15, 1, ''], ['production', 'assembly', 11, 0, ''], ['production', 'assembly', 8, 0, 'Pickup by customer'], ['production', 'packing', 6, 0, ''],
    ['ready', null, 14, -2, 'Carrier rescheduled'], ['ready', null, 22, -1, 'Awaiting pallet pickup'], ['new', null, 18, -3, 'Held: chain shortage'], ['new', null, 12, -1, 'Held: credit check'],
  ];
  const used = DAY_DEMAND.map(() => 0);
  raw.forEach(([, , q, d]) => { if (d >= 0 && d < 10) used[d]! += q; });
  DAY_DEMAND.forEach((t, d) => {
    let rem = t - used[d]!; const n = Math.max(1, Math.round(rem / 46));
    for (let k = 0; k < n; k++) { const q = k === n - 1 ? rem : Math.max(6, Math.round((rem / (n - k)) * (0.8 + r() * 0.4))); rem -= q; raw.push([d === 0 && k === 0 ? 'ready' : 'new', null, q, d, d === 5 ? 'Retail launch 29 Oct' : '']); }
  });
  raw.sort((a, b) => a[3] - b[3]);
  const mk = (st: OrderStatus, stage: StationId | null, qty: number, due: number, note: string, i: number, shippedOn?: number): Order => {
    const k = qty < 10 ? 1 : qty < 30 ? 2 : 3; const pick = [...MODELS].sort(() => r() - 0.5).slice(0, k); let left = qty;
    const lines = pick.map((m, j) => { const q = j === k - 1 ? left : Math.max(1, Math.round(left * (0.4 + r() * 0.3))); left -= q; return { model: m.model, qty: q, price: m.price }; });
    return { id: `SO-${5200 + i}`, customer: CUSTOMERS[(i * 5 + 3) % CUSTOMERS.length]!, due, status: st, stage, lines, note, placed: due - 9 - Math.floor(r() * 8), shippedOn };
  };
  const hist: Array<[number, number, number]> = [[24, -1, -1], [18, -1, 0], [30, -2, -2], [12, -3, -4], [36, -3, -3], [20, -5, -5], [28, -6, -7], [16, -6, -6]];
  return [...hist.map(([q, on, due], i) => mk('shipped', null, q, due, '', 90 + i, on)), ...raw.map(([st, stage, q, d, n], i) => mk(st, stage, q, d, n, i))];
}
const po = (id: number, supplier: string, sku: string, qty: number, due: number, note = ''): PO => ({ id: `PO-${id}`, supplier, sku, qty, unit: PARTS.find((p) => p.sku === sku)!.cost, placed: due - lead(supplier), due, note, status: 'open', chased: false });
const initState = (): S => ({
  orders: buildOrders(),
  pos: [po(2291, 'Kettenwerk GmbH', 'DT-3001', 200, -4, 'Held at customs'), po(2288, 'Kettenwerk GmbH', 'DT-3020', 60, -2, 'Carrier rescheduled'), po(2302, 'Northgate Tube', 'FR-1002', 40, -1, 'Paint line backlog'), po(2297, 'Packwise Packaging', 'PK-5002', 300, -1, 'Awaiting pickup'),
    po(2308, 'Brakewell Components', 'AS-4001', 100, 2), po(2305, 'Rimline Wheels', 'WH-2002', 80, 3), po(2309, 'Saddlecraft', 'AS-4010', 60, 5), po(2306, 'Rimline Wheels', 'WH-2010', 600, 6), po(2303, 'Northgate Tube', 'FR-1001', 50, 8)],
  reorder: {}, received: {}, ordered: {},
  blocks: { drivetrain: { reason: 'Material shortage: chain 11-speed below minimum (22 on hand, 60 needed)', since: '09:40' } },
  crew: Object.fromEntries(STATION_DEFS.map((d) => [d.id, [...d.crew]])) as Record<StationId, string[]>,
  cfg: Object.fromEntries(STATION_DEFS.map((d) => [d.id, { cap: d.cap, start: d.start, end: d.end }])) as Record<StationId, StationCfg>,
  plant: { weekday: 140, sat: 100, sun: 60 }, thr: { ...DEFAULT_THRESHOLDS }, ship: { total: 417, ok: 391, units: 0 }, poSeq: 2310,
});

/* ------------------------------------------------------------------ derived numbers */
export const BLOCK_REASONS = ['Material shortage', 'Machine fault', 'Quality hold', 'No operator available'];
export function derive(s: S, tick: number) {
  const parts: Part[] = PARTS.map((p) => ({ ...p, reorder: s.reorder[p.sku] ?? p.reorder, onHand: p.onHand + (s.received[p.sku] ?? 0) }));
  const open = s.orders.filter((o) => o.status !== 'shipped');
  const stations: LiveStation[] = STATION_DEFS.map((d, i) => {
    const q = open.filter((o) => o.status === 'production' && o.stage === d.id).reduce((a, o) => a + units(o), 0);
    const crew = s.crew[d.id], target = Math.round(((s.cfg[d.id].cap * crew.length) / d.crew.length) * 10) / 10, blk = s.blocks[d.id];
    const status = blk || crew.length === 0 ? 'blocked' : q > 0 ? 'running' : 'idle';
    const thr = status === 'running' ? Math.round(Math.min(target * 1.04, Math.max(0, target * d.eff + 0.35 * Math.sin(tick * 0.9 + i * 1.7))) * 10) / 10 : 0;
    const note = blk ? blk.reason.split(':')[0]! + (blk.reason.includes(':') ? ': ' + blk.reason.split(':')[1]!.trim() : '') : crew.length === 0 ? 'No operators assigned' : status === 'idle' ? 'Waiting on upstream' : `Cycle ${d.cycle} min`;
    return { id: d.id, name: d.name, status, target, thr, q, note, crew, reason: blk?.reason };
  });
  const util = stations.reduce((a, x) => a + (x.target ? x.thr / x.target : 0), 0) / stations.length;
  const wd = (d: number) => new Date(TODAY + d * 864e5).getUTCDay();
  const cap = DAY_DEMAND.map((_, d) => (wd(d) === 0 ? s.plant.sun : wd(d) === 6 ? s.plant.sat : s.plant.weekday));
  const demand = DAY_DEMAND.map((_, d) => open.filter((o) => o.due === d).reduce((a, o) => a + units(o), 0));
  const late = open.filter(isLate);
  const lowParts = parts.filter((p) => p.onHand <= p.reorder);
  const critical = parts.filter((p) => p.onHand / p.perDay < s.thr.critDays);
  const latePos = s.pos.filter((p) => p.status === 'open' && p.due < 0);
  return {
    parts, stations, util, cap, demand, days: DAY_DEMAND.map((_, d) => dayLabel(d)), open, late, lowParts, critical, latePos,
    openPos: s.pos.filter((p) => p.status === 'open'), onTime: s.ship.ok / s.ship.total, dueToday: open.filter((o) => o.due === 0).reduce((a, o) => a + units(o), 0), blocked: stations.filter((x) => x.status === 'blocked'),
  };
}
export type D = ReturnType<typeof derive>;

/* ------------------------------------------------------------------ state + actions */
export function useOps() {
  const [s, setS] = useState<S>(initState); const cur = useRef(s); const seq = useRef(0); const [toast, setToast] = useState<Toast | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const say = (msg: string, undo?: () => void) => setToast({ id: ++seq.current, msg, undo });
  const commit = (n: S) => { cur.current = n; setS(n); };
  const act = (fn: (x: S) => S, msg?: string, undoable = false) => {
    const prev = cur.current; commit(fn(prev));
    if (msg) say(msg, undoable ? () => { commit(prev); say('Undone'); } : undefined);
  };
  const setOrder = (id: string, f: (o: Order) => Order) => (x: S): S => ({ ...x, orders: x.orders.map((o) => (o.id === id ? f(o) : o)) });
  const find = (id: string) => cur.current.orders.find((o) => o.id === id)!;
  const A = {
    start: (id: string) => act(setOrder(id, (o) => ({ ...o, status: 'production', stage: 'frames' })), `${id} started: ${units(find(id))} units queued at Frames`, true),
    ready: (id: string) => act(setOrder(id, (o) => ({ ...o, status: 'ready', stage: null })), `${id} marked ready to ship`, true),
    ship: (id: string) => { const o = find(id), ok = o.due >= 0; act((x) => ({ ...setOrder(id, (q) => ({ ...q, status: 'shipped', shippedOn: 0 }))(x), ship: { total: x.ship.total + 1, ok: x.ship.ok + (ok ? 1 : 0), units: x.ship.units + units(o) } }), `${id} shipped to ${o.customer}${ok ? '' : ` (${-o.due} d late)`}`, true); },
    advance: (id: string) => { const o = find(id), nx = o.stage ? NEXT[o.stage] : null; if (nx) act(setOrder(id, (q) => ({ ...q, stage: nx })), `${id} moved to ${stationName(nx)}`); else A.ready(id); },
    block: (st: StationId, reason: string) => act((x) => ({ ...x, blocks: { ...x.blocks, [st]: { reason, since: '11:20' } } }), `${stationName(st)} blocked: ${reason}`, true),
    unblock: (st: StationId, how: string) => act((x) => { const b = { ...x.blocks }; delete b[st]; return { ...x, blocks: b }; }, `${stationName(st)} unblocked: ${how}`, true),
    moveCrew: (name: string, from: StationId, to: StationId) => act((x) => ({ ...x, crew: { ...x.crew, [from]: x.crew[from].filter((n) => n !== name), [to]: [...x.crew[to], name] } }), `${name} reassigned from ${stationName(from)} to ${stationName(to)}`, true),
    commitPo: (items: Array<{ sku: string; qty: number }>, msg: string) => {
      const x = cur.current, bySup = new Map<string, Array<{ sku: string; qty: number }>>();
      items.forEach((it) => { const sup = PARTS.find((p) => p.sku === it.sku)!.supplier; bySup.set(sup, [...(bySup.get(sup) ?? []), it]); });
      let n = x.poSeq; const add: PO[] = [];
      bySup.forEach((its, sup) => { its.forEach((it) => add.push({ ...po(n, sup, it.sku, it.qty, lead(sup)), placed: 0 })); n++; });
      act((y) => ({ ...y, pos: [...y.pos, ...add], poSeq: n, ordered: { ...y.ordered, ...Object.fromEntries(items.map((i) => [i.sku, i.qty])) } }), msg, true);
      setSelected(new Set());
    },
    receive: (id: string) => { const p = cur.current.pos.find((q) => q.id === id)!; act((x) => ({ ...x, pos: x.pos.map((q) => (q.id === id ? { ...q, status: 'received' as const } : q)), received: { ...x.received, [p.sku]: (x.received[p.sku] ?? 0) + p.qty }, ordered: Object.fromEntries(Object.entries(x.ordered).filter(([k]) => k !== p.sku)) }), `${id} received: ${p.qty} units added to stock`, true); },
    chase: (id: string) => { const p = cur.current.pos.find((q) => q.id === id)!; act((x) => ({ ...x, pos: x.pos.map((q) => (q.id === id ? { ...q, chased: true } : q)) }), `Asked ${p.supplier} for an update on ${id}`); },
    saveReorder: (m: Record<string, number>) => act((x) => ({ ...x, reorder: { ...x.reorder, ...m } }), `Reorder points saved for ${Object.keys(m).length} ${Object.keys(m).length === 1 ? 'part' : 'parts'}`),
    saveStations: (cfg: Record<StationId, StationCfg>) => act((x) => ({ ...x, cfg }), 'Station capacity and shift hours saved'),
    savePlant: (plant: Plant) => act((x) => ({ ...x, plant }), 'Plant capacity saved'),
    saveThr: (thr: Thresholds) => act((x) => ({ ...x, thr }), 'Alert thresholds saved'),
  };
  return { s, A, toast, say, dismiss: () => setToast(null), selected, setSelected, supplierNames: SUPPLIERS.map((x) => x.name) };
}
export type Ops = ReturnType<typeof useOps>;
