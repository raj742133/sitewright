'use client';
/*
 * Adapted from BoardUI (MIT), Copyright (c) 2026 Mertcan Dundar Esmergul (BoardUI) (free tier). See THIRD_PARTY_NOTICES.md.
 * What changed from upstream: Tailwind and remixicon are replaced by plain CSS and inline icons; the gradient icon tile follows the host's --primary by default;
 * the info tooltip is a small accessible hint (hover, focus, click, Escape). Upstream: dashboard/stat-cards.tsx.
 */
import { Chip, Ico, cx, type BuiIcon, type ChipColor } from './_bui';
import { Hint } from './_bui-pop';

export type StatCardsVariant = 'plain' | 'footer';
export type StatTint = 'brand' | 'blue' | 'orange' | 'purple' | 'pink' | 'sky' | 'emerald';
export type DeltaTone = 'good' | 'bad' | 'neutral';
export interface Stat {
  icon: BuiIcon;
  label: string;
  value: string;
  delta: string;
  /** good = green, bad = red, neutral = grey. */
  deltaTone: DeltaTone;
  /** Footer variant: tint of the icon tile (defaults to the brand colour). */
  tint?: StatTint;
  /** Footer variant: the comparison text in the band ("From last month"). */
  caption?: string;
  /** Footer variant: explains the figure in a small info tooltip. */
  hint?: string;
}

const PLAIN: Stat[] = [
  { icon: 'users', label: 'Customers', value: '14,592', delta: '+5.3%', deltaTone: 'good' },
  { icon: 'box', label: 'Units sold', value: '385', delta: '-2.1%', deltaTone: 'bad' },
  { icon: 'basket', label: 'Orders', value: '1,394', delta: '0.00%', deltaTone: 'neutral' },
  { icon: 'chat', label: 'Support tickets', value: '708', delta: '+12.8%', deltaTone: 'good' },
];
const FOOTER: Stat[] = [
  { icon: 'coins', label: 'Total revenue', value: '$152,313.92', delta: '16%', deltaTone: 'good', tint: 'brand', hint: 'Gross revenue across every channel this month, before refunds. The change is against the same days last month.' },
  { icon: 'basket', label: 'Total orders', value: '25,162', delta: '20%', deltaTone: 'good', tint: 'orange', hint: 'Checkouts completed this month, repeat purchases included. The change is against the same days last month.' },
  { icon: 'users', label: 'New customers', value: '3,847', delta: '8.1%', deltaTone: 'good', tint: 'purple', hint: 'People who bought for the first time this month. The change is against the same days last month.' },
  { icon: 'refund', label: 'Refunds', value: '$4,209.44', delta: '2.4%', deltaTone: 'bad', tint: 'pink', hint: 'Value of orders refunded this month. Down is good here, so the change reads in red when refunds rise.' },
];
const CHIP: Record<DeltaTone, ChipColor> = { good: 'lime', bad: 'rose', neutral: 'neutral' };
const DELTA_ICON: Record<DeltaTone, BuiIcon> = { good: 'up-circle', bad: 'down-circle', neutral: 'flat-circle' };
const WORD: Record<DeltaTone, string> = { good: 'Improved', bad: 'Worsened', neutral: 'No change' };

function Plain({ s }: { s: Stat }) {
  return (
    <section className="bui-stat is-plain" aria-label={s.label}>
      <span className="bui-stat-tile"><Ico name={s.icon} size={20} /></span>
      <div className="bui-stat-b">
        <p className="bui-stat-l">{s.label}</p>
        <div className="bui-stat-r"><p className="bui-stat-v">{s.value}</p><Chip variant="bold" color={CHIP[s.deltaTone]}><span className="bui-sr">{WORD[s.deltaTone]}: </span>{s.delta}</Chip></div>
      </div>
    </section>
  );
}
function Footer({ s }: { s: Stat }) {
  return (
    <section className="bui-stat is-footer" aria-label={s.label}>
      <div className="bui-stat-top">
        <span className={cx('bui-stat-tile is-grad', `t-${s.tint ?? 'brand'}`)}><Ico name={s.icon} size={20} /></span>
        {s.hint && <Hint label={s.label}>{s.hint}</Hint>}
      </div>
      <div className="bui-stat-mid">
        <p className="bui-stat-l">{s.label}</p>
        <p className="bui-stat-v is-display">{s.value}</p>
      </div>
      <div className="bui-stat-band">
        <p>{s.caption ?? 'From last month'}</p>
        <span className={cx('bui-dpill', `d-${s.deltaTone}`)}><Ico name={DELTA_ICON[s.deltaTone]} size={16} /><span>{s.delta}</span><span className="bui-sr"> {WORD[s.deltaTone]}</span></span>
      </div>
    </section>
  );
}

export interface StatCardsProps {
  variant?: StatCardsVariant;
  /** KPI cards to show; defaults to demo metrics for the variant. */
  stats?: Stat[];
  /** How many of them to show (from the start of the list). */
  count?: number;
  /** Columns at the widest container width: 4 (default), 2, or 1 for a single column. The grid follows its own container, not the screen. */
  columns?: 1 | 2 | 4;
  className?: string;
}

export default function StatCards({ variant = 'plain', stats, count, columns = 4, className }: StatCardsProps) {
  const items = (stats ?? (variant === 'footer' ? FOOTER : PLAIN)).slice(0, count);
  return (
    <div className={cx('bui', 'bui-stats-w', className)}>
      <div className={cx('bui-stats', `is-${variant}`, `cols-${columns}`)}>
        {items.map((s) => (variant === 'footer' ? <Footer key={s.label} s={s} /> : <Plain key={s.label} s={s} />))}
      </div>
    </div>
  );
}

export function Demo() {
  return (
    <div className="bui-demo is-stack">
      <StatCards variant="footer" count={2} columns={2} />
      <StatCards variant="plain" />
    </div>
  );
}
