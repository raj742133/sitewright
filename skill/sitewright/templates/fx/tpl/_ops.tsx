'use client';
// Static data and small pieces for the operations dashboard: the bicycle workshop's parts, stations and suppliers, the capacity chart and a station tile.
// Everything that changes (orders, purchase orders, blocks, crews, thresholds) lives in _opsstate.tsx and is derived from this seed.
import { BarChart, Glyph, Pill, Progress, fmt, useWidth } from './_dash';

export type StationId = 'frames' | 'wheels' | 'drivetrain' | 'assembly' | 'qa' | 'packing';
export interface Part { sku: string; name: string; cat: string; station: StationId; onHand: number; reorder: number; perDay: number; cost: number; supplier: string }
export interface Supplier { name: string; lead: number; onTime: number; spend: number; region: string; contact: string; email: string; phone: string; terms: string }
export interface StationDef { id: StationId; name: string; cap: number; crew: string[]; eff: number; cycle: number; start: string; end: string }
export interface Thresholds { critDays: number; onTime: number; utilFloor: number; queueMax: number }

export const TODAY = Date.UTC(2026, 9, 24);
export const dateLabel = (offset: number) => new Date(TODAY + offset * 864e5).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
export const dayLabel = (offset: number) => new Date(TODAY + offset * 864e5).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', timeZone: 'UTC' });

