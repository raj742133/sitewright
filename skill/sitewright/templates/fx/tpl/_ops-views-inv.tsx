'use client';
// Inventory: the full parts table beside an inline purchase order builder (quantities per line, grouped by supplier, validated, placed as one PO per supplier).
import { useEffect, useMemo, useState, type RefObject } from 'react';
import { Button, Empty, Glyph, Kpi, Tabs, cx, fmt } from './_dash';
import { dateLabel, lead, money, suggest, type Part } from './_ops';
import { InventoryTable } from './_opsinv';
import type { D, Ops } from './_opsstate';
import { SearchBox, ViewHeader } from './_opsui';

const MAXQ = 5000;
export function InventoryView({ ops, d, hRef }: { ops: Ops; d: D; hRef: RefObject<HTMLHeadingElement | null> }) {
  const [q, setQ] = useState(''); const [lowOnly, setLowOnly] = useState(false); const [cat, setCat] = useState('all'); const [raw, setRaw] = useState<Record<string, string>>({}); const [tried, setTried] = useState(false);
  const { selected, setSelected } = ops; const ordered = ops.s.ordered;
  const cats = ['all', ...Array.from(new Set(d.parts.map((p) => p.cat)))];
  const rows = useMemo(() => d.parts.filter((p) => (cat === 'all' || p.cat === cat) && (!lowOnly || p.onHand <= p.reorder) && (!q.trim() || `${p.sku} ${p.name} ${p.supplier} ${p.cat}`.toLowerCase().includes(q.trim().toLowerCase()))), [d.parts, cat, lowOnly, q]);
  const picked = d.parts.filter((p) => selected.has(p.sku));
  useEffect(() => { if (picked.length === 0) setTried(false); }, [picked.length]);
  const qtyStr = (p: Part) => raw[p.sku] ?? String(suggest(p));
  const err = (p: Part) => { const v = qtyStr(p).trim(); return !/^\d+$/.test(v) ? 'Whole number' : Number(v) < 1 ? 'At least 1' : Number(v) > MAXQ ? `At most ${MAXQ}` : ''; };
  const bad = picked.filter((p) => err(p));
  const total = picked.reduce((a, p) => a + (bad.includes(p) ? 0 : Number(qtyStr(p))) * p.cost, 0);
  const groups = useMemo(() => { const m = new Map<string, Part[]>(); picked.forEach((p) => m.set(p.supplier, [...(m.get(p.supplier) ?? []), p])); return [...m.entries()]; }, [picked]);
  const toggle = (sku: string) => setSelected((s) => { const n = new Set(s); if (!n.delete(sku)) n.add(sku); return n; });
  const selectAll = (skus: string[], on: boolean) => setSelected((s) => { const n = new Set(s); skus.forEach((k) => (on ? n.add(k) : n.delete(k))); return n; });
  const place = () => {
    setTried(true); if (bad.length || !picked.length) return;
    const items = picked.map((p) => ({ sku: p.sku, qty: Number(qtyStr(p)) })); const first = ops.s.poSeq;
    ops.A.commitPo(items, `PO-${first}${groups.length > 1 ? ` to PO-${first + groups.length - 1}` : ''} placed: ${fmt.n(items.reduce((a, i) => a + i.qty, 0))} units, ${money(total)}`); setRaw({});
  };
  const onOrder = Object.entries(ordered).reduce((a, [sku, n]) => a + n * (d.parts.find((p) => p.sku === sku)?.cost ?? 0), 0);
  return (
    <>
      <ViewHeader hRef={hRef} title="Inventory" sub={`${d.parts.length} stocked parts · ${d.lowParts.length} at or below reorder point · ${d.critical.length} critical`} />
      <div className="td-kpis">
        <Kpi label="Stock value" value={money(d.parts.reduce((a, p) => a + p.onHand * p.cost, 0))} hint={`${d.parts.length} parts`} tone="signal" />
        <Kpi label="Below reorder point" value={String(d.lowParts.length)} goodWhen="down" hint={`${d.critical.length} under ${ops.s.thr.critDays} days of cover`} />
        <Kpi label="Open PO value" value={money(d.openPos.reduce((a, p) => a + p.qty * p.unit, 0))} hint={`${d.openPos.length} POs · ${d.latePos.length} late`} />
        <Kpi label="Placed this session" value={money(onOrder)} hint={`${Object.keys(ordered).length} parts on order`} tone="signal" />
      </div>
      <div className="to-invsplit">
        <section className="td-panel" aria-label="Parts">
          <div className="to-tabbar"><Tabs label="Part category" value={cat} onChange={setCat} tabs={cats.map((c) => ({ id: c, label: c === 'all' ? 'All parts' : c, count: c === 'all' ? d.parts.length : d.parts.filter((p) => p.cat === c).length }))} /></div>
          <div className="to-bar-t to-bar-f">
            <SearchBox value={q} onChange={setQ} label="Search inventory" placeholder="Search SKU, part or supplier" />
            <button type="button" role="switch" aria-checked={lowOnly} className="to-sw" onClick={() => setLowOnly((v) => !v)}><i aria-hidden="true" />Low stock only<span>{d.lowParts.length}</span></button>
            <Button small variant="ghost" onClick={() => setSelected(new Set(d.lowParts.map((p) => p.sku)))}>Select all low stock</Button>
            <span className="to-sel" role="status">{rows.length} parts shown</span>
          </div>
          <InventoryTable rows={rows} selected={selected} ordered={ordered} onSelect={toggle} onSelectAll={selectAll} crit={ops.s.thr.critDays} />
        </section>
        <section className="td-panel to-builder" aria-labelledby="to-bld-t">
          <header className="td-panel-h"><div><h2 id="to-bld-t">Purchase order</h2><p>{picked.length ? `${picked.length} ${picked.length === 1 ? 'part' : 'parts'} · ${groups.length} ${groups.length === 1 ? 'supplier' : 'suppliers'}` : 'Tick parts in the table to build one'}</p></div>
            {picked.length > 0 && <Button variant="ghost" small onClick={() => { setSelected(new Set()); setRaw({}); }}>Clear</Button>}</header>
          <div className="td-panel-b to-bld">
            {picked.length === 0 && <Empty title="No parts selected" text="Select rows, or use Select all low stock to start from what needs reordering." />}
            {groups.map(([sup, ps], gi) => (
              <div key={sup} className="to-po" role="group" aria-label={`${sup} order`}>
                <div className="to-po-h"><b>{sup}</b><span className="td-muted">PO-{ops.s.poSeq + gi} · arrives about {dateLabel(lead(sup))}</span></div>
                {ps.map((p) => { const e = err(p), id = `to-q-${p.sku}`; return (
                  <div key={p.sku} className={cx('to-bl', e && 'has-err')}>
                    <span className="to-line-n"><b>{p.name}</b><small className="td-mono">{p.sku} · {money(p.cost)} each</small></span>
                    <input id={id} inputMode="numeric" value={qtyStr(p)} aria-label={`Quantity for ${p.name}`} aria-invalid={e ? true : undefined} aria-describedby={e ? `${id}-e` : undefined} onChange={(ev) => setRaw((r) => ({ ...r, [p.sku]: ev.target.value }))} />
                    <b className="to-line-t">{e ? '–' : money(Number(qtyStr(p)) * p.cost)}</b>
                    <Button variant="ghost" icon="x" small label={`Remove ${p.name}`} onClick={() => toggle(p.sku)} />
                    {e && <small id={`${id}-e`} className="to-err">{e}</small>}
                  </div>); })}
              </div>))}
          </div>
          <footer className="to-bld-f">
            <div className="to-tot"><span className="td-muted">{fmt.n(picked.reduce((a, p) => a + (err(p) ? 0 : Number(qtyStr(p))), 0))} units</span><b>{money(total)}</b></div>
            <Button variant="primary" icon="check" disabled={picked.length === 0} onClick={place}>Place {groups.length > 1 ? `${groups.length} orders` : 'order'}</Button>
            {tried && bad.length > 0 && <p className="to-err" role="alert"><Glyph name="x" size={12} />Fix {bad.length} {bad.length === 1 ? 'quantity' : 'quantities'} first.</p>}
          </footer>
        </section>
      </div>
    </>
  );
}
