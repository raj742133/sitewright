'use client';
/*
 * Adapted from BoardUI (MIT), Copyright (c) 2026 Mertcan Dundar Esmergul (BoardUI) (free tier). See THIRD_PARTY_NOTICES.md.
 * What changed from upstream: Tailwind / remixicon / react-aria are plain CSS, inline icons and the small popover in _bui-pop.tsx; the settings modal,
 * theme toggle, mobile drawer and the BoardUI brand artwork are not included (the host owns those); the nav is data you pass in; the quick-search
 * shortcut is "/" (Ctrl+L belongs to the browser); labels fade and shrink as the rail collapses exactly as upstream, but not under reduced motion.
 * Upstream: dashboard/dashboard-sidebar.tsx, dashboard-team-menu.tsx, dashboard-user-menu.tsx.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Avatar, Badge, Ico, Kbd, cx, useControlled, type BuiIcon } from './_bui';
import { Popover } from './_bui-pop';

export interface SidebarItem { key: string; label: string; icon: BuiIcon; href?: string; badge?: string | number }
export interface SidebarUser { name: string; selected?: boolean }
export interface SidebarTeam { name: string; email: string; version?: string }
export interface DashboardSidebarProps {
  items?: SidebarItem[];
  /** Rows pinned above the team card (Support, Settings). */
  secondary?: SidebarItem[];
  selected?: string;
  /** Called when a row without an href is chosen. */
  onSelect?: (key: string) => void;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (c: boolean) => void;
  team?: SidebarTeam;
  /** The signed-in person and the other people with access (the account menu). */
  user?: string;
  users?: SidebarUser[];
  /** Menu choices (team menu rows, Add user, Manage) arrive here by id. */
  onAction?: (id: string) => void;
  search?: boolean;
  className?: string;
}

export const SIDEBAR_NAV: SidebarItem[] = [
  { key: 'home', label: 'Home', icon: 'home', badge: 152 }, { key: 'board', label: 'Project board', icon: 'kanban' }, { key: 'marketing', label: 'Marketing', icon: 'megaphone' },
  { key: 'calendar', label: 'Calendar', icon: 'calendar' }, { key: 'finance', label: 'Finance', icon: 'bank' }, { key: 'customers', label: 'Customers', icon: 'users' },
];
const SECONDARY: SidebarItem[] = [{ key: 'support', label: 'Support', icon: 'headset' }, { key: 'settings', label: 'Settings', icon: 'sliders' }];
const USERS: SidebarUser[] = [{ name: 'Mertcan Esmergul', selected: true }, { name: 'Steven Raule' }, { name: 'Lauren Proso' }];
const TEAM: SidebarTeam = { name: 'Board team', email: 'hi@example.com', version: 'v1.0' };
const TEAM_GROUPS: Array<{ id: string; label?: string; rows: Array<{ id: string; label: string; icon: BuiIcon; badge?: string }> }> = [
  { id: 'workspace', rows: [{ id: 'team-profile', label: 'View team profile', icon: 'bank' }, { id: 'folders', label: 'Folders', icon: 'folder' }, { id: 'messages', label: 'Messages', icon: 'chat', badge: '94' }, { id: 'people', label: 'People', icon: 'users' }] },
  { id: 'company', label: 'Company', rows: [{ id: 'billing', label: 'Billing', icon: 'card' }, { id: 'company', label: 'Company details', icon: 'school' }, { id: 'integrations', label: 'Integrations', icon: 'box' }] },
  { id: 'personal', label: 'Personal', rows: [{ id: 'notifications', label: 'Notifications', icon: 'bell' }, { id: 'account', label: 'Account details', icon: 'user' }, { id: 'signout', label: 'Sign out', icon: 'logout' }] },
];

function Fade({ collapsed, children }: { collapsed: boolean; children: ReactNode }) { return <span className={cx('bui-sb-fade', collapsed && 'is-off')} aria-hidden={collapsed || undefined}>{children}</span>; }

