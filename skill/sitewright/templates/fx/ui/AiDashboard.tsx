'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Area, Bars, Donut, Mini, money, useReducedMotion, type Pt, type Pt2 } from './_d8';

export type AiView =
  | { kind: 'area'; title: string; data: Pt[]; name: string; money?: boolean }
  | { kind: 'bars'; title: string; data: Pt2[]; aName: string; bName: string }
  | { kind: 'donut'; title: string; data: Pt[] }
  | { kind: 'table'; title: string; columns: string[]; rows: string[][] };
export interface AiIntent { id: string; chip: string; keys: string[]; answer: string; view: AiView }
export interface AiDashboardProps {
  title?: string;
  intents?: AiIntent[];
  greeting?: string;
  className?: string;
}

const INTENTS: AiIntent[] = [
  { id: 'revenue', chip: 'How is revenue trending?', keys: ['revenue', 'sales', 'trend', 'money', 'growth'], answer: 'Revenue is up 23% across the last 10 weeks. The steepest climb came in weeks 7 to 9, right after the annual-plan discount went out. I plotted weekly totals on the right.', view: { kind: 'area', title: 'Weekly revenue', name: 'Revenue', money: true, data: [14200, 14900, 15300, 15100, 16800, 17400, 19600, 21200, 22100, 21800].map((v, i) => ({ label: `W${i + 1}`, value: v })) } },
  { id: 'churn', chip: 'Where are we losing customers?', keys: ['churn', 'lose', 'losing', 'cancel', 'retention', 'leaving'], answer: 'Churn is concentrated in the Starter plan, at 6.4% a month, versus 2.1% on Team. Most Starter cancellations happen in the first 30 days, so onboarding is the place to look.', view: { kind: 'bars', title: 'Monthly churn by plan (%)', aName: 'Churn %', bName: 'Target %', data: [{ label: 'Starter', a: 6.4, b: 4 }, { label: 'Team', a: 2.1, b: 3 }, { label: 'Business', a: 1.4, b: 2 }, { label: 'Scale', a: 0.9, b: 1.5 }] } },
  { id: 'channels', chip: 'Which channels bring signups?', keys: ['channel', 'signup', 'sign up', 'source', 'acquisition', 'traffic'], answer: 'Organic search brings the most signups at 38%, but referrals convert best. If you can grow only one channel this quarter, referrals have the better return.', view: { kind: 'donut', title: 'Signups by channel', data: [{ label: 'Search', value: 38 }, { label: 'Referral', value: 24 }, { label: 'Social', value: 19 }, { label: 'Email', value: 13 }, { label: 'Paid', value: 6 }] } },
  { id: 'accounts', chip: 'Show my top accounts', keys: ['account', 'customer', 'top', 'biggest', 'client'], answer: 'Here are your five largest accounts by monthly recurring revenue. Northwind and Kestrel Labs together make up 31% of the total, so keep an eye on concentration.', view: { kind: 'table', title: 'Top accounts by MRR', columns: ['Account', 'Plan', 'MRR', 'Seats'], rows: [['Northwind Freight', 'Scale', '$6,400', '212'], ['Kestrel Labs', 'Scale', '$5,150', '174'], ['Bramble & Co', 'Business', '$3,900', '96'], ['Ovenworks', 'Business', '$3,320', '88'], ['Tidewater Media', 'Team', '$2,100', '41']] } },
];
const FALLBACK = 'I can dig into revenue, churn, signup channels or your top accounts. Pick a suggestion or ask about one of those.';
type Msg = { role: 'user' | 'ai'; text: string };

