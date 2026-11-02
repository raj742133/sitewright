'use client';
// Ink-and-wash plates for the paper-sketchbook page, drawn as SVG (viewBox 100 x 130). Colours come from CSS classes
// (hps-i = ink line, hps-g/r/b/o = wash fills) so both themes and any brand palette work. No images.
import type { ReactNode } from 'react';

export type PlateKind = 'fern' | 'tram' | 'teapot' | 'wren' | 'moth' | 'cat' | 'light' | 'mushroom';

const I = 'hps-i', G = 'hps-g', R = 'hps-r', B = 'hps-b', O = 'hps-o', F = 'hps-f';
const r2 = (n: number) => Math.round(n * 100) / 100;

/** deterministic generator (same numbers on server and client) */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** fine stipple dots inside a box: the detail you only see under the loupe */
function Stipple({ n, seed, x, y, w, h }: { n: number; seed: number; x: number; y: number; w: number; h: number }) {
  const rnd = rng(seed);
  const dots: ReactNode[] = [];
  for (let k = 0; k < n; k++) dots.push(<circle key={k} className={F} cx={r2(x + rnd() * w)} cy={r2(y + rnd() * h)} r={r2(0.16 + rnd() * 0.22)} />);
  return <g opacity=".55">{dots}</g>;
}

function Hatch({ x, y, w, n, dy = 1.6, seed = 3 }: { x: number; y: number; w: number; n: number; dy?: number; seed?: number }) {
  const rnd = rng(seed);
  return <g className={I} strokeWidth=".4" opacity=".6">{Array.from({ length: n }, (_, k) => { const o = rnd() * 3; return <path key={k} d={`M${r2(x + o)} ${r2(y + k * dy)}h${r2(w - o * 2)}`} />; })}</g>;
}

function Fern({ detail }: { detail?: boolean }) {
  const bez = (t: number) => { const u = 1 - t; const P = [[50, 122], [47, 96], [53, 62], [47, 16]] as const; return [u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t ** 3 * P[3][0], u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t ** 3 * P[3][1]] as const; };
  const leaves: ReactNode[] = [];
  for (let i = 0; i < 10; i++) {
    const [px, py] = bez(0.12 + i * 0.085);
    const l = 27 - i * 2.2;
    for (const s of [-1, 1]) {
      const cx = r2(px + s * l * 0.55), cy = r2(py - l * 0.16), rot = -s * (26 - i * 0.8);
      leaves.push(
        <g key={`${i}${s}`} transform={`rotate(${r2(rot)} ${cx} ${cy})`}>
          <ellipse className={G} cx={cx} cy={cy} rx={r2(l * 0.56)} ry={r2(l * 0.19)} />
          <ellipse className={I} cx={cx} cy={cy} rx={r2(l * 0.56)} ry={r2(l * 0.19)} />
          <path className={I} d={`M${r2(cx - l * 0.5)} ${cy}H${r2(cx + l * 0.5)}`} strokeWidth=".4" />
        </g>,
      );
    }
  }
  return (
    <g>
      <path className={I} d="M50 122C47 96 53 62 47 16" strokeWidth="1.2" />
      {leaves}
      <ellipse className={O} cx="47" cy="12" rx="3" ry="5" />
      <Hatch x={26} y={124} w={48} n={1} dy={1.7} seed={9} />
      {detail && <Stipple n={252} seed={11} x={14} y={18} w={74} h={100} />}
    </g>
  );
}

