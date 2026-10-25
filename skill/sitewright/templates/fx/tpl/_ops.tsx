'use client';
// Data and small pieces for the operations dashboard: the bicycle workshop's parts, stations, suppliers, late POs, the capacity chart and a station tile.
import { BarChart, Icon, Pill, Progress, fmt, useWidth } from './_dash';

export type StationId = 'frames' | 'wheels' | 'drivetrain' | 'assembly' | 'qa' | 'packing';
export interface Part { sku: string; name: string; cat: string; station: StationId; onHand: number; reorder: number; perDay: number; cost: number; supplier: string }
export interface Supplier { name: string; lead: number; onTime: number; spend: number }
export interface Station { id: StationId; name: string; status: 'running' | 'idle' | 'blocked'; target: number; base: number; queue: number; note: string }

export const TODAY = Date.UTC(2026, 9, 24);
export const dateLabel = (offset: number) => new Date(TODAY + offset * 864e5).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export const SUPPLIERS: Supplier[] = [
  { name: 'Kettenwerk GmbH', lead: 14, onTime: 81, spend: 18420 },
  { name: 'Rimline Wheels', lead: 11, onTime: 88, spend: 22150 },
  { name: 'Saddlecraft', lead: 10, onTime: 90, spend: 6840 },
  { name: 'Northgate Tube', lead: 9, onTime: 92, spend: 31900 },
  { name: 'Brakewell Components', lead: 7, onTime: 95, spend: 14270 },
  { name: 'Packwise Packaging', lead: 4, onTime: 98, spend: 5230 },
];
export const lead = (name: string) => SUPPLIERS.find((s) => s.name === name)?.lead ?? 7;

export const PARTS: Part[] = [
  { sku: 'FR-1001', name: 'Frame blank, 6061 alloy, M', cat: 'Frames', station: 'frames', onHand: 46, reorder: 40, perDay: 6, cost: 118, supplier: 'Northgate Tube' },
  { sku: 'FR-1002', name: 'Frame blank, 6061 alloy, L', cat: 'Frames', station: 'frames', onHand: 18, reorder: 30, perDay: 5, cost: 124, supplier: 'Northgate Tube' },
  { sku: 'FR-1010', name: 'Fork, carbon tapered', cat: 'Frames', station: 'frames', onHand: 52, reorder: 35, perDay: 6, cost: 64, supplier: 'Northgate Tube' },
  { sku: 'FR-1020', name: 'Headset bearing kit', cat: 'Frames', station: 'frames', onHand: 210, reorder: 120, perDay: 14, cost: 9.5, supplier: 'Brakewell Components' },
  { sku: 'WH-2001', name: 'Rim 700c disc, 28h', cat: 'Wheels', station: 'wheels', onHand: 140, reorder: 100, perDay: 12, cost: 22, supplier: 'Rimline Wheels' },
  { sku: 'WH-2002', name: 'Rear hub, 12-speed', cat: 'Wheels', station: 'wheels', onHand: 64, reorder: 80, perDay: 9, cost: 41, supplier: 'Rimline Wheels' },
  { sku: 'WH-2010', name: 'Spoke set, 32 pc', cat: 'Wheels', station: 'wheels', onHand: 260, reorder: 300, perDay: 40, cost: 6.2, supplier: 'Rimline Wheels' },
  { sku: 'WH-2020', name: 'Tyre 700x28', cat: 'Wheels', station: 'wheels', onHand: 310, reorder: 150, perDay: 22, cost: 12.8, supplier: 'Rimline Wheels' },
  { sku: 'DT-3001', name: 'Chain, 11-speed', cat: 'Drivetrain', station: 'drivetrain', onHand: 22, reorder: 60, perDay: 12, cost: 14.2, supplier: 'Kettenwerk GmbH' },
  { sku: 'DT-3002', name: 'Cassette 11-34t', cat: 'Drivetrain', station: 'drivetrain', onHand: 88, reorder: 70, perDay: 9, cost: 31, supplier: 'Kettenwerk GmbH' },
  { sku: 'DT-3010', name: 'Crankset 170 mm', cat: 'Drivetrain', station: 'drivetrain', onHand: 41, reorder: 40, perDay: 7, cost: 58, supplier: 'Kettenwerk GmbH' },
  { sku: 'DT-3020', name: 'Rear derailleur', cat: 'Drivetrain', station: 'drivetrain', onHand: 35, reorder: 45, perDay: 8, cost: 47, supplier: 'Kettenwerk GmbH' },
  { sku: 'AS-4001', name: 'Brake caliper set', cat: 'Assembly', station: 'assembly', onHand: 120, reorder: 80, perDay: 10, cost: 36, supplier: 'Brakewell Components' },
  { sku: 'AS-4002', name: 'Handlebar 420 mm', cat: 'Assembly', station: 'assembly', onHand: 95, reorder: 60, perDay: 9, cost: 18.5, supplier: 'Brakewell Components' },
  { sku: 'AS-4010', name: 'Saddle, road', cat: 'Assembly', station: 'assembly', onHand: 70, reorder: 60, perDay: 8, cost: 24, supplier: 'Saddlecraft' },
  { sku: 'QA-6001', name: 'Inspection tag set', cat: 'QA', station: 'qa', onHand: 540, reorder: 200, perDay: 25, cost: 0.4, supplier: 'Packwise Packaging' },
  { sku: 'PK-5001', name: 'Bike box, double wall', cat: 'Packing', station: 'packing', onHand: 150, reorder: 100, perDay: 12, cost: 7.8, supplier: 'Packwise Packaging' },
  { sku: 'PK-5002', name: 'Foam protection kit', cat: 'Packing', station: 'packing', onHand: 90, reorder: 120, perDay: 12, cost: 3.4, supplier: 'Packwise Packaging' },
];
export const cover = (p: Part) => p.onHand / p.perDay;
export const isLow = (p: Part) => p.onHand <= p.reorder;
export const suggest = (p: Part) => Math.max(5, Math.ceil((p.reorder * 2 - p.onHand) / 5) * 5);
export const money = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

