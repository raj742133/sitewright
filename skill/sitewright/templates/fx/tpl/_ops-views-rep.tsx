'use client';
// Reports: throughput, on-time rate trend, utilisation by station, scrap and rework, inventory turns, for a 7 / 30 / 90 day period.
// The 30 day on-time rate and today's shipments come from the shared state, so shipping an order on the Orders view moves these numbers.
import { useMemo, useState, type RefObject } from 'react';
import { AreaChart, BarChart, Button, Kpi, Panel, RankList, Segmented, fmt, seeded, series } from './_dash';
import { LineChart } from './_ops-charts';
import { dateLabel, money } from './_ops';
import type { D, Ops } from './_opsstate';
import { ViewHeader } from './_opsui';

type Period = '7d' | '30d' | '90d';
const N: Record<Period, number> = { '7d': 7, '30d': 30, '90d': 90 };
const BUCKET: Record<Period, number> = { '7d': 1, '30d': 3, '90d': 6 };
const UTIL: Record<string, number> = { frames: 0.79, wheels: 0.86, drivetrain: 0.74, assembly: 0.81, qa: 0.77, packing: 0.88 };
const REASONS: Array<[string, 'scrap' | 'rework', number]> = [['Paint chip at frame weld', 'rework', 0.26], ['Weld porosity', 'scrap', 0.24], ['Spoke tension out of tolerance', 'rework', 0.2], ['Cable routing', 'rework', 0.12], ['Damaged in packing', 'scrap', 0.1], ['Bearing preload', 'rework', 0.08]];

