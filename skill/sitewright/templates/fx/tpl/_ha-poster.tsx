'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { useCanvasLoop } from './_ha-kit';

/* The media panel of the Quillfold page: no video file, an animated canvas poster that reacts to a working clock. Play, pause,
   scrub, speed, captions and a transcript whose lines seek the clock. */

const DUR = 400;
const LINES: [number, string][] = [
  [0, 'I started The Salt Ledger with a sentence about a tide that did not arrive.'],
  [44, 'I wanted a town that lies politely, in small figures, in a very neat hand.'],
  [96, 'The clerk is not clever. She is careful, which is more dangerous.'],
  [158, 'Harbours are good places for fiction because everything arrives and leaves on a schedule.'],
  [221, 'My editor asked me to cut forty pages. I cut sixty and the book got longer.'],
  [290, 'If you read it slowly, you will notice the ledger changes handwriting twice.'],
  [348, 'That is the whole trick. Pay attention to who is holding the pen.'],
];
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const cur = (t: number) => { let k = 0; LINES.forEach(([s], i) => { if (t >= s) k = i; }); return k; };

export function Player({ reduced }: { reduced: boolean }) {
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [cc, setCc] = useState(true);
  const cv = useRef<HTMLCanvasElement>(null);
  const st = useRef({ pos: 0, playing: false });
  st.current = { pos, playing };
  const sid = useId();
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setPos((p) => { const n = p + 0.25 * rate; if (n >= DUR) { setPlaying(false); return DUR; } return n; }), 250);
    return () => clearInterval(id);
  }, [playing, rate]);
  useCanvasLoop(cv, reduced, (ctx, { w, h }, t) => {
    const { pos: p, playing: on } = st.current;
    const prog = p / DUR, amp = on ? 1 : 0.35;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#f6c98b'); g.addColorStop(0.55, '#e9895a'); g.addColorStop(1, '#6c3a55');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const sy = h * (0.62 - 0.22 * Math.sin(prog * Math.PI));
    ctx.fillStyle = '#fff3d6'; ctx.beginPath(); ctx.arc(w * 0.5, sy, h * 0.17, 0, 6.283); ctx.fill();
    for (let i = 0; i < 16; i++) {
      const y = h * 0.64 + i * (h * 0.024) * (1 + i * 0.08);
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) { const yy = y + Math.sin(x * 0.02 + t * (0.8 + i * 0.07) + i) * (1.5 + i * 0.5) * amp; x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }
      ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath();
      ctx.fillStyle = `rgba(${40 + i * 4},${24 + i * 2},${58 + i * 3},${0.1 + i * 0.045})`; ctx.fill();
    }
    ctx.fillStyle = 'rgba(30,18,44,.55)';
    const bars = Math.max(20, Math.floor(w / 9));
    for (let i = 0; i < bars; i++) {
      const u = i / bars, v = 0.35 + 0.65 * Math.abs(Math.sin(u * 23.7 + 1.3) * Math.cos(u * 7.1)) * (0.6 + 0.4 * Math.sin(t * 3 + i) * (on ? 1 : 0));
      ctx.globalAlpha = u <= prog ? 0.95 : 0.35;
      const bh = v * h * 0.09; ctx.fillRect(i * (w / bars) + 1, h - 18 - bh, Math.max(2, w / bars - 3), bh);
    }
    ctx.globalAlpha = 1;
  }, 0);
  const li = cur(pos);
  return (
    <div className="hbs-player">
      <div className="hbs-screen">
        <canvas ref={cv} aria-hidden="true" />
        <div className="hbs-badge" aria-hidden="true">In conversation</div>
        {cc && <p className="hbs-cc" aria-live="off">{LINES[li]![1]}</p>}
        <button type="button" className="hbs-bigplay" onClick={() => { if (pos >= DUR) setPos(0); setPlaying((v) => !v); }} aria-label={playing ? 'Pause' : 'Play'} data-on={playing}>
          {playing ? <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg> : <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" aria-hidden="true"><path d="M8 5l12 7-12 7z" /></svg>}
        </button>
      </div>
      <div className="hbs-ctl">
        <label className="hbs-scrub"><span className="ha-sr">Seek</span>
          <input type="range" min={0} max={DUR} step={1} value={Math.round(pos)} onChange={(e) => setPos(Number(e.target.value))} aria-valuetext={`${fmt(pos)} of ${fmt(DUR)}`} style={{ '--v': `${(pos / DUR) * 100}%` } as React.CSSProperties} />
        </label>
        <output className="hbs-time">{fmt(pos)} / {fmt(DUR)}</output>
        <button type="button" className="hbs-sm" onClick={() => setRate((r) => (r === 1 ? 1.25 : r === 1.25 ? 1.5 : 1))} aria-label={`Playback speed ${rate}x, change`}>{rate}x</button>
        <button type="button" className="hbs-sm" aria-pressed={cc} onClick={() => setCc((v) => !v)} aria-label="Captions">CC</button>
      </div>
      <div className="hbs-tr" role="group" aria-labelledby={sid}>
        <h3 id={sid}>Transcript</h3>
        <ol>{LINES.map(([s, text], i) => <li key={s}><button type="button" data-now={i === li} aria-current={i === li ? 'true' : undefined} onClick={() => { setPos(s); setPlaying(true); }}><time>{fmt(s)}</time><span>{text}</span></button></li>)}</ol>
      </div>
    </div>
  );
}
