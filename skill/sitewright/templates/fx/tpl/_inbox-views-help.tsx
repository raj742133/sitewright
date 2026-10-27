'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Empty, Glyph, Pill, cx, fmt, useWidth } from './_dash';
import { Ico, type Conv } from './_inbox';
import { ARTICLES, HELP_CATS, type Article } from './_inbox-help-data';
import { SearchField, SelectField, ViewHead } from './_inbox-views-ui';

export type Votes = Record<string, 'up' | 'down'>;
const catName = (id: string) => HELP_CATS.find((c) => c.id === id)!.label;
const score = (a: Article, v?: 'up' | 'down') => { const up = a.up + (v === 'up' ? 1 : 0), down = a.down + (v === 'down' ? 1 : 0); return { up, down, pct: up / (up + down) }; };

export default function Help({ convs, current, votes, onVote, onInsert }: { convs: Conv[]; current: string | null; votes: Votes; onVote: (id: string, v: 'up' | 'down' | null) => void; onInsert: (articleId: string, convId: string) => void }) {
  const [q, setQ] = useState(''); const [cat, setCat] = useState('all'); const [open, setOpen] = useState<string | null>(null);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ARTICLES.filter((a) => (cat === 'all' || a.cat === cat) && (!s || [a.title, a.summary, a.intro, ...a.sections.flatMap((x) => [x.h, x.p ?? '', ...(x.steps ?? [])])].some((t) => t.toLowerCase().includes(s)))).sort((a, b) => b.reads - a.reads);
  }, [q, cat]);
  const [wrap, w] = useWidth<HTMLDivElement>();
  const art = ARTICLES.find((a) => a.id === open) ?? (w > 820 ? list[0] ?? null : null);
  const counts = (id: string) => (id === 'all' ? ARTICLES.length : ARTICLES.filter((a) => a.cat === id).length);
  const onKey = (e: React.KeyboardEvent) => {
    const els = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[data-art]')); const i = els.indexOf(document.activeElement as HTMLElement);
    const n = e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : -1; if (n < 0 || !els.length) return; e.preventDefault(); els[Math.max(0, Math.min(els.length - 1, n))]?.focus();
  };
  return (
    <>
      <ViewHead title="Help center" sub={`${ARTICLES.length} public articles your customers and your team can link to. Insert any of them straight into a reply.`} />
      <div className="tv-help" ref={wrap} data-open={open && art ? 'reader' : 'list'}>
        <section className="tv-hl" aria-label="Articles">
          <div className="tv-hl-h">
            <SearchField value={q} onChange={setQ} label="Search articles" placeholder="Search articles" />
            <SelectField value={cat} onChange={setCat} label="Category" options={[{ id: 'all', label: `All categories (${counts('all')})` }, ...HELP_CATS.map((c) => ({ id: c.id, label: `${c.label} (${counts(c.id)})` }))]} />
          </div>
          <div className="tv-hl-b" onKeyDown={onKey} role="list" aria-label={`${list.length} articles`}>
            {HELP_CATS.filter((c) => list.some((a) => a.cat === c.id)).map((c) => (
              <div key={c.id} role="listitem" className="tv-hcat"><h2>{c.label}</h2>
                <ul>{list.filter((a) => a.cat === c.id).map((a) => { const s = score(a, votes[a.id]); return (
                  <li key={a.id}><button type="button" data-art="" className={cx('tv-art', art?.id === a.id && 'is-sel')} aria-current={art?.id === a.id ? 'true' : undefined} onClick={() => setOpen(a.id)}>
                    <b>{a.title}</b><span>{a.summary}</span><small>{fmt.n(a.reads)} reads · {Math.round(s.pct * 100)}% helpful</small></button></li>); })}</ul>
              </div>))}
            {!list.length && <Empty title="No articles found" text={q ? `Nothing matches “${q}”. Try a shorter word.` : 'This category is empty.'} />}
          </div>
        </section>
        <section className="tv-reader" aria-label="Article">
          {art ? <Reader key={art.id} focus={open === art.id} art={art} vote={votes[art.id]} onVote={(v) => onVote(art.id, v)} onBack={() => setOpen(null)} convs={convs} current={current} onInsert={(cid) => onInsert(art.id, cid)} /> : <Empty title="Select an article" text="Read it here, rate it, and add it to a reply." />}
        </section>
      </div>
    </>
  );
}

function Reader({ focus, art, vote, onVote, onBack, convs, current, onInsert }: { focus: boolean; art: Article; vote?: 'up' | 'down'; onVote: (v: 'up' | 'down' | null) => void; onBack: () => void; convs: Conv[]; current: string | null; onInsert: (convId: string) => void }) {
  const h = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (focus) h.current?.focus({ preventScroll: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const targets = convs.filter((c) => c.status !== 'resolved');
  const [to, setTo] = useState(targets.some((c) => c.id === current) ? current! : targets[0]?.id ?? '');
  const s = score(art, vote);
  return (
    <article className="tv-art-r">
      <button type="button" className="tv-back" onClick={onBack}><Ico name="back" size={14} />All articles</button>
      <div className="tv-art-m"><Pill tone="info" dot={false}>{catName(art.cat)}</Pill><span>Updated {art.upd}</span><span>{fmt.n(art.reads)} reads</span></div>
      <h2 ref={h} tabIndex={-1}>{art.title}</h2>
      <p className="tv-lead">{art.intro}</p>
      {art.sections.map((x) => (
        <div key={x.h} className="tv-sec"><h3>{x.h}</h3>{x.p && <p>{x.p}</p>}{x.steps && <ol>{x.steps.map((t) => <li key={t}>{t}</li>)}</ol>}</div>
      ))}
      <div className="tv-fb" role="group" aria-label="Was this article helpful?">
        <b>Was this helpful?</b>
        <button type="button" className="td-btn is-sm" aria-pressed={vote === 'up'} onClick={() => onVote(vote === 'up' ? null : 'up')}><Glyph name="up" size={13} />Helpful</button>
        <button type="button" className="td-btn is-sm" aria-pressed={vote === 'down'} onClick={() => onVote(vote === 'down' ? null : 'down')}><Glyph name="arrowdown" size={13} />Not helpful</button>
        <span className="tv-fb-s" role="status">{vote === 'up' ? 'Thanks, noted.' : vote === 'down' ? 'Thanks. We will review this article.' : ''} {s.up} helpful, {s.down} not ({Math.round(s.pct * 100)}%)</span>
      </div>
      <div className="tv-ins">
        <div><b>Use in a reply</b><small>Adds the title, a short summary and the link to the composer. You can edit it before sending.</small></div>
        {targets.length ? <>
          <SelectField value={to} onChange={setTo} label="Conversation to reply to" options={targets.map((c) => ({ id: c.id, label: `#${c.num} ${c.cust.name}` }))} />
          <Button variant="primary" icon="send" onClick={() => onInsert(to)}>Insert into reply</Button></>
          : <small>No open or pending conversations to reply to.</small>}
      </div>
    </article>
  );
}
