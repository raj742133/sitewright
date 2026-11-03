'use client';
/*
 * Layout and component set adapted from the BoardUI free tier (MIT), Copyright (c) 2026 Mertcan Dundar Esmergul (BoardUI). See THIRD_PARTY_NOTICES.md.
 * This screen is composed for Sitewright from the ported pieces (sidebar, stat cards, revenue and orders chart cards, segmented control, notification
 * center, data table); the screen itself, its six views, copy and data are new. It copies nothing from BoardUI's paid templates.
 */
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import DashboardSidebar, { type SidebarItem } from '../ui/DashboardSidebar';
import StatCards, { type Stat } from '../ui/StatCards';
import RevenueChartCard, { REVENUE_DATA } from '../ui/RevenueChartCard';
import OrdersChartCard, { ORDERS_DATA } from '../ui/OrdersChartCard';
import SegmentedControl from '../ui/SegmentedControl';
import NotificationCenter, { SAMPLE_NOTIFICATIONS, unreadIn } from '../ui/NotificationCenter';
import DataTable from '../ui/DataTable';
import { Ico, cx, useSize } from '../ui/_bui';
import { Popover } from '../ui/_bui-pop';
import { Preview } from './_dash';

type View = 'overview' | 'customers' | 'reports' | 'notifications' | 'support' | 'settings';
type Period = 'weekly' | 'monthly' | 'yearly';
const TITLES: Record<View, [string, string]> = {
  overview: ['Overview', 'How the shop is doing at a glance'],
  customers: ['Customers', 'Everyone who has bought from you'],
  reports: ['Reports', 'This year against last year'],
  notifications: ['Notifications', 'Mentions, system messages and activity'],
  support: ['Support', 'Questions about the dashboard'],
  settings: ['Settings', 'Workspace and notification preferences'],
};

/* Figures per period: the same four KPIs, scaled so the footer cards read believably in each. */
const STATS: Record<Period, Stat[]> = {
  weekly: [
    { icon: 'coins', label: 'Total revenue', value: '$34,280.10', delta: '4.2%', deltaTone: 'good', tint: 'brand', caption: 'From last week', hint: 'Gross revenue across every channel this week, before refunds. The change is against the previous seven days.' },
    { icon: 'basket', label: 'Total orders', value: '5,812', delta: '2.9%', deltaTone: 'good', tint: 'orange', caption: 'From last week', hint: 'Checkouts completed this week, repeat purchases included.' },
    { icon: 'users', label: 'New customers', value: '864', delta: '1.1%', deltaTone: 'bad', tint: 'purple', caption: 'From last week', hint: 'People who bought for the first time this week. Down is bad here, so the change reads in red.' },
    { icon: 'refund', label: 'Refunds', value: '$912.40', delta: '0.8%', deltaTone: 'good', tint: 'pink', caption: 'From last week', hint: 'Value of orders refunded this week. Down is good here, so the change reads in green when refunds fall.' },
  ],
  monthly: [
    { icon: 'coins', label: 'Total revenue', value: '$152,313.92', delta: '16%', deltaTone: 'good', tint: 'brand', hint: 'Gross revenue across every channel this month, before refunds. The change is against the same days last month.' },
    { icon: 'basket', label: 'Total orders', value: '25,162', delta: '20%', deltaTone: 'good', tint: 'orange', hint: 'Checkouts completed this month, repeat purchases included. The change is against the same days last month.' },
    { icon: 'users', label: 'New customers', value: '3,847', delta: '8.1%', deltaTone: 'good', tint: 'purple', hint: 'People who bought for the first time this month. The change is against the same days last month.' },
    { icon: 'refund', label: 'Refunds', value: '$4,209.44', delta: '2.4%', deltaTone: 'bad', tint: 'pink', hint: 'Value of orders refunded this month. Down is good here, so the change reads in red when refunds rise.' },
  ],
  yearly: [
    { icon: 'coins', label: 'Total revenue', value: '$1.62M', delta: '23%', deltaTone: 'good', tint: 'brand', caption: 'From last year', hint: 'Gross revenue across every channel this year, before refunds.' },
    { icon: 'basket', label: 'Total orders', value: '271,940', delta: '19%', deltaTone: 'good', tint: 'orange', caption: 'From last year', hint: 'Checkouts completed this year, repeat purchases included.' },
    { icon: 'users', label: 'New customers', value: '41,206', delta: '12%', deltaTone: 'good', tint: 'purple', caption: 'From last year', hint: 'People who bought for the first time this year.' },
    { icon: 'refund', label: 'Refunds', value: '$48,330.12', delta: '5.6%', deltaTone: 'bad', tint: 'pink', caption: 'From last year', hint: 'Value of orders refunded this year. Down is good here, so the change reads in red when refunds rise.' },
  ],
};
const PLAIN: Stat[] = [
  { icon: 'users', label: 'Customers', value: '14,592', delta: '+5.3%', deltaTone: 'good' }, { icon: 'box', label: 'Units sold', value: '385', delta: '-2.1%', deltaTone: 'bad' },
  { icon: 'basket', label: 'Open orders', value: '1,394', delta: '0.00%', deltaTone: 'neutral' }, { icon: 'chat', label: 'Support tickets', value: '708', delta: '+12.8%', deltaTone: 'good' },
];
const FAQ: Array<[string, string]> = [
  ['How are the percentages worked out?', 'Each change compares the period with the same length of time just before it; the chart cards compare every month with the same month a year earlier.'],
  ['Can I export the numbers?', 'Yes. Reports has an Export CSV button that downloads the twelve months shown in both charts.'],
  ['Why is a notification still marked unread?', 'An item is read when you press one of its buttons or choose Mark all read.'],
];

