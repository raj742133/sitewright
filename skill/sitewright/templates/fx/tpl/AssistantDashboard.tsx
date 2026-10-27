'use client';
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Button, Glyph, Preview, Segmented, Shell, Tabs, cx, useReducedMotion, type NavEntry } from './_dash';
import { Catalog, ResultView, Skeleton } from './_tx';
import { RESULTS, match, related, type Result } from './_txdata';

interface Msg { id: number; role: 'user' | 'ai'; text: string; res?: Result; steps: string[]; chips: string[] }
interface Job { mid: number; steps: string[]; step: number; phase: 'think' | 'stream'; n: number; text: string; res?: Result }
const NAV: NavEntry[] = [{ id: 'ask', label: 'Ask', icon: 'sparkle' }, { id: 'results', label: 'Results', icon: 'chart' }, { id: 'tables', label: 'Tables', icon: 'layers' }];
const FALLBACK_Q = RESULTS.map((r) => r.q);
const FALLBACK = `I can't answer that from the demo tables. Here is what I can analyse:`;
const HELLO = `Hi, I'm the Meridian data assistant. Pick a question below or type your own:`;

function Steps({ steps, step, live }: { steps: string[]; step: number; live: boolean }) {
  const done = step >= steps.length;
  if (!live) return <details className="tx-ran"><summary><Glyph name="check" size={12} />Ran {steps.length} step{steps.length === 1 ? '' : 's'}</summary><ol className="tx-steps">{steps.map((s) => <li key={s} className="is-done"><Glyph name="check" size={12} />{s}</li>)}</ol></details>;
  return (
    <ol className="tx-steps" aria-label="What the assistant is doing">
      {steps.map((s, i) => <li key={s} className={i < step ? 'is-done' : i === step ? 'is-run' : ''}>{i < step ? <Glyph name="check" size={12} /> : i === step ? <i className="tx-spin" /> : <i className="tx-pend" />}{s}{i === step && !done && <span className="tx-dots" aria-hidden="true"><b /><b /><b /></span>}</li>)}
    </ol>
  );
}