export const STATIONS: Station[] = [
  { id: 'frames', name: 'Frames', status: 'running', target: 7, base: 6.2, queue: 14, note: 'Cycle 9.4 min' },
  { id: 'wheels', name: 'Wheels', status: 'running', target: 12, base: 11.4, queue: 22, note: 'Cycle 5.1 min' },
  { id: 'drivetrain', name: 'Drivetrain', status: 'blocked', target: 9, base: 0, queue: 31, note: 'Chain 11-speed below minimum' },
  { id: 'assembly', name: 'Assembly', status: 'running', target: 9, base: 8.1, queue: 19, note: 'Cycle 6.7 min' },
  { id: 'qa', name: 'QA', status: 'idle', target: 9, base: 0, queue: 3, note: 'Waiting on assembly' },
  { id: 'packing', name: 'Packing', status: 'running', target: 9, base: 8.8, queue: 6, note: 'Cycle 6.2 min' },
];

export const DAYS = ['Sat 24', 'Sun 25', 'Mon 26', 'Tue 27', 'Wed 28', 'Thu 29', 'Fri 30', 'Sat 31', 'Sun 1', 'Mon 2'];
export const ORDERS = [96, 44, 132, 146, 168, 151, 139, 88, 41, 127];
export const CAP = [100, 60, 140, 140, 140, 140, 140, 100, 60, 140];

export const LATE = [
  { po: 'PO-2291', supplier: 'Kettenwerk GmbH', part: 'Chain, 11-speed × 200', due: -4, why: 'Held at customs' },
  { po: 'PO-2288', supplier: 'Kettenwerk GmbH', part: 'Rear derailleur × 60', due: -2, why: 'Carrier rescheduled' },
  { po: 'PO-2302', supplier: 'Northgate Tube', part: 'Frame blank, L × 40', due: -1, why: 'Paint line backlog' },
  { po: 'PO-2297', supplier: 'Packwise Packaging', part: 'Foam protection kit × 300', due: -1, why: 'Awaiting pickup' },
];

/* ------------------------------------------------------------------ orders vs capacity */
const niceMax = (v: number) => { const p = Math.pow(10, Math.floor(Math.log10(v || 1))); const f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; };
/** The kit's stacked bars (within / over capacity) with a stepped capacity line drawn over the same geometry. */
export function CapacityChart({ height = 232 }: { height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const n = DAYS.length, padL = 40, padR = 6, padT = 10, padB = 22, iw = Math.max(10, w - padL - padR), ih = height - padT - padB, slot = iw / n;
  const max = niceMax(Math.max(...ORDERS)), y = (v: number) => padT + ih - (v / max) * ih;
  const path = CAP.map((c, i) => `${i ? 'L' : 'M'}${(padL + slot * i).toFixed(1)} ${y(c).toFixed(1)}L${(padL + slot * (i + 1)).toFixed(1)} ${y(c).toFixed(1)}`).join('');
  const peak = ORDERS.indexOf(Math.max(...ORDERS)), over = ORDERS[peak]! - CAP[peak]!;
  return (
    <div ref={ref} className="to-cap">
      <BarChart ariaLabel="Orders due per day for the next 10 days against capacity, in units" height={height} labels={DAYS} stacked format={fmt.n}
        series={[{ id: 'in', label: 'Within capacity', data: ORDERS.map((o, i) => Math.min(o, CAP[i]!)) }, { id: 'over', label: 'Over capacity', data: ORDERS.map((o, i) => Math.max(0, o - CAP[i]!)), color: 'var(--critical, #b32d18)' }]} />
      {w > 0 && (
        <svg className="to-capsvg" width={w} height={height} aria-hidden="true">
          <path d={path} className="to-capline" />
          {over > 0 && <text x={padL + slot * (peak + 0.5)} y={y(ORDERS[peak]!) - 6} textAnchor="middle" className="to-capnote">+{over} over</text>}
        </svg>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ one station of the production line */
export interface LiveStation extends Station { thr: number; q: number }
const TONE = { running: 'ok', idle: 'neutral', blocked: 'bad' } as const;
const LABEL = { running: 'Running', idle: 'Idle', blocked: 'Blocked' } as const;
export function StationTile({ s, index, on, onToggle }: { s: LiveStation; index: number; on: boolean; onToggle: () => void }) {
  return (
    <li className="to-stli">
      <button type="button" className={`to-st is-${s.status}`} aria-pressed={on} onClick={onToggle} aria-label={`${s.name}, ${LABEL[s.status]}, ${s.thr.toFixed(1)} of ${s.target} per hour, queue ${s.q}. Show its parts in inventory`}>
        <span className="to-st-h"><span className="to-st-n"><em>{index + 1}</em>{s.name}</span><Pill tone={TONE[s.status]}>{LABEL[s.status]}</Pill></span>
        <span className="to-st-v"><b>{s.thr.toFixed(1)}</b><small>/ {s.target} per hr</small></span>
        <Progress value={s.thr / s.target} tone={s.status === 'blocked' ? 'bad' : 'signal'} label={`${s.name} throughput against target`} />
        <span className="to-st-f"><span>Queue <b>{s.q}</b></span><span className={s.status === 'blocked' ? 'is-bad' : undefined}>{s.status === 'blocked' && <Icon name="x" size={11} />}{s.note}</span></span>
      </button>
      <span className="to-flow" aria-hidden="true"><Icon name="chevron" size={12} /></span>
    </li>
  );
}
