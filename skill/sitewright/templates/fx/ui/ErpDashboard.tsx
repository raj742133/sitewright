'use client';
import { useMemo, useState } from 'react';
import { Bars, Mini, useMounted, useReducedMotion, fmtNum, type Pt2 } from './_d8';

export interface ErpPart { sku: string; name: string; stock: number; min: number; supplier: string }
export interface ErpStage { name: string; done: number; total: number; line: 'running' | 'slow' | 'stopped'; note: string }
export interface ErpSupplier { name: string; lead: number; onTime: number; open: number }
export interface ErpDashboardProps {
  title?: string;
  parts?: ErpPart[];
  stages?: ErpStage[];
  orders?: Pt2[];
  suppliers?: ErpSupplier[];
  className?: string;
}

const PARTS: ErpPart[] = [
  { sku: 'FR-700', name: 'Aluminium road frame 54cm', stock: 38, min: 30, supplier: 'Nordal Tube' },
  { sku: 'FR-290', name: 'Steel gravel frame 56cm', stock: 12, min: 20, supplier: 'Nordal Tube' },
  { sku: 'WH-270', name: 'Rim 700c, 32 hole', stock: 140, min: 80, supplier: 'Roundwell' },
  { sku: 'WH-111', name: 'Hub set, sealed bearing', stock: 46, min: 60, supplier: 'Roundwell' },
  { sku: 'DR-510', name: 'Chainset 50/34', stock: 92, min: 40, supplier: 'Cogline' },
  { sku: 'DR-044', name: 'Rear derailleur, 11 speed', stock: 17, min: 25, supplier: 'Cogline' },
  { sku: 'BR-330', name: 'Disc brake caliper', stock: 210, min: 100, supplier: 'Stopworks' },
  { sku: 'CK-018', name: 'Cockpit stem 90mm', stock: 64, min: 30, supplier: 'Barfield' },
  { sku: 'TY-700', name: 'Tyre 700x28, tubeless', stock: 8, min: 50, supplier: 'Roundwell' },
  { sku: 'SD-005', name: 'Saddle, sport', stock: 71, min: 35, supplier: 'Barfield' },
];
const STAGES: ErpStage[] = [
  { name: 'Frames', done: 182, total: 200, line: 'running', note: 'Welding cell 2 on pace' },
  { name: 'Wheels', done: 131, total: 200, line: 'slow', note: 'Truing bench short a hand' },
  { name: 'Assembly', done: 96, total: 200, line: 'running', note: 'Two stations open' },
  { name: 'QA', done: 44, total: 200, line: 'stopped', note: 'Torque rig recalibrating' },
];
const ORDERS: Pt2[] = [
  { label: 'W1', a: 120, b: 104 }, { label: 'W2', a: 138, b: 121 }, { label: 'W3', a: 126, b: 130 }, { label: 'W4', a: 152, b: 139 },
  { label: 'W5', a: 171, b: 148 }, { label: 'W6', a: 165, b: 160 }, { label: 'W7', a: 188, b: 166 }, { label: 'W8', a: 204, b: 181 },
];
const SUPPLIERS: ErpSupplier[] = [
  { name: 'Nordal Tube', lead: 12, onTime: 94, open: 3 }, { name: 'Roundwell', lead: 18, onTime: 81, open: 5 },
  { name: 'Cogline', lead: 9, onTime: 97, open: 2 }, { name: 'Barfield', lead: 7, onTime: 99, open: 1 },
];
const LINE_LABEL = { running: 'Running', slow: 'Slow', stopped: 'Stopped' } as const;
type SortKey = 'name' | 'stock' | 'cover';

