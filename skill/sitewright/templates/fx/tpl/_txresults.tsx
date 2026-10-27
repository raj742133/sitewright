'use client';
// Results: the analyses someone saved. A gallery or a list with search, tags, pin, rename and delete (with undo), and a detail page
// that shows the chart, table and query again with a way back to Ask carrying the context.
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Button, Delta, Empty, PALETTE, Segmented, Table, cx, type Col } from './_dash';
import { ResultView } from './_tx';
import type { Result } from './_txdata';
import { dateLabel, resOf, type Saved, type useSaved } from './_txstore';
import { Ic, SearchBox } from './_txui';

type Store = ReturnType<typeof useSaved>;
export type Notify = (msg: string, action?: { label: string; run: () => void }) => void;

function Thumb({ res }: { res: Result }) {
  const c = res.chart;
  if (c.kind === 'donut') {
    const sum = c.parts.reduce((a, p) => a + p.value, 0); let acc = 0; const r = 17, len = 2 * Math.PI * r;
    return <svg viewBox="0 0 200 52" preserveAspectRatio="xMidYMid meet" aria-hidden="true">{c.parts.map((p, k) => { const l = (p.value / sum) * len; const el = <circle key={p.label} cx="100" cy="26" r={r} fill="none" stroke={PALETTE[k % PALETTE.length]} strokeWidth="7" strokeDasharray={`${Math.max(0, l - 1.5)} ${len}`} strokeDashoffset={-acc} transform="rotate(-90 100 26)" />; acc += l; return el; })}</svg>;
  }
  const s = c.series[0]!; const d = s.data; const mx = Math.max(...d, 1); const col = s.color ?? 'var(--primary, #c2410c)';
  if (c.kind === 'bar') { const w = 200 / d.length; return <svg viewBox="0 0 200 52" preserveAspectRatio="none" aria-hidden="true">{d.map((v, i) => <rect key={i} x={i * w + w * 0.18} width={w * 0.64} y={52 - (v / mx) * 50} height={(v / mx) * 50} rx="1.5" fill={col} opacity={0.85} />)}</svg>; }
  const pts = d.map((v, i) => `${((i / (d.length - 1)) * 200).toFixed(1)},${(50 - (v / mx) * 46).toFixed(1)}`).join(' ');
  return <svg viewBox="0 0 200 52" preserveAspectRatio="none" aria-hidden="true"><polygon points={`0,52 ${pts} 200,52`} fill={col} opacity={0.14} /><polyline points={pts} fill="none" stroke={col} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" /></svg>;
}

function RenameField({ value, onSave, onCancel, label }: { value: string; onSave: (v: string) => void; onCancel: () => void; label: string }) {
  const [v, setV] = useState(value); const [err, setErr] = useState(''); const id = useRef(`tv-rn-${Math.abs([...label].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % 99999}`).current;
  const check = (t: string) => (!t.trim() ? 'Give it a name.' : t.trim().length > 60 ? 'Use 60 characters or fewer.' : '');
  const done = useRef(false);
  const commit = () => { const e = check(v); if (e) { setErr(e); return; } if (done.current) return; done.current = true; onSave(v.trim()); };
  const key = (e: KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } else if (e.key === 'Escape') { e.stopPropagation(); done.current = true; onCancel(); } };
  return (
    <span className="tv-rn" onClick={(e) => e.stopPropagation()}>
      <input autoFocus value={v} aria-label={label} aria-invalid={!!err} aria-describedby={err ? id : undefined} onChange={(e) => { setV(e.target.value); setErr(''); }} onKeyDown={key} onFocus={(e) => e.currentTarget.select()} onBlur={() => { if (done.current) return; if (check(v)) { done.current = true; onCancel(); } else commit(); }} />
      {err && <span id={id} className="tv-err" role="alert">{err}</span>}
    </span>
  );
}

function RowActions({ s, onPin, onRename, onDelete }: { s: Saved; onPin: () => void; onRename: () => void; onDelete: () => void }) {
  return (
    <span className="tv-ra" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="tx-ib" aria-pressed={s.pinned} aria-label={`${s.pinned ? 'Unpin' : 'Pin'} ${s.name}`} title={s.pinned ? 'Unpin' : 'Pin to top'} onClick={onPin}><Ic name="pin" size={14} fill={s.pinned} /></button>
      <button type="button" className="tx-ib" aria-label={`Rename ${s.name}`} title="Rename" onClick={onRename}><Ic name="edit" size={14} /></button>
      <button type="button" className="tx-ib is-danger" aria-label={`Delete ${s.name}`} title="Delete" onClick={onDelete}><Ic name="trash" size={14} /></button>
    </span>
  );
}

function TagList({ tags, on, onPick }: { tags: string[]; on?: string; onPick: (t: string) => void }) {
  return <ul className="tv-tags">{tags.map((t) => <li key={t}><button type="button" aria-pressed={on === t} onClick={(e) => { e.stopPropagation(); onPick(t); }}>{t}</button></li>)}</ul>;
}

