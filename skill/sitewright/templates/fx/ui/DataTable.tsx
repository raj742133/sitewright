'use client';
/*
 * Adapted from BoardUI (MIT), Copyright (c) 2026 Mertcan Dundar Esmergul (BoardUI) (free tier). See THIRD_PARTY_NOTICES.md.
 * What changed from upstream: @tanstack/react-table and react-aria are replaced by plain state (sort, filter, paginate and select are a few lines each);
 * the dropdown selects are native <select>s; the table is a real <table> with aria-sort, a select-all checkbox with an indeterminate state and a live
 * region; Delete, Edit (inline rename) and the more-menu actually change the rows. Avatars are initials. Dates are plain numbers, not Date objects,
 * so the first render is identical on server and client. Upstream: data-table/data-table.tsx.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Chip, Ico, StatusDot, cx, type ChipColor } from './_bui';
import { MenuButton, type MenuAction } from './_bui-pop';
import SegmentedControl from './SegmentedControl';

export type Purchase = 'completed' | 'waiting' | 'processing';
export interface Customer { id: string; name: string; purchase: Purchase; status: string; product: string; region: string; price: number; month: number; day: number }
const STATUS: Array<{ label: string; color: ChipColor }> = [{ label: 'Shipped', color: 'lime' }, { label: 'Delivery waiting', color: 'yellow' }, { label: 'Delivery failed', color: 'rose' }, { label: 'Confirmed', color: 'cyan' }];
export const PRODUCTS = ['Sneakers', 'Backpack', 'Smart watch', 'Headphones', 'Sunglasses', 'Wallet'];
export const REGIONS = ['North America', 'Europe', 'Asia', 'Oceania'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PRICE: Array<{ id: string; label: string; test: (p: number) => boolean }> = [
  { id: 'all', label: 'All prices', test: () => true }, { id: 'u100', label: 'Under $100', test: (p) => p < 100 }, { id: 'm500', label: '$100 – $500', test: (p) => p >= 100 && p <= 500 },
  { id: 'm1k', label: '$500 – $1,000', test: (p) => p > 500 && p <= 1000 }, { id: 'o1k', label: 'Over $1,000', test: (p) => p > 1000 },
];
const FIRST = ['Marcus', 'Cheyenne', 'Alfredo', 'Talan', 'Roger', 'Cristofer', 'Emery', 'Kadin', 'Nolan', 'Ruben', 'Skylar', 'Hanna', 'Corey', 'Miracle', 'Zaire', 'Cooper', 'Leilani', 'Alena', 'Terry', 'Jaxson', 'John', 'Aspen', 'Michael', 'Kianna', 'Livia', 'Jaydon', 'Maria', 'Ann'];
const LAST = ['Culhane', 'Herwitz', 'Septimus', 'Bergson', 'Curtis', 'Vetrovs', 'Rhiel', 'Dokidis', 'Kenter', 'Stanton', 'Baptista', 'Workman', 'Torff', 'Calzoni', 'Rosser', 'Geidt', 'Bator', 'Vaccaro', 'Lipshutz', 'Botosh', 'Clarkson', 'Lubin', 'Ekstrom', 'Saris', 'Aminoff', 'Press'];
function rng(seed: number) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** Deterministic demo customers. */
export function makeCustomers(count = 48, seed = 42): Customer[] {
  const r = rng(seed); const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)]!;
  return Array.from({ length: count }, (_, i) => {
    const st = pick(STATUS);
    const purchase: Purchase = r() < 0.24 ? 'processing' : st.label === 'Shipped' || st.label === 'Confirmed' ? 'completed' : 'waiting';
    return { id: `c${i}`, name: `${FIRST[(i * 7 + Math.floor(r() * 5)) % FIRST.length]} ${LAST[(i * 11 + Math.floor(r() * 5)) % LAST.length]}`, purchase, status: st.label, product: pick(PRODUCTS), region: pick(REGIONS), price: 20 + Math.floor(r() * 3980), month: Math.floor(r() * 12), day: 1 + Math.floor(r() * 28) };
  });
}
const dateLabel = (c: Customer) => `${MONTHS[c.month]} ${String(c.day).padStart(2, '0')}, 2026`;
const dateKey = (c: Customer) => c.month * 31 + c.day;
const price = (n: number) => `$${n.toLocaleString('en-US')}`;
const PURCHASE: Array<{ id: Purchase; label: string; dot: 'green' | 'yellow' | 'indigo' }> = [{ id: 'completed', label: 'Completed', dot: 'green' }, { id: 'waiting', label: 'Waiting', dot: 'yellow' }, { id: 'processing', label: 'Processing', dot: 'indigo' }];
const MORE: MenuAction[] = [{ id: 'profile', label: 'View profile', icon: 'user' }, { id: 'duplicate', label: 'Duplicate row', icon: 'copy' }, { id: 'invoice', label: 'Download invoice', icon: 'download' }, { id: 'archive', label: 'Archive customer', icon: 'archive', danger: true }];