export const SUPPLIERS: Supplier[] = [
  { name: 'Kettenwerk GmbH', lead: 14, onTime: 81, spend: 18420, region: 'Schweinfurt, DE', contact: 'Jana Hollweg', email: 'jana.hollweg@kettenwerk.example', phone: '+49 9721 555 0142', terms: 'Net 45' },
  { name: 'Rimline Wheels', lead: 11, onTime: 88, spend: 22150, region: 'Brno, CZ', contact: 'Pavel Doležal', email: 'p.dolezal@rimline.example', phone: '+420 541 555 019', terms: 'Net 30' },
  { name: 'Saddlecraft', lead: 10, onTime: 90, spend: 6840, region: 'Leicester, UK', contact: 'Fiona Marsh', email: 'fiona@saddlecraft.example', phone: '+44 116 555 0187', terms: 'Net 30' },
  { name: 'Northgate Tube', lead: 9, onTime: 92, spend: 31900, region: 'Sheffield, UK', contact: 'Callum Rhodes', email: 'callum.rhodes@northgatetube.example', phone: '+44 114 555 0123', terms: 'Net 60' },
  { name: 'Brakewell Components', lead: 7, onTime: 95, spend: 14270, region: 'Lyon, FR', contact: 'Amélie Rousset', email: 'a.rousset@brakewell.example', phone: '+33 4 72 55 01 64', terms: 'Net 30' },
  { name: 'Packwise Packaging', lead: 4, onTime: 98, spend: 5230, region: 'Rotterdam, NL', contact: 'Daan Verhoeven', email: 'daan@packwise.example', phone: '+31 10 555 0175', terms: 'Net 14' },
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
export const money = (v: number) => (v >= 100 ? `$${Math.round(v).toLocaleString('en-US')}` : `$${v.toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`);

export const DEFAULT_THRESHOLDS: Thresholds = { critDays: 4, onTime: 95, utilFloor: 70, queueMax: 30 };

/** Stations of the line in flow order. `cap` is units per hour at full crew; the crew lists are the day shift. */
export const STATION_DEFS: StationDef[] = [
  { id: 'frames', name: 'Frames', cap: 7, eff: 0.89, cycle: 9.4, start: '06:00', end: '14:00', crew: ['Mara Voss', 'Ibrahim Sy'] },
  { id: 'wheels', name: 'Wheels', cap: 12, eff: 0.95, cycle: 5.1, start: '06:00', end: '14:00', crew: ['Tomas Reyes', 'Lena Fischer', 'Ola Brandt'] },
  { id: 'drivetrain', name: 'Drivetrain', cap: 9, eff: 0.93, cycle: 6.5, start: '06:00', end: '14:00', crew: ['Priya Nair', 'Jonas Kuhl', 'Wei Zhang'] },
  { id: 'assembly', name: 'Assembly', cap: 9, eff: 0.9, cycle: 6.7, start: '06:00', end: '14:00', crew: ['Hana Okafor', 'Diego Marin', 'Sam Whitlock'] },
  { id: 'qa', name: 'QA', cap: 9, eff: 0.92, cycle: 4.2, start: '06:00', end: '14:00', crew: ['Noor Haddad', 'Eli Brandt'] },
  { id: 'packing', name: 'Packing', cap: 9, eff: 0.98, cycle: 6.2, start: '06:00', end: '14:00', crew: ['Rosa Linde', 'Kofi Mensah', 'Yuki Tanaka'] },
];
export const stationName = (id: StationId) => STATION_DEFS.find((s) => s.id === id)!.name;
export const NEXT: Record<StationId, StationId | null> = { frames: 'wheels', wheels: 'drivetrain', drivetrain: 'assembly', assembly: 'qa', qa: 'packing', packing: null };
export const SHIFT_CREWS: Record<'evening' | 'night', Record<StationId, string[]>> = {
  evening: { frames: ['Ben Achterberg', 'Sofia Lund'], wheels: ['Marek Novak', 'Chidi Eze'], drivetrain: ['Alma Reyes', 'Tobias Wirth'], assembly: ['Ines Duarte', 'Paul Okoro'], qa: ['Mina Sato'], packing: ['Leo Brandt', 'Zara Idris'] },
  night: { frames: ['Gus Halvorsen'], wheels: ['Neha Rao'], drivetrain: ['Omar Fadel'], assembly: ['Ruth Kamau', 'Dev Malik'], qa: ['Alva Berg'], packing: ['Jin Park'] },
};

/* ------------------------------------------------------------------ orders vs capacity */
const niceMax = (v: number) => { const p = Math.pow(10, Math.floor(Math.log10(v || 1))); const f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; };
/** The kit's stacked bars (within / over capacity) with a stepped capacity line drawn over the same geometry. */
export function CapacityChart({ days, demand, cap, height = 280 }: { days: string[]; demand: number[]; cap: number[]; height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const n = days.length, padL = 40, padR = 6, padT = 10, padB = 22, iw = Math.max(10, w - padL - padR), ih = height - padT - padB, slot = iw / n;
  const max = niceMax(Math.max(...demand, ...cap)), y = (v: number) => padT + ih - (v / max) * ih;
  const path = cap.map((c, i) => `${i ? 'L' : 'M'}${(padL + slot * i).toFixed(1)} ${y(c).toFixed(1)}L${(padL + slot * (i + 1)).toFixed(1)} ${y(c).toFixed(1)}`).join('');
  const peak = demand.indexOf(Math.max(...demand)), over = demand[peak]! - cap[peak]!;
  return (
    <div ref={ref} className="to-cap">
      <BarChart ariaLabel="Orders due per day for the next 10 days against capacity, in units" height={height} labels={days} stacked format={fmt.n}
        series={[{ id: 'in', label: 'Within capacity', data: demand.map((o, i) => Math.min(o, cap[i]!)) }, { id: 'over', label: 'Over capacity', data: demand.map((o, i) => Math.max(0, o - cap[i]!)), color: 'var(--critical, #b32d18)' }]} />
      {w > 0 && (
        <svg className="to-capsvg" width={w} height={height} aria-hidden="true">
          <path d={path} className="to-capline" />
          {over > 0 && <text x={padL + slot * (peak + 0.5)} y={y(demand[peak]!) - 6} textAnchor="middle" className="to-capnote">+{over} over</text>}
        </svg>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ one station of the production line */
export interface LiveStation { id: StationId; name: string; status: 'running' | 'idle' | 'blocked'; target: number; thr: number; q: number; note: string; crew: string[]; reason?: string }
const TONE = { running: 'ok', idle: 'neutral', blocked: 'bad' } as const;
export const LABEL = { running: 'Running', idle: 'Idle', blocked: 'Blocked' } as const;
export const STATUS_TONE = TONE;
export function StationTile({ s, on, onToggle }: { s: LiveStation; on: boolean; onToggle: () => void }) {
  return (
    <li className="to-stli">
      <button type="button" className={`to-st is-${s.status}`} aria-pressed={on} onClick={onToggle} aria-label={`${s.name}, ${LABEL[s.status]}, ${s.thr.toFixed(1)} of ${s.target.toFixed(1)} per hour, queue ${s.q}. Show its low stock parts`}>
        <span className="to-st-h"><span className="to-st-n">{s.name}</span><Pill tone={TONE[s.status]}>{LABEL[s.status]}</Pill></span>
        <span className="to-st-v"><b>{s.thr.toFixed(1)}</b><small>/ {s.target.toFixed(1)} per hr</small></span>
        <Progress value={s.target ? s.thr / s.target : 0} tone={s.status === 'blocked' ? 'bad' : 'signal'} label={`${s.name} throughput against target`} />
        <span className="to-st-f"><span>Queue <b>{s.q}</b></span><span className={s.status === 'blocked' ? 'is-bad' : undefined}>{s.status === 'blocked' && <Glyph name="x" size={11} />}{s.note}</span></span>
      </button>
      <span className="to-flow" aria-hidden="true"><Glyph name="chevron" size={12} /></span>
    </li>
  );
}
