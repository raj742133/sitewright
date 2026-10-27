'use client';
import { useEffect, useRef, useState } from 'react';
import { Avatar, Button, Pill, Progress, cx } from './_dash';
import { CANNED } from './_inbox-data';
import { Ico, Menu, clock, dayLabel, localTime, money, type Conv, type Customer, type Msg } from './_inbox';

/* ---------------------------------------------------------------- one message in the thread */
export function Message({ m }: { m: Msg }) {
  if (m.kind === 'event') return <li className="ti-event"><Ico name="check" size={12} />{m.text}<span>{clock(m.ago)}</span></li>;
  const note = m.kind === 'note', mine = m.kind !== 'customer';
  return (
    <li className={cx('ti-msg', note && 'is-note', mine && !note && 'is-agent')}>
      <Avatar name={m.who} size={28} />
      <div className="ti-msg-c">
        <div className="ti-msg-h"><b>{m.who}</b>{mine && !note && <span className="ti-tag">Team</span>}<time>{clock(m.ago)}</time></div>
        {note && <div className="ti-note-l"><Ico name="lock" size={12} />Internal note. Only your team can see this.</div>}
        <p>{m.text}</p>
        {m.delivery && (
          <span className={cx('ti-deliv', m.delivery !== 'sending' && 'is-ok')} role="status">
            <Ico name={m.delivery === 'sending' ? 'clock' : 'tick'} size={13} />{m.delivery === 'sending' ? 'Sending…' : m.delivery === 'seen' ? 'Seen' : 'Delivered'}
          </span>
        )}
      </div>
    </li>
  );
}
export function dayBreaks(msgs: Msg[]) {
  const out: Array<{ label: string; items: Msg[] }> = [];
  for (const m of msgs) { const l = dayLabel(m.ago); const last = out[out.length - 1]; if (last && last.label === l) last.items.push(m); else out.push({ label: l, items: [m] }); }
  return out;
}

/* ---------------------------------------------------------------- composer: Reply / Internal note */
export function Composer({ conv, onSend }: { conv: Conv; onSend: (mode: 'reply' | 'note', text: string) => void }) {
  const [mode, setMode] = useState<'reply' | 'note'>('reply');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const area = useRef<HTMLTextAreaElement>(null);
  const [mac, setMac] = useState(false);
  useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);
  const key = `${conv.id}:${mode}`, text = drafts[key] ?? '';
  const set = (v: string) => setDrafts((d) => ({ ...d, [key]: v }));
  const first = conv.cust.name.split(' ')[0]!;
  const send = () => { if (!text.trim()) return; onSend(mode, text.trim()); set(''); area.current?.focus(); };
  const tabKey = (e: React.KeyboardEvent) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); const n = mode === 'reply' ? 'note' : 'reply'; setMode(n); (e.currentTarget.querySelector(`[data-m="${n}"]`) as HTMLElement | null)?.focus(); } };
  return (
    <div className={cx('ti-comp', mode === 'note' && 'is-note')}>
      <div className="ti-comp-t" role="tablist" aria-label="Composer mode" onKeyDown={tabKey}>
        {(['reply', 'note'] as const).map((k) => (
          <button key={k} type="button" role="tab" data-m={k} aria-selected={mode === k} tabIndex={mode === k ? 0 : -1} onClick={() => setMode(k)}><Ico name={k === 'reply' ? 'send' : 'lock'} size={13} />{k === 'reply' ? 'Reply' : 'Internal note'}</button>
        ))}
        <span className="ti-comp-to">{mode === 'reply' ? <>To <b>{conv.cust.email}</b></> : 'Visible to your team only'}</span>
      </div>
      <textarea ref={area} value={text} onChange={(e) => set(e.target.value)} rows={3} aria-label={mode === 'reply' ? `Reply to ${conv.cust.name}` : 'Internal note'}
        placeholder={mode === 'reply' ? `Write a reply to ${first}…` : 'Leave a note for your team. Use @ to mention someone.'}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }} />
      <div className="ti-comp-b">
        {mode === 'reply' && <Menu label="Canned replies" icon="bolt" text="Canned replies" up items={CANNED.map((c) => ({ id: c.id, label: c.label, hint: c.text.replace('{first}', first) }))}
          onPick={(id) => { const c = CANNED.find((x) => x.id === id); if (c) { set((text ? `${text}\n\n` : '') + c.text.replace('{first}', first)); setTimeout(() => area.current?.focus(), 0); } }} />}
        <span className="ti-comp-h"><kbd>{mac ? '⌘' : 'Ctrl'}</kbd><kbd>{'↵'}</kbd> to send</span>
        <Button variant="primary" icon={mode === 'reply' ? 'send' : 'lock'} onClick={send} disabled={!text.trim()}>{mode === 'reply' ? 'Send reply' : 'Add note'}</Button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- customer panel */
