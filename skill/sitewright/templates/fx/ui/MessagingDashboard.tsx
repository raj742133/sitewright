'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import { Avatar, Mini, useEntry } from './_d7';

export type ConvStatus = 'open' | 'pending' | 'closed';
export interface Msg { id: string; from: 'them' | 'me'; text: string; time: string }
export interface Order { id: string; item: string; total: string; state: string }
export interface Conversation {
  id: string; name: string; email: string; plan: string; tags: string[]; status: ConvStatus; unread: number; since: string;
  orders: Order[]; messages: Msg[];
}
export interface MessagingDashboardProps {
  conversations?: Conversation[];
  agent?: string;
  /** produce the automatic reply; defaults to a small keyword bot */
  reply?: (text: string, c: Conversation) => string;
  replyDelay?: number;
}

const SAMPLE: Conversation[] = [
  { id: 'c1', name: 'Maya Okafor', email: 'maya@fernhill.example', plan: 'Pro', tags: ['wholesale', 'priority'], status: 'open', unread: 2, since: 'Customer since 2023',
    orders: [{ id: '#4821', item: 'House blend x12', total: '$216', state: 'Shipped' }, { id: '#4760', item: 'Dripper set', total: '$64', state: 'Delivered' }],
    messages: [{ id: 'm1', from: 'them', text: 'Hi! Our shop order has not arrived yet.', time: '9:12' }, { id: 'm2', from: 'me', text: 'Sorry about that, checking the tracking now.', time: '9:14' }, { id: 'm3', from: 'them', text: 'Thanks. Can you also send an invoice?', time: '9:20' }] },
  { id: 'c2', name: 'Jonas Weber', email: 'jonas@mail.example', plan: 'Starter', tags: ['new'], status: 'open', unread: 1, since: 'Customer since 2026',
    orders: [{ id: '#4833', item: 'Cold brew kit', total: '$38', state: 'Packing' }],
    messages: [{ id: 'm1', from: 'them', text: 'Is the cold brew kit dishwasher safe?', time: '8:41' }] },
  { id: 'c3', name: 'Priya Raman', email: 'priya@loft.example', plan: 'Pro', tags: ['refund'], status: 'pending', unread: 0, since: 'Customer since 2024',
    orders: [{ id: '#4790', item: 'Gift subscription', total: '$90', state: 'Refund due' }],
    messages: [{ id: 'm1', from: 'them', text: 'I bought the wrong subscription by mistake.', time: 'Tue' }, { id: 'm2', from: 'me', text: 'No problem, I have asked billing to review it.', time: 'Tue' }] },
  { id: 'c4', name: 'Tomas Liu', email: 'tomas@studio.example', plan: 'Team', tags: ['vip'], status: 'pending', unread: 0, since: 'Customer since 2022',
    orders: [{ id: '#4702', item: 'Office beans x40', total: '$640', state: 'Delivered' }],
    messages: [{ id: 'm1', from: 'them', text: 'Could we move delivery to Fridays?', time: 'Mon' }, { id: 'm2', from: 'me', text: 'Waiting on the courier to confirm.', time: 'Mon' }] },
  { id: 'c5', name: 'Ines Duarte', email: 'ines@cafe.example', plan: 'Starter', tags: [], status: 'closed', unread: 0, since: 'Customer since 2025',
    orders: [{ id: '#4655', item: 'Ceramic dripper', total: '$42', state: 'Delivered' }],
    messages: [{ id: 'm1', from: 'them', text: 'Received it, it is lovely. Thank you!', time: 'Sun' }, { id: 'm2', from: 'me', text: 'Wonderful, enjoy!', time: 'Sun' }] },
];

