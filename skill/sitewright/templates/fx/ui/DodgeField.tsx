'use client';
import { useEffect, useRef, type CSSProperties, type PointerEvent } from 'react';
import { cx, useControlled } from './_micro-a';
import { useCoarsePointer, useReducedMotion } from './_t2';

export interface DodgeFieldProps {
  /** Chips to show. */
  items?: string[];
  /** Controlled selection. */
  value?: string[];
  defaultValue?: string[];
  onChange?: (v: string[]) => void;
  /** Distance (px) at which chips start to slip away from the pointer. */
  radius?: number;
  /** Largest sideways slip in px. */
  strength?: number;
  /** Accessible group label. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const DEFAULTS = ['Typography', 'Motion', 'Colour', 'Layout', 'Icons', 'Grids', 'Depth', 'Sound', 'Forms', 'Charts'];

/** A cloud of toggle chips that slip out of the pointer's way and spring back when it leaves. They stay ordinary buttons (aria-pressed), and the slip fades to zero over the chip itself so it can always be caught. Touch and reduced-motion users get a still field. */
export default function DodgeField({ items = DEFAULTS, value, defaultValue = ['Motion', 'Colour'], onChange, radius = 96, strength = 22, label = 'Topics', className, style }: DodgeFieldProps) {
  const [sel, setSel] = useControlled(value, defaultValue, onChange);
  const root = useRef<HTMLDivElement>(null);
  const chips = useRef<(HTMLButtonElement | null)[]>([]);
  const st = useRef({ x: 0, y: 0, inside: false, raf: 0, pos: [] as [number, number][] });
  const reduced = useReducedMotion();
  const coarse = useCoarsePointer();
  const still = reduced || coarse;

  const loop = () => {
    const s = st.current;
    s.raf = 0;
    let busy = false;
    chips.current.forEach((el, i) => {
      if (!el) return;
      const cx0 = el.offsetLeft + el.offsetWidth / 2, cy0 = el.offsetTop + el.offsetHeight / 2;
      let tx = 0, ty = 0;
      if (s.inside) {
        const hw = el.offsetWidth / 2, hh = el.offsetHeight / 2;
        const dx = s.x - cx0, dy = s.y - cy0;
        const ox = Math.max(Math.abs(dx) - hw, 0), oy = Math.max(Math.abs(dy) - hh, 0);
        const d = Math.hypot(ox, oy); // distance from pointer to the chip's resting box
        if (d < radius) {
          const near = Math.min(1, d / 18); // 0 right on the chip so it can be caught
          const push = strength * (1 - d / radius) ** 2 * near * near * (3 - 2 * near);
          const len = Math.hypot(dx, dy) || 1;
          tx = (-dx / len) * push * 1.2; ty = (-dy / len) * push;
        }
      }
      const p = s.pos[i] ?? [0, 0];
      p[0] += (tx - p[0]) * 0.2; p[1] += (ty - p[1]) * 0.2;
      if (Math.abs(tx - p[0]) < 0.05 && Math.abs(ty - p[1]) < 0.05 && !tx && !ty) { p[0] = 0; p[1] = 0; } else busy = true;
      s.pos[i] = p;
      el.style.transform = p[0] === 0 && p[1] === 0 ? '' : `translate(${p[0].toFixed(2)}px,${p[1].toFixed(2)}px)`;
    });
    if (busy || s.inside) s.raf = requestAnimationFrame(loop);
  };
  const kick = () => { if (!st.current.raf) st.current.raf = requestAnimationFrame(loop); };
  useEffect(() => () => { cancelAnimationFrame(st.current.raf); st.current.raf = 0; }, []);
  useEffect(() => { if (still) { st.current.inside = false; chips.current.forEach((c) => { if (c) c.style.transform = ''; }); } }, [still]);

  const move = (e: PointerEvent) => {
    if (still || e.pointerType === 'touch' || !root.current) return;
    const b = root.current.getBoundingClientRect();
    st.current.x = e.clientX - b.left; st.current.y = e.clientY - b.top; st.current.inside = true;
    kick();
  };
  const leave = () => { st.current.inside = false; kick(); };
  const toggle = (it: string) => setSel(sel.includes(it) ? sel.filter((x) => x !== it) : [...sel, it]);

  return (
    <div className={cx('ui-dodge-field', className)} style={style}>
      <div ref={root} className="ui-dodge-field-cloud" role="group" aria-label={label} onPointerMove={move} onPointerLeave={leave} onPointerCancel={leave}>
        {items.map((it, i) => (
          <button key={it} ref={(el) => { chips.current[i] = el; }} type="button" className="ui-dodge-field-chip" aria-pressed={sel.includes(it)} onClick={() => toggle(it)}>
            <span className="ui-dodge-field-tick" aria-hidden="true">{sel.includes(it) ? '✓' : '+'}</span>{it}
          </button>
        ))}
      </div>
      <p className="ui-dodge-field-count" role="status">{sel.length} selected</p>
    </div>
  );
}

export function Demo() {
  return (
    <div className="ui-dodge-field-demo">
      <DodgeField />
    </div>
  );
}
