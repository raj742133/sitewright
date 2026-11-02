'use client';
// The hero loupe: a brass magnifier that follows the pointer over any drawing on the open spread and shows the same drawing a few times
// larger, with the fine stipple that is only drawn at that size. It is decoration (aria-hidden); the "Under the loupe" section has the
// keyboard-operable version. It is driven straight from pointer events, never through React state, so it costs nothing per frame.
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Plate, type PlateKind } from './_hps-art';

export function HeroLens({ stage, kinds }: { stage: RefObject<HTMLDivElement | null>; kinds: { l?: PlateKind; r?: PlateKind } }) {
  const lens = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [kind, setKind] = useState<PlateKind>(kinds.r ?? 'moth');
  const kindsRef = useRef(kinds);
  useEffect(() => { kindsRef.current = kinds; });

  useEffect(() => {
    const st = stage.current, ln = lens.current, inn = inner.current;
    if (!st || !ln || !inn) return;
    let raf = 0, last: PointerEvent | null = null, side: 'l' | 'r' | '' = '';
    const hide = () => { ln.dataset.on = ''; side = ''; };
    const paint = () => {
      raf = 0;
      const e = last;
      if (!e || st.dataset.busy) { hide(); return; }
      const sr = st.getBoundingClientRect();
      let hit: 'l' | 'r' | '' = '', ar: DOMRect | null = null;
      for (const s of ['r', 'l'] as const) {
        const el = st.querySelector<HTMLElement>(`[data-art="${s}"]`);
        const r = el?.getBoundingClientRect();
        if (r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) { hit = s; ar = r; break; }
      }
      if (!hit || !ar) { hide(); return; }
      const D = Math.max(112, Math.min(200, sr.width * 0.15)), Z = 2.7;
      const lift = e.pointerType === 'touch' ? D * 0.62 : 0;
      if (hit !== side) { side = hit; const k = kindsRef.current[hit]; if (k) setKind(k); }
      ln.style.setProperty('--d', `${D}px`);
      ln.style.transform = `translate(${(e.clientX - sr.left - D / 2).toFixed(1)}px, ${(e.clientY - sr.top - D / 2 - lift).toFixed(1)}px)`;
      inn.style.width = `${ar.width}px`;
      inn.style.height = `${ar.height}px`;
      inn.style.transform = `translate(${(D / 2 - (e.clientX - ar.left) * Z).toFixed(1)}px, ${(D / 2 - (e.clientY - ar.top) * Z).toFixed(1)}px) scale(${Z})`;
      ln.dataset.on = 'true';
      st.dataset.lens = 'true';
    };
    const on = (e: PointerEvent) => { last = e; if (!raf) raf = requestAnimationFrame(paint); };
    const off = () => { last = null; hide(); st.dataset.lens = ''; };
    st.addEventListener('pointermove', on);
    st.addEventListener('pointerdown', on);
    st.addEventListener('pointerleave', off);
    st.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch') off(); });
    st.addEventListener('pointercancel', off);
    return () => { cancelAnimationFrame(raf); st.removeEventListener('pointermove', on); st.removeEventListener('pointerdown', on); st.removeEventListener('pointerleave', off); st.removeEventListener('pointercancel', off); };
  }, [stage]);

  return (
    <div ref={lens} className="hps-hl" aria-hidden="true">
      <span className="hps-hl-handle" />
      <span className="hps-hl-ring" />
      <div className="hps-hl-glass">
        <div ref={inner} className="hps-hl-in"><Plate kind={kind} detail /></div>
        <span className="hps-hl-glint" />
      </div>
    </div>
  );
}
