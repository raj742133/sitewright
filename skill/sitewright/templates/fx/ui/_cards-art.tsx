import type { ReactNode } from 'react';

/* Original CSS/SVG scenery for the card demos. Colours come from the host tokens, so every scene follows the theme. */

const SCENES: ((id: string) => ReactNode)[] = [
  // dunes under a low sun
  () => (<>
    <rect width="200" height="120" className="ca-sky" />
    <circle cx="146" cy="52" r="20" className="ca-sun" />
    <path d="M0 120V84q32-26 70-8t74-4q34 8 56-8v56z" className="ca-far" />
    <path d="M0 120V98q40-22 84-6t116-8v36z" className="ca-near" />
  </>),
  // ring planet
  () => (<>
    <rect width="200" height="120" className="ca-sky" />
    <circle cx="48" cy="22" r="1.6" className="ca-dot" /><circle cx="162" cy="30" r="1.2" className="ca-dot" /><circle cx="116" cy="12" r="1.4" className="ca-dot" /><circle cx="22" cy="84" r="1.2" className="ca-dot" />
    <circle cx="100" cy="62" r="30" className="ca-sun" />
    <ellipse cx="100" cy="62" rx="58" ry="12" transform="rotate(-16 100 62)" className="ca-ring" />
    <path d="M70 70a30 30 0 0 0 58-6q-30 14-58 6z" className="ca-far" opacity=".35" />
  </>),
  // peaks
  () => (<>
    <rect width="200" height="120" className="ca-sky" />
    <circle cx="38" cy="30" r="12" className="ca-sun" />
    <path d="M0 120V76l34-34 26 28 40-46 46 52 28-22 26 24v42z" className="ca-far" />
    <path d="M0 120V96l44-22 36 20 44-26 76 34v18z" className="ca-near" />
  </>),
  // waves
  () => (<>
    <rect width="200" height="120" className="ca-sky" />
    <circle cx="60" cy="44" r="16" className="ca-sun" />
    <path d="M0 74q25-14 50 0t50 0 50 0 50 0v46H0z" className="ca-far" />
    <path d="M0 92q25-14 50 0t50 0 50 0 50 0v28H0z" className="ca-near" />
  </>),
  // blocks / city
  () => (<>
    <rect width="200" height="120" className="ca-sky" />
    <circle cx="156" cy="28" r="10" className="ca-sun" />
    <path d="M10 120V64h28v56zM44 120V40h30v80zM80 120V72h26v48zM112 120V52h34v68zM152 120V78h38v42z" className="ca-far" />
    <path d="M0 120v-14h200v14z" className="ca-near" />
    <path d="M54 52h4v6h-4zM54 66h4v6h-4zM124 62h4v6h-4zM136 76h4v6h-4zM124 90h4v6h-4z" className="ca-dot" />
  </>),
  // hills + path
  () => (<>
    <rect width="200" height="120" className="ca-sky" />
    <circle cx="108" cy="46" r="14" className="ca-sun" />
    <path d="M0 120V80q50-34 110-4t90 0v44z" className="ca-far" />
    <path d="M0 120V100q60-30 120-4t80-6v30z" className="ca-near" />
    <path d="M96 120q8-14 30-20" fill="none" className="ca-path" />
  </>),
];

/** A scene drawn in SVG; `index` picks one of six (wraps). Fills its parent. Style the `.ca-*` parts through `.ca-scene`. */
export function Scene({ index = 0, className }: { index?: number; className?: string }) {
  const i = ((index % SCENES.length) + SCENES.length) % SCENES.length;
  return (
    <svg className={`ca-scene ca-scene-${i} ${className ?? ''}`} viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      {SCENES[i]?.('')}
    </svg>
  );
}


/** Deterministic initials from a name. */
export function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? (p[p.length - 1]?.[0] ?? '') : '')).toUpperCase();
}