function Row({ item, selected, collapsed, onSelect }: { item: SidebarItem; selected: boolean; collapsed: boolean; onSelect?: (k: string) => void }) {
  const inner = (
    <>
      <span className="bui-sb-rl"><Ico name={item.icon} size={20} className="bui-sb-ic" /><Fade collapsed={collapsed}><span className="bui-sb-t">{item.label}</span></Fade></span>
      {item.badge !== undefined && <Fade collapsed={collapsed}><Badge color={selected ? 'primary' : 'neutral'}>{item.badge}</Badge></Fade>}
    </>
  );
  const common = { className: cx('bui-sb-row', selected && 'is-on'), 'aria-current': selected ? ('page' as const) : undefined, 'aria-label': item.badge !== undefined ? `${item.label}, ${item.badge}` : item.label, title: collapsed ? item.label : undefined };
  return item.href ? <a href={item.href} {...common}>{inner}</a> : <button type="button" {...common} onClick={() => onSelect?.(item.key)}>{inner}</button>;
}

export default function DashboardSidebar({ items = SIDEBAR_NAV, secondary = SECONDARY, selected = items[0]?.key ?? '', onSelect, collapsed, defaultCollapsed = false, onCollapsedChange, team = TEAM, user = USERS[0]!.name, users = USERS, onAction, search = true, className }: DashboardSidebarProps) {
  const [col, setCol] = useControlled<boolean>(collapsed, defaultCollapsed, onCollapsedChange);
  const [searching, setSearching] = useState(false); const [q, setQ] = useState('');
  const trig = useRef<HTMLButtonElement>(null); const field = useRef<HTMLDivElement>(null); const inp = useRef<HTMLInputElement>(null);
  const query = q.trim().toLowerCase(); const match = (l: string) => l.toLowerCase().includes(query);
  const shown = items.filter((i) => match(i.label)); const shown2 = secondary.filter((i) => match(i.label));
  const start = () => { if (col) setCol(false); setSearching(true); };
  const stop = (restore: boolean) => { setQ(''); setSearching(false); if (restore) requestAnimationFrame(() => trig.current?.focus()); };
  useEffect(() => { if (searching) inp.current?.focus(); }, [searching]);
  useEffect(() => {
    if (!searching) return;
    const f = (e: PointerEvent) => { if (!field.current?.contains(e.target as Node)) stop(false); };
    document.addEventListener('pointerdown', f); return () => document.removeEventListener('pointerdown', f);
  }, [searching]);
  useEffect(() => {
    if (!search) return;
    const f = (e: KeyboardEvent) => { const t = e.target as HTMLElement | null; if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || (t && (/^(input|textarea|select)$/i.test(t.tagName) || t.isContentEditable))) return; e.preventDefault(); start(); };
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f);
  });
  const act = (id: string) => onAction?.(id);
  return (
    <aside className={cx('bui', 'bui-sb', col && 'is-col', className)} aria-label="Sidebar">
      <div className="bui-sb-top">
        <div className="bui-sb-head">
          <div className="bui-sb-who">
            <Popover placement="right-top" label="Account menu" triggerClassName="bui-sb-user" triggerLabel={user}
              trigger={() => (<><Avatar name={user} size={36} /><Fade collapsed={col}><span className="bui-sb-un">{user}<Ico name="updown" size={16} className="bui-sb-ud" /></span></Fade></>)}>
              {(close) => (
                <div className="bui-pm">
                  <p className="bui-pm-h">Users with access</p>
                  <div className="bui-pm-l">{users.map((u) => <button key={u.name} type="button" className="bui-mi" aria-current={u.selected ? 'true' : undefined} onClick={() => { act(`user:${u.name}`); close(); }}><Avatar name={u.name} size={20} /><span>{u.name}</span></button>)}</div>
                  <hr className="bui-pm-hr" />
                  <div className="bui-pm-ab">
                    <button type="button" className="bui-btn is-secondary is-sm" onClick={() => { act('add-user'); close(); }}><Ico name="plus" size={16} />Add user</button>
                    <button type="button" className="bui-btn is-secondary is-sm" onClick={() => { act('manage'); close(); }}><Ico name="sliders" size={16} />Manage</button>
                  </div>
                </div>
              )}
            </Popover>
          </div>
          <button type="button" className="bui-sb-toggle" aria-label={col ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!col} onClick={() => { if (!col) stop(false); setCol(!col); }}><Ico name="sidebar" size={20} /></button>
        </div>
        {search && (searching && !col ? (
          <div ref={field} className="bui-sb-find is-on">
            <Ico name="search" size={20} />
            <input ref={inp} type="search" aria-label="Filter navigation" placeholder="Search navigation…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); stop(true); } }} />
            <button type="button" className="bui-sb-x" aria-label="Clear navigation search" onClick={() => stop(true)}><Ico name="close" size={14} /></button>
          </div>
        ) : (
          <button ref={trig} type="button" className="bui-sb-find" aria-label="Quick search" aria-keyshortcuts="/" title={col ? 'Quick search' : undefined} onClick={start}>
            <span className="bui-sb-rl"><Ico name="search" size={20} /><Fade collapsed={col}><span className="bui-sb-t">Quick search</span></Fade></span>
            <Fade collapsed={col}><Kbd>/</Kbd></Fade>
          </button>
        ))}
        <nav className="bui-sb-nav" aria-label="Primary">
          {shown.map((i) => <Row key={i.key} item={i} selected={selected === i.key} collapsed={col} onSelect={onSelect} />)}
          {shown.length === 0 && shown2.length === 0 && !col && <p className="bui-sb-none" role="status">No results</p>}
        </nav>
      </div>
      <div className="bui-sb-bot">
        <nav className="bui-sb-nav" aria-label="Secondary">{shown2.map((i) => <Row key={i.key} item={i} selected={selected === i.key} collapsed={col} onSelect={onSelect} />)}</nav>
        <Popover placement="right-bottom" label={`${team.name} menu`} triggerClassName="bui-sb-team" triggerLabel={team.name}
          trigger={(open) => (<>
            <Avatar name={team.name} size={36} />
            <Fade collapsed={col}><span className="bui-sb-tn"><b>{team.name}</b><small>{team.email}</small></span></Fade>
            <Fade collapsed={col}><span className="bui-sb-cv"><Ico name="down" size={14} className={cx(open && 'is-open')} /></span></Fade>
          </>)}>
          {(close) => (
            <div className="bui-pm">
              <div className="bui-pm-tm"><Avatar name={team.name} size={36} /><div><b>{team.name}</b><small>{team.email}</small></div></div>
              {TEAM_GROUPS.map((g, gi) => (
                <div key={g.id} className="bui-pm-g" role="group" aria-label={g.label ?? 'Workspace'}>
                  {gi > 0 && <hr className="bui-pm-hr" />}
                  {g.label && <p className="bui-pm-h">{g.label}</p>}
                  {g.rows.map((r) => <button key={r.id} type="button" className="bui-mi" onClick={() => { act(r.id); close(); }}><Ico name={r.icon} size={20} /><span>{r.label}</span>{r.badge && <Badge className="bui-pm-b">{r.badge}</Badge>}</button>)}
                </div>
              ))}
              <p className="bui-pm-f"><span>{team.name}</span><span className="bui-pm-v">{team.version}</span></p>
            </div>
          )}
        </Popover>
      </div>
    </aside>
  );
}

export function Demo() {
  const [sel, setSel] = useState('home'); const [last, setLast] = useState('');
  return (
    <div className="bui-demo is-sb">
      <DashboardSidebar selected={sel} onSelect={setSel} onAction={(a) => setLast(a)} />
      <div className="bui-sb-demo-main"><h2>{SIDEBAR_NAV.find((i) => i.key === sel)?.label ?? sel}</h2><p className="bui-demo-note" role="status">{last ? `Chose: ${last}` : 'Collapse the rail, press / to search, open the account or team menu.'}</p></div>
    </div>
  );
}
