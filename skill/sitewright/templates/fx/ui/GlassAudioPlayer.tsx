'use client';
import { useCallback, useEffect, useRef, useState, type HTMLAttributes, type KeyboardEvent, type PointerEvent } from 'react';
import { AUDIO_DEFAULT_PARAMS, getGlassEngine } from './_tg-engine';
import { attachTilt, useGlass, type GlassOpticsProps } from './_tg-use';
import { getGlassAudioSynth } from './_tg-audio';
import { GlassStage } from './_tg-stage';

export interface GlassAudioTrack { title: string; durationSec: number }

/** The three tracks the built-in synth can play (it makes the sound itself: no audio files). */
export const DEFAULT_AUDIO_TRACKS: GlassAudioTrack[] = [
  { title: 'Solaris Phase', durationSec: 228 },
  { title: 'Obsidian Bloom', durationSec: 256 },
  { title: 'Caustic Horizon', durationSec: 192 },
];

export interface GlassAudioPlayerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  tracks?: GlassAudioTrack[];
  defaultTrackIndex?: number;
  onPlayChange?: (playing: boolean) => void;
  onTrackChange?: (index: number, track: GlassAudioTrack) => void;
  tilt3d?: boolean;
  maxTilt?: number;
  optics?: GlassOpticsProps;
}

