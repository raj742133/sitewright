'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

export type ChatStatus = 'sending' | 'sent' | 'delivered' | 'read';
export interface ChatMessage { id: string; from: string; name?: string; text: string; time?: string | number; status?: ChatStatus }
export interface ChatThreadProps {
  messages?: ChatMessage[];
  onSend?: (text: string) => void;
  typing?: boolean | string;
  you?: string;
  compact?: boolean;
  height?: number | string;
  label?: string;
  placeholder?: string;
}

const SAMPLE: ChatMessage[] = [
  { id: 's1', from: 'ana', name: 'Ana', text: 'Hi! The new menu page is ready for review.', time: '9:40' },
  { id: 's2', from: 'me', text: 'Great, looking now.', time: '9:41', status: 'read' },
];
const STATUS_TEXT: Record<ChatStatus, string> = { sending: 'Sending', sent: 'Sent', delivered: 'Delivered', read: 'Read' };

function Ticks({ status }: { status: ChatStatus }) {
  const two = status === 'delivered' || status === 'read';
  return (
    <span className={`ui-chat-thread-ticks is-${status}`} role="img" aria-label={STATUS_TEXT[status]}>
      <svg viewBox="0 0 18 10" width="14" height="8" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {status === 'sending' ? <circle cx="5" cy="5" r="3" strokeDasharray="3 2" /> : <path d="m1.5 5.2 2.6 2.6 5-6" />}
        {two && <path d="m7.8 6.6.9.9 6.5-6.5" />}
      </svg>
    </span>
  );
}

function fmt(t: ChatMessage['time'], mounted: boolean) {
  if (typeof t === 'number') return mounted ? new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
  return t ?? '';
}

export default function ChatThread({
  messages, onSend, typing = false, you = 'me', compact = false, height = 360,
  label = 'Conversation', placeholder = 'Message',
}: ChatThreadProps) {
  const [own, setOwn] = useState<ChatMessage[]>(SAMPLE);
  const list = messages ?? own;
  const [draft, setDraft] = useState('');
  const [mounted, setMounted] = useState(false);
  const [fresh, setFresh] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const atBottom = useRef(true);
  const initial = useRef(list.length);
  const prevLen = useRef(list.length);
  const reduced = useRef(false);
  const counter = useRef(0);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced.current = mq.matches;
    const f = () => { reduced.current = mq.matches; };
    mq.addEventListener('change', f);
    return () => mq.removeEventListener('change', f);
  }, []);

  const toBottom = useCallback((smooth: boolean) => {
    const el = box.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth && !reduced.current ? 'smooth' : 'auto' });
  }, []);

  useLayoutEffect(() => { toBottom(false); }, [toBottom]);

  const typingOn = !!typing;
  useEffect(() => {
    const added = list.length - prevLen.current;
    prevLen.current = list.length;
    const last = list[list.length - 1];
    if (added > 0 && last && last.from !== you && !atBottom.current) setFresh((c) => c + added);
    else if (atBottom.current || (added > 0 && last?.from === you)) toBottom(true);
  }, [list, you, typingOn, toBottom]);

  const onScroll = () => {
    const el = box.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    if (atBottom.current) setFresh(0);
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    onSend?.(text);
    if (!messages) {
      counter.current += 1;
      setOwn((m) => [...m, { id: `me-${counter.current}`, from: you, text, time: Date.now(), status: 'sent' }]);
    }
    setDraft('');
    atBottom.current = true;
    input.current?.focus();
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
  };

  const typer = typeof typing === 'string' ? typing : 'Someone';
  return (
    <section className={`ui-chat-thread${compact ? ' is-compact' : ''}`} style={{ height }} aria-label={label}>
      <div className="ui-chat-thread-wrap">
        <div ref={box} className="ui-chat-thread-list" role="log" aria-live="polite" aria-label="Messages" tabIndex={0} onScroll={onScroll}>
          {list.map((m, i) => {
            const mine = m.from === you;
            const prev = list[i - 1];
            const next = list[i + 1];
            const first = !prev || prev.from !== m.from;
            const last = !next || next.from !== m.from;
            const cls = `ui-chat-thread-row ${mine ? 'is-mine' : 'is-theirs'}${first ? ' is-first' : ''}${last ? ' is-last' : ''}${i >= initial.current ? ' is-new' : ''}`;
            const t = fmt(m.time, mounted);
            return (
              <div key={m.id} className={cls}>
                {first && !mine && m.name && <span className="ui-chat-thread-name">{m.name}</span>}
                <p className="ui-chat-thread-bubble">{m.text}</p>
                {last && (t || (mine && m.status)) && (
                  <span className="ui-chat-thread-meta">
                    {t && <time>{t}</time>}
                    {mine && m.status && <Ticks status={m.status} />}
                  </span>
                )}
              </div>
            );
          })}
          {typingOn && (
            <div className="ui-chat-thread-row is-theirs is-first is-last ui-chat-thread-typing" role="status" aria-label={`${typer} is typing`}>
              <p className="ui-chat-thread-bubble" aria-hidden="true"><i /><i /><i /></p>
            </div>
          )}
        </div>
        {fresh > 0 && (
          <button type="button" className="ui-chat-thread-pill" onClick={() => { toBottom(true); setFresh(0); }}>
            New messages{fresh > 1 ? ` (${fresh})` : ''}
          </button>
        )}
      </div>
      <form className="ui-chat-thread-form" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <textarea
          ref={input}
          className="ui-chat-thread-input"
          rows={1}
          value={draft}
          placeholder={placeholder}
          aria-label="Write a message"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
        />
        <button type="submit" className="ui-chat-thread-send" aria-label="Send message" disabled={!draft.trim()}>
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M2 8 14 2l-3.5 12L8 9.2 2 8Z" fill="currentColor" /></svg>
        </button>
      </form>
    </section>
  );
}

const REPLIES = ['Looks tidy. Ship it?', 'Nice, I will add photos tonight.', 'Perfect, thank you!'];

export function Demo() {
  const [msgs, setMsgs] = useState<ChatMessage[]>([
    { id: 'd1', from: 'ana', name: 'Ana', text: 'Menu page is ready for review.', time: '9:40' },
    { id: 'd2', from: 'ana', text: 'Want me to publish it?', time: '9:40' },
  ]);
  const [typing, setTyping] = useState(false);
  const n = useRef(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  const stamp = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  const onSend = (text: string) => {
    n.current += 1;
    const id = `u${n.current}`;
    setMsgs((m) => [...m, { id, from: 'me', text, time: stamp(), status: 'sent' }]);
    const set = (status: ChatStatus) => setMsgs((m) => m.map((x) => (x.id === id ? { ...x, status } : x)));
    later(() => set('delivered'), 500);
    later(() => setTyping(true), 800);
    later(() => {
      setTyping(false);
      set('read');
      setMsgs((m) => [...m, { id: `r${id}`, from: 'ana', name: 'Ana', text: REPLIES[(n.current - 1) % REPLIES.length] ?? 'Thanks!', time: stamp() }]);
    }, 2400);
  };
  return <ChatThread compact height={150} messages={msgs} typing={typing ? 'Ana' : false} you="me" onSend={onSend} placeholder="Reply to Ana" />;
}
