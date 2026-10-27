'use client';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Avatar, Button, Empty, Glyph, Pill, Preview, Shell, Tabs, cx, type NavEntry } from './_dash';
import { ARTICLES, articleLink } from './_inbox-help-data';
import { DEFAULT_SETTINGS, EXTRA_CONTACTS, SEED_NOTES, buildRows, type Contact, type Note, type Settings } from './_inbox-store';
import { Toast, ViewCtx, type ToastMsg } from './_inbox-views-ui';
import type { Canned } from './_inbox-views-canned';
import type { Votes } from './_inbox-views-help';
import Customers from './_inbox-views-customers';
import Reports from './_inbox-views-reports';
import Help from './_inbox-views-help';
import SettingsView from './_inbox-views-settings';
import { CANNED, CONVERSATIONS } from './_inbox-data';
import { Composer, CustomerPanel, Message, dayBreaks, type Inject } from './_inbox-parts';
import { Ico, Menu, ME, TEAM, channelIcon, channelName, clock, frtOf, fmtDur, lastAgo, shortAgo, type Conv, type Priority, type Status } from './_inbox';

const TONE: Record<Status, 'info' | 'warn' | 'ok'> = { open: 'info', pending: 'warn', resolved: 'ok' };
const LABEL: Record<Status, string> = { open: 'Open', pending: 'Pending', resolved: 'Resolved' };
const PRI: Record<Priority, string> = { urgent: 'Urgent', high: 'High', normal: 'Normal', low: 'Low' };
const SNOOZE = [{ id: 'Today, 11:42', label: 'In 1 hour', hint: 'Today, 11:42' }, { id: 'Sun 25 Oct, 09:00', label: 'Tomorrow', hint: 'Sun 25 Oct, 09:00' }, { id: 'Mon 26 Oct, 09:00', label: 'Next week', hint: 'Mon 26 Oct, 09:00' }];

function Sla({ c }: { c: Conv }) {
  if (c.status === 'resolved' || c.slaLeft === null) { const f = frtOf(c); return f === null ? null : <span className="ti-sla is-done" title="First response time">FRT {fmtDur(f)}</span>; }
  return <span className={cx('ti-sla', c.slaLeft <= 0 ? 'is-bad' : c.slaLeft <= 30 ? 'is-warn' : '')} title="Time left to the first-response SLA">SLA {fmtDur(c.slaLeft)}</span>;
}