function csv(): string {
  const rows = [['Month', 'Revenue this year', 'Revenue last year', 'Orders this year', 'Orders last year']];
  REVENUE_DATA.forEach((r, i) => rows.push([r.label, String(r.current), String(r.previous), String(ORDERS_DATA[i]!.current), String(ORDERS_DATA[i]!.previous)]));
  return rows.map((r) => r.join(',')).join('\n');
}

export default function BoardUIOverview({ brand = 'Northwind' }: { brand?: string }) {
  const [view, setView] = useState<View>('overview'); const [period, setPeriod] = useState<Period>('monthly');
  const [col, setCol] = useState(false); const [read, setRead] = useState<string[]>([]); const [toast, setToast] = useState('');
  const [root, w] = useSize<HTMLDivElement>(1200, 700);
  const narrow = w < 900; const small = useRef(false);
  const mainRef = useRef<HTMLDivElement>(null); const hRef = useRef<HTMLHeadingElement>(null); const first = useRef(true);
  const unread = unreadIn(SAMPLE_NOTIFICATIONS, read);
  useEffect(() => { if (narrow !== small.current) { small.current = narrow; if (narrow) setCol(true); } }, [narrow]);
  useEffect(() => { const v = new URLSearchParams(window.location.search).get('view') as View | null; if (v && TITLES[v]) { first.current = true; setView(v); } }, []);
  useEffect(() => { if (first.current) { first.current = false; return; } mainRef.current?.scrollTo(0, 0); hRef.current?.focus({ preventScroll: true }); }, [view]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3200); return () => clearTimeout(t); }, [toast]);

  const nav: SidebarItem[] = useMemo(() => [
    { key: 'overview', label: 'Overview', icon: 'home' }, { key: 'customers', label: 'Customers', icon: 'users' }, { key: 'reports', label: 'Reports', icon: 'chart' },
    { key: 'notifications', label: 'Notifications', icon: 'bell', badge: unread || undefined },
  ], [unread]);
  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob([csv()], { type: 'text/csv' })); const a = document.createElement('a'); a.href = url; a.download = 'northwind-monthly.csv'; a.click(); URL.revokeObjectURL(url); setToast('Exported 12 months to CSV');
  };
  const [t, sub] = TITLES[view];
  const bell = (
    <Popover placement="bottom-end" width={430} label="Notifications" triggerLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'} triggerClassName="bui-iconbtn tbu-bell" className="is-flush"
      trigger={() => (<><Ico name="bell" size={18} />{unread > 0 && <i className="tbu-bell-n" aria-hidden="true">{unread}</i>}</>)}>
      {() => <NotificationCenter read={read} onReadChange={setRead} className="tbu-nc" onAction={(id, a) => setToast(`${a} on ${SAMPLE_NOTIFICATIONS.find((n) => n.id === id)?.title ?? id}`)} />}
    </Popover>
  );

  return (
    <div ref={root} className="tbu bui">
      <div className="tbu-frame">
        <DashboardSidebar items={nav} selected={view} onSelect={(k) => setView(k as View)} collapsed={col} onCollapsedChange={setCol}
          secondary={[{ key: 'support', label: 'Support', icon: 'headset' }, { key: 'settings', label: 'Settings', icon: 'sliders' }]}
          team={{ name: brand, email: `hello@${brand.toLowerCase()}.example`, version: 'v2.4' }} user="Dana Ortiz" users={[{ name: 'Dana Ortiz', selected: true }, { name: 'Sam Reyes' }, { name: 'Priya Nair' }]}
          onAction={(a) => setToast(a === 'signout' ? 'Signed out (demo)' : `Chose ${a.replace(/[:-]/g, ' ')}`)} />
        <div ref={mainRef} className="tbu-main" role="region" aria-label={`${t} view`} tabIndex={-1}>
          <header className="tbu-top">
            <div className="tbu-head"><h1 ref={hRef} tabIndex={-1}>{t}</h1><p>{sub}</p></div>
            <div className="tbu-tools">
              {view === 'overview' && <SegmentedControl label="Reporting period" value={period} onChange={setPeriod} options={[{ id: 'weekly', label: 'Weekly' }, { id: 'monthly', label: 'Monthly' }, { id: 'yearly', label: 'Yearly' }]} />}
              {view === 'reports' && <button type="button" className="bui-btn is-secondary" onClick={exportCsv}><Ico name="download" size={16} />Export CSV</button>}
              {view !== 'notifications' && bell}
            </div>
          </header>

          {view === 'overview' && (
            <>
              <StatCards variant="footer" stats={STATS[period]} />
              <div className="tbu-two"><RevenueChartCard /><OrdersChartCard /></div>
              <section className="tbu-sec" aria-labelledby="tbu-rc">
                <div className="tbu-sech"><h2 id="tbu-rc">Recent customers</h2><button type="button" className="bui-link" onClick={() => setView('customers')}>View all customers</button></div>
                <DataTable pageSize={5} showDensity={false} />
              </section>
            </>
          )}
          {view === 'customers' && <DataTable pageSize={8} />}
          {view === 'reports' && (
            <>
              <StatCards variant="plain" stats={PLAIN} />
              <RevenueChartCard /><OrdersChartCard />
            </>
          )}
          {view === 'notifications' && <div className="tbu-ncw"><NotificationCenter read={read} onReadChange={setRead} className="is-wide" onAction={(id, a) => setToast(`${a} on ${SAMPLE_NOTIFICATIONS.find((n) => n.id === id)?.title ?? id}`)} /></div>}
          {view === 'support' && <SupportView onSent={setToast} />}
          {view === 'settings' && <SettingsView onSaved={setToast} brand={brand} />}
        </div>
      </div>
      <p className={cx('tbu-toast', toast && 'is-on')} role="status" aria-live="polite">{toast}</p>
    </div>
  );
}

