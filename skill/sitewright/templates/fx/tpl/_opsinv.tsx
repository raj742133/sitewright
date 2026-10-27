'use client';
// The inventory work area: a sortable table with row selection, and the purchase-order summary dialog.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Button, Empty, Glyph, Pill, cx, fmt } from './_dash';
import { cover, dateLabel, isLow, lead, money, suggest, type Part } from './_ops';

export type Status = { key: 'critical' | 'low' | 'ok' | 'order'; label: string; tone: 'bad' | 'warn' | 'ok' | 'info' };
export function statusOf(p: Part, ordered?: number, crit = 4): Status {
  if (ordered) return { key: 'order', label: `On order · ${fmt.n(ordered)}`, tone: 'info' };
  if (cover(p) < crit) return { key: 'critical', label: 'Critical', tone: 'bad' };
  if (isLow(p)) return { key: 'low', label: 'Low', tone: 'warn' };
  return { key: 'ok', label: 'In stock', tone: 'ok' };
}
type SortId = 'sku' | 'name' | 'onHand' | 'reorder' | 'cover' | 'value' | 'supplier' | 'status';
const RANK = { critical: 0, low: 1, order: 2, ok: 3 };

export function InventoryTable({ rows, selected, ordered, onSelect, onSelectAll, crit = 4 }: { crit?: number; rows: Part[]; selected: Set<string>; ordered: Record<string, number>; onSelect: (sku: string) => void; onSelectAll: (skus: string[], on: boolean) => void }) {
  const [sort, setSort] = useState<{ id: SortId; dir: 1 | -1 }>({ id: 'status', dir: 1 });
  const sorted = useMemo(() => {
    const f: Record<SortId, (a: Part, b: Part) => number> = {
      sku: (a, b) => a.sku.localeCompare(b.sku), name: (a, b) => a.name.localeCompare(b.name), onHand: (a, b) => a.onHand - b.onHand, reorder: (a, b) => a.reorder - b.reorder,
      cover: (a, b) => cover(a) - cover(b), value: (a, b) => a.onHand * a.cost - b.onHand * b.cost, supplier: (a, b) => a.supplier.localeCompare(b.supplier),
      status: (a, b) => RANK[statusOf(a, ordered[a.sku], crit).key] - RANK[statusOf(b, ordered[b.sku], crit).key] || cover(a) - cover(b),
    };
    return [...rows].sort((a, b) => f[sort.id](a, b) * sort.dir);
  }, [rows, sort, ordered, crit]);
  const nSel = rows.filter((r) => selected.has(r.sku)).length, all = rows.length > 0 && nSel === rows.length;
  const allRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (allRef.current) allRef.current.indeterminate = nSel > 0 && !all; }, [nSel, all]);
  const th = (id: SortId, label: string, cls?: string, right?: boolean) => (
    <th scope="col" className={cx(cls, right && 'is-r')} aria-sort={sort.id === id ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => setSort((s) => ({ id, dir: s.id === id && s.dir === 1 ? -1 : 1 }))}>{label}<Glyph name="down" size={11} className={cx('td-sortic', sort.id === id && 'is-on', sort.id === id && sort.dir === 1 && 'is-asc')} /></button>
    </th>
  );
  return (
    <div className="td-tablewrap to-invwrap">
      <table className="td-table to-inv">
        <caption className="td-sr">Inventory, {rows.length} parts. Column headers sort the table.</caption>
        <thead><tr>
          <th scope="col" className="to-chk"><input ref={allRef} type="checkbox" checked={all} onChange={(e) => onSelectAll(rows.map((r) => r.sku), e.target.checked)} aria-label="Select all shown parts" /></th>
          {th('sku', 'SKU', 'hide-md')}{th('name', 'Part')}{th('onHand', 'On hand', undefined, true)}{th('reorder', 'Reorder pt', 'hide-md', true)}{th('cover', 'Days of cover', 'hide-sm', true)}{th('value', 'Value', 'hide-md', true)}{th('supplier', 'Supplier', 'hide-md')}{th('status', 'Status')}
        </tr></thead>
        <tbody>
          {sorted.length === 0 && <tr><td colSpan={9} className="to-noneCell"><Empty title="No parts match" text="Clear the search, the station filter or the low stock switch." /></td></tr>}
          {sorted.map((p) => {
            const st = statusOf(p, ordered[p.sku], crit), c = cover(p), on = selected.has(p.sku);
            return (
              <tr key={p.sku} className={cx('is-click', on && 'is-sel')} onClick={() => onSelect(p.sku)}>
                <td className="to-chk" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={on} onChange={() => onSelect(p.sku)} aria-label={`Select ${p.name}`} /></td>
                <td className="hide-md td-mono to-sku">{p.sku}</td>
                <td><div className="td-cellmain"><div><b>{p.name}</b><small><span className="to-skui td-mono">{p.sku} · </span>{p.cat}</small></div></div></td>
                <td className="is-r"><b className={cx('to-n', isLow(p) && 'is-low')}>{fmt.n(p.onHand)}</b></td>
                <td className="is-r hide-md td-muted">{fmt.n(p.reorder)}</td>
                <td className="is-r hide-sm"><span className="to-cover"><span className={cx('to-bar', st.key === 'critical' && 'is-bad', st.key === 'low' && 'is-warn')}><i style={{ width: `${Math.min(1, c / 21) * 100}%` }} /></span><b>{c.toFixed(1)}</b></span></td>
                <td className="is-r hide-md">{money(p.onHand * p.cost)}</td>
                <td className="hide-md td-muted">{p.supplier}</td>
                <td><Pill tone={st.tone}>{st.label}</Pill></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export interface PoResult { count: number; units: number; total: number; ids: string[]; lines: Record<string, number> }
/** Order summary: the chosen parts grouped by supplier with editable quantities, delivery estimates and totals. */
export function PoDialog({ parts, firstPo, onClose, onPlace }: { parts: Part[]; firstPo: number; onClose: () => void; onPlace: (r: PoResult) => void }) {
  const [qty, setQty] = useState<Record<string, number>>(() => Object.fromEntries(parts.map((p) => [p.sku, suggest(p)])));
  const [gone, setGone] = useState<Set<string>>(new Set());
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { const prev = document.activeElement as HTMLElement | null; box.current?.querySelector<HTMLElement>('[data-first]')?.focus(); return () => prev?.focus?.(); }, []);
  const live = parts.filter((p) => !gone.has(p.sku));
  const groups = useMemo(() => { const m = new Map<string, Part[]>(); live.forEach((p) => m.set(p.supplier, [...(m.get(p.supplier) ?? []), p])); return [...m.entries()]; }, [live]);
  const sub = (p: Part) => (qty[p.sku] ?? 0) * p.cost, units = live.reduce((a, p) => a + (qty[p.sku] ?? 0), 0), total = live.reduce((a, p) => a + sub(p), 0);
  const ok = live.length > 0 && live.every((p) => (qty[p.sku] ?? 0) > 0);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
    if (e.key !== 'Tab' || !box.current) return;
    const f = [...box.current.querySelectorAll<HTMLElement>('button:not(:disabled), input')]; const a = document.activeElement;
    if (e.shiftKey && a === f[0]) { e.preventDefault(); f[f.length - 1]?.focus(); } else if (!e.shiftKey && a === f[f.length - 1]) { e.preventDefault(); f[0]?.focus(); }
  };
  const place = () => onPlace({ count: groups.length, units, total, ids: groups.map((_, i) => `PO-${firstPo + i}`), lines: Object.fromEntries(live.map((p) => [p.sku, qty[p.sku] ?? 0])) });
  return (
    <div className="to-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="to-dialog" ref={box} role="dialog" aria-modal="true" aria-labelledby="to-po-t" onKeyDown={onKey}>
        <header><div><h2 id="to-po-t">New purchase order</h2><p>{live.length} {live.length === 1 ? 'part' : 'parts'} from {groups.length} {groups.length === 1 ? 'supplier' : 'suppliers'} · one PO per supplier</p></div><Button variant="ghost" icon="x" label="Close" onClick={onClose} />
        </header>
        <div className="to-dlg-b">
          {groups.length === 0 && <Empty title="Nothing to order" text="Every line was removed. Close this and select parts again." />}
          {groups.map(([sup, ps], gi) => (
            <section key={sup} className="to-po" aria-label={`${sup} order`}>
              <div className="to-po-h"><b>{sup}</b><span className="td-muted">PO-{firstPo + gi} · arrives about {dateLabel(lead(sup))}</span></div>
              {ps.map((p, i) => (
                <div key={p.sku} className="to-line">
                  <span className="to-line-n"><b>{p.name}</b><small className="td-mono">{p.sku} · {money(p.cost)} each</small></span>
                  <input type="number" min={0} step={5} value={qty[p.sku] ?? 0} data-first={gi === 0 && i === 0 ? '' : undefined} aria-label={`Quantity for ${p.name}`} onChange={(e) => setQty((q) => ({ ...q, [p.sku]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))} />
                  <b className="to-line-t">{money(sub(p))}</b>
                  <Button variant="ghost" icon="x" small label={`Remove ${p.name}`} onClick={() => setGone((g) => new Set(g).add(p.sku))} />
                </div>
              ))}
              <div className="to-po-f"><span className="td-muted">Subtotal</span><b>{money(ps.reduce((a, p) => a + sub(p), 0))}</b></div>
            </section>
          ))}
        </div>
        <footer>
          <div className="to-tot"><span className="td-muted">{fmt.n(units)} units</span><b>{money(total)}</b></div>
          <Button onClick={onClose}>Cancel</Button><Button variant="primary" icon="check" disabled={!ok} onClick={place}>Place {groups.length > 1 ? `${groups.length} orders` : 'order'}</Button>
        </footer>
      </div>
    </div>
  );
}
