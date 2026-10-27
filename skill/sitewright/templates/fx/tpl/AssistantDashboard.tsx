'use client';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Button, Glyph, Preview, Segmented, Shell, Tabs, cx, useReducedMotion, type NavEntry } from './_dash';
import { ResultView, Skeleton } from './_tx';
import { AskEmpty, MsgActions, Steps, Workspace, type Feedback } from './_txask';
import { RESULTS, match, related, type Result } from './_txdata';
import { ResultsView } from './_txresults';
import { TABLE_RE, byName, tableAnswer, usedBy } from './_txschema';
import { VIEWS, resOf, useSaved, type ViewId } from './_txstore';
import { TablesView } from './_txtables';
import { Ic, Toast, copyText, type ToastMsg } from './_txui';

interface Msg { id: number; role: 'user' | 'ai'; text: string; res?: Result; table?: string; steps: string[]; chips: string[] }
interface Job { mid: number; steps: string[]; step: number; phase: 'think' | 'stream'; n: number; text: string; res?: Result }
const NAV: NavEntry[] = [{ id: 'ask', label: 'Ask', icon: 'sparkle' }, { id: 'results', label: 'Results', icon: 'chart' }, { id: 'tables', label: 'Tables', icon: 'layers' }];
const TITLES: Record<ViewId, string> = { ask: 'Ask data', results: 'Results', tables: 'Tables' };
const FALLBACK_Q = RESULTS.map((r) => r.q);
const FALLBACK = `I can't answer that from the demo tables. Here is what I can analyse:`;
const HELLO = `Hi, I'm the Meridian data assistant. Pick a question below or type your own:`;

