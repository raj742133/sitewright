'use client';
import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { Scene, initials } from './_cards-art';
import { setPointerVars, useControlled } from './_cards-use';

export interface ProfileStat { label: string; value: string }

export interface ProfileCardProps {
  name?: string;
  handle?: string;
  role?: string;
  bio?: string;
  stats?: ProfileStat[];
  status?: 'online' | 'away' | 'offline';
  /** Replaces the generated avatar (an <img> or any node). */
  avatar?: ReactNode;
  /** Replaces the banner artwork. */
  banner?: ReactNode;
  /** Follow state (controlled). */
  following?: boolean;
  defaultFollowing?: boolean;
  onFollowChange?: (following: boolean) => void;
  /** Shows a second button when provided. */
  onMessage?: () => void;
  className?: string;
  style?: CSSProperties;
}

const STATUS_TEXT = { online: 'Online', away: 'Away', offline: 'Offline' } as const;

/** A person card: banner, avatar with a live status dot, role, bio, stat row and Follow / Message actions. A soft foil sheen follows the pointer; the layout goes side by side when the container is wide. */
export default function ProfileCard({ name = 'Ada Okafor', handle = '@ada', role = 'Principal designer', bio = 'Builds calm interfaces for noisy problems. Currently shaping design systems.', stats = [{ label: 'Projects', value: '48' }, { label: 'Followers', value: '12.4k' }, { label: 'Rating', value: '4.9' }], status = 'online', avatar, banner, following, defaultFollowing = false, onFollowChange, onMessage, className, style }: ProfileCardProps) {
  const ref = useRef<HTMLElement>(null);
  const [fol, setFol] = useControlled<boolean>(following, defaultFollowing, onFollowChange);
  const move = (e: PointerEvent<HTMLElement>) => { if (ref.current) setPointerVars(ref.current, e.clientX, e.clientY); };
  return (
    <article ref={ref} className={`ui-profile-card-root ${className ?? ''}`} style={style} aria-label={`${name}, ${role}`} onPointerMove={move}>
      <div className="ui-profile-card-banner" aria-hidden="true">{banner ?? <Scene index={5} />}</div>
      <div className="ui-profile-card-sheen" aria-hidden="true" />
      <div className="ui-profile-card-main">
        <div className="ui-profile-card-ava">
          <span className="ui-profile-card-face">{avatar ?? <span aria-hidden="true">{initials(name)}</span>}</span>
          <span className="ui-profile-card-dot" data-status={status} role="img" aria-label={STATUS_TEXT[status]} />
        </div>
        <div className="ui-profile-card-id">
          <h3>{name}</h3>
          <p className="ui-profile-card-handle">{handle}<span> / {role}</span></p>
        </div>
        {bio ? <p className="ui-profile-card-bio">{bio}</p> : null}
        {stats.length ? (
          <dl className="ui-profile-card-stats">
            {stats.map((s) => <div key={s.label}><dd>{s.value}</dd><dt>{s.label}</dt></div>)}
          </dl>
        ) : null}
        <div className="ui-profile-card-actions">
          <button type="button" className="ui-profile-card-btn" data-primary="true" aria-pressed={fol} onClick={() => setFol(!fol)}>{fol ? 'Following' : 'Follow'}</button>
          {onMessage ? <button type="button" className="ui-profile-card-btn" onClick={onMessage}>Message</button> : null}
        </div>
      </div>
    </article>
  );
}

export function Demo() {
  return <div className="ui-profile-card-demo"><ProfileCard onMessage={() => undefined} /></div>;
}
