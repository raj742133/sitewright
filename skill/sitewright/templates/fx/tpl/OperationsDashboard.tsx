'use client';
import { useEffect, useMemo, useState } from 'react';
import { Button, Icon, Kpi, PageHeader, Panel, Pill, Preview, RankList, Segmented, Shell, fmt, series, useReducedMotion, type NavEntry } from './_dash';
import { CAP, CapacityChart, LATE, ORDERS, PARTS, STATIONS, StationTile, SUPPLIERS, dateLabel, isLow, money, type LiveStation, type StationId } from './_ops';
import { InventoryTable, PoDialog, type PoResult } from './_opsinv';

const NAV: NavEntry[] = [
  { id: 'overview', label: 'Overview', icon: 'home' }, { id: 'orders', label: 'Orders', icon: 'cart', badge: 24 }, { id: 'line', label: 'Production', icon: 'layers' },
  { id: 'inventory', label: 'Inventory', icon: 'box' }, { id: 'suppliers', label: 'Suppliers', icon: 'truck' }, { id: 'reports', label: 'Reports', icon: 'chart' }, { id: 'settings', label: 'Settings', icon: 'settings' },
];
type SupView = 'lead' | 'spend';

export default function OperationsDashboard({ brand = 'Spokeworks' }: { brand?: string }) {
  const [active, setActive] = useState('overview');
  const [tick, setTick] = useState(0); const [live, setLive] = useState(true); const [visible, setVisible] = useState(true); const reduced = useReducedMotion();
  const [q, setQ] = useState(''); const [lowOnly, setLowOnly] = useState(false); const [station, setStation] = useState<StationId | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set()); const [ordered, setOrdered] = useState<Record<string, number>>({});
  const [po, setPo] = useState(false); const [poCount, setPoCount] = useState(0); const [chased, setChased] = useState<Set<string>>(new Set());
  const [supView, setSupView] = useState<SupView>('lead'); const [msg, setMsg] = useState('');

  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 6000); return () => clearTimeout(t); }, [msg]);
  const running = live && !reduced && visible;
  useEffect(() => { const f = () => setVisible(!document.hidden); f(); document.addEventListener('visibilitychange', f); return () => document.removeEventListener('visibilitychange', f); }, []);
  useEffect(() => { if (!running) return; const t = setInterval(() => setTick((n) => n + 1), 2500); return () => clearInterval(t); }, [running]);

  const stations: LiveStation[] = STATIONS.map((s, i) => s.status !== 'running' ? { ...s, thr: 0, q: s.queue } : {
    ...s, thr: Math.round(Math.min(s.target * 1.04, Math.max(0, s.base + 0.35 * Math.sin(tick * 0.9 + i * 1.7))) * 10) / 10, q: Math.max(0, s.queue + Math.round(2 * Math.sin(tick * 0.6 + i))),
  });
  const util = stations.reduce((a, s) => a + s.thr / s.target, 0) / stations.length;
  const blocked = stations.filter((s) => s.status === 'blocked');

  const rows = useMemo(() => PARTS.filter((p) => (!station || p.station === station) && (!lowOnly || isLow(p)) && (!q.trim() || `${p.sku} ${p.name} ${p.supplier} ${p.cat}`.toLowerCase().includes(q.trim().toLowerCase()))), [q, lowOnly, station]);
  const stockValue = rows.reduce((a, p) => a + p.onHand * p.cost, 0);
  const lowCount = PARTS.filter(isLow).length;
  const picked = PARTS.filter((p) => selected.has(p.sku));
  const pickedValue = picked.reduce((a, p) => a + p.onHand * p.cost, 0);
  const toggle = (sku: string) => setSelected((s) => { const n = new Set(s); if (!n.delete(sku)) n.add(sku); return n; });
  const selectAll = (skus: string[], on: boolean) => setSelected((s) => { const n = new Set(s); skus.forEach((k) => (on ? n.add(k) : n.delete(k))); return n; });
  const place = (r: PoResult) => {
    setOrdered((o) => ({ ...o, ...r.lines })); setSelected(new Set()); setPo(false); setPoCount((c) => c + r.count);
    setMsg(`${r.count === 1 ? r.ids[0] : `${r.ids[0]} to ${r.ids[r.ids.length - 1]}`} placed: ${fmt.n(r.units)} units, ${money(r.total)}`);
  };
  const sup = [...SUPPLIERS].sort((a, b) => (supView === 'lead' ? b.lead - a.lead : b.spend - a.spend)).map((s) => ({ label: s.name, value: supView === 'lead' ? s.lead : s.spend, sub: supView === 'lead' ? `${s.onTime}% on time` : `${s.lead} d lead` }));
  const stLabel = station ? STATIONS.find((s) => s.id === station)!.name : '';

  return (
    <Shell brand={brand} nav={NAV} active={active} onNav={setActive} title="Operations" crumbs={[brand, 'Bicycle workshop', 'Operations']} searchHint="Search parts, orders">
      <PageHeader title="Operations" sub={`Day shift · Saturday 24 Oct 2026 · 6 stations, ${PARTS.length} stocked parts`}>
        <button type="button" className="to-live" aria-pressed={running} disabled={reduced} onClick={() => setLive((l) => !l)} title={reduced ? 'Live updates are off because reduced motion is on' : live ? 'Pause live updates' : 'Resume live updates'}>
          <i aria-hidden="true" />{reduced ? 'Live off' : running ? 'Live' : live ? 'Paused (tab hidden)' : 'Paused'}
        </button>
      </PageHeader>
      <div className="td-kpis">
        <Kpi label="Orders due today" value={fmt.n(ORDERS[0]!)} delta={-6.8} goodWhen="down" spark={series(31, 14, { base: 100, trend: 0.1, wave: 0.2 })} hint={`of ${CAP[0]} capacity today`} />
        <Kpi label="On-time rate · 30 d" value="93.8%" delta={1.2} spark={series(32, 14, { base: 92, trend: 0.03, wave: 0.02, noise: 0.01 })} tone="signal" hint="target 95%" />
        <Kpi label="Line utilisation" value={fmt.p(util, 0)} delta={-8.4} spark={series(33, 14, { base: 70, trend: -0.15, wave: 0.12 })} hint={blocked.length ? `${blocked.map((b) => b.name).join(', ')} blocked` : 'all stations flowing'} />
        <Kpi label={station || lowOnly || q ? 'Stock value · filtered' : 'Stock value'} value={money(stockValue)} spark={series(34, 14, { base: 60, trend: -0.05, wave: 0.05 })} tone="signal" hint={`${rows.length} of ${PARTS.length} parts`} />
      </div>

      <Panel id="to-line" title="Production line" sub="Parts flow left to right. Select a station to see only its parts below." actions={<span className="to-sub">{blocked.length} blocked · {stations.filter((s) => s.status === 'running').length} running</span>} flush>
        <ol className="to-line-flow">{stations.map((s, i) => <StationTile key={s.id} s={s} index={i} on={station === s.id} onToggle={() => setStation((c) => (c === s.id ? null : s.id))} />)}</ol>
      </Panel>

      <Panel id="to-inv" title="Inventory" sub={`${rows.length} parts · ${lowCount} at or below reorder point`} flush
        actions={<Button variant="primary" icon="plus" disabled={picked.length === 0} onClick={() => setPo(true)}>Create purchase order{picked.length ? ` (${picked.length})` : ''}</Button>}>
        <div className="to-bar-t">
          <label className="to-find"><Icon name="search" size={14} /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search SKU, part or supplier" aria-label="Search inventory" /></label>
          <button type="button" role="switch" aria-checked={lowOnly} className="to-sw" onClick={() => setLowOnly((v) => !v)}><i aria-hidden="true" />Low stock only<span>{lowCount}</span></button>
          {station && <button type="button" className="to-chip" onClick={() => setStation(null)} aria-label={`Clear ${stLabel} filter`}>{stLabel}<Icon name="x" size={11} /></button>}
          <span className="to-sel" role="status">{picked.length ? `${picked.length} selected · ${money(pickedValue)} on hand` : 'Select parts to build a purchase order'}</span>
          {picked.length > 0 && <Button variant="ghost" small onClick={() => setSelected(new Set())}>Clear</Button>}
        </div>
        <InventoryTable rows={rows} selected={selected} ordered={ordered} onSelect={toggle} onSelectAll={selectAll} />
      </Panel>

      <div className="to-row">
        <Panel id="to-cap" title="Orders vs capacity" sub="Units due per day, next 10 days" className="to-cap-p" actions={<span className="to-legend"><i />Within<i className="is-over" />Over<i className="is-cap" />Capacity</span>}>
          <CapacityChart />
          <p className="to-note"><Icon name="clock" size={13} />Wed 28 peaks at {ORDERS[4]} units against {CAP[4]}. Move 28 units to Sunday or approve overtime.</p>
        </Panel>
        <Panel id="to-sup" title="Suppliers" sub="Ranked, slowest first" actions={<Segmented label="Rank suppliers by" value={supView} onChange={setSupView} options={[{ id: 'lead', label: 'Lead time' }, { id: 'spend', label: 'Spend' }]} />}>
          <RankList rows={sup} tone="signal" format={(v) => (supView === 'lead' ? `${v} d` : money(v))} />
        </Panel>
        <Panel id="to-late" title="Late shipments" sub={`${LATE.length} past due · ${poCount} new PO${poCount === 1 ? '' : 's'} placed`} actions={<Pill tone="bad">{LATE.length - chased.size} open</Pill>}>
          <ul className="to-late">{LATE.map((l) => (
            <li key={l.po}>
              <div><b>{l.part}</b><small>{l.supplier} · <span className="td-mono">{l.po}</span></small><small className="to-why">{Math.abs(l.due)} d late, was due {dateLabel(l.due)} · {l.why}</small></div>
              <Button small disabled={chased.has(l.po)} onClick={() => { setChased((c) => new Set(c).add(l.po)); setMsg(`Asked ${l.supplier} for an update on ${l.po}`); }}>{chased.has(l.po) ? 'Chased' : 'Chase'}</Button>
            </li>))}
          </ul>
        </Panel>
      </div>
      {po && <PoDialog parts={picked} firstPo={2310 + poCount} onClose={() => setPo(false)} onPlace={place} />}
      <div className="td-sr" role="status" aria-live="polite">{msg}</div>
      {msg && <div className="to-toast" aria-hidden="true"><Icon name="check" size={14} />{msg}<button type="button" tabIndex={-1} onClick={() => setMsg('')} aria-label="Dismiss"><Icon name="x" size={12} /></button></div>}
    </Shell>
  );
}

export function Demo() { return <Preview w={1280} h={150}><OperationsDashboard /></Preview>; }