export default function InboxDashboard({ brand = 'Quillbase' }: { brand?: string }) {
  const [convs, setConvs] = useState<Conv[]>(CONVERSATIONS);
  const [tab, setTab] = useState<Status>('open');
  const [q, setQ] = useState('');
  const [who, setWho] = useState('all');
  const [sel, setSel] = useState<string | null>('c1');
  const [pane, setPane] = useState<'list' | 'thread' | 'info'>('list');
  const [nav, setNav] = useState('inbox');
  const [custSel, setCustSel] = useState<string | null>(null);
  const [extras, setExtras] = useState<Contact[]>(EXTRA_CONTACTS);
  const [notes, setNotes] = useState<Record<string, Note[]>>(SEED_NOTES);
  const [canned, setCanned] = useState<Canned[]>(CANNED);
  const [saved, setSaved] = useState<Settings>(DEFAULT_SETTINGS);
  const [draft, setDraft] = useState<Settings>(DEFAULT_SETTINGS);
  const [votes, setVotes] = useState<Votes>({});
  const [inject, setInject] = useState<Inject | null>(null);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [touched, setTouched] = useState(false);
  const after = useRef<'thread' | 'composer' | null>(null);
  const [flash, setFlash] = useState('');
  const [live, setLive] = useState('');
  const body = useRef<HTMLDivElement>(null), timers = useRef<number[]>([]), seq = useRef(100), listEl = useRef<HTMLDivElement>(null);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { const v = new URLSearchParams(window.location.search).get('view'); if (v && ['customers', 'reports', 'help', 'settings'].includes(v)) setNav(v); }, []);
  useEffect(() => {
    if (!touched || nav !== 'inbox') return;
    const el = after.current === 'composer' ? null : document.querySelector<HTMLElement>(after.current === 'thread' ? '.ti-th-t h2' : '.ti-lt h1');
    el?.focus({ preventScroll: true }); setLive(after.current === 'composer' ? 'Inbox. Article added to your reply.' : after.current === 'thread' ? `Inbox. ${cur?.subject ?? ''}` : 'Inbox'); after.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav, touched]);
  const say = (msg: string, undo?: () => void) => { setLive(msg); setToast({ id: ++seq.current, text: msg, undo }); timers.current.push(window.setTimeout(() => setToast((t) => (t && t.text === msg ? null : t)), 6000)); };

  const scoped = useMemo(() => {
    const s = q.trim().toLowerCase();
    return convs.filter((c) => (who === 'all' || (who === 'none' ? !c.assignee : c.assignee === (who === 'me' ? ME : who))) && (!s || [c.cust.name, c.cust.company, c.cust.email, c.subject, ...c.msgs.filter((m) => m.kind !== 'event').map((m) => m.text)].some((t) => t.toLowerCase().includes(s))));
  }, [convs, q, who]);
  const counts = { open: 0, pending: 0, resolved: 0 }; scoped.forEach((c) => { counts[c.status]++; });
  const rows = useMemo(() => scoped.filter((c) => c.status === tab).sort((a, b) => lastAgo(a) - lastAgo(b)), [scoped, tab]);
  const cur = convs.find((c) => c.id === sel) ?? null;
  const allOpen = convs.filter((c) => c.status === 'open').length;
  const note = (msg: string, visible = true) => { setLive(msg); if (visible) { setFlash(msg); timers.current.push(window.setTimeout(() => setFlash(''), 4000)); } };
  const patch = (id: string, f: (c: Conv) => Conv) => setConvs((cs) => cs.map((c) => (c.id === id ? f(c) : c)));
  const event = (text: string) => ({ id: `e${++seq.current}`, kind: 'event' as const, who: ME, ago: 0, text });
  useEffect(() => { if (body.current) body.current.scrollTop = body.current.scrollHeight; }, [sel, cur?.msgs.length, pane]);

  const open = (id: string) => { setSel(id); setPane('thread'); patch(id, (c) => ({ ...c, unread: false })); };
  const advance = (id: string) => { const i = rows.findIndex((r) => r.id === id); const next = rows[i + 1] ?? rows[i - 1]; setSel(next && next.id !== id ? next.id : null); setPane('list'); };
  const resolve = (c: Conv) => {
    if (c.status === 'resolved') { patch(c.id, (x) => ({ ...x, status: 'open', msgs: [...x.msgs, event(`${ME} reopened this conversation`)] })); setTab('open'); note('Conversation reopened'); return; }
    patch(c.id, (x) => ({ ...x, status: 'resolved', slaLeft: null, snooze: undefined, unread: false, msgs: [...x.msgs, event(`${ME} resolved this conversation`)] }));
    if (tab !== 'resolved') advance(c.id);
    note(`Resolved. ${Math.max(0, allOpen - (c.status === 'open' ? 1 : 0))} open conversations left`);
  };
  const snooze = (c: Conv, id: string) => {
    if (id === 'wake') { patch(c.id, (x) => ({ ...x, status: 'open', snooze: undefined, msgs: [...x.msgs, event(`${ME} woke this conversation`)] })); note('Snooze cleared, back in Open'); return; }
    patch(c.id, (x) => ({ ...x, status: 'pending', snooze: id, slaLeft: null, msgs: [...x.msgs, event(`${ME} snoozed until ${id}`)] })); note(`Snoozed until ${id}. Moved to Pending`);
  };
  const assign = (c: Conv, id: string) => {
    const to = id === 'none' ? null : id;
    patch(c.id, (x) => ({ ...x, assignee: to, msgs: [...x.msgs, event(to ? `${ME} assigned this to ${to === ME ? 'themselves' : to}` : `${ME} unassigned this conversation`)] }));
    note(to ? `Assigned to ${to}` : 'Unassigned');
  };
  const send = (mode: 'reply' | 'note', text: string) => {
    if (!cur) return; const id = cur.id, mid = `m${++seq.current}`;
    patch(id, (c) => ({ ...c, assignee: c.assignee ?? ME, unread: false, ...(mode === 'reply' ? { status: 'pending' as const, slaLeft: null, snooze: undefined } : {}), msgs: [...c.msgs, { id: mid, kind: mode === 'note' ? 'note' : 'agent', who: ME, ago: 0, text, delivery: mode === 'reply' ? 'sending' : undefined }] }));
    if (mode === 'reply') { timers.current.push(window.setTimeout(() => patch(id, (c) => ({ ...c, msgs: c.msgs.map((m) => (m.id === mid ? { ...m, delivery: 'delivered' as const } : m)) })), 900)); note(cur.status === 'pending' ? 'Reply sent' : 'Reply sent. Moved to Pending'); } else note('Note added for your team', false);
  };
  const custRows = useMemo(() => buildRows(convs, extras), [convs, extras]);
  const goNav = (id: string) => { setTouched(true); if (id === 'customers') setCustSel(null); after.current = null; setNav(id); };
  const openConv = (id: string) => { const c = convs.find((x) => x.id === id); if (!c) return; setQ(''); setWho('all'); setTab(c.status); setSel(id); setPane('thread'); patch(id, (x) => ({ ...x, unread: false })); after.current = 'thread'; setTouched(true); setNav('inbox'); };
  const setTags = (email: string, tags: string[]) => { setConvs((cs) => cs.map((c) => (c.cust.email === email ? { ...c, cust: { ...c.cust, tags } } : c))); setExtras((xs) => xs.map((x) => (x.email === email ? { ...x, tags } : x))); };
  const addNote = (email: string, text: string) => { setNotes((n) => ({ ...n, [email]: [{ id: `n${++seq.current}`, by: ME, ago: 0, text }, ...(n[email] ?? [])] })); say('Note saved'); };
  const delNote = (email: string, id: string) => { const prev = notes[email] ?? []; setNotes((n) => ({ ...n, [email]: prev.filter((x) => x.id !== id) })); say('Note deleted', () => setNotes((n) => ({ ...n, [email]: prev }))); };
  const saveCanned = (next: Canned[], msg: string, undo?: Canned[]) => { setCanned(next); say(msg, undo ? () => setCanned(undo) : undefined); };
  const applyRules = () => {
    let n = 0; const rules = saved.rules;
    setConvs((cs) => cs.map((c) => { const r = c.status !== 'resolved' && !c.assignee ? rules.find((x) => c.cust.tags.includes(x.tag)) : undefined; if (!r) return c; n++; return { ...c, assignee: r.agent, msgs: [...c.msgs, event(`Rule “${r.tag}” assigned this to ${r.agent}`)] }; }));
    say(n ? `Assigned ${n} ${n === 1 ? 'conversation' : 'conversations'} by your rules` : 'No unassigned conversation matches a rule'); return n;
  };
  const insertArticle = (aid: string, cid: string) => {
    const c = convs.find((x) => x.id === cid), a = ARTICLES.find((x) => x.id === aid); if (!c || !a) return;
    setInject({ n: ++seq.current, conv: cid, text: `Hi ${c.cust.name.split(' ')[0]}, this guide should help: “${a.title}”, ${articleLink(a)}\n\n${a.summary}` });
    setQ(''); setWho('all'); setTab(c.status); setSel(cid); setPane('thread'); patch(cid, (x) => ({ ...x, unread: false })); after.current = 'composer'; setTouched(true); setNav('inbox'); note(`Added “${a.title}” to your reply`);
  };
  const dirtyN = [JSON.stringify([draft.sla, draft.bizHours]) !== JSON.stringify([saved.sla, saved.bizHours]), JSON.stringify([draft.method, draft.agents, draft.rules]) !== JSON.stringify([saved.method, saved.agents, saved.rules]), JSON.stringify([draft.notif, draft.quiet]) !== JSON.stringify([saved.notif, saved.quiet])].filter(Boolean).length;
  const overdue = convs.filter((c) => c.status === 'open' && c.slaLeft !== null && c.slaLeft <= 0).length;
  const custOpen = custRows.filter((r) => r.open > 0).length;
  const custCur = custSel ? custRows.find((r) => r.key === custSel) : null;
  const listKey = (e: KeyboardEvent) => {
    const els = Array.from(listEl.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []); const i = els.indexOf(document.activeElement as HTMLElement);
    const n = e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? els.length - 1 : null;
    if (n === null || !els.length) return; e.preventDefault(); els[Math.max(0, Math.min(els.length - 1, n))]?.focus();
  };

  const NAV: NavEntry[] = [{ id: 'inbox', label: 'Inbox', icon: 'inbox', badge: allOpen }, { id: 'customers', label: 'Customers', icon: 'users', badge: custOpen || undefined }, { id: 'reports', label: 'Reports', icon: 'chart', badge: overdue || undefined }, { id: 'help', label: 'Help center', icon: 'file' }, { id: 'settings', label: 'Settings', icon: 'settings', badge: dirtyN || undefined }];
  const tabs = [{ id: 'open' as const, label: 'Open', count: counts.open }, { id: 'pending' as const, label: 'Pending', count: counts.pending }, { id: 'resolved' as const, label: 'Resolved', count: counts.resolved }];
  const focusId = rows.some((r) => r.id === sel) ? sel : rows[0]?.id;

  return (
    <ViewCtx.Provider value={{ focus: touched, announce: setLive }}>
    <Shell brand={brand} nav={NAV} active={nav} onNav={goNav} title={NAV.find((n) => n.id === nav)!.label} crumbs={[brand, 'Support', NAV.find((n) => n.id === nav)!.label, ...(nav === 'customers' && custCur ? [custCur.cust.name] : [])]} searchHint="Search" user={{ name: ME, role: 'Support lead' }}>
      <div className="td-sr" role="status" aria-live="polite">{live}</div>
      {nav === 'customers' ? <Customers rows={custRows} sel={custSel} onSel={setCustSel} notes={notes} onAddNote={addNote} onDelNote={delNote} onTags={setTags} onOpenConv={openConv} />
      : nav === 'reports' ? <Reports convs={convs} settings={saved} onOpenConv={openConv} />
      : nav === 'help' ? <Help convs={convs} current={sel} votes={votes} onVote={(id, v) => setVotes((x) => { const n = { ...x }; if (v) n[id] = v; else delete n[id]; return n; })} onInsert={insertArticle} />
      : nav === 'settings' ? <SettingsView canned={canned} onCanned={saveCanned} draft={draft} saved={saved} setDraft={setDraft} onSave={() => { setSaved(draft); say('Settings saved'); }} onDiscard={() => { setDraft(saved); say('Changes discarded'); }} convs={convs} onApplyRules={applyRules} />
      : (
        <div className="ti" data-pane={pane}>
          {/* ------------------------------------------------ left: conversations */}
          <section className="ti-list" aria-label="Conversations">
            <div className="ti-lh">
              <div className="ti-lt"><h1 tabIndex={-1}>Inbox</h1>
                <label className="ti-sel"><span className="td-sr">Filter by assignee</span><Ico name="user" size={13} />
                  <select value={who} onChange={(e) => setWho(e.target.value)} aria-label="Filter by assignee">
                    <option value="all">All assignees</option><option value="me">Assigned to me</option>{TEAM.filter((t) => t !== ME).map((t) => <option key={t} value={t}>{t}</option>)}<option value="none">Unassigned</option>
                  </select><Glyph name="down" size={12} />
                </label>
              </div>
              <label className="ti-search"><Glyph name="search" size={14} /><span className="td-sr">Search conversations</span>
                <input type="search" value={q} placeholder="Search name, subject or message" onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') setQ(''); if (e.key === 'ArrowDown') { e.preventDefault(); (listEl.current?.querySelector('[role="option"][tabindex="0"]') as HTMLElement | null)?.focus(); } }} />
                {q && <button type="button" aria-label="Clear search" onClick={() => setQ('')}><Ico name="x" size={13} /></button>}
              </label>
            </div>
            <Tabs label="Conversation status" value={tab} tabs={tabs} onChange={setTab} />
            <div className="ti-rows" ref={listEl} role="listbox" aria-label={`${LABEL[tab]} conversations`} onKeyDown={listKey}>
              {rows.map((c) => {
                const last = [...c.msgs].reverse().find((m) => m.kind !== 'event')!;
                return (
                  <div key={c.id} role="option" aria-selected={c.id === sel} tabIndex={c.id === focusId ? 0 : -1} className={cx('ti-row', c.id === sel && 'is-sel', c.unread && 'is-unread')} onClick={() => open(c.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(c.id); } }}>
                    <Avatar name={c.cust.name} size={32} />
                    <div className="ti-row-c">
                      <div className="ti-r1">{c.unread && <i className="ti-unread" role="img" aria-label="Unread" />}<b>{c.cust.name}</b><time>{shortAgo(lastAgo(c))}</time></div>
                      <div className="ti-r2">{c.subject}</div>
                      <div className="ti-r3">{last.kind === 'agent' ? 'You: ' : last.kind === 'note' ? 'Note: ' : ''}{last.text}</div>
                      <div className="ti-r4">
                        <span className="ti-ch" title={channelName[c.channel]}><Ico name={channelIcon[c.channel]} size={13} /><span className="td-sr">{channelName[c.channel]}</span></span>
                        {(c.priority === 'urgent' || c.priority === 'high') && <span className={cx('ti-pri', `is-${c.priority}`)}><Ico name={c.priority === 'urgent' ? 'flag' : 'arrowup'} size={12} />{PRI[c.priority]}</span>}
                        {c.snooze && <span className="ti-sn"><Ico name="clock" size={12} />{c.snooze.split(',')[0]}</span>}
                        <Sla c={c} />
                        <span className="ti-asg">{c.assignee ? <Avatar name={c.assignee} size={18} /> : <span className="ti-un">Unassigned</span>}{c.assignee && <span className="td-sr">Assigned to {c.assignee}</span>}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!rows.length && <Empty title={q ? 'No matches' : tab === 'open' ? 'Inbox zero' : `Nothing ${LABEL[tab].toLowerCase()}`} text={q ? `Nothing in ${LABEL[tab]} matches “${q}”.` : tab === 'open' ? 'Every open conversation has an answer. Enjoy it.' : 'Conversations will show up here.'} />}
            </div>
          </section>
          {/* ------------------------------------------------ middle: thread */}
          <section className="ti-thread" aria-label="Conversation">
            {cur ? <>
              <header className="ti-th">
                <button type="button" className="td-btn is-ghost is-icon ti-back" onClick={() => setPane('list')} aria-label="Back to conversations"><Ico name="back" size={18} /></button>
                <div className="ti-th-t">
                  <h2 tabIndex={-1}>{cur.subject}</h2>
                  <div className="ti-th-m"><Pill tone={TONE[cur.status]}>{LABEL[cur.status]}</Pill><span>#{cur.num}</span><span className="ti-dotsep">{channelName[cur.channel]}</span>
                    {cur.priority !== 'normal' && <span className="ti-dotsep">{PRI[cur.priority]} priority</span>}
                    <span className="ti-dotsep">{cur.assignee ? (cur.assignee === ME ? 'Assigned to you' : `Assigned to ${cur.assignee}`) : 'Unassigned'}</span>
                    {cur.snooze && <span className="ti-dotsep"><Ico name="clock" size={12} /> Snoozed until {cur.snooze}</span>}
                    <Sla c={cur} /></div>
                </div>
                <div className="ti-th-a">
                  <Menu label="Assign" icon="user" text={<span className="ti-bl">Assign</span>} align="right" onPick={(id) => assign(cur, id)} items={[...TEAM.map((t) => ({ id: t, label: t === ME ? `${t} (you)` : t, checked: cur.assignee === t })), { id: 'none', label: 'Unassigned', checked: !cur.assignee }]} />
                  <Menu label="Snooze" icon="moon" text={<span className="ti-bl">Snooze</span>} align="right" onPick={(id) => snooze(cur, id)} items={[...SNOOZE, ...(cur.snooze ? [{ id: 'wake', label: 'Wake now', hint: 'Move back to Open' }] : [])]} />
                  <Button small variant={cur.status === 'resolved' ? 'default' : 'primary'} icon="check" onClick={() => resolve(cur)}>{cur.status === 'resolved' ? 'Reopen' : 'Resolve'}</Button>
                  <button type="button" className="td-btn is-sm is-icon ti-infob" aria-label="Customer details" aria-expanded={pane === 'info'} onClick={() => setPane(pane === 'info' ? 'thread' : 'info')}><Ico name="panel" size={14} /></button>
                </div>
              </header>
              <div className="ti-body" ref={body} tabIndex={0} aria-label="Messages">
                <ol className="ti-msgs">
                  {dayBreaks(cur.msgs).map((g) => (
                    <li key={g.label} className="ti-day"><div className="ti-daylbl"><span>{g.label}</span></div><ol>{g.items.map((m) => <Message key={m.id} m={m} />)}</ol></li>
                  ))}
                </ol>
              </div>
              {flash && <div className="ti-flash" aria-hidden="true"><Ico name="check" size={13} />{flash}</div>}
              <Composer conv={cur} onSend={send} canned={canned} inject={inject} />
            </> : <div className="ti-none"><button type="button" className="td-btn is-ghost is-icon ti-back" onClick={() => setPane('list')} aria-label="Back to conversations"><Ico name="back" size={18} /></button><Empty title={tab === 'open' && !rows.length ? 'You’re all caught up' : 'Select a conversation'} text={tab === 'open' && !rows.length ? 'No open conversations. New messages will appear here.' : 'Pick one from the list to read the thread and reply.'} /></div>}
          </section>
          {/* ------------------------------------------------ right: customer */}
          <aside className="ti-info" aria-label="Customer details">
            {cur ? <CustomerPanel c={cur.cust} onClose={() => setPane('thread')} onTags={(tags) => patch(cur.id, (c) => ({ ...c, cust: { ...c.cust, tags } }))} /> : <Empty title="No customer" text="Select a conversation." />}
          </aside>
          {pane === 'info' && <button type="button" className="ti-scrim" aria-label="Close customer panel" tabIndex={-1} onClick={() => setPane('thread')} />}
        </div>
      )}
      {nav !== 'inbox' && <Toast t={toast} onClose={() => setToast(null)} />}
    </Shell>
    </ViewCtx.Provider>
  );
}

export function Demo() { return <Preview w={1280} h={150}><InboxDashboard /></Preview>; }