function Tram({ detail }: { detail?: boolean }) {
  const rnd = rng(21);
  const rain = Array.from({ length: 30 }, (_, k) => { const x = rnd() * 100, y = rnd() * 80; return <path key={k} d={`M${r2(x)} ${r2(y)}l-2.6 6`} />; });
  return (
    <g>
      <g className={I} strokeWidth=".5" opacity=".7">{rain}</g>
      <path className={I} d="M0 14L100 22M0 18L100 26" strokeWidth=".5" />
      <path className={I} d="M50 44L44 22M50 44L58 22M44 22H58" />
      <rect className={R} x="14" y="44" width="72" height="42" rx="7" />
      <rect className={I} x="14" y="44" width="72" height="42" rx="7" />
      <path className={I} d="M14 76H86M14 52H86" strokeWidth=".6" />
      {[0, 1, 2, 3, 4].map((k) => <rect key={k} className={`${B} ${I}`} x={20 + k * 13} y="55" width="10" height="14" rx="1.5" strokeWidth=".7" />)}
      <circle className={I} cx="30" cy="90" r="4.5" /><circle className={I} cx="70" cy="90" r="4.5" />
      <circle className={F} cx="30" cy="90" r="1.2" /><circle className={F} cx="70" cy="90" r="1.2" />
      <path className={I} d="M4 95.5H96" />
      <path className={I} d="M20 102H40M52 104H80M30 110H62" strokeWidth=".5" opacity=".6" />
      <circle className={O} cx="82" cy="79" r="2" />
      <Hatch x={16} y={98} w={70} n={2} dy={2.2} seed={5} />
      {detail && <Stipple n={180} seed={4} x={14} y={44} w={72} h={42} />}
    </g>
  );
}

function Teapot({ detail }: { detail?: boolean }) {
  return (
    <g>
      <path className={B} d="M30 80C26 56 40 46 52 46C64 46 78 56 74 80C73 92 32 92 30 80Z" />
      <path className={I} d="M30 80C26 56 40 46 52 46C64 46 78 56 74 80C73 92 32 92 30 80Z" />
      <path className={I} d="M44 46C46 40 58 40 60 46M32 66C20 64 16 54 12 50C20 50 28 56 33 60M74 60C90 56 90 78 72 80" />
      <circle className={I} cx="52" cy="38" r="3" />
      <path className={I} d="M36 62C40 56 46 54 50 54" strokeWidth=".5" />
      <ellipse className={O} cx="24" cy="106" rx="11" ry="8" transform="rotate(-12 24 106)" />
      <ellipse className={I} cx="24" cy="106" rx="11" ry="8" transform="rotate(-12 24 106)" />
      <path className={I} d="M34 102l3-2M13 108l-3 1" />
      <path className={R} d="M60 98H84C84 110 80 114 72 114C64 114 60 110 60 98Z" />
      <path className={I} d="M60 98H84C84 110 80 114 72 114C64 114 60 110 60 98ZM84 101C92 101 92 109 83 109" />
      <path className={I} d="M6 118H94" />
      <Hatch x={14} y={120} w={74} n={2} dy={2} seed={7} />
      {detail && <Stipple n={180} seed={6} x={28} y={46} w={48} h={44} />}
    </g>
  );
}

function Wren({ detail }: { detail?: boolean }) {
  return (
    <g>
      <path className={I} d="M4 96C30 90 60 98 98 88M40 94C40 104 36 110 30 112M72 94C72 102 76 108 82 110" strokeWidth="1.1" />
      <ellipse className={G} cx="20" cy="104" rx="9" ry="4" transform="rotate(-25 20 104)" /><ellipse className={G} cx="86" cy="104" rx="9" ry="4" transform="rotate(30 86 104)" />
      <ellipse className={O} cx="52" cy="70" rx="21" ry="15" transform="rotate(-18 52 70)" />
      <ellipse className={I} cx="52" cy="70" rx="21" ry="15" transform="rotate(-18 52 70)" />
      <circle className={O} cx="35" cy="58" r="9" /><circle className={I} cx="35" cy="58" r="9" />
      <path className={I} d="M27 56L16 52L27 61M69 62L90 36M70 68L92 44M66 74L84 56" />
      <circle className={F} cx="33" cy="56" r="1.6" />
      <path className={I} d="M44 66C54 62 62 70 56 80M48 72C54 70 58 76 54 82" strokeWidth=".6" />
      <path className={I} d="M48 84L46 92M58 83L60 92" />
      <Hatch x={30} y={116} w={46} n={1} dy={2} seed={2} />
      {detail && <Stipple n={228} seed={8} x={30} y={48} w={44} h={40} />}
    </g>
  );
}

const FW = 'M50 58C36 30 10 28 8 50C8 66 30 70 50 66Z';
const HW = 'M50 68C34 72 20 92 30 104C42 108 50 88 50 72Z';

