'use client';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { useReducedMotion, watchLive } from './_text-c';

export interface TrueFocusProps {
  /** The sentence; each word can take focus. */
  text?: string;
  /** Controlled focused word index. */
  index?: number;
  defaultIndex?: number;
  onIndexChange?: (index: number) => void;
  /** Cycle through the words by itself (default true; ignored under reduced motion). */
  autoplay?: boolean;
  /** Milliseconds each word keeps focus (default 2200). */
  interval?: number;
  /** Blur of the unfocused words in px (default 5). */
  blur?: number;
  className?: string;
  style?: CSSProperties;
}

interface Box { x: number; y: number; w: number; h: number }

/**
 * A sentence where one word is sharp inside a bracketed focus frame and the rest are blurred. The frame glides between words by itself,
 * follows hover or taps, and Left/Right arrows move it (Space pauses). Reduced motion keeps the frame still and jumps instantly.
 */
export default function TrueFocus({ text = 'Look closely at what matters most', index, defaultIndex = 0, onIndexChange, autoplay = true, interval = 2200, blur = 5, className, style }: TrueFocusProps) {
  const words = text.split(/\s+/).filter(Boolean);
  const [inner, setInner] = useState(defaultIndex);
  const cur = Math.min(words.length - 1, Math.max(0, index ?? inner));
  const [playing, setPlaying] = useState(autoplay);
  const [hold, setHold] = useState(false);
  const [live, setLive] = useState(true);
  const [box, setBox] = useState<Box | null>(null);
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const curRef = useRef(cur);
  useEffect(() => { curRef.current = cur; });

  const go = useCallback((i: number) => {
    const n = ((i % words.length) + words.length) % words.length;
    if (index === undefined) setInner(n);
    onIndexChange?.(n);
  }, [words.length, index, onIndexChange]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const measure = () => {
      const el = wordRefs.current[cur];
      if (el) setBox({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    if (document.fonts?.ready) document.fonts.ready.then(measure);
    return () => ro.disconnect();
  }, [cur, text]);

  useEffect(() => { const r = rootRef.current; return r ? watchLive(r, setLive) : undefined; }, []);

  const run = playing && !hold && live && !reduced && words.length > 1;
  useEffect(() => {
    if (!run) return;
    const id = window.setInterval(() => go(curRef.current + 1), interval);
    return () => window.clearInterval(id);
  }, [run, interval, go]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') go(cur + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(cur - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(words.length - 1);
    else if (e.key === ' ' && e.target === e.currentTarget) setPlaying((p) => !p);
    else return;
    e.preventDefault();
  };

  return (
    <div className={`ui-true-focus-root ${className ?? ''}`} style={{ ...style, ['--ui-tf-blur' as string]: `${blur}px` }}
      data-reduced={reduced ? '' : undefined}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHold(true); }} onPointerLeave={() => setHold(false)}>
      <div ref={rootRef} className="ui-true-focus-text" tabIndex={0} role="group" aria-label={`${text}. Arrow keys move the focus frame between words, Space pauses.`}
        onKeyDown={onKey} onFocus={() => setHold(true)} onBlur={() => setHold(false)}>
        {words.map((w, i) => (
          <span key={i} ref={(el) => { wordRefs.current[i] = el; }} className="ui-true-focus-word" data-on={i === cur ? '' : undefined}
            aria-current={i === cur ? 'true' : undefined} onPointerEnter={(e) => { if (e.pointerType === 'mouse') go(i); }} onClick={() => go(i)}>
            {w}
          </span>
        ))}
        <span className="ui-true-focus-frame" aria-hidden="true" data-ready={box ? '' : undefined}
          style={box ? { transform: `translate(${box.x - 8}px, ${box.y - 4}px)`, width: box.w + 16, height: box.h + 8 } : undefined}>
          <i /><i /><i /><i />
        </span>
      </div>
      {autoplay && !reduced && words.length > 1 ? (
        <button type="button" className="ui-true-focus-pause" aria-pressed={!playing} onClick={() => setPlaying((p) => !p)}>
          {playing ? 'Pause' : 'Play'}
        </button>
      ) : null}
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-true-focus-stage">
      <TrueFocus text="Sharp focus finds one clear idea" />
    </div>
  );
}
