'use client';
import { Mini } from './_shared';

export interface BentoBoardProps {
  /** Brand name; its first letter becomes the logo tile. */
  brand?: string;
  /** The big sentence in the first tile. */
  statement?: string;
  /** One headline number and what it counts. Leave out if you have no real figure. */
  metric?: { value: string; label: string };
  /** Swatches for the colour tile. Defaults to the site's own primary, signal, ink and surface. */
  colors?: string[];
  /** Name shown next to the type sample. */
  fontName?: string;
  /** Three or four words for the tone tile. */
  tone?: string[];
  quote?: { text: string; who: string };
  /** Words under the imagery tile. */
  caption?: string;
  className?: string;
}

const TOKENS = ['var(--primary, #c2410c)', 'var(--signal, #0f766e)', 'var(--ink, #15130e)', 'var(--surface, #f4f2ef)', 'var(--primary-wash, #f8e8e2)'];

/** A share-ready brand board in a bento grid: statement, a key number, logo, type sample, colours, an abstract picture drawn from the brand colours, tone words, a slice of UI and a quote. Reflows from four columns to one with its container, not the screen. */
export default function BentoBoard({ brand = 'Mova', statement = 'A bold visual system built around contrast, character and clear communication.', metric = { value: '39%', label: 'More engagement' }, colors = TOKENS, fontName = 'Aa Bb 123', tone = ['Bold', 'Warm', 'Direct', 'Human'], quote = { text: 'One system that works everywhere we show up.', who: 'Design lead' }, caption = 'Ideas that move people forward', className }: BentoBoardProps) {
  const initial = (brand.trim()[0] ?? 'M').toUpperCase();
  return (
    <section className={`ui-bento-board${className ? ' ' + className : ''}`} aria-label={`${brand} brand board`}><div className="ui-bento-board-grid">
      <article className="ui-bento-board-t is-statement"><small>Our approach</small><p>{statement}</p></article>
      <article className="ui-bento-board-t is-metric"><small>Key metric</small><b>{metric.value}</b><span>{metric.label}</span></article>
      <article className="ui-bento-board-t is-art" aria-label="Brand imagery">
        <svg viewBox="0 0 200 260" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <rect width="200" height="260" fill={colors[0]} />
          <circle cx="150" cy="70" r="62" fill={colors[1]} />
          <circle cx="60" cy="150" r="48" fill={colors[4] ?? colors[3]} opacity=".9" />
          <path d="M-10 260 L70 120 L130 200 L170 140 L220 260Z" fill={colors[2]} />
          <circle cx="100" cy="132" r="22" fill={colors[3]} />
        </svg>
        <span>{caption}</span>
      </article>
      <article className="ui-bento-board-t is-logo"><small>Logo</small><div aria-hidden="true">{initial}</div><strong>{brand}</strong></article>
      <article className="ui-bento-board-t is-type"><small>Typography</small><p aria-label={`Type sample: ${fontName}`}>{fontName}</p><span>Regular · Medium · Bold</span></article>
      <article className="ui-bento-board-t is-colors"><small>Colour</small><ul aria-label="Brand colours">{colors.map((c, i) => <li key={i} style={{ background: c }} title={c} />)}</ul></article>
      <article className="ui-bento-board-t is-tone"><small>Tone</small><ul>{tone.map((t) => <li key={t}>{t}</li>)}</ul></article>
      <article className="ui-bento-board-t is-system"><small>One system, everywhere</small><div aria-hidden="true"><i /><span>Welcome back</span><em>Continue</em></div></article>
      <article className="ui-bento-board-t is-quote"><blockquote>“{quote.text}”<footer>{quote.who}</footer></blockquote></article>
    </div></section>
  );
}

export function Demo() {
  return <Mini w={760} h={150}><div style={{ padding: 16, width: 760, background: 'var(--surface, #f4f2ef)' }}><BentoBoard /></div></Mini>;
}