type SortKey = 'name' | 'date' | 'price';
function Pager({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  const list: Array<number | 'gap'> = [];
  for (let p = 1; p <= pages; p++) if (p === 1 || p === pages || Math.abs(p - page) <= 1) list.push(p); else if (list[list.length - 1] !== 'gap') list.push('gap');
  return (
    <nav className="bui-pg" aria-label="Pagination">
      <button type="button" className="bui-btn is-secondary is-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}><Ico name="left" size={16} />Previous</button>
      <ul>{list.map((p, i) => <li key={i}>{p === 'gap' ? <span aria-hidden="true">…</span> : <button type="button" className={cx('bui-pg-n', p === page && 'is-on')} aria-label={`Page ${p}`} aria-current={p === page ? 'page' : undefined} onClick={() => onChange(p)}>{p}</button>}</li>)}</ul>
      <p className="bui-pg-m" aria-hidden="true">Page {page} of {pages}</p>
      <button type="button" className="bui-btn is-secondary is-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Next<Ico name="right" size={16} /></button>
    </nav>
  );
}

export interface DataTableProps { rows?: Customer[]; pageSize?: number; showDensity?: boolean; className?: string }

export default function DataTable({ rows: initial, pageSize = 8, showDensity = true, className }: DataTableProps) {
  const [rows, setRows] = useState<Customer[]>(() => initial ?? makeCustomers());
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [sel, setSel] = useState<Set<string>>(() => new Set(['c1', 'c2']));
  const [page, setPage] = useState(1);
  const [fp, setFp] = useState('all'), [fprod, setFprod] = useState('all'), [freg, setFreg] = useState('all'), [q, setQ] = useState('');
  const [dense, setDense] = useState<'md' | 'sm'>('md');
  const [editing, setEditing] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const allRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const b = PRICE.find((x) => x.id === fp) ?? PRICE[0]!; const s = q.trim().toLowerCase();
    const f = rows.filter((c) => b.test(c.price) && (fprod === 'all' || c.product === fprod) && (freg === 'all' || c.region === freg) && (s === '' || c.name.toLowerCase().includes(s)));
    if (!sort) return f;
    const val = (c: Customer) => (sort.key === 'name' ? c.name.toLowerCase() : sort.key === 'date' ? dateKey(c) : c.price);
    return [...f].sort((a, b2) => (val(a) < val(b2) ? -1 : val(a) > val(b2) ? 1 : 0) * sort.dir);
  }, [rows, fp, fprod, freg, q, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const cur = Math.min(page, pages);
  const view = filtered.slice((cur - 1) * pageSize, cur * pageSize);
  const onPage = view.filter((c) => sel.has(c.id)).length;
  useEffect(() => { if (allRef.current) allRef.current.indeterminate = onPage > 0 && onPage < view.length; }, [onPage, view.length]);

  const toggleSort = (key: SortKey) => setSort((s) => (s?.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : null));
  const aria = (key: SortKey) => (sort?.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none');
  const remove = (c: Customer, verb: string) => { setRows((r) => r.filter((x) => x.id !== c.id)); setSel((s) => { const n = new Set(s); n.delete(c.id); return n; }); setNote(`${verb} ${c.name}`); };
  const act = (c: Customer, id: string) => {
    if (id === 'archive') remove(c, 'Archived');
    else if (id === 'duplicate') { setRows((r) => { const i = r.findIndex((x) => x.id === c.id); const copy = { ...c, id: `${c.id}-copy${r.length}` }; return [...r.slice(0, i + 1), copy, ...r.slice(i + 1)]; }); setNote(`Duplicated ${c.name}`); }
    else setNote(id === 'invoice' ? `Invoice for ${c.name} queued for download` : `Opened profile of ${c.name}`);
  };
  const SortHead = ({ k, label }: { k: SortKey; label: string }) => (
    <th scope="col" aria-sort={aria(k)}><button type="button" className="bui-sort" onClick={() => toggleSort(k)}>{label}<Ico name="down" size={18} className={cx('bui-sort-i', sort?.key === k && 'is-on', sort?.key === k && sort.dir === 1 && 'is-asc')} /></button></th>
  );
  const sub = dense === 'sm';
  return (
    <div className={cx('bui', 'bui-dt', sub && 'is-sm', className)}>
      <section className="bui-dt-card" aria-label="Customers">
        <div className="bui-dt-bar">
          <div className="bui-dt-total"><p>Total results</p><p><b>{filtered.length.toLocaleString('en-US')}</b> customers</p></div>
          <div className="bui-dt-filters">
            <select className="bui-select" aria-label="Filter by price" value={fp} onChange={(e) => { setFp(e.target.value); setPage(1); }}>{PRICE.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
            <select className="bui-select" aria-label="Filter by product" value={fprod} onChange={(e) => { setFprod(e.target.value); setPage(1); }}><option value="all">All products</option>{PRODUCTS.map((p) => <option key={p}>{p}</option>)}</select>
            <select className="bui-select" aria-label="Filter by region" value={freg} onChange={(e) => { setFreg(e.target.value); setPage(1); }}><option value="all">All regions</option>{REGIONS.map((p) => <option key={p}>{p}</option>)}</select>
            <label className="bui-search"><Ico name="search" size={18} /><input type="search" aria-label="Search customers" placeholder="Search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></label>
          </div>
        </div>
        <div className="bui-dt-scroll" tabIndex={0} role="region" aria-label="Customers table, scrolls sideways on narrow screens">
          <table>
            <caption className="bui-sr">Customers, {filtered.length} results, page {cur} of {pages}{sort ? `, sorted by ${sort.key} ${sort.dir === 1 ? 'ascending' : 'descending'}` : ''}</caption>
            <thead>
              <tr>
                <th scope="col" aria-sort={aria('name')} className="bui-dt-name"><div className="bui-dt-hn">
                  <input ref={allRef} type="checkbox" className="bui-check" aria-label="Select all customers on this page" checked={view.length > 0 && onPage === view.length} onChange={(e) => setSel((s) => { const n = new Set(s); view.forEach((c) => (e.target.checked ? n.add(c.id) : n.delete(c.id))); return n; })} />
                  <button type="button" className="bui-sort" onClick={() => toggleSort('name')}>Customer name<Ico name="down" size={18} className={cx('bui-sort-i', sort?.key === 'name' && 'is-on', sort?.key === 'name' && sort.dir === 1 && 'is-asc')} /></button></div></th>
                <th scope="col">Purchase</th><th scope="col">Status</th><SortHead k="date" label="Last updated" /><SortHead k="price" label="Price" />
                <th scope="col" className="bui-dt-ar">Actions</th>
              </tr>
            </thead>
            <tbody>
              {view.length === 0 && <tr><td colSpan={6} className="bui-dt-none">No customers match your filters.</td></tr>}
              {view.map((c) => {
                const st = STATUS.find((s) => s.label === c.status) ?? STATUS[0]!;
                return (
                  <tr key={c.id} className={cx(sel.has(c.id) && 'is-sel')}>
                    <th scope="row" className="bui-dt-name"><div className="bui-dt-cn">
                      <input type="checkbox" className="bui-check" aria-label={`Select ${c.name}`} checked={sel.has(c.id)} onChange={(e) => setSel((s) => { const n = new Set(s); if (e.target.checked) n.add(c.id); else n.delete(c.id); return n; })} />
                      <Avatar name={c.name} size={sub ? 24 : 32} />
                      {editing === c.id ? (
                        <input className="bui-dt-edit" aria-label={`Rename ${c.name}`} defaultValue={c.name} ref={(el) => el?.focus()}
                          onKeyDown={(e) => { if (e.key === 'Escape') setEditing(null); if (e.key === 'Enter') { const v = e.currentTarget.value.trim(); if (v) { setRows((r) => r.map((x) => (x.id === c.id ? { ...x, name: v } : x))); setNote(`Renamed to ${v}`); } setEditing(null); } }}
                          onBlur={() => setEditing(null)} />
                      ) : <span className="bui-dt-nm">{c.name}</span>}
                    </div></th>
                    <td><span className="bui-pur"><StatusDot color={PURCHASE.find((p) => p.id === c.purchase)!.dot} />
                      <select className="bui-select is-flat" aria-label={`Purchase status for ${c.name}`} value={c.purchase} onChange={(e) => setRows((r) => r.map((x) => (x.id === c.id ? { ...x, purchase: e.target.value as Purchase } : x)))}>{PURCHASE.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></span></td>
                    <td><Chip variant={sub ? 'caption' : 'bold'} color={st.color}>{c.status}</Chip></td>
                    <td className="bui-dt-date">{dateLabel(c)}</td>
                    <td><Chip variant={sub ? 'caption' : 'subtle'} color="gray">{price(c.price)}</Chip></td>
                    <td className="bui-dt-ar"><div className="bui-dt-act">
                      <button type="button" className="bui-iconbtn" aria-label={`Delete ${c.name}`} title="Delete" onClick={() => remove(c, 'Deleted')}><Ico name="trash" size={16} /></button>
                      <button type="button" className="bui-iconbtn" aria-label={`Edit ${c.name}`} title="Edit" onClick={() => setEditing(c.id)}><Ico name="edit" size={16} /></button>
                      <MenuButton label={`More actions for ${c.name}`} actions={MORE} onSelect={(id) => act(c, id)} />
                    </div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pages > 1 && <div className="bui-dt-foot"><Pager page={cur} pages={pages} onChange={setPage} /></div>}
      </section>
      {showDensity && <SegmentedControl label="Table density" value={dense} onChange={setDense} options={[{ id: 'md', label: 'Normal' }, { id: 'sm', label: 'Compact' }]} />}
      <p className="bui-sr" role="status" aria-live="polite">{note}{sel.size ? ` ${sel.size} selected` : ''}</p>
    </div>
  );
}

export function Demo() {
  return <div className="bui-demo is-scroll"><DataTable pageSize={5} /></div>;
}