const PLAN_TONE = { Trial: 'neutral', Starter: 'neutral', Team: 'ok', Business: 'info', Enterprise: 'accent' } as const;
export function CustomerPanel({ c, onTags, onClose }: { c: Customer; onTags: (tags: string[]) => void; onClose: () => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const commit = () => { const t = draft.trim().toLowerCase().replace(/\s+/g, '-'); if (t && !c.tags.includes(t)) onTags([...c.tags, t]); setDraft(''); setAdding(false); };
  return (
    <>
      <div className="ti-ph"><button type="button" className="td-btn is-ghost is-icon ti-close" onClick={onClose} aria-label="Close customer panel"><Ico name="x" /></button><h2>Customer</h2></div>
      <div className="ti-pane-s">
        <div className="ti-who">
          <Avatar name={c.name} size={44} />
          <div><b>{c.name}</b><a href={`mailto:${c.email}`}>{c.email}</a><span>{c.company}</span></div>
        </div>
        <dl className="ti-kv">
          <div><dt>Plan</dt><dd><Pill tone={PLAN_TONE[c.plan]}>{c.plan}</Pill></dd></div>
          <div><dt>MRR</dt><dd>{c.mrr ? money(c.mrr) : '—'}</dd></div>
          <div><dt>Customer since</dt><dd>{c.since}</dd></div>
          <div><dt>Location</dt><dd>{c.location}</dd></div>
          <div><dt>Local time</dt><dd>{localTime(c.tz)}</dd></div>
        </dl>
        <section className="ti-sec" aria-label="Tags">
          <h3>Tags</h3>
          <div className="ti-tags">
            {c.tags.map((t) => <span key={t} className="ti-chip">{t}<button type="button" aria-label={`Remove tag ${t}`} onClick={() => onTags(c.tags.filter((x) => x !== t))}><Ico name="x" size={11} /></button></span>)}
            {adding
              ? <input className="ti-taginput" autoFocus value={draft} aria-label="New tag" placeholder="tag name" onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(''); setAdding(false); } }} />
              : <button type="button" className="ti-chip is-add" onClick={() => setAdding(true)}><Ico name="plus" size={11} />Add tag</button>}
          </div>
        </section>
        <section className="ti-sec" aria-label="Previous conversations">
          <h3>Previous conversations <span>{c.prev.length}</span></h3>
          {c.prev.length ? <ul className="ti-prev">{c.prev.map((p) => <li key={p.s}><span>{p.s}</span><small>{p.d}</small></li>)}</ul> : <p className="ti-quiet">First conversation with {c.name.split(' ')[0]}.</p>}
        </section>
        <section className="ti-sec" aria-label="Satisfaction">
          <h3>Satisfaction</h3>
          {c.csat === null ? <p className="ti-quiet">No ratings yet.</p> : <>
            <div className="ti-csat"><b>{Math.round(c.csat * 100)}%</b><small>positive across {c.ratings} {c.ratings === 1 ? 'rating' : 'ratings'}</small></div>
            <Progress value={c.csat} tone={c.csat >= 0.9 ? 'ok' : 'primary'} label={`Satisfaction ${Math.round(c.csat * 100)} percent`} />
          </>}
        </section>
      </div>
    </>
  );
}
