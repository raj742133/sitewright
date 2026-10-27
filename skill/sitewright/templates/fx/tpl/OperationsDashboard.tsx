'use client';
import { useEffect, useRef, useState } from 'react';
import { Button, Glyph, Kpi, Panel, Pill, Preview, RankList, Segmented, Shell, fmt, series, useReducedMotion, type NavEntry } from './_dash';
import { CapacityChart, StationTile, SUPPLIERS, dateLabel, money, type StationId } from './_ops';
import { PoDialog, statusOf, type PoResult } from './_opsinv';
import { derive, useOps } from './_opsstate';
import { Toaster, ViewHeader } from './_opsui';
import { OrderDrawer, OrdersView } from './_ops-views-orders';
import { ProductionView } from './_ops-views-prod';
import { InventoryView } from './_ops-views-inv';
import { SuppliersView } from './_ops-views-sup';
import { ReportsView } from './_ops-views-rep';
import { SettingsView } from './_ops-views-set';

const TITLES: Record<string, string> = { overview: 'Overview', orders: 'Orders', line: 'Production', inventory: 'Inventory', suppliers: 'Suppliers', reports: 'Reports', settings: 'Settings' };
type SupView = 'lead' | 'spend';

export default function OperationsDashboard({ brand = 'Spokeworks' }: { brand?: string }) {
  const [active, setActive] = useState('overview'); const [announce, setAnnounce] = useState('');
  const [tick, setTick] = useState(0); const [live, setLive] = useState(true); const [visible, setVisible] = useState(true); const reduced = useReducedMotion();
  const [station, setStation] = useState<StationId | null>(null); const [po, setPo] = useState(false); const [supView, setSupView] = useState<SupView>('lead'); const [open, setOpen] = useState<string | null>(null);
  const ops = useOps(); const { s, A, selected, setSelected } = ops; const d = derive(s, tick);
  const hRef = useRef<HTMLHeadingElement>(null); const first = useRef(true); const fromUrl = useRef(false);

  useEffect(() => { const v = new URLSearchParams(window.location.search).get('view'); if (v && TITLES[v]) { fromUrl.current = true; setActive(v); } }, []);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (fromUrl.current) { fromUrl.current = false; return; }
    hRef.current?.closest('.td-content')?.scrollTo(0, 0); hRef.current?.focus({ preventScroll: true }); setAnnounce(`${TITLES[active]} view`);
  }, [active]);
  const running = live && !reduced && visible;
  useEffect(() => { const f = () => setVisible(!document.hidden); f(); document.addEventListener('visibilitychange', f); return () => document.removeEventListener('visibilitychange', f); }, []);
  useEffect(() => { if (!running) return; const t = setInterval(() => setTick((n) => n + 1), 2500); return () => clearInterval(t); }, [running]);

  const NAV: NavEntry[] = [
    { id: 'overview', label: 'Overview', icon: 'home' }, { id: 'orders', label: 'Orders', icon: 'cart', badge: d.open.length }, { id: 'line', label: 'Production', icon: 'layers', badge: d.blocked.length || undefined },
    { id: 'inventory', label: 'Inventory', icon: 'box', badge: d.lowParts.length || undefined }, { id: 'suppliers', label: 'Suppliers', icon: 'truck', badge: d.latePos.length || undefined }, { id: 'reports', label: 'Reports', icon: 'chart' }, { id: 'settings', label: 'Settings', icon: 'settings' },
  ];
  const lowShown = d.lowParts.filter((p) => !station || p.station === station).sort((a, b) => a.onHand / a.perDay - b.onHand / b.perDay);
  const picked = d.parts.filter((p) => selected.has(p.sku));
  const toggle = (sku: string) => setSelected((x) => { const n = new Set(x); if (!n.delete(sku)) n.add(sku); return n; });
  const place = (r: PoResult) => { A.commitPo(Object.entries(r.lines).map(([sku, qty]) => ({ sku, qty })), `${r.count === 1 ? r.ids[0] : `${r.ids[0]} to ${r.ids[r.ids.length - 1]}`} placed: ${fmt.n(r.units)} units, ${money(r.total)}`); setPo(false); };
  const sup = [...SUPPLIERS].sort((a, b) => (supView === 'lead' ? b.lead - a.lead : b.spend - a.spend)).map((x) => ({ label: x.name, value: supView === 'lead' ? x.lead : x.spend, sub: supView === 'lead' ? `${x.onTime}% on time` : `${x.lead} d lead` }));
  const stLabel = station ? d.stations.find((x) => x.id === station)!.name : '';
  const peak = d.demand.indexOf(Math.max(...d.demand)), over = d.demand[peak]! - d.cap[peak]!;
  const sessionPos = s.pos.filter((p) => p.placed === 0).length;
  const stockValue = d.parts.reduce((a, p) => a + p.onHand * p.cost, 0);
  const underFloor = d.util * 100 < s.thr.utilFloor;

  const overview = (
    <>
      <ViewHeader hRef={hRef} title="Operations" sub={`Day shift · Saturday 24 Oct 2026 · 6 stations, ${d.parts.length} stocked parts`}>
        <button type="button" className="to-live" aria-pressed={running} disabled={reduced} onClick={() => setLive((l) => !l)} title={reduced ? 'Live updates are off because reduced motion is on' : live ? 'Pause live updates' : 'Resume live updates'}>
          <i aria-hidden="true" />{reduced ? 'Live off' : running ? 'Live' : live ? 'Paused (tab hidden)' : 'Paused'}
        </button>
      </ViewHeader>
      <div className="td-kpis">
        <Kpi label="Units due today" value={fmt.n(d.dueToday)} delta={-6.8} goodWhen="down" spark={series(31, 14, { base: 100, trend: 0.1, wave: 0.2 })} hint={`of ${d.cap[0]} capacity today`} />
        <Kpi label="On-time rate · 30 d" value={fmt.p(d.onTime)} delta={1.2} spark={series(32, 14, { base: 92, trend: 0.03, wave: 0.02, noise: 0.01 })} tone="signal" hint={`target ${s.thr.onTime}%`} />
        <Kpi label="Line utilisation" value={fmt.p(d.util, 0)} delta={-8.4} spark={series(33, 14, { base: 70, trend: -0.15, wave: 0.12 })} hint={d.blocked.length ? `${d.blocked.map((b) => b.name).join(', ')} blocked` : underFloor ? `below ${s.thr.utilFloor}% floor` : 'all stations flowing'} />
        <Kpi label="Stock value" value={money(stockValue)} spark={series(34, 14, { base: 60, trend: -0.05, wave: 0.05 })} tone="signal" hint={`${d.lowParts.length} of ${d.parts.length} parts low`} />
      </div>
      <Panel id="to-line" title="Production line" sub="Parts flow left to right. Select a station to filter the low stock list below." actions={<span className="to-sub">{d.blocked.length} blocked · {d.stations.filter((x) => x.status === 'running').length} running</span>} flush>
        <ol className="to-line-flow">{d.stations.map((x) => <StationTile key={x.id} s={x} on={station === x.id} onToggle={() => setStation((c) => (c === x.id ? null : x.id))} />)}</ol>
      </Panel>
      <Panel id="to-inv" title="Low stock" sub={`${lowShown.length} ${station ? `at ${stLabel}` : 'parts'} at or below reorder point`} flush
        actions={<><Button variant="ghost" small onClick={() => setActive('inventory')}>Open inventory</Button><Button variant="primary" icon="plus" disabled={picked.length === 0} onClick={() => setPo(true)}>Create purchase order{picked.length ? ` (${picked.length})` : ''}</Button></>}>
        {station && <div className="to-bar-t"><button type="button" className="to-chip" onClick={() => setStation(null)} aria-label={`Clear ${stLabel} filter`}>{stLabel}<Glyph name="x" size={11} /></button></div>}
        {lowShown.length === 0 ? <p className="to-lowe"><Glyph name="check" size={14} />Nothing is below its reorder point{station ? ` at ${stLabel}` : ''}.</p> : (
          <ul className="to-low">{lowShown.slice(0, 6).map((p) => { const st = statusOf(p, s.ordered[p.sku], s.thr.critDays); return (
            <li key={p.sku}><label><input type="checkbox" checked={selected.has(p.sku)} onChange={() => toggle(p.sku)} aria-label={`Select ${p.name}`} /><span className="to-low-n"><b>{p.name}</b><small className="td-mono">{p.sku} · {p.supplier}</small></span></label>
              <span className="to-low-c"><span><b>{p.onHand}</b> / {p.reorder}</span><small>{(p.onHand / p.perDay).toFixed(1)} d cover</small></span><Pill tone={st.tone}>{st.label}</Pill></li>); })}
          </ul>)}
        {lowShown.length > 6 && <p className="to-more"><button type="button" className="to-link" onClick={() => setActive('inventory')}>and {lowShown.length - 6} more in Inventory</button></p>}
      </Panel>
      <div className="to-row">
        <Panel id="to-cap" title="Orders vs capacity" sub="Units due per day, next 10 days" className="to-cap-p" actions={<span className="to-legend"><i />Within<i className="is-over" />Over<i className="is-cap" />Capacity</span>}>
          <CapacityChart days={d.days} demand={d.demand} cap={d.cap} />
          <p className="to-note"><Glyph name="clock" size={13} />{over > 0 ? `${d.days[peak]} peaks at ${d.demand[peak]} units against ${d.cap[peak]}. Move ${over} units to a quieter day or approve overtime.` : `Peak day ${d.days[peak]} is ${d.demand[peak]} of ${d.cap[peak]} units: within capacity.`}</p>
        </Panel>
        <Panel id="to-sup" title="Suppliers" sub="Ranked, slowest first" actions={<Segmented label="Rank suppliers by" value={supView} onChange={setSupView} options={[{ id: 'lead', label: 'Lead time' }, { id: 'spend', label: 'Spend' }]} />}>
          <RankList rows={sup} tone="signal" format={(v) => (supView === 'lead' ? `${v} d` : money(v))} />
        </Panel>
        <Panel id="to-late" title="Late shipments" sub={`${d.latePos.length} past due · ${sessionPos} new PO line${sessionPos === 1 ? '' : 's'} placed`} actions={<Pill tone={d.latePos.some((p) => !p.chased) ? 'bad' : 'ok'}>{d.latePos.filter((p) => !p.chased).length} open</Pill>}>
          {d.latePos.length === 0 ? <p className="to-lowe"><Glyph name="check" size={14} />No purchase orders are past due.</p> : <ul className="to-late">{d.latePos.map((l) => (
            <li key={l.id}>
              <div><b>{d.parts.find((p) => p.sku === l.sku)!.name} × {l.qty}</b><small>{l.supplier} · <span className="td-mono">{l.id}</span></small><small className="to-why">{Math.abs(l.due)} d late, was due {dateLabel(l.due)} · {l.note}</small></div>
              <Button small disabled={l.chased} label={`Chase ${l.id}`} onClick={() => A.chase(l.id)}>{l.chased ? 'Chased' : 'Chase'}</Button>
            </li>))}</ul>}
        </Panel>
      </div>
      {po && <PoDialog parts={picked} firstPo={s.poSeq} onClose={() => setPo(false)} onPlace={place} />}
    </>
  );
  const view = active === 'orders' ? <OrdersView ops={ops} d={d} hRef={hRef} open={open} setOpen={setOpen} />
    : active === 'line' ? <ProductionView ops={ops} d={d} hRef={hRef} setOpen={setOpen} />
    : active === 'inventory' ? <InventoryView ops={ops} d={d} hRef={hRef} />
    : active === 'suppliers' ? <SuppliersView ops={ops} d={d} hRef={hRef} />
    : active === 'reports' ? <ReportsView ops={ops} d={d} hRef={hRef} />
    : active === 'settings' ? <SettingsView ops={ops} d={d} hRef={hRef} /> : overview;
  return (
    <Shell brand={brand} nav={NAV} active={active} onNav={(id) => { setOpen(null); setActive(id); }} title={TITLES[active]} crumbs={[brand, 'Bicycle workshop', TITLES[active]!]} searchHint="Search parts, orders">
      {view}
      {open && <OrderDrawer id={open} ops={ops} onClose={() => setOpen(null)} />}
      <div className="td-sr" role="status" aria-live="polite">{announce}</div>
      <Toaster toast={ops.toast} onClose={ops.dismiss} />
    </Shell>
  );
}

export function Demo() { return <Preview w={1280} h={150}><OperationsDashboard /></Preview>; }
