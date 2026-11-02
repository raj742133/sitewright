'use client';
import { useMemo, useState } from 'react';
import MagicBento, { type BentoCell } from '../ui/MagicBento';
import { Art, PRODUCTS } from './_ha-green-art';

/* The living shelf: the library's MagicBento (pointer spotlight, tilt) holding six products. The filter chips and the sort menu
   change what is in the grid; the bento layout adapts to how many are left (six fill a 4x3 mosaic, fewer become even columns). */

type Sort = 'featured' | 'low' | 'high';
const CATS = ['All', 'Face', 'Home', 'Soil'] as const;
const MOSAIC: BentoCell['size'][] = ['big', 'small', 'small', 'wide', 'wide', 'wide'];

export function Shelf({ cart, add, say }: { cart: Record<string, number>; add: (id: string, name: string) => void; say: (s: string) => void }) {
  const [cat, setCat] = useState<(typeof CATS)[number]>('All');
  const [sort, setSort] = useState<Sort>('featured');
  const shown = useMemo(() => {
    const l = PRODUCTS.filter((p) => cat === 'All' || p.cat === cat);
    return sort === 'low' ? [...l].sort((a, b) => a.price - b.price) : sort === 'high' ? [...l].sort((a, b) => b.price - a.price) : l;
  }, [cat, sort]);
  const cells: BentoCell[] = shown.map((p, i) => {
    const size = shown.length === 6 ? MOSAIC[i] : 'small';
    const n = cart[p.id] ?? 0;
    return {
      id: p.id, title: p.name, size,
      content: (
        <>
          <div className="hlg-artbox"><span className="hlg-tag">{p.tag}</span><Art kind={p.kind} /></div>
          <p className="hlg-pnote">{p.note}</p>
          <div className="hlg-buy"><b className="hlg-price">${p.price}</b><button type="button" className="hlg-add" onClick={() => add(p.id, p.name)} aria-label={`Add ${p.name} to basket${n ? `, ${n} already in basket` : ''}`}>{n > 0 ? `Add another (${n})` : 'Add to basket'}</button></div>
        </>
      ),
    };
  });
  return (
    <>
      <div className="hlg-head">
        <div><p className="hlg-kicker">The living shelf</p><h2 id="hlg-hs">Six things, <em>all still growing.</em></h2></div>
        <div className="hlg-tools">
          <div className="hlg-chips" role="group" aria-label="Filter products">{CATS.map((c) => <button key={c} type="button" aria-pressed={cat === c} onClick={() => { setCat(c); say(`Showing ${c === 'All' ? 'all products' : c}`); }}>{c}</button>)}</div>
          <label className="hlg-sort"><span>Sort</span><select value={sort} onChange={(e) => setSort(e.target.value as Sort)}><option value="featured">Featured</option><option value="low">Price, low to high</option><option value="high">Price, high to low</option></select></label>
        </div>
      </div>
      <div className="hlg-bento" data-n={shown.length}><MagicBento key={`${cat}-${sort}`} cells={cells} spotlight={260} tilt={3} /></div>
    </>
  );
}
