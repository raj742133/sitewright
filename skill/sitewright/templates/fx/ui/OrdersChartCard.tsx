'use client';
/*
 * Adapted from BoardUI (MIT), Copyright (c) 2026 Mertcan Dundar Esmergul (BoardUI) (free tier). See THIRD_PARTY_NOTICES.md.
 * What changed from upstream: recharts is replaced by an SVG chart (_bui-chart.tsx); bars draw in with CSS only (none under reduced motion), arrow keys read each
 * month and a screen-reader table carries the numbers. Upstream: dashboard/orders-chart-card.tsx.
 */
import { YearChartCard, type YearPoint } from './_bui-chart';

export type OrdersPoint = YearPoint;
/** Twelve months of the demo year. */
export const ORDERS_DATA: OrdersPoint[] = [
  { label: 'Jan', current: 1680, previous: 1510 }, { label: 'Feb', current: 1740, previous: 1480 }, { label: 'Mar', current: 1920, previous: 1650 },
  { label: 'Apr', current: 1850, previous: 1620 }, { label: 'May', current: 2040, previous: 1710 }, { label: 'Jun', current: 2110, previous: 1760 },
  { label: 'Jul', current: 2290, previous: 1840 }, { label: 'Aug', current: 2180, previous: 1890 }, { label: 'Sep', current: 2320, previous: 1930 },
  { label: 'Oct', current: 2410, previous: 1970 }, { label: 'Nov', current: 2280, previous: 1810 }, { label: 'Dec', current: 2342, previous: 1798 },
];

export interface OrdersChartCardProps {
  /** One point per month; defaults to the demo year. */
  data?: OrdersPoint[];
  title?: string;
  className?: string;
}

export default function OrdersChartCard({ data = ORDERS_DATA, title = 'Orders', className }: OrdersChartCardProps) {
  return <YearChartCard data={data} title={title} kind="bars" tone="orders" money={false} className={className} />;
}

export function Demo() {
  return <div className="bui-demo"><OrdersChartCard /></div>;
}