export default function AssistantDashboard() {
  const reduced = useReducedMotion();
  const [msgs, setMsgs] = useState<Msg[]>([]); const [results, setResults] = useState<Result[]>([]); const [sel, setSel] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null); const [draft, setDraft] = useState(''); const [view, setView] = useState<'chat' | 'result'>('chat');
  const [unseen, setUnseen] = useState(false); const [live, setLive] = useState(''); const [nav, setNav] = useState('ask');
  const log = useRef<HTMLDivElement>(null); const ta = useRef<HTMLTextAreaElement>(null); const body = useRef<HTMLDivElement>(null); const bar = useRef<HTMLDivElement>(null);
  const nid = useRef(1); const committed = useRef(0); const busy = job !== null;

  const commit = useCallback((res: Result) => {
    setResults((r) => (r.some((x) => x.id === res.id) ? r : [...r, res])); setSel(res.id); setUnseen(true);
  }, []);
  const finish = useCallback((j: Job) => {
    if (j.res && committed.current !== j.mid) { committed.current = j.mid; commit(j.res); }
    setMsgs((m) => m.map((x) => (x.id === j.mid ? { ...x, text: j.text } : x))); setJob(null); setLive(j.res ? `Answer ready: ${j.res.title}` : j.text);
  }, [commit]);

  const send = (text: string) => {
    const t = text.trim(); if (!t || busy) return;
    const m = match(t); const res = m.kind === 'result' ? m.res : undefined;
    const reply = res ? res.reply : m.kind === 'hello' ? HELLO : FALLBACK;
    const steps = res ? res.steps : ['Checking available tables'];
    const mid = nid.current + 1; nid.current += 2;
    setMsgs((x) => [...x, { id: nid.current - 2, role: 'user', text: t, steps: [], chips: [] }, { id: mid, role: 'ai', text: '', res, steps, chips: res ? related(res.id).map((r) => r.q) : FALLBACK_Q }]);
    setJob({ mid, steps, step: 0, phase: 'think', n: 0, text: reply, res }); setDraft(''); setLive(`Thinking: ${steps[0]}`); ta.current?.focus();
  };

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

  useEffect(() => { const el = log.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs, job]);
  useEffect(() => { body.current?.scrollTo({ top: 0 }); const t = bar.current?.querySelector('[aria-selected=true]') as HTMLElement | null; const w = bar.current?.firstElementChild as HTMLElement | null; if (t && w) w.scrollTo({ left: t.offsetLeft - 12, behavior: reduced ? 'auto' : 'smooth' }); }, [sel, results.length, reduced]);
  useEffect(() => { const el = ta.current; if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(120, el.scrollHeight)}px`; } }, [draft]);

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(draft); } };
  const reset = () => { if (job) return; setMsgs([]); setResults([]); setSel(null); setUnseen(false); setView('chat'); setLive('Started a new chat'); ta.current?.focus(); };
  const showResult = (id: string) => { setSel(id); setView('result'); setUnseen(false); };
  const onNav = (id: string) => {
    setNav(id);
    if (id === 'ask') { setView('chat'); ta.current?.focus(); } else if (id === 'results') { setView('result'); setUnseen(false); if (results.length) setSel(results[results.length - 1]!.id); } else { setView('result'); setSel('_t'); }
  };
  const lastAi = [...msgs].reverse().find((m) => m.role === 'ai');
  const thinking = job?.phase === 'think' && job.res;
  const current = results.find((r) => r.id === sel);

  return (
    <div className="tx-root">
      <Shell brand="Meridian" nav={NAV.map((n) => (n.id === 'results' && results.length ? { ...n, badge: results.length } : n))} active={nav} onNav={onNav} title="Ask data" crumbs={['Meridian', 'Ask data', current?.title ?? 'New chat']} user={{ name: 'Dana Ortiz', role: 'Analyst' }}
        actions={<Button icon="plus" small onClick={reset} disabled={!msgs.length || busy}>New chat</Button>}>
        <div className="tx-ws" data-view={view}>
          <h1 className="td-sr">Ask your data</h1>
          <div className="tx-switch"><Segmented label="Show" value={view} onChange={(v) => { setView(v); if (v === 'result') setUnseen(false); }} options={[{ id: 'chat', label: 'Chat' }, { id: 'result', label: unseen ? 'Result ●' : 'Result' }]} /></div>
          <section className="tx-chat" aria-label="Conversation">
            <div className="tx-log" ref={log} tabIndex={0} role="log" aria-label="Messages" aria-live="off">
              {!msgs.length && (
                <div className="tx-hello">
                  <span className="tx-mark is-lg"><Glyph name="sparkle" size={18} /></span>
                  <h2>What do you want to know?</h2><p>Ask about revenue, users, customers, churn, conversion or shipping. I will show the answer, the numbers and the query.</p>
                  <ul className="tx-sug">{RESULTS.slice(0, 4).map((r) => <li key={r.id}><button type="button" onClick={() => send(r.q)}><Glyph name={r.icon} size={15} /><span>{r.q}</span></button></li>)}</ul>
                </div>
              )}
              {msgs.map((m) => {
                const active = job?.mid === m.id;
                if (m.role === 'user') return <div key={m.id} className="tx-msg is-user">{m.text}</div>;
                const txt = active ? (job.phase === 'stream' ? job.text.split(' ').slice(0, reduced ? undefined : job.n).join(' ') : '') : m.text;
                return (
                  <div key={m.id} className="tx-msg is-ai">
                    <span className="tx-mark"><Glyph name="sparkle" size={13} /></span>
                    <div className="tx-ai">
                      <Steps steps={m.steps} step={active ? job.step : m.steps.length} live={active} />
                      {txt && <p className="tx-txt">{txt}{active && job.phase === 'stream' && <i className="tx-caret" aria-hidden="true" />}</p>}
                      {m.res && !active && <button type="button" className={cx('tx-card', sel === m.res.id && 'is-on')} onClick={() => showResult(m.res!.id)}><Glyph name={m.res.icon} size={15} /><span><b>{m.res.title}</b><small>{m.res.period.split(',')[0]}</small></span><em>{sel === m.res.id ? 'Showing' : 'Open'}</em><Glyph name="chevron" size={13} /></button>}
                      {!active && m === lastAi && !busy && (
                        <div className="tx-chips" role="group" aria-label="Suggested follow-ups">{m.chips.map((c) => <button key={c} type="button" className="tx-chip" onClick={() => send(c)}>{c}</button>)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <form className="tx-comp-w" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
              <div className="tx-comp">
                <textarea ref={ta} rows={1} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onKey} placeholder="Ask a question about your data" aria-label="Ask a question about your data" />
                {busy ? <button type="button" className="tx-send is-stop" aria-label="Stop" onClick={() => job && finish({ ...job, step: job.steps.length })}><i /></button>
                  : <button type="submit" className="tx-send" aria-label="Send" disabled={!draft.trim()}><Glyph name="send" size={15} /></button>}
              </div>
              <div className="tx-hint"><span>Enter to send, Shift+Enter for a new line</span><span>Demo data, answers are scripted</span></div>
            </form>
          </section>
          <section className="tx-res" aria-label="Result">
            {results.length > 0 && <div className="tx-tabbar" ref={bar}><Tabs label="Result history" value={sel ?? results[results.length - 1]!.id} onChange={(id) => { setSel(id); setUnseen(false); }} tabs={[...results.map((r) => ({ id: r.id, label: r.short })), { id: '_t', label: 'Tables' }]} /></div>}
            <div className="tx-res-b" ref={body} tabIndex={0} aria-label="Result details" aria-busy={!!thinking}>
              {thinking && job?.res ? <Skeleton step={job.steps[job.step] ?? 'Finishing'} /> : current ? <ResultView key={current.id} res={current} /> : <Catalog onAsk={send} busy={busy} hasResults={results.length > 0} />}
            </div>
          </section>
          <p className="td-sr" role="status">{live}</p>
        </div>
      </Shell>
    </div>
  );
}

export function Demo() { return <Preview w={1280} h={150}><AssistantDashboard /></Preview>; }
