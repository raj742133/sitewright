'use client';
/*
 * Adapted from BoardUI (MIT), Copyright (c) 2026 Mertcan Dundar Esmergul (BoardUI) (free tier). See THIRD_PARTY_NOTICES.md.
 * What changed from upstream: remixicon / react-aria are inline icons and native buttons; tabs reuse the SegmentedControl in this kit; avatar images
 * are initials; unread state can be controlled (`read` / `onReadChange`) so a bell badge elsewhere stays in step; groups get small headings;
 * a polite live region announces the unread count. Upstream: notification-center/notification-center.tsx.
 */
import { useMemo, useState } from 'react';
import { Avatar, Ico, cx, useControlled, type BuiIcon } from './_bui';
import SegmentedControl from './SegmentedControl';

export type NotificationTab = 'all' | 'mentions' | 'system';
export type NotificationCategory = 'mentions' | 'system' | 'activity';
export type NotificationStatus = 'neutral' | 'information' | 'success' | 'error';
export interface NotificationAction { id: string; label: string; variant?: 'primary' | 'secondary' }
export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  /** Heading the item sits under ("Today", "Earlier this week"). */
  group: string;
  title: string;
  description: string;
  timestamp: string;
  unread?: boolean;
  status?: NotificationStatus;
  icon?: BuiIcon;
  /** A person: shows their initials instead of an icon. */
  avatar?: string;
  actions?: NotificationAction[];
}
export interface NotificationCenterProps {
  notifications?: NotificationItem[];
  defaultTab?: NotificationTab;
  tab?: NotificationTab;
  onTabChange?: (t: NotificationTab) => void;
  /** Ids already read. Controlled when given. */
  read?: string[];
  onReadChange?: (ids: string[]) => void;
  onAction?: (notificationId: string, actionId: string) => void;
  title?: string;
  emptyMessage?: string;
  className?: string;
}

const STATUS_ICON: Record<NotificationStatus, BuiIcon> = { neutral: 'bell', information: 'info', success: 'check-circle', error: 'alert-circle' };
export const SAMPLE_NOTIFICATIONS: NotificationItem[] = [
  { id: 'mention-notes', category: 'mentions', group: 'Today', title: 'Livia mentioned you', description: 'Can you review the new empty state before we ship the dashboard?', timestamp: '2m', unread: true, avatar: 'Livia Saris', actions: [{ id: 'reply', label: 'Reply', variant: 'primary' }, { id: 'view', label: 'View thread', variant: 'secondary' }] },
  { id: 'backup-ready', category: 'system', group: 'Today', title: 'Workspace backup is ready', description: 'The July 23 backup finished successfully and is ready to download.', timestamp: '18m', unread: true, status: 'success', icon: 'download-cloud', actions: [{ id: 'download', label: 'Download', variant: 'secondary' }] },
  { id: 'project-invite', category: 'system', group: 'Today', title: 'You joined Project Sea', description: 'Maria added you as an editor. You now have access to all project files.', timestamp: '1h', unread: true, icon: 'user-add', status: 'information' },
  { id: 'pull-request', category: 'mentions', group: 'Earlier this week', title: 'Jaydon requested your review', description: 'Pull request #284 updates the notification preferences flow.', timestamp: 'Mon', avatar: 'Jaydon Aminoff', actions: [{ id: 'review', label: 'Review changes', variant: 'secondary' }] },
  { id: 'security-check', category: 'system', group: 'Earlier this week', title: 'Security check completed', description: 'No exposed credentials or vulnerable dependencies were found.', timestamp: 'Sun', status: 'success', icon: 'shield' },
  { id: 'deploy-failed', category: 'system', group: 'Earlier this week', title: 'Preview deployment failed', description: 'The build stopped while validating the application routes.', timestamp: 'Sat', unread: true, status: 'error', icon: 'git-pr', actions: [{ id: 'retry', label: 'Retry', variant: 'primary' }, { id: 'logs', label: 'View logs', variant: 'secondary' }] },
];

export function unreadIn(items: NotificationItem[], read: string[]) { return items.filter((i) => i.unread && !read.includes(i.id)).length; }