/** the moth study: veined wings, eye spots, a furred thorax, a feathered antenna and the pencil guides still showing underneath */
function Moth({ detail }: { detail?: boolean }) {
  const rnd = rng(41);
  const fwVeins = [[34, 33], [22, 34], [13, 40], [9, 49], [12, 59], [24, 66]];
  const hwVeins = [[34, 78], [27, 88], [28, 100], [40, 100]];
  const fur = Array.from({ length: 22 }, (_, k) => { const a = (k / 22) * Math.PI * 2, rx = 4.6, ry = 6.4; const x = 50 + Math.cos(a) * rx * (0.55 + rnd() * 0.5), y = 56 + Math.sin(a) * ry * (0.55 + rnd() * 0.5); return <path key={k} d={`M${r2(x)} ${r2(y)}l${r2(Math.cos(a) * 1.6)} ${r2(Math.sin(a) * 1.6)}`} />; });
  const feather = (s: number) => Array.from({ length: 9 }, (_, k) => { const t = (k + 1) / 10; const x = 50 + s * (2 + 20 * t), y = 49 - 17 * t - 7 * t * t; return <path key={k} d={`M${r2(x)} ${r2(y)}l${r2(s * 2.4)} ${r2(-2.6 + t * 1.2)}M${r2(x)} ${r2(y)}l${r2(s * 1.2)} ${r2(2.4)}`} strokeWidth=".35" />; });
  const wing = (
    <g>
      <path className={O} d={FW} /><path className={R} d={HW} />
      <g clipPath="url(#hps-fw)">
        <g className={I} strokeWidth=".38" opacity=".75">{fwVeins.map(([x, y], k) => <path key={k} d={`M49 61Q${r2((49 + x) / 2)} ${r2((61 + y) / 2 - 3)} ${x} ${y}`} />)}</g>
        <path className={I} d="M11 52C13 40 22 33 36 32" strokeWidth=".3" strokeDasharray="1.2 1.2" opacity=".6" />
        <Hatch x={34} y={52} w={14} n={9} dy={1.4} seed={22} />
        <Stipple n={detail ? 40 : 90} seed={44} x={8} y={30} w={42} h={38} />
      </g>
      <g clipPath="url(#hps-hw)">
        <g className={I} strokeWidth=".38" opacity=".75">{hwVeins.map(([x, y], k) => <path key={k} d={`M49 70Q${r2((49 + x) / 2)} ${r2((70 + y) / 2)} ${x} ${y}`} />)}</g>
        <Hatch x={36} y={74} w={13} n={8} dy={1.5} seed={26} />
      </g>
      <path className={I} d={FW} strokeWidth="1" /><path className={I} d={HW} strokeWidth="1" />
      <circle className={I} cx="26" cy="50" r="8.6" strokeWidth=".4" strokeDasharray="1 1.1" />
      <circle className={I} cx="26" cy="50" r="7" /><circle className={B} cx="26" cy="50" r="4.4" /><circle className={I} cx="26" cy="50" r="4.4" strokeWidth=".5" /><circle className={F} cx="26" cy="50" r="1.8" /><circle fill="#fff" fillOpacity=".7" cx="24.8" cy="48.8" r=".7" />
      <circle className={I} cx="37" cy="93" r="3.4" strokeWidth=".6" /><circle className={F} cx="37" cy="93" r="1.2" />
    </g>
  );
  return (
    <g>
      <g className="hps-pen" fill="none">
        <path d="M50 8V124M8 66H92" /><circle cx="50" cy="66" r="44" /><path d="M10 14L90 118M90 14L10 118" strokeWidth=".25" /><path d="M6 124H94M6 122v4M28 122v4M50 122v4M72 122v4M94 122v4" strokeWidth=".35" />
      </g>
      {wing}
      <g transform="translate(100 0) scale(-1 1)">{wing}</g>
      <g className={I} strokeWidth=".4">{fur}</g>
      <ellipse className={F} cx="50" cy="56" rx="3.8" ry="6.6" opacity=".85" />
      <g className={F}>{Array.from({ length: 6 }, (_, k) => <ellipse key={k} cx="50" cy={65 + k * 4.4} rx={3.2 - k * 0.32} ry="2.3" opacity={0.9 - k * 0.04} />)}</g>
      <g stroke="var(--hps-paper)" strokeWidth=".35" opacity=".8">{Array.from({ length: 5 }, (_, k) => <path key={k} d={`M${r2(46.8 + k * 0.3)} ${r2(67 + k * 4.4)}H${r2(53.2 - k * 0.3)}`} />)}</g>
      <circle className={F} cx="50" cy="47.6" r="2.8" /><circle fill="#fff" fillOpacity=".55" cx="48.8" cy="46.8" r=".6" />
      <path className={I} d="M48.4 46C44 36 36 31 28 30M51.6 46C56 36 64 31 72 30" strokeWidth=".7" />
      <g className={I} fill="none">{feather(-1)}{feather(1)}</g>
      <path className={I} d="M44 118h12" strokeWidth=".4" />
      <text className="hps-hand" x="58" y="116" fontSize="4.6">wingspan 4.2 cm</text>
      <path className={I} d="M74 112Q80 100 72 92" strokeWidth=".4" /><text className="hps-hand" x="64" y="90" fontSize="4.2">eye spot, stippled</text>
      {detail && <g clipPath="url(#hps-fw)"><Stipple n={300} seed={12} x={8} y={28} w={42} h={42} /></g>}
      {detail && <g transform="translate(100 0) scale(-1 1)" clipPath="url(#hps-fw)"><Stipple n={300} seed={13} x={8} y={28} w={42} h={42} /></g>}
    </g>
  );
}