function defaultReply(text: string, c: Conversation): string {
  const t = text.toLowerCase();
  const first = c.name.split(' ')[0];
  if (/refund|money back/.test(t)) return `Understood, ${first}. I have flagged a refund review; you will hear back within 2 working days.`;
  if (/ship|deliver|track|arrive/.test(t)) return 'The parcel is with the courier and should arrive within 2 days. I will send the tracking link here.';
  if (/invoice|receipt/.test(t)) return 'Of course, the invoice is on its way to ' + c.email + '.';
  if (/thank|thx/.test(t)) return "You're welcome! Anything else I can help with?";
  if (/hi|hello|hey/.test(t)) return `Hello ${first}! How can I help today?`;
  return 'Got it, thanks. I will look into this and update you shortly.';
}
const TABS: ConvStatus[] = ['open', 'pending', 'closed'];
const nowTime = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export default function MessagingDashboard({ conversations = SAMPLE, agent = 'Support', reply = defaultReply, replyDelay = 1400 }: MessagingDashboardProps) {
  const root = useRef<HTMLDivElement>(null);
  const { cls } = useEntry(root);
  const [convs, setConvs] = useState(conversations);
  const [tab, setTab] = useState<ConvStatus>('open');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(conversations[0]?.id ?? '');
  const [view, setView] = useState<'list' | 'thread'>('list');
  const [info, setInfo] = useState(false);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const selRef = useRef(sel);
  const bottom = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  selRef.current = sel;
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const counts = useMemo(() => Object.fromEntries(TABS.map((s) => [s, convs.filter((c) => c.status === s).length])) as Record<ConvStatus, number>, [convs]);
  const list = useMemo(() => convs.filter((c) => c.status === tab && (c.name + ' ' + (c.messages[c.messages.length - 1]?.text ?? '')).toLowerCase().includes(q.trim().toLowerCase())), [convs, tab, q]);
  const cur = convs.find((c) => c.id === sel) ?? null;
  const curLen = cur?.messages.length ?? 0;
  useEffect(() => { bottom.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' }); }, [curLen, typing, sel]);

  const open = (id: string) => {
    setSel(id); setView('thread'); setInfo(false);
    setConvs((cs) => cs.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
  };
  const setStatus = (id: string, status: ConvStatus) => { setConvs((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c))); };
  const send = (e?: FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || !cur) return;
    const id = cur.id;
    const mk = (from: 'me' | 'them', t: string): Msg => ({ id: 'n' + ++seq.current, from, text: t, time: nowTime() });
    setConvs((cs) => cs.map((c) => (c.id === id ? { ...c, messages: [...c.messages, mk('me', text)], status: c.status === 'closed' ? 'open' : c.status } : c)));
    if (cur.status === 'closed') setTab('open');
    setDraft('');
    setTyping(id);
    const t1 = window.setTimeout(() => {
      setTyping((t) => (t === id ? null : t));
      setConvs((cs) => cs.map((c) => (c.id === id ? { ...c, messages: [...c.messages, mk('them', reply(text, c))], unread: selRef.current === id ? 0 : c.unread + 1 } : c)));
    }, replyDelay);
    timers.current.push(t1);
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
  const tabKey = (e: KeyboardEvent) => {
    const i = TABS.indexOf(tab);
    const n = e.key === 'ArrowRight' ? (i + 1) % 3 : e.key === 'ArrowLeft' ? (i + 2) % 3 : -1;
    if (n < 0) return;
    e.preventDefault(); setTab(TABS[n]!);
    root.current?.querySelector<HTMLElement>(`[data-tab="${TABS[n]}"]`)?.focus();
  };

  return (
    <div ref={root} className={'ui-messaging-dashboard' + cls} data-view={view}>
      <aside className="ui-messaging-dashboard-list" aria-label="Conversations">
        <h2 className="ui-messaging-dashboard-h">Inbox</h2>
        <div className="ui-messaging-dashboard-tabs" role="tablist" aria-label="Status" onKeyDown={tabKey}>
          {TABS.map((s) => (
            <button key={s} type="button" role="tab" data-tab={s} aria-selected={tab === s} tabIndex={tab === s ? 0 : -1} onClick={() => setTab(s)}>
              {s[0]!.toUpperCase() + s.slice(1)} <span>{counts[s]}</span>
            </button>
          ))}
        </div>
        <input className="ui-messaging-dashboard-search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations" aria-label="Search conversations" />
        <ul role="tabpanel" className="ui-messaging-dashboard-convs" aria-live="polite">
          {list.map((c, i) => {
            const last = c.messages[c.messages.length - 1];
            return (
              <li key={c.id} style={{ '--i': i } as React.CSSProperties}>
                <button type="button" className="ui-messaging-dashboard-conv" aria-current={c.id === sel ? 'true' : undefined} onClick={() => open(c.id)}>
                  <Avatar name={c.name} size={36} />
                  <span className="ui-messaging-dashboard-cmain">
                    <span className="ui-messaging-dashboard-cname"><b>{c.name}</b><small>{last?.time}</small></span>
                    <span className="ui-messaging-dashboard-prev">{last?.text}</span>
                  </span>
                  {c.unread > 0 && <span className="ui-messaging-dashboard-badge" aria-label={`${c.unread} unread`}>{c.unread}</span>}
                </button>
              </li>
            );
          })}
          {list.length === 0 && <li className="ui-messaging-dashboard-empty">No {tab} conversations{q ? ' match your search' : ''}.</li>}
        </ul>
      </aside>

      <section className="ui-messaging-dashboard-thread" aria-label={cur ? `Conversation with ${cur.name}` : 'Conversation'}>
        {cur ? (<>
          <header className="ui-messaging-dashboard-thead">
            <button type="button" className="ui-messaging-dashboard-back" onClick={() => setView('list')} aria-label="Back to inbox">&#8592;</button>
            <Avatar name={cur.name} size={34} />
            <div className="ui-messaging-dashboard-who"><b>{cur.name}</b><small>{cur.email}</small></div>
            <div className="ui-messaging-dashboard-chips" role="group" aria-label="Conversation status">
              {TABS.map((s) => <button key={s} type="button" className={`ui-messaging-dashboard-chip is-${s}`} aria-pressed={cur.status === s} onClick={() => setStatus(cur.id, s)}>{s}</button>)}
            </div>
            <button type="button" className="ui-messaging-dashboard-infobtn" aria-expanded={info} onClick={() => setInfo((v) => !v)}>Details</button>
          </header>
          <div className="ui-messaging-dashboard-msgs" role="log" aria-live="polite" aria-label="Messages">
            {cur.messages.map((m) => (
              <div key={m.id} className={'ui-messaging-dashboard-msg ' + (m.from === 'me' ? 'is-me' : 'is-them')}>
                <p>{m.text}</p><small>{m.from === 'me' ? agent + ' · ' : ''}{m.time}</small>
              </div>
            ))}
            {typing === cur.id && (
              <div className="ui-messaging-dashboard-msg is-them is-typing" role="status" aria-label={`${cur.name} is typing`}><p><i /><i /><i /></p></div>
            )}
            <div ref={bottom} />
          </div>
          <form className="ui-messaging-dashboard-compose" onSubmit={send}>
            <textarea rows={1} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} placeholder={`Reply to ${cur.name.split(' ')[0]}`} aria-label="Write a reply" />
            <button type="submit" disabled={!draft.trim()}>Send</button>
          </form>
        </>) : <p className="ui-messaging-dashboard-empty">Select a conversation.</p>}
      </section>

      {cur && (
        <aside className="ui-messaging-dashboard-panel" data-open={info} aria-label="Customer details">
          <div className="ui-messaging-dashboard-pid">
            <Avatar name={cur.name} size={56} />
            <b>{cur.name}</b><small>{cur.since}</small>
            <span className="ui-messaging-dashboard-plan">{cur.plan} plan</span>
          </div>
          <h3>Tags</h3>
          <ul className="ui-messaging-dashboard-tags">{cur.tags.length ? cur.tags.map((t) => <li key={t}>{t}</li>) : <li className="is-none">No tags</li>}</ul>
          <h3>Recent orders</h3>
          <ul className="ui-messaging-dashboard-orders">
            {cur.orders.map((o) => <li key={o.id}><span><b>{o.id}</b> {o.item}</span><span>{o.total} <em>{o.state}</em></span></li>)}
          </ul>
          <button type="button" className="ui-messaging-dashboard-close" onClick={() => setInfo(false)}>Close details</button>
        </aside>
      )}
    </div>
  );
}

export function Demo() {
  return <Mini width={1000} height={150}><MessagingDashboard /></Mini>;
}