export default function NotificationCenter({ notifications = SAMPLE_NOTIFICATIONS, defaultTab = 'all', tab, onTabChange, read, onReadChange, onAction, title = 'Notifications', emptyMessage = 'You’re all caught up.', className }: NotificationCenterProps) {
  const [active, setActive] = useControlled<NotificationTab>(tab, defaultTab, onTabChange);
  const [readIds, setRead] = useControlled<string[]>(read, [], onReadChange);
  const unread = unreadIn(notifications, readIds);
  const counts = useMemo(() => ({ all: notifications.length, mentions: notifications.filter((n) => n.category === 'mentions').length, system: notifications.filter((n) => n.category === 'system').length }), [notifications]);
  const shown = active === 'all' ? notifications : notifications.filter((n) => n.category === active);
  const groups = shown.reduce<Array<{ name: string; items: NotificationItem[] }>>((a, n) => { const g = a.find((x) => x.name === n.group); if (g) g.items.push(n); else a.push({ name: n.group, items: [n] }); return a; }, []);
  const markAll = () => setRead([...new Set([...readIds, ...notifications.filter((n) => n.unread).map((n) => n.id)])]);
  const tabs = ([['all', 'All'], ['mentions', 'Mentions'], ['system', 'System']] as const).map(([id, l]) => ({ id, text: `${l}, ${counts[id]}`, label: <span className="bui-nc-tab">{l}<span className="bui-nc-count">{counts[id]}</span></span> }));
  return (
    <section className={cx('bui', 'bui-nc', className)} aria-label={title}>
      <div className="bui-nc-h">
        <div className="bui-nc-hr">
          <div><h2 className="bui-nc-title">{title}</h2><p className="bui-nc-sub" role="status" aria-live="polite">{unread === 0 ? 'No unread notifications' : `${unread} unread`}</p></div>
          <button type="button" className="bui-btn is-ghost is-sm" onClick={markAll} disabled={unread === 0}>Mark all read</button>
        </div>
        <SegmentedControl label="Notification category" options={tabs} value={active} onChange={(t) => setActive(t)} fullWidth />
      </div>
      <div className="bui-nc-wrap"><div className="bui-nc-scroll" tabIndex={0} role="region" aria-label={`${title} list`}>
        {shown.length === 0 ? (
          <div className="bui-nc-empty"><span><Ico name="bell-off" size={20} /></span><p className="bui-nc-et">{emptyMessage}</p><p className="bui-nc-ed">New activity will appear here when it arrives.</p></div>
        ) : groups.map((g) => (
          <div key={g.name} className="bui-nc-g" role="group" aria-label={g.name}>
            <h3 className="bui-nc-gh">{g.name}</h3>
            {g.items.map((n) => {
              const isUnread = !!n.unread && !readIds.includes(n.id); const st = n.status ?? 'neutral';
              return (
                <article key={n.id} className="bui-nc-i">
                  {n.avatar ? <Avatar name={n.avatar} size={40} /> : <span className={cx('bui-nc-vis', `s-${st}`)}><Ico name={n.icon ?? STATUS_ICON[st]} size={20} /></span>}
                  <div className="bui-nc-body">
                    <div className="bui-nc-top"><p className="bui-nc-it">{n.title}</p><span className="bui-nc-meta"><time>{n.timestamp}</time>{isUnread && <i className="bui-nc-dot" role="img" aria-label="Unread" />}</span></div>
                    <p className="bui-nc-d">{n.description}</p>
                    {n.actions?.length ? <div className="bui-nc-act">{n.actions.map((a) => (
                      <button key={a.id} type="button" className={cx('bui-btn is-sm', a.variant === 'primary' ? 'is-primary' : 'is-secondary')} onClick={() => { if (!readIds.includes(n.id)) setRead([...readIds, n.id]); onAction?.(n.id, a.id); }}>{a.label}<span className="bui-sr">, {n.title}</span></button>
                    ))}</div> : null}
                  </div>
                </article>
              );
            })}
          </div>
        ))}
      </div></div>
    </section>
  );
}

export function Demo() {
  const [last, setLast] = useState('');
  return (
    <div className="bui-demo is-center">
      <div className="bui-demo-col">
        <NotificationCenter onAction={(id, a) => setLast(`${a} on ${id}`)} />
        <p className="bui-sr" role="status">{last}</p>
      </div>
    </div>
  );
}