function Cat({ detail }: { detail?: boolean }) {
  return (
    <g>
      <path className={B} d="M6 106C6 98 94 98 94 106C94 116 6 116 6 106Z" /><path className={I} d="M6 106C6 98 94 98 94 106C94 116 6 116 6 106Z" strokeWidth=".7" />
      <ellipse className={O} cx="54" cy="88" rx="34" ry="19" /><ellipse className={I} cx="54" cy="88" rx="34" ry="19" />
      <path className={I} d="M84 98C98 98 98 76 82 74" strokeWidth="2.2" />
      <circle className={O} cx="30" cy="84" r="13" /><circle className={I} cx="30" cy="84" r="13" />
      <path className={I} d="M20 74L21 62L29 71M32 71L40 62L41 74" />
      <path className={I} d="M24 84C26 86 29 86 31 84M34 84C36 86 39 86 41 84M27 90C30 92 33 92 36 90" strokeWidth=".7" />
      <path className={I} d="M16 90L6 88M16 93L6 95M44 90L54 88M44 93L54 95" strokeWidth=".4" />
      <path className={I} d="M52 70C56 76 56 84 52 90M62 72C66 78 66 86 62 92M72 74C76 80 76 88 72 94" strokeWidth=".6" />
      <Hatch x={14} y={118} w={72} n={1} dy={2} seed={4} />
      {detail && <Stipple n={204} seed={15} x={22} y={70} w={64} h={38} />}
    </g>
  );
}

function Light({ detail }: { detail?: boolean }) {
  return (
    <g>
      <circle className={O} cx="22" cy="24" r="8" opacity=".7" />
      <path className={O} d="M52 34L100 18V50Z" opacity=".35" />
      <path className={I} d="M52 34L100 18M52 34L100 50" strokeWidth=".4" />
      <path className={I} d="M66 20l3-2 3 2M78 30l3-2 3 2" strokeWidth=".6" />
      <path className={R} d="M45 82L44 66H59L58 82ZM47 56L46 42H57L56 56Z" opacity=".8" />
      <path className={I} d="M42 108L46 42H58L62 108Z" /><path className={I} d="M44 66H60M44 82H61M46 56H58" strokeWidth=".5" />
      <rect className={I} x="44" y="32" width="14" height="10" /><path className={I} d="M42 32H60L51 24Z" /><circle className={F} cx="51" cy="37" r="2" />
      <path className={G} d="M20 110C30 100 44 104 52 108C66 104 80 100 88 110Z" /><path className={I} d="M20 110C30 100 44 104 52 108C66 104 80 100 88 110Z" />
      {[0, 1, 2, 3].map((k) => <path key={k} className={I} d={`M${6 + k * 4} ${114 + k * 4}q6-3 12 0t12 0t12 0t12 0t12 0t12 0`} strokeWidth=".6" opacity={0.9 - k * 0.15} />)}
      {detail && <Stipple n={180} seed={14} x={20} y={30} w={70} h={80} />}
    </g>
  );
}