function SupportView({ onSent }: { onSent: (m: string) => void }) {
  const [err, setErr] = useState('');
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const f = e.currentTarget; const msg = String(new FormData(f).get('message') ?? '').trim();
    if (msg.length < 10) { setErr('Tell us a little more, at least 10 characters.'); return; }
    setErr(''); f.reset(); onSent('Message sent. We reply within one working day.');
  };
  return (
    <div className="tbu-two is-top">
      <section className="tbu-card" aria-labelledby="tbu-sf">
        <h2 id="tbu-sf">Contact support</h2>
        <form className="tbu-form" noValidate onSubmit={submit}>
          <label>Topic<select name="topic" className="bui-select" defaultValue="data"><option value="data">Numbers look wrong</option><option value="export">Exporting data</option><option value="account">Account and billing</option><option value="other">Something else</option></select></label>
          <label>Message<textarea name="message" rows={5} aria-invalid={err ? true : undefined} aria-describedby={err ? 'tbu-sf-e' : undefined} placeholder="What happened, and what did you expect?" /></label>
          {err && <p id="tbu-sf-e" className="tbu-err" role="alert">{err}</p>}
          <button type="submit" className="bui-btn is-primary">Send message</button>
        </form>
      </section>
      <section className="tbu-card" aria-labelledby="tbu-faq">
        <h2 id="tbu-faq">Common questions</h2>
        <div className="tbu-faq">{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
      </section>
    </div>
  );
}

function SettingsView({ onSaved, brand }: { onSaved: (m: string) => void; brand: string }) {
  const [name, setName] = useState(`${brand} Shop`); const [digest, setDigest] = useState('weekly'); const [opts, setOpts] = useState({ mentions: true, system: true, activity: false });
  const [err, setErr] = useState('');
  const save = (e: FormEvent) => { e.preventDefault(); if (!name.trim()) { setErr('Give the workspace a name.'); return; } setErr(''); onSaved('Settings saved'); };
  return (
    <form className="tbu-card tbu-set" noValidate onSubmit={save} aria-label="Workspace settings">
      <label>Workspace name<input value={name} onChange={(e) => setName(e.target.value)} aria-invalid={err ? true : undefined} aria-describedby={err ? 'tbu-set-e' : undefined} />{err && <span id="tbu-set-e" className="tbu-err" role="alert">{err}</span>}</label>
      <div role="group" aria-labelledby="tbu-dg" className="tbu-grp"><span id="tbu-dg">Email digest</span><SegmentedControl label="Email digest" value={digest} onChange={setDigest} options={[{ id: 'off', label: 'Off' }, { id: 'daily', label: 'Daily' }, { id: 'weekly', label: 'Weekly' }]} /></div>
      <fieldset className="tbu-grp"><legend>Tell me about</legend>
        {([['mentions', 'Mentions of me'], ['system', 'System messages'], ['activity', 'Project activity']] as const).map(([k, l]) => (
          <label key={k} className="tbu-chk"><input type="checkbox" className="bui-check" checked={opts[k]} onChange={(e) => setOpts({ ...opts, [k]: e.target.checked })} />{l}</label>
        ))}
      </fieldset>
      <div><button type="submit" className="bui-btn is-primary">Save changes</button></div>
    </form>
  );
}

export function Demo() { return <Preview w={1280} h={150}><BoardUIOverview /></Preview>; }