export default function AssistantDashboard() {
  const reduced = useReducedMotion(); const store = useSaved();
  const [nav, setNav] = useState<ViewId>('ask'); const [resOpen, setResOpen] = useState<string | null>(null); const [tableSel, setTableSel] = useState('orders');
  const [msgs, setMsgs] = useState<Msg[]>([]); const [results, setResults] = useState<Result[]>([]); const [sel, setSel] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null); const [draft, setDraft] = useState(''); const [view, setView] = useState<'chat' | 'result'>('chat');
  const [unseen, setUnseen] = useState(false); const [live, setLive] = useState(''); const [ctx, setCtx] = useState<string | null>(null);
  const [fb, setFb] = useState<Record<number, Feedback>>({}); const [copiedMsg, setCopiedMsg] = useState(0); const [toast, setToast] = useState<ToastMsg | null>(null);
  const root = useRef<HTMLDivElement>(null); const log = useRef<HTMLDivElement>(null); const ta = useRef<HTMLTextAreaElement>(null); const body = useRef<HTMLDivElement>(null); const bar = useRef<HTMLDivElement>(null);
  const nid = useRef(1); const tid = useRef(0); const committed = useRef(0); const seen = useRef(new Set<string>()); const wantTa = useRef(false); const first = useRef(true);
  const busy = job !== null;

  const notify = useCallback((text: string, action?: { label: string; run: () => void }) => { tid.current += 1; setToast({ id: tid.current, text, action }); }, []);
  const closeToast = useCallback(() => setToast(null), []);
  const commit = useCallback((res: Result, mark = true) => { setResults((r) => (r.some((x) => x.id === res.id) ? r : [...r, res])); setSel(res.id); if (mark) setUnseen(true); }, []);
  const finish = useCallback((j: Job) => {
    if (j.res && committed.current !== j.mid) { committed.current = j.mid; commit(j.res); }
    setMsgs((m) => m.map((x) => (x.id === j.mid ? { ...x, text: j.text } : x))); setJob(null); setLive(j.res ? `Answer ready: ${j.res.title}` : j.text);
  }, [commit]);

  const go = useCallback((id: ViewId, o: { open?: string | null; table?: string; ta?: boolean } = {}) => {
    wantTa.current = !!o.ta; setNav(id); setResOpen(o.open ?? null); if (o.table) setTableSel(o.table); if (id === 'ask') setView('chat');
  }, []);

  const send = (text: string) => {
    const t = text.trim(); if (!t || busy) return;
    const tm = /\b(table|columns?|schema)\b/i.test(t) ? TABLE_RE.exec(t) : null; const table = tm ? tm[1]!.toLowerCase() : undefined;
    const m = table ? null : match(t); const res = m?.kind === 'result' ? m.res : undefined; const c = ctx;
    const reply = table ? tableAnswer(table) : res ? res.reply : m?.kind === 'hello' ? HELLO : c ? `I can't slice ${resOf(c).title.toLowerCase()} any further in this demo. These analyses are close to it:` : FALLBACK;
    const steps = table ? ['Reading schema', 'Counting columns', 'Checking relationships'] : res ? res.steps : ['Checking available tables'];
    const chips = res ? related(res.id).map((r) => r.q) : table ? (usedBy(table).length ? usedBy(table).slice(0, 3).map((r) => r.q) : FALLBACK_Q.slice(0, 3)) : c ? related(c).map((r) => r.q) : FALLBACK_Q;
    const mid = nid.current + 1; nid.current += 2;
    setMsgs((x) => [...x, { id: nid.current - 2, role: 'user', text: t, steps: [], chips: [] }, { id: mid, role: 'ai', text: '', res, table, steps, chips }]);
    setJob({ mid, steps, step: 0, phase: 'think', n: 0, text: reply, res }); setDraft(''); setCtx(null); setLive(`Thinking: ${steps[0]}`); ta.current?.focus();
  };
  const followUp = (rid: string) => {
    const r = resOf(rid); commit(r, false); setUnseen(false); setCtx(rid); const id = nid.current; nid.current += 1;
    setMsgs((x) => [...x, { id, role: 'ai', text: `Following up on “${r.title}”. Ask about it, or try one of these related analyses.`, res: r, steps: [], chips: related(rid).map((x) => x.q) }]);
    go('ask', { ta: true }); setLive(`Following up on ${r.title}`);
  };
  const toggleSave = (rid: string) => {
    const name = resOf(rid).title;
    if (store.has(rid)) { const r = store.remove(rid); if (r) notify(`Removed “${r.item.name}” from Results`, { label: 'Undo', run: () => store.restore(r.item, r.i) }); }
    else { store.add(rid); notify(`Saved “${name}” to Results`, { label: 'View', run: () => go('results', { open: rid }) }); }
  };
  const setFeedback = (id: number, v: 'up' | 'down' | null, reason?: string) => { setFb((f) => { const n = { ...f }; if (v) n[id] = { v, reason }; else delete n[id]; return n; }); setLive(v === 'up' ? 'Marked as a good answer' : v === 'down' ? (reason ? `Marked as a bad answer: ${reason}` : 'Marked as a bad answer. Choose what was wrong.') : 'Feedback removed'); };

  useEffect(() => {
    if (!job) return;
    const words = job.text.split(' ');
    if (job.phase === 'think') {
      const t = window.setTimeout(() => {
        const step = job.step + 1;
        if (step >= job.steps.length) { if (job.res && committed.current !== job.mid) { committed.current = job.mid; commit(job.res); } setJob({ ...job, step, phase: 'stream' }); }
        else { setJob({ ...job, step }); setLive(`Thinking: ${job.steps[step]}`); }
      }, reduced ? 80 : job.step === 0 ? 700 : 620);
      return () => window.clearTimeout(t);
    }
    if (reduced || job.n >= words.length) { const t = window.setTimeout(() => finish(job), reduced ? 0 : 120); return () => window.clearTimeout(t); }
    const t = window.setTimeout(() => setJob({ ...job, n: job.n + 1 }), 30);
    return () => window.clearTimeout(t);
  }, [job, reduced, commit, finish]);

  useEffect(() => { const q = new URLSearchParams(window.location.search); const v = q.get('view') as ViewId | null; if (!v || !VIEWS.includes(v)) return; const o = q.get('open'); const t = q.get('table'); go(v, { open: o && store.has(o) ? o : null, table: t && byName(t) ? t : undefined }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    root.current?.querySelectorAll('[data-scroll]').forEach((el) => el.scrollTo({ top: 0 }));
    const t = window.setTimeout(() => { if (wantTa.current && ta.current) ta.current.focus(); else (root.current?.querySelector('[data-vh]') as HTMLElement | null)?.focus({ preventScroll: true }); wantTa.current = false; }, 0);
    setLive(`${TITLES[nav]} view${resOpen ? `, ${resOf(resOpen).title}` : ''}`);
    return () => window.clearTimeout(t);
  }, [nav, resOpen]);
  useEffect(() => { const el = log.current; if (el && msgs.length) el.scrollTop = el.scrollHeight; }, [msgs, job, nav]);
  useEffect(() => { body.current?.scrollTo({ top: 0 }); const t = bar.current?.querySelector('[aria-selected=true]') as HTMLElement | null; const w = bar.current?.firstElementChild as HTMLElement | null; if (t && w) w.scrollTo({ left: t.offsetLeft - 12, behavior: reduced ? 'auto' : 'smooth' }); }, [sel, results.length, reduced, nav]);
  useEffect(() => { const el = ta.current; if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(120, el.scrollHeight)}px`; } }, [draft, nav]);

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(draft); } };
  const reset = () => { if (job) return; setMsgs([]); setResults([]); setSel(null); setUnseen(false); setView('chat'); setCtx(null); setFb({}); setLive('Started a new chat'); ta.current?.focus(); };
  const showResult = (id: string) => { setSel(id); setView('result'); setUnseen(false); };
  const lastAi = [...msgs].reverse().find((m) => m.role === 'ai');
  const thinking = job?.phase === 'think' && job.res;
  const current = results.find((r) => r.id === sel);
  const crumbs = nav === 'ask' ? ['Meridian', 'Ask data', current?.title ?? 'New chat'] : nav === 'results' ? ['Meridian', 'Results', ...(resOpen ? [store.saved.find((s) => s.rid === resOpen)?.name ?? ''] : [])] : ['Meridian', 'Tables', tableSel];
  const navItems = NAV.map((n) => (n.id === 'results' ? { ...n, badge: store.saved.length } : n));

  return (
    <div className="tx-root" ref={root}>
      <Shell brand="Meridian" nav={navItems} active={nav} onNav={(id) => go(id as ViewId)} title={TITLES[nav]} crumbs={crumbs} user={{ name: 'Dana Ortiz', role: 'Analyst' }}
        actions={nav === 'ask' ? <Button icon="plus" small onClick={reset} disabled={!msgs.length || busy}>New chat</Button> : undefined}>
        {nav === 'results' && <ResultsView store={store} open={resOpen} onOpen={(rid) => setResOpen(rid)} onFollow={followUp} notify={notify} />}
        {nav === 'tables' && <TablesView sel={tableSel} onSel={setTableSel} notify={notify}
          onAsk={(t) => { setDraft(`Tell me about the ${t} table`); go('ask', { ta: true }); setLive(`Question about ${t} typed in the composer`); }}
          onResult={(rid) => (store.has(rid) ? go('results', { open: rid }) : (go('ask', { ta: true }), setDraft(resOf(rid).q)))} />}
        {nav === 'ask' && (
          <div className="tx-ws" data-view={view}>
            <h1 className="td-sr" data-vh tabIndex={-1}>Ask your data</h1>
            <div className="tx-switch"><Segmented label="Show" value={view} onChange={(v) => { setView(v); if (v === 'result') setUnseen(false); }} options={[{ id: 'chat', label: 'Chat' }, { id: 'result', label: unseen ? 'Result ●' : 'Result' }]} /></div>
            <section className="tx-chat" aria-label="Conversation">
              <div className="tx-log" ref={log} tabIndex={0} role="log" aria-label="Messages" aria-live="off">
                {!msgs.length && <AskEmpty onAsk={send} onTables={() => go('tables')} />}
                {msgs.map((m) => {
                  const active = job?.mid === m.id;
                  if (m.role === 'user') return <div key={m.id} className="tx-msg is-user">{m.text}</div>;
                  const txt = active ? (job.phase === 'stream' ? job.text.split(' ').slice(0, reduced ? undefined : job.n).join(' ') : '') : m.text;
                  return (
                    <div key={m.id} className="tx-msg is-ai">
                      <span className="tx-mark"><Glyph name="sparkle" size={13} /></span>
                      <div className="tx-ai">
                        {m.steps.length > 0 && <Steps steps={m.steps} step={active ? job.step : m.steps.length} live={active} />}
                        {txt && <p className="tx-txt">{txt}{active && job.phase === 'stream' && <i className="tx-caret" aria-hidden="true" />}</p>}
                        {m.res && !active && <button type="button" className={cx('tx-card', sel === m.res.id && 'is-on')} onClick={() => showResult(m.res!.id)}><Glyph name={m.res.icon} size={15} /><span><b>{m.res.title}</b><small>{m.res.period.split(',')[0]}</small></span><em>{sel === m.res.id ? 'Showing' : 'Open'}</em><Glyph name="chevron" size={13} /></button>}
                        {m.table && !active && <button type="button" className="tx-card" onClick={() => go('tables', { table: m.table })}><Ic name="table" size={15} /><span><b>{m.table}</b><small>{byName(m.table)?.cols.length} columns, {byName(m.table)?.rows.toLocaleString('en-US')} rows</small></span><em>Open</em><Glyph name="chevron" size={13} /></button>}
                        {m.res && m.steps.length > 0 && !active && <MsgActions fb={fb[m.id]} onFb={(v, r) => setFeedback(m.id, v, r)} copied={copiedMsg === m.id} onCopy={async () => { if (await copyText(m.text)) { setCopiedMsg(m.id); setLive('Answer copied'); window.setTimeout(() => setCopiedMsg(0), 1800); } }} saved={store.has(m.res.id)} onSave={() => toggleSave(m.res!.id)} />}
                        {!active && m === lastAi && !busy && (
                          <div className="tx-chips" role="group" aria-label="Suggested follow-ups"><span className="tx-fl">Follow up</span>{m.chips.map((c) => <button key={c} type="button" className="tx-chip" onClick={() => send(c)}>{c}</button>)}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <form className="tx-comp-w" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
                {ctx && <div className="tx-ctx"><Glyph name="link" size={12} /><span>Following up on <b>{resOf(ctx).short}</b></span><button type="button" aria-label="Remove context" onClick={() => setCtx(null)}><Ic name="x" size={12} /></button></div>}
                <div className="tx-comp">
                  <textarea ref={ta} rows={1} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} placeholder="Ask a question about your data" aria-label="Ask a question about your data" />
                  {busy ? <button type="button" className="tx-send is-stop" aria-label="Stop" onClick={() => job && finish({ ...job, step: job.steps.length })}><i /></button>
                    : <button type="submit" className="tx-send" aria-label="Send" disabled={!draft.trim()}><Glyph name="send" size={15} /></button>}
                </div>
                <div className="tx-hint"><span>Enter to send, Shift+Enter for a new line</span><span>Demo data, answers are scripted</span></div>
              </form>
            </section>
            <section className="tx-res" aria-label="Result">
              {results.length > 0 && <div className="tx-tabbar" ref={bar}><Tabs label="Result history" value={sel ?? results[results.length - 1]!.id} onChange={(id) => { setSel(id); setUnseen(false); }} tabs={results.map((r) => ({ id: r.id, label: r.short }))} /></div>}
              <div className="tx-res-b" ref={body} tabIndex={0} aria-label="Result details" aria-busy={!!thinking}>
                {thinking && job?.res ? <Skeleton step={job.steps[job.step] ?? 'Finishing'} />
                  : current ? <ResultView key={current.id} res={current} seen={seen.current} saved={store.has(current.id)} onSave={() => toggleSave(current.id)} />
                  : <Workspace saved={store.saved} busy={busy} onOpenResult={(rid) => go('results', { open: rid })} onOpenTable={(t) => go('tables', { table: t })} onAll={(v) => go(v)} />}
              </div>
            </section>
          </div>
        )}
      </Shell>
      <Toast t={toast} onClose={closeToast} />
      <p className="td-sr" role="status">{live}</p>
    </div>
  );
}

export function Demo() { return <Preview w={1280} h={150}><AssistantDashboard /></Preview>; }