/** Bicycle plant ERP: KPIs, a four-stage production pipeline, sortable parts table with low-stock highlight, weekly orders chart and suppliers. */
export default function ErpDashboard({ title = 'Spokeworks plant', parts = PARTS, stages = STAGES, orders = ORDERS, suppliers = SUPPLIERS, className }: ErpDashboardProps) {
  const mounted = useMounted();
  const reduced = useReducedMotion();
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'cover', dir: 1 });
  const [lowOnly, setLowOnly] = useState(false);
  const cover = (p: ErpPart) => p.stock / p.min;
  const low = parts.filter((p) => p.stock < p.min).length;
  const rows = useMemo(() => {
    const r = parts.filter((p) => !lowOnly || p.stock < p.min);
    const v = (p: ErpPart) => (sort.key === 'name' ? p.name.toLowerCase() : sort.key === 'stock' ? p.stock : cover(p));
    return [...r].sort((a, b) => (v(a) < v(b) ? -1 : v(a) > v(b) ? 1 : 0) * sort.dir);
  }, [parts, sort, lowOnly]);
  const openOrders = orders[orders.length - 1]?.a ?? 0;
  const built = stages[stages.length - 1]?.done ?? 0;
  const th = (key: SortKey, label: string) => (
    <th scope="col" aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="ui-erp-dashboard-sort" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}>
        {label}<span aria-hidden="true">{sort.key === key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ' ◆'}</span>
      </button>
    </th>
  );
  const kpis = [
    { k: 'Parts on hand', v: fmtNum(parts.reduce((s, p) => s + p.stock, 0)), n: `${parts.length} part lines` },
    { k: 'Orders this week', v: String(openOrders), n: `${orders[orders.length - 1]?.b ?? 0} shipped` },
    { k: 'Low-stock parts', v: String(low), n: low ? 'needs reorder' : 'all covered', warn: low > 0 },
    { k: 'Bikes built today', v: String(built), n: `of ${stages[0]?.total ?? 0} planned` },
  ];
  return (
    <section className={`ui-erp-dashboard ${className ?? ''}`} aria-label={`${title} ERP dashboard`}>
      <header className="ui-erp-dashboard-head">
        <div><h2>{title}</h2><p>Bicycle manufacturing, shift A</p></div>
        <ul className="ui-erp-dashboard-lines" aria-label="Production line status">
          {stages.map((s) => <li key={s.name} data-line={s.line}><span aria-hidden="true" className="ui-erp-dashboard-dot" />{s.name}: {LINE_LABEL[s.line]}</li>)}
        </ul>
      </header>
      <ul className="ui-erp-dashboard-kpis">
        {kpis.map((k) => <li key={k.k} className="ui-erp-dashboard-card" data-warn={k.warn ? 'true' : undefined}><span>{k.k}</span><b>{k.v}</b><small>{k.n}</small></li>)}
      </ul>
      <div className="ui-erp-dashboard-grid">
        <section className="ui-erp-dashboard-card ui-erp-dashboard-pipe" aria-labelledby="erp-pipe">
          <h3 id="erp-pipe">Production pipeline</h3>
          <ol>
            {stages.map((s) => {
              const pct = Math.round((s.done / s.total) * 100);
              return (
                <li key={s.name} data-line={s.line}>
                  <div className="ui-erp-dashboard-stage"><b>{s.name}</b><span>{s.done}/{s.total}</span></div>
                  <div className="ui-erp-dashboard-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${s.name} progress`}>
                    <i style={{ width: mounted || reduced ? `${pct}%` : '0%' }} />
                  </div>
                  <small>{LINE_LABEL[s.line]} · {s.note}</small>
                </li>
              );
            })}
          </ol>
        </section>
        <section className="ui-erp-dashboard-card ui-erp-dashboard-orders" aria-labelledby="erp-ord">
          <h3 id="erp-ord">Orders per week</h3>
          <div className="ui-erp-dashboard-legend" aria-hidden="true"><span><i data-s="a" />Received</span><span><i data-s="b" />Shipped</span></div>
          <Bars data={orders} aName="Received" bName="Shipped" title="Weekly bicycle orders received and shipped" height={150} />
        </section>
        <section className="ui-erp-dashboard-card ui-erp-dashboard-parts" aria-labelledby="erp-parts">
          <div className="ui-erp-dashboard-bar">
            <h3 id="erp-parts">Parts inventory</h3>
            <label className="ui-erp-dashboard-check"><input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />Low stock only</label>
          </div>
          <div className="ui-erp-dashboard-scroll" tabIndex={0} role="region" aria-label="Parts table, scrollable">
            <table>
              <thead><tr><th scope="col">SKU</th>{th('name', 'Part')}{th('stock', 'In stock')}<th scope="col">Minimum</th>{th('cover', 'Cover')}<th scope="col">Supplier</th></tr></thead>
              <tbody>
                {rows.map((p) => {
                  const isLow = p.stock < p.min;
                  return (
                    <tr key={p.sku} data-low={isLow ? 'true' : undefined}>
                      <td className="ui-erp-dashboard-mono">{p.sku}</td><td>{p.name}</td>
                      <td><b>{p.stock}</b>{isLow && <span className="ui-erp-dashboard-badge">Low</span>}</td>
                      <td>{p.min}</td><td>{cover(p).toFixed(1)}x</td><td>{p.supplier}</td>
                    </tr>
                  );
                })}
                {!rows.length && <tr><td colSpan={6}>Nothing is below its minimum.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="ui-erp-dashboard-live" aria-live="polite">{rows.length} of {parts.length} parts shown</p>
        </section>
        <section className="ui-erp-dashboard-card ui-erp-dashboard-sup" aria-labelledby="erp-sup">
          <h3 id="erp-sup">Suppliers</h3>
          <ul>
            {suppliers.map((s) => (
              <li key={s.name}>
                <div><b>{s.name}</b><small>{s.lead} day lead time · {s.open} open PO</small></div>
                <div className="ui-erp-dashboard-ot" data-bad={s.onTime < 90 ? 'true' : undefined}><span>{s.onTime}% on time</span><i><u style={{ width: `${s.onTime}%` }} /></i></div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}

export function Demo() {
  return <Mini w={1000}><ErpDashboard /></Mini>;
}