export function ReportsView({ ops, d, hRef }: { ops: Ops; d: D; hRef: RefObject<HTMLHeadingElement | null> }) {
  const [period, setPeriod] = useState<Period>('30d'); const n = N[period], b = BUCKET[period];
  const target = ops.s.thr.onTime;
  const R = useMemo(() => {
    const labels = Array.from({ length: n }, (_, i) => dateLabel(-(n - 1 - i)));
    const shipped = series(41 + n, n, { base: 108, trend: 0.08, wave: 0.14, noise: 0.07 }); shipped[n - 1] = shipped[n - 1]! + ops.s.ship.units;
    const plan = shipped.map(() => 118);
    const endRate = Math.min(99.5, d.onTime * 100 + (period === '7d' ? 1.1 : period === '90d' ? -1.2 : 0)); const r = seeded(500 + n);
    const rate = Array.from({ length: n }, (_, i) => { const t = i / Math.max(1, n - 1); return Math.round((endRate - (1 - t) * 1.6 + (r() - 0.5) * 1.1 * (1 - t * 0.4)) * 10) / 10; }); rate[n - 1] = Math.round(endRate * 10) / 10;
    const pts = Math.round(n / b), bl = Array.from({ length: pts }, (_, i) => dateLabel(-(n - 1 - (i + 1) * b + 1)));
    const made = Array.from({ length: pts }, (_, i) => shipped.slice(i * b, (i + 1) * b).reduce((a, v) => a + v, 0));
    const scrap = made.map((m, i) => Math.round(m * (0.011 + 0.003 * Math.sin(i * 1.3 + n)))), rework = made.map((m, i) => Math.round(m * (0.028 + 0.006 * Math.cos(i * 0.9 + n))));
    return { labels, shipped, plan, rate, bl, scrap, rework, made };
  }, [n, b, period, d.onTime, ops.s.ship.units]);
  const total = R.shipped.reduce((a, v) => a + v, 0), planTotal = R.plan.reduce((a, v) => a + v, 0);
  const sc = R.scrap.reduce((a, v) => a + v, 0), rw = R.rework.reduce((a, v) => a + v, 0), made = R.made.reduce((a, v) => a + v, 0);
  const adj = period === '7d' ? 0.02 : period === '90d' ? -0.02 : 0;
  const util = d.stations.map((s) => ({ label: s.name, value: Math.max(0, UTIL[s.id]! + adj - (period === '7d' && s.status === 'blocked' ? 0.12 : 0)) }));
  const meanUtil = util.reduce((a, u) => a + u.value, 0) / util.length;
  const cats = ['Frames', 'Wheels', 'Drivetrain', 'Assembly', 'QA', 'Packing'].map((c) => {
    const ps = d.parts.filter((p) => p.cat === c), stock = ps.reduce((a, p) => a + p.onHand * p.cost, 0), day = ps.reduce((a, p) => a + p.perDay * p.cost, 0);
    return { c, stock, used: day * n, days: stock / day, turns: (day * 300) / stock };
  });
  const stockAll = cats.reduce((a, c) => a + c.stock, 0), dayAll = cats.reduce((a, c) => a + c.used / n, 0), turns = (dayAll * 300) / stockAll;
  const lead = Math.round(R.rate[n - 1]! * 10) / 10;
  const alloc = (kind: 'scrap' | 'rework', sum: number) => { const rs = REASONS.filter((x) => x[1] === kind), w = rs.reduce((a, x) => a + x[2], 0); let left = sum; return rs.map((x, i) => { const v = i === rs.length - 1 ? left : Math.round((sum * x[2]) / w); left -= v; return { label: x[0], value: v, sub: kind }; }); };
  const reasons = [...alloc('scrap', sc), ...alloc('rework', rw)].sort((a, b2) => b2.value - a.value);
  const exportCsv = () => {
    const csv = ['date,units_shipped,plan,on_time_pct', ...R.labels.map((l, i) => `${l},${R.shipped[i]},${R.plan[i]},${R.rate[i]}`)].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `operations-${period}.csv`; a.click(); URL.revokeObjectURL(a.href); ops.say(`Exported ${n} days to operations-${period}.csv`);
  };
  return (
    <>
      <ViewHeader hRef={hRef} title="Reports" sub={`Last ${n} days to 24 Oct 2026`}>
        <Segmented label="Period" value={period} onChange={setPeriod} options={[{ id: '7d', label: '7 days' }, { id: '30d', label: '30 days' }, { id: '90d', label: '90 days' }]} />
        <Button icon="file" onClick={exportCsv}>Export CSV</Button>
      </ViewHeader>
      <div className="td-kpis">
        <Kpi label="Units shipped" value={fmt.n(total)} delta={((total - planTotal) / planTotal) * 100} hint={`plan ${fmt.n(planTotal)}`} spark={R.shipped.slice(-14)} />
        <Kpi label="On-time rate" value={`${lead.toFixed(1)}%`} hint={`target ${target}%`} spark={R.rate.slice(-14)} tone="signal" />
        <Kpi label="Line utilisation" value={fmt.p(meanUtil, 0)} hint={`floor ${ops.s.thr.utilFloor}%`} spark={series(60 + n, 14, { base: 70, trend: 0.1, wave: 0.1 })} />
        <Kpi label="Scrap + rework" value={fmt.p((sc + rw) / made)} hint={`${fmt.n(sc)} scrap · ${fmt.n(rw)} rework`} tone="signal" spark={R.rework.slice(-14)} />
      </div>
      <div className="to-r2">
        <Panel id="to-r-th" title="Throughput" sub="Units shipped per day against plan">
          <AreaChart ariaLabel={`Units shipped per day over ${n} days against a plan of 118`} labels={R.labels} height={240} format={fmt.n} area={false}
            series={[{ id: 's', label: 'Shipped', data: R.shipped }, { id: 'p', label: 'Plan', data: R.plan, color: 'color-mix(in srgb, var(--ink, #15130e) 45%, transparent)' }]} />
        </Panel>
        <Panel id="to-r-ot" title="On-time rate" sub={`Percent of orders shipped by their due date, target ${target}%`}>
          <LineChart labels={R.labels} data={R.rate} target={target} format={(v) => `${v.toFixed(v % 1 ? 1 : 0)}%`} name="On time" targetName="Target" height={240} label={`On-time rate per day over ${n} days against a ${target}% target`} />
        </Panel>
      </div>
      <div className="to-r3">
        <Panel id="to-r-ut" title="Utilisation by station" sub="Average throughput against capacity"><RankList tone="signal" rows={util} format={(v) => fmt.p(v, 0)} /></Panel>
        <Panel id="to-r-sr" title="Scrap and rework" sub={`Units per ${b === 1 ? 'day' : `${b} days`}`}>
          <BarChart ariaLabel={`Scrap and rework units per ${b} days`} labels={R.bl} height={200} stacked format={fmt.n} series={[{ id: 'rw', label: 'Rework', data: R.rework, color: 'var(--signal, #0f766e)' }, { id: 'sc', label: 'Scrap', data: R.scrap, color: 'var(--critical, #b32d18)' }]} />
        </Panel>
        <Panel id="to-r-rs" title="Top causes" sub={`${fmt.n(sc + rw)} units in the period`}><RankList rows={reasons} format={fmt.n} /></Panel>
      </div>
      <Panel id="to-r-tn" title="Inventory turns" sub={`${turns.toFixed(1)} turns a year overall · ${money(stockAll)} in stock`} flush>
        <div className="td-tablewrap"><table className="td-table to-tbl">
          <caption className="td-sr">Inventory turns by category</caption>
          <thead><tr><th scope="col">Category</th><th scope="col" className="is-r">Stock value</th><th scope="col" className="is-r hide-sm">Used in period</th><th scope="col" className="is-r">Days of stock</th><th scope="col" className="is-r">Turns a year</th></tr></thead>
          <tbody>{cats.map((c) => <tr key={c.c}><td><b>{c.c}</b></td><td className="is-r">{money(c.stock)}</td><td className="is-r hide-sm">{money(c.used)}</td><td className="is-r">{c.days.toFixed(1)}</td><td className="is-r"><span className="to-cover"><span className="to-bar"><i style={{ width: `${Math.min(1, c.turns / 30) * 100}%` }} /></span><b>{c.turns.toFixed(1)}</b></span></td></tr>)}</tbody>
          <tfoot><tr><td>All parts</td><td className="is-r">{money(stockAll)}</td><td className="is-r hide-sm">{money(dayAll * n)}</td><td className="is-r">{(stockAll / dayAll).toFixed(1)}</td><td className="is-r">{turns.toFixed(1)}</td></tr></tfoot>
        </table></div>
      </Panel>
    </>
  );
}