function TagEditor({ s, store, notify }: { s: Saved; store: Store; notify: Notify }) {
  const [v, setV] = useState(''); const [err, setErr] = useState('');
  const add = () => {
    const t = v.trim().toLowerCase().replace(/\s+/g, '-'); if (!t) return;
    const e = !/^[a-z0-9-]{1,20}$/.test(t) ? 'Use up to 20 letters, numbers or dashes.' : s.tags.includes(t) ? `“${t}” is already on this result.` : s.tags.length >= 5 ? 'A result can have 5 tags at most.' : '';
    if (e) { setErr(e); return; } store.patch(s.rid, { tags: [...s.tags, t] }); setV(''); setErr(''); notify(`Added tag ${t}`);
  };
  return (
    <div className="tv-te">
      <ul className="tv-tags is-edit" aria-label="Tags">{s.tags.map((t) => <li key={t}><span>{t}</span><button type="button" aria-label={`Remove tag ${t}`} onClick={() => { store.patch(s.rid, { tags: s.tags.filter((x) => x !== t) }); notify(`Removed tag ${t}`); }}><Ic name="x" size={11} /></button></li>)}</ul>
      <span className="tv-ta"><input value={v} placeholder="Add tag" aria-label="Add a tag" aria-invalid={!!err} aria-describedby={err ? 'tv-te-e' : undefined} onChange={(e) => { setV(e.target.value); setErr(''); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} /><button type="button" className="td-btn is-sm" onClick={add} disabled={!v.trim()}>Add</button></span>
      {err && <span id="tv-te-e" className="tv-err" role="alert">{err}</span>}
    </div>
  );
}

export function ResultsView({ store, open, onOpen, onFollow, notify }: { store: Store; open: string | null; onOpen: (rid: string | null) => void; onFollow: (rid: string) => void; notify: Notify }) {
  const { saved } = store;
  const [q, setQ] = useState(''); const [tag, setTag] = useState(''); const [sort, setSort] = useState<'recent' | 'name'>('recent'); const [mode, setMode] = useState<'grid' | 'list'>('grid'); const [ren, setRen] = useState<string | null>(null);
  const tags = useMemo(() => { const m = new Map<string, number>(); saved.forEach((s) => s.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1))); return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])); }, [saved]);
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return saved.filter((s) => (!tag || s.tags.includes(tag)) && (!n || `${s.name} ${resOf(s.rid).title} ${resOf(s.rid).period} ${s.tags.join(' ')}`.toLowerCase().includes(n)))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (sort === 'name' ? a.name.localeCompare(b.name) : b.at.localeCompare(a.at)));
  }, [saved, q, tag, sort]);
  const del = (s: Saved) => { const r = store.remove(s.rid); if (!r) return; if (open === s.rid) onOpen(null); notify(`Deleted “${s.name}”`, { label: 'Undo', run: () => { store.restore(r.item, r.i); notify(`Restored “${s.name}”`); } }); };
  const pin = (s: Saved) => { store.patch(s.rid, { pinned: !s.pinned }); notify(s.pinned ? `Unpinned “${s.name}”` : `Pinned “${s.name}” to the top`); };
  const rename = (s: Saved, name: string) => { setRen(null); if (name !== s.name) { store.patch(s.rid, { name }); notify(`Renamed to “${name}”`); } };
  const cur = open ? saved.find((s) => s.rid === open) : undefined;

  if (cur) {
    const res = resOf(cur.rid);
    return (
      <div className="tv-page" data-scroll>
        <div className="tv-detail">
          <button type="button" className="tv-back" onClick={() => onOpen(null)}><Ic name="back" size={14} />All results</button>
          <div className="tv-dt">
            {ren === cur.rid ? <RenameField value={cur.name} label="Result name" onSave={(v) => rename(cur, v)} onCancel={() => setRen(null)} /> : <h1 data-vh tabIndex={-1}>{cur.name}</h1>}
            <RowActions s={cur} onPin={() => pin(cur)} onRename={() => setRen(cur.rid)} onDelete={() => del(cur)} />
          </div>
          <p className="tv-sub">{res.title} · saved {dateLabel(cur.at)}</p>
          <TagEditor s={cur} store={store} notify={notify} />
          <div className="tv-card tv-big"><ResultView res={res} bare actions={<Button variant="primary" small icon="sparkle" onClick={() => onFollow(cur.rid)}>Ask follow-up</Button>} /></div>
        </div>
      </div>
    );
  }

  const cols: Array<Col<Saved>> = [
    { id: 'name', label: 'Name', sort: (a, b) => a.name.localeCompare(b.name), cell: (s) => (ren === s.rid ? <RenameField value={s.name} label="Result name" onSave={(v) => rename(s, v)} onCancel={() => setRen(null)} /> : <span className="tv-ln">{s.pinned && <Ic name="pin" size={12} fill />}<button type="button" className="tv-link" onClick={(e) => { e.stopPropagation(); onOpen(s.rid); }}>{s.name}</button></span>) },
    { id: 'val', label: 'Headline', align: 'right', cell: (s) => <b>{resOf(s.rid).headline.value}</b>, hideBelow: 'sm' },
    { id: 'period', label: 'Period', cell: (s) => resOf(s.rid).period.split(' (')[0]!.split(',')[0], hideBelow: 'md' },
    { id: 'tags', label: 'Tags', cell: (s) => <TagList tags={s.tags} on={tag} onPick={(t) => setTag(tag === t ? '' : t)} />, hideBelow: 'sm' },
    { id: 'at', label: 'Saved', sort: (a, b) => a.at.localeCompare(b.at), cell: (s) => dateLabel(s.at), hideBelow: 'md' },
    { id: 'a', label: '', align: 'right', w: '120px', cell: (s) => <RowActions s={s} onPin={() => pin(s)} onRename={() => setRen(s.rid)} onDelete={() => del(s)} /> },
  ];
  const pinned = rows.filter((s) => s.pinned); const rest = rows.filter((s) => !s.pinned);
  const card = (s: Saved) => {
    const r = resOf(s.rid); const h = r.headline;
    return (
      <article key={s.rid} className={cx('tv-card', 'tv-g', s.pinned && 'is-pinned')}>
        <div className="tv-thumb"><Thumb res={r} /></div>
        <div className="tv-cb">
          {ren === s.rid ? <RenameField value={s.name} label="Result name" onSave={(v) => rename(s, v)} onCancel={() => setRen(null)} /> : <h3><button type="button" className="tv-open" onClick={() => onOpen(s.rid)}>{s.name}</button></h3>}
          <p className="tv-meta">{r.period.split(' (')[0]!.split(',')[0]} · saved {dateLabel(s.at)}</p>
          <div className="tv-kv"><b>{h.value}</b>{h.delta !== undefined && <Delta value={h.delta} good={h.good ?? 'up'} />}<span>{h.label.split(',')[0]}</span></div>
          <div className="tv-foot"><TagList tags={s.tags} on={tag} onPick={(t) => setTag(tag === t ? '' : t)} /><RowActions s={s} onPin={() => pin(s)} onRename={() => setRen(s.rid)} onDelete={() => del(s)} /></div>
        </div>
      </article>
    );
  };
  return (
    <div className="tv-page" data-scroll>
      <div className="td-ph"><div><h1 data-vh tabIndex={-1}>Results</h1><p>{saved.length} saved {saved.length === 1 ? 'analysis' : 'analyses'}. Open one to see the chart, table and query again.</p></div></div>
      <div className="tv-bar">
        <SearchBox value={q} onChange={setQ} label="Search saved results" placeholder="Search by name, topic or tag" />
        {mode === 'grid' && <Segmented label="Sort by" value={sort} onChange={setSort} options={[{ id: 'recent', label: 'Recent' }, { id: 'name', label: 'Name' }]} />}
        <Segmented label="Layout" value={mode} onChange={setMode} options={[{ id: 'grid', label: 'Gallery' }, { id: 'list', label: 'List' }]} />
      </div>
      <div className="tv-chips" role="group" aria-label="Filter by tag">
        <button type="button" className="tx-chip is-sm" aria-pressed={!tag} onClick={() => setTag('')}>All <span>{saved.length}</span></button>
        {tags.map(([t, n]) => <button key={t} type="button" className="tx-chip is-sm" aria-pressed={tag === t} onClick={() => setTag(tag === t ? '' : t)}>{t} <span>{n}</span></button>)}
      </div>
      <p className="td-sr" role="status">{rows.length} of {saved.length} results shown</p>
      {!saved.length ? <Empty title="Nothing saved yet" text="Ask a question, then choose “Save to Results” under the answer to keep it here." />
        : !rows.length ? <div className="tv-empty"><Empty title="No results match" text="Try a different word or clear the filters." /><Button small onClick={() => { setQ(''); setTag(''); }}>Clear filters</Button></div>
        : mode === 'list' ? <div className="tv-card"><Table caption="Saved results" cols={cols} rows={rows} rowKey={(s) => s.rid} onRow={(s) => onOpen(s.rid)} /></div>
        : <>
          {pinned.length > 0 && <section aria-label="Pinned"><h2 className="tv-gh"><Ic name="pin" size={12} fill />Pinned</h2><div className="tv-grid">{pinned.map(card)}</div></section>}
          {rest.length > 0 && <section aria-label={pinned.length ? 'Other results' : 'Results'}>{pinned.length > 0 && <h2 className="tv-gh">{sort === 'name' ? 'A to Z' : 'Most recent'}</h2>}<div className="tv-grid">{rest.map(card)}</div></section>}
        </>}
    </div>
  );
}