function Mushroom({ detail }: { detail?: boolean }) {
  const rnd = rng(31);
  const grass = Array.from({ length: 26 }, (_, k) => { const x = 4 + k * 3.7, h = 6 + rnd() * 9; return <path key={k} d={`M${r2(x)} 120q${r2(rnd() * 3 - 1.5)} -${r2(h / 2)} ${r2(rnd() * 5 - 2.5)} -${r2(h)}`} />; });
  const cap = (x: number, y: number, w: number, h: number, cls: string, k: string) => (
    <g key={k}>
      <path className={cls} d={`M${x} ${y}C${x} ${y - h} ${x + w} ${y - h} ${x + w} ${y}Z`} /><path className={I} d={`M${x} ${y}C${x} ${y - h} ${x + w} ${y - h} ${x + w} ${y}Z`} />
      <path className={I} d={`M${x + 2} ${y + 1.4}H${x + w - 2}`} strokeWidth=".6" />
      <path className={I} d={`M${r2(x + w * 0.5 - 2)} ${y + 1.4}C${r2(x + w * 0.5 - 3)} ${y + 12} ${r2(x + w * 0.5 - 2)} ${y + 22} ${r2(x + w * 0.5 - 5)} 118M${r2(x + w * 0.5 + 2)} ${y + 1.4}C${r2(x + w * 0.5 + 3)} ${y + 12} ${r2(x + w * 0.5 + 2)} ${y + 22} ${r2(x + w * 0.5 + 5)} 118`} />
      <circle className={F} cx={r2(x + w * 0.35)} cy={r2(y - h * 0.5)} r="1.3" opacity=".8" /><circle className={F} cx={r2(x + w * 0.68)} cy={r2(y - h * 0.62)} r="1" opacity=".8" />
    </g>
  );
  return (
    <g>
      {cap(46, 64, 40, 28, R, 'a')}{cap(10, 82, 32, 22, O, 'b')}{cap(68, 94, 22, 14, B, 'c')}
      <g className={I} strokeWidth=".6">{grass}</g>
      {detail && <Stipple n={192} seed={16} x={10} y={36} w={78} h={80} />}
    </g>
  );
}

const PLATES: Record<PlateKind, (p: { detail?: boolean }) => ReactNode> = { fern: Fern, tram: Tram, teapot: Teapot, wren: Wren, moth: Moth, cat: Cat, light: Light, mushroom: Mushroom };

/** One drawing. `detail` adds the fine stipple you only notice under the loupe. */
export function Plate({ kind, detail, label }: { kind: PlateKind; detail?: boolean; label?: string }) {
  const C = PLATES[kind];
  return (
    <svg className="hps-plate" viewBox="0 0 100 130" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
      <g filter="url(#hps-wob)"><C detail={detail} /></g>
    </svg>
  );
}

/** the hand-wobble filter every plate references; render once per page */
export function PlateDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="hps-fw"><path d={FW} /></clipPath><clipPath id="hps-hw"><path d={HW} /></clipPath>
        <filter id="hps-wob" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="4" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" />
        </filter>
      </defs>
    </svg>
  );
}

export interface PageData { kind: PlateKind; title: string; note: string }
export const PAGES: PageData[] = [
  { kind: 'fern', title: 'Fern, north window', note: 'Ink first, then one wet green.' },
  { kind: 'tram', title: 'Number 28, wet morning', note: 'Sketched through a bus shelter.' },
  { kind: 'teapot', title: 'Teapot with lemon', note: 'The lemon moved twice.' },
  { kind: 'wren', title: 'Wren on the fence', note: 'Four seconds. Then gone.' },
  { kind: 'moth', title: 'Moth, found on the sill', note: 'Left wing drawn from memory.' },
  { kind: 'cat', title: 'Nap, mid-commission', note: 'A model who never charges.' },
  { kind: 'light', title: 'The light at Foz', note: 'Salt in the paint water.' },
  { kind: 'mushroom', title: 'Three after rain', note: 'Cap, gills, mud on the knee.' },
];