const fmt = (sec: number) => { const s = Math.max(0, Math.floor(sec)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const BARS = 70;

/**
 * A spatial audio deck in liquid glass with a procedural synth: play, previous / next, a timeline you can drag, a live spectrum and repeat.
 * Sound starts only after you press play (browsers require a gesture and so does this) and stops when you pause or leave the page.
 */
export default function GlassAudioPlayer({ tracks = DEFAULT_AUDIO_TRACKS, defaultTrackIndex = 0, onPlayChange, onTrackChange, tilt3d = true, maxTilt = 10, optics, className = '', ...props }: GlassAudioPlayerProps) {
  const [idx, setIdx] = useState(Math.max(0, Math.min(tracks.length - 1, defaultTrackIndex)));
  const [playing, setPlaying] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [progress, setProgress] = useState(0);
  const [said, setSaid] = useState('');
  const track = tracks[idx] ?? DEFAULT_AUDIO_TRACKS[0]!;
  const pr = useRef(0);
  const spec = useRef<HTMLCanvasElement | null>(null);
  const hit = useRef<HTMLDivElement | null>(null);
  const live = useRef({ idx, repeat, tracks, track, onTrackChange });
  live.current = { idx, repeat, tracks, track, onTrackChange };

  const { rootRef, canvasRef, dataGlass } = useGlass<HTMLDivElement>({
    defaults: AUDIO_DEFAULT_PARAMS, optics, radius: 'css', deps: [tilt3d, maxTilt],
    measure: (el) => [el.offsetWidth, el.offsetHeight + Math.ceil(48 * Math.min(1, el.offsetWidth / 480))],
    onResize: (root, canvas) => {
      const scale = Math.min(1, root.offsetWidth / 480);
      const bleed = Math.ceil(48 * scale);
      root.style.setProperty('--tg-scale', scale.toFixed(4));
      canvas.style.bottom = `-${bleed}px`;
      canvas.style.height = `calc(100% + ${bleed}px)`;
    },
    setup: (inst, root) => {
      inst.isAudioDeck = true;
      inst.getRect = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.round(root.offsetWidth * dpr);
        const h = Math.round(root.offsetHeight * dpr);
        return [0, Math.max(0, inst.canvas.height - h), w, h];
      };
      return tilt3d ? attachTilt(root, inst, { max: maxTilt, scale: 1.025, easeIn: 0.1, easeOut: 0.07, calm: '.ui-glass-audio-dock, .ui-glass-audio-time, .ui-glass-audio-like' }) : undefined;
    },
  });

  // never leave sound running when the player goes away
  useEffect(() => () => getGlassAudioSynth().setPlaying(false), []);

  // the spectrum: runs only while the deck is on screen, the tab is visible and motion is allowed; otherwise one still frame
  useEffect(() => {
    const cv = spec.current;
    const root = rootRef.current;
    if (!cv || !root) return;
    const c2 = cv.getContext('2d');
    if (!c2) return;
    const synth = getGlassAudioSynth();
    const eng = getGlassEngine();
    const lv = new Float32Array(BARS), idle = new Float32Array(BARS), glow = new Float32Array(BARS);
    let raf: number | null = null, onScreen = true, ink = '#fff';
    const draw = () => {
      raf = null;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = cv.clientWidth || 480, cssH = cv.clientHeight || 304;
      const W = Math.round(cssW * dpr), H = Math.round(cssH * dpr);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      const t = eng.reduced ? 4.2 : eng.getTime();
      synth.getSpectrumBars(BARS, lv, t);
      synth.getIdleWaveBars(BARS, idle, t, glow);
      c2.clearRect(0, 0, W, H);
      const barW = Math.max(1, Math.round(1.5 * dpr));
      const step = Math.max(2, Math.round(6 * (cssW / 480) * dpr));
      const x0 = Math.round((W - ((BARS - 1) * step + barW)) * 0.5);
      const cy = Math.round((146 / 304) * H);
      const sy = (cssH / 304) * dpr;
      const dot = Math.max(2, Math.round(2 * sy));
      c2.fillStyle = ink;
      for (let i = 0; i < BARS; i++) {
        const level = lv[i]!, wave = idle[i]!;
        const a = 0.16 + 0.76 * Math.min(1, Math.max(glow[i]!, level * 2.5));
        const extra = 130 * level * sy, wp = wave * 56 * sy;
        const up = extra * 0.5 + Math.max(0, wp), down = extra * 0.5 + Math.max(0, -wp);
        c2.globalAlpha = a;
        c2.beginPath();
        c2.roundRect(x0 + i * step, cy - dot * 0.5 - up, barW, dot + up + down, barW * 0.5);
        c2.fill();
      }
      c2.globalAlpha = 1;
      if (!eng.reduced && onScreen && !document.hidden) raf = requestAnimationFrame(draw);
    };
    const kick = () => { ink = getComputedStyle(root).getPropertyValue('--tg-ink').trim() || '#fff'; if (raf === null) raf = requestAnimationFrame(draw); };
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((es) => { onScreen = es[es.length - 1]?.isIntersecting ?? true; if (onScreen) kick(); }) : null;
    io?.observe(root);
    document.addEventListener('visibilitychange', kick);
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', kick);
    kick();
    return () => { if (raf !== null) cancelAnimationFrame(raf); io?.disconnect(); document.removeEventListener('visibilitychange', kick); mq.removeEventListener('change', kick); };
  }, [rootRef]);

  const goTo = useCallback((next: number, play: boolean) => {
    const L = live.current;
    const s = getGlassAudioSynth();
    s.seek(0); s.setTrack(next); if (play) s.setPlaying(true);
    pr.current = 0; setProgress(0); setIdx(next);
    if (play) setPlaying(true);
    const t = L.tracks[next];
    if (t) { L.onTrackChange?.(next, t); setSaid(`${play ? 'Playing' : 'Track'} ${t.title}`); }
  }, []);

  // progress while playing (about 10 updates a second is plenty for a timeline)
  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      const next = pr.current + dt / Math.max(1, live.current.track.durationSec);
      if (next >= 1) {
        if (live.current.repeat) { getGlassAudioSynth().seek(0); pr.current = 0; setProgress(0); }
        else goTo((live.current.idx + 1) % live.current.tracks.length, true);
        return;
      }
      pr.current = next;
      setProgress(next);
    }, 100);
    return () => window.clearInterval(id);
  }, [playing, goTo]);

  const toggle = () => {
    const next = !playing;
    const s = getGlassAudioSynth();
    s.setTrack(idx); s.seek(pr.current); s.setPlaying(next);   // the click is the gesture that lets the browser start audio
    setPlaying(next);
    setSaid(next ? `Playing ${track.title}` : 'Paused');
    onPlayChange?.(next);
  };
  const seekTo = (r: number) => { const v = Math.max(0, Math.min(1, r)); getGlassAudioSynth().seek(v); pr.current = v; setProgress(v); };
  const scrub = (x: number) => { const el = hit.current; if (!el) return; const b = el.getBoundingClientRect(); if (b.width > 0) seekTo((x - b.left) / b.width); };
  const down = (e: PointerEvent<HTMLDivElement>) => { e.stopPropagation(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not capturable */ } scrub(e.clientX); };
  const move = (e: PointerEvent<HTMLDivElement>) => { if (e.currentTarget.hasPointerCapture(e.pointerId) || e.buttons === 1) { e.stopPropagation(); scrub(e.clientX); } };
  const up = (e: PointerEvent<HTMLDivElement>) => { try { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* released */ } };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const d = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -0.05 : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 0.05 : e.key === 'PageDown' ? -0.1 : e.key === 'PageUp' ? 0.1 : 0;
    if (e.key === 'Home') { e.preventDefault(); seekTo(0); } else if (e.key === 'End') { e.preventDefault(); seekTo(1); } else if (d) { e.preventDefault(); seekTo(pr.current + d); }
  };

  const cur = progress * track.durationSec;
  return (
    <div ref={rootRef} role="group" aria-label={`Audio player, ${track.title}`} data-glass={dataGlass} className={`ui-glass ui-glass-dark ui-glass-pane ui-glass-audio ${className}`.trim()} {...props}>
      <canvas ref={canvasRef} className="ui-glass-canvas" aria-hidden="true" />
      <canvas ref={spec} className="ui-glass-audio-spectrum" aria-hidden="true" />
      <div className="ui-glass-audio-inner">
        <div className="ui-glass-audio-top">
          <div className="ui-glass-audio-title">{track.title}</div>
          <button type="button" className="ui-glass-audio-like" aria-label="Repeat track" aria-pressed={repeat} onClick={() => setRepeat((v) => !v)}>
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></svg>
          </button>
        </div>
        <div className="ui-glass-audio-time">
          <div ref={hit} className="ui-glass-audio-hit" role="slider" tabIndex={0} aria-label="Playback position" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-valuetext={`${fmt(cur)} of ${fmt(track.durationSec)}`}
            onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}>
            <div className="ui-glass-audio-track"><div className="ui-glass-audio-fill" style={{ width: `${(progress * 100).toFixed(1)}%` }} /></div>
          </div>
          <div className="ui-glass-audio-stamps" aria-hidden="true"><span>{fmt(cur)}</span><span>-{fmt(track.durationSec - cur)}</span></div>
        </div>
      </div>
      <div className="ui-glass-audio-dock">
        <button type="button" className="ui-glass-audio-btn" aria-label="Previous track" onClick={() => goTo((idx - 1 + tracks.length) % tracks.length, true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><polygon points="19 20 9 12 19 4 19 20" /><line x1="5" x2="5" y1="19" y2="5" /></svg>
        </button>
        <button type="button" className="ui-glass-audio-btn" data-play="" aria-label={playing ? 'Pause' : 'Play'} onClick={toggle}>
          {playing
            ? <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="14" y="4" width="4" height="16" rx="1" /><rect x="6" y="4" width="4" height="16" rx="1" /></svg>
            : <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><polygon points="6 3 20 12 6 21 6 3" /></svg>}
        </button>
        <button type="button" className="ui-glass-audio-btn" aria-label="Next track" onClick={() => goTo((idx + 1) % tracks.length, true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><polygon points="5 4 15 12 5 20 5 4" /><line x1="19" x2="19" y1="5" y2="19" /></svg>
        </button>
      </div>
      <div className="ui-glass-sr" role="status" aria-live="polite">{said}</div>
    </div>
  );
}

export function Demo() {
  return (
    <GlassStage>
      <GlassAudioPlayer optics={{ refraction: 40, thickness: 40, bevelWidth: 10, frost: 20, sheen: 40, rim: 40 }} style={{ width: 'min(100%, 340px)' }} />
    </GlassStage>
  );
}