function Panel({ view }: { view: AiView }) {
  if (view.kind === 'area') return <Area data={view.data} title={view.title} name={view.name} fmt={view.money ? (n) => money(n) : undefined} height={220} />;
  if (view.kind === 'bars') return <Bars data={view.data} aName={view.aName} bName={view.bName} title={view.title} height={190} />;
  if (view.kind === 'donut') return <Donut cls="ui-ai-dashboard" data={view.data} title={view.title} colors={['var(--primary, #2563eb)', 'var(--signal, #f59e0b)', 'var(--ok, #16a34a)', '#a855f7', 'var(--muted, #667)']} centre="signups" />;
  return (
    <div className="ui-ai-dashboard-scroll" tabIndex={0} role="region" aria-label={`${view.title}, scrollable`}>
      <table><caption className="ui-ai-dashboard-sr">{view.title}</caption>
        <thead><tr>{view.columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
        <tbody>{view.rows.map((r) => <tr key={r[0]}>{r.map((c, i) => (i === 0 ? <th key={i} scope="row">{c}</th> : <td key={i}>{c}</td>))}</tr>)}</tbody>
      </table>
    </div>
  );
}

/** Assistant chat (canned answers, typing animation, suggestion chips) next to an analytics panel that changes with each question. */
export default function AiDashboard({ title = 'Ask Meridian', intents = INTENTS, greeting = 'Hi, I am your data assistant. What would you like to look at?', className }: AiDashboardProps) {
  const reduced = useReducedMotion();
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'ai', text: greeting }]);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [view, setView] = useState<AiIntent | null>(intents[0] ?? null);
  const [asked, setAsked] = useState(intents[0]?.chip ?? '');
  const log = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => { timers.current.forEach((t) => clearTimeout(t)); timers.current = []; }, []);
  useEffect(() => { const el = log.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, busy]);

  const ask = (q: string) => {
    const text = q.trim();
    if (!text || busy) return;
    setMsgs((m) => [...m, { role: 'user', text }]);
    setDraft('');
    setBusy(true);
    const lower = text.toLowerCase();
    const hit = intents.find((i) => i.chip === text || i.keys.some((k) => lower.includes(k)));
    const answer = hit ? hit.answer : FALLBACK;
    const finish = () => { setBusy(false); if (hit) { setView(hit); setAsked(text); } };
    const t0 = window.setTimeout(() => {
      if (reduced) { setMsgs((m) => [...m, { role: 'ai', text: answer }]); finish(); return; }
      setMsgs((m) => [...m, { role: 'ai', text: '' }]);
      let n = 0;
      const tick = () => {
        n += 2;
        setMsgs((m) => m.map((x, i) => (i === m.length - 1 ? { ...x, text: answer.slice(0, n) } : x)));
        if (n < answer.length) timers.current.push(window.setTimeout(tick, 16));
        else finish();
      };
      tick();
    }, reduced ? 0 : 650);
    timers.current.push(t0);
  };
  const submit = (e: FormEvent) => { e.preventDefault(); ask(draft); };
  const typing = busy && msgs[msgs.length - 1]?.role === 'user';
  return (
    <section className={`ui-ai-dashboard ${className ?? ''}`} aria-label={title}>
      <div className="ui-ai-dashboard-chat">
        <h2><span className="ui-ai-dashboard-orb" aria-hidden="true" />{title}</h2>
        <div ref={log} className="ui-ai-dashboard-log" role="log" aria-live="polite" aria-label="Conversation" tabIndex={0}>
          {msgs.map((m, i) => (m.text || m.role === 'user') && <p key={i} data-role={m.role}>{m.text}</p>)}
          {typing && <p data-role="ai" className="ui-ai-dashboard-dots" aria-label="Assistant is typing"><i /><i /><i /></p>}
        </div>
        <ul className="ui-ai-dashboard-chips" aria-label="Suggestions">
          {intents.map((i) => <li key={i.id}><button type="button" disabled={busy} onClick={() => ask(i.chip)}>{i.chip}</button></li>)}
        </ul>
        <form onSubmit={submit} className="ui-ai-dashboard-form">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask about revenue, churn…" aria-label="Your question" autoComplete="off" />
          <button type="submit" disabled={busy || !draft.trim()}>Send</button>
        </form>
      </div>
      <div className="ui-ai-dashboard-panel" aria-live="polite">
        {view ? (
          <>
            <div className="ui-ai-dashboard-ph"><h3>{view.view.title}</h3><p>For: “{asked}”</p></div>
            <div key={view.id} className="ui-ai-dashboard-body"><Panel view={view.view} /></div>
          </>
        ) : <p>Ask a question to see data here.</p>}
      </div>
    </section>
  );
}

export function Demo() {
  return <Mini w={1000}><AiDashboard /></Mini>;
}
