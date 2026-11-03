'use client';
/*
 * Adapted from BoardUI (MIT), Copyright (c) 2026 Mertcan Dundar Esmergul (BoardUI) (free tier). See THIRD_PARTY_NOTICES.md.
 * What changed from upstream: recharts is replaced by an SVG chart (_bui-chart.tsx), the count-up hook is SSR safe and stops under reduced motion,
 * and the chart is keyboard operable (arrow keys read each month) with a screen-reader table. Upstream: dashboard/revenue-chart-card.tsx.
 */
import { YearChartCard, type YearPoint } from './_bui-chart';

export type RevenuePoint = YearPoint;
/** Twelve months of the demo year (they add up to the stat cards' total revenue). */
export const REVENUE_DATA: RevenuePoint[] = [
  { label: 'Jan', current: 9840, previous: 8210 }, { label: 'Feb', current: 10120, previous: 8460 }, { label: 'Mar', current: 11380, previous: 9950 },
  { label: 'Apr', current: 10960, previous: 10240 }, { label: 'May', current: 12210, previous: 10880 }, { label: 'Jun', current: 12740, previous: 11020 },
  { label: 'Jul', current: 13980, previous: 11760 }, { label: 'Aug', current: 13120, previous: 12030 }, { label: 'Sep', current: 14210, previous: 12190 },
  { label: 'Oct', current: 14690, previous: 12480 }, { label: 'Nov', current: 14360, previous: 12160 }, { label: 'Dec', current: 14704, previous: 11924 },
];

export interface RevenueChartCardProps {
  /** One point per month; defaults to the demo year. */
  data?: RevenuePoint[];
  /** Headline label when no month is read. */
  title?: string;
  className?: string;
}

export default function RevenueChartCard({ data = REVENUE_DATA, title = 'Revenue', className }: RevenueChartCardProps) {
  return <YearChartCard data={data} title={title} kind="area" tone="revenue" money className={className} />;
}

export function Demo() {
  return <div className="bui-demo"><RevenueChartCard /></div>;
}
