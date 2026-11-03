'use client';
/*
 * Adapted from BoardUI (MIT), Copyright (c) 2026 Mertcan Dundar Esmergul (BoardUI) (free tier). See THIRD_PARTY_NOTICES.md.
 * What changed from upstream: Tailwind variant maps are plain CSS classes; each colour is one host-token mix (a tinted background and a readable
 * text colour in both themes) instead of a hand-picked light/dark pair. Upstream: base/badges/{chip,badge,status-dot}.tsx and base/kbd/kbd.tsx.
 */
import { Avatar, Badge, Chip, Kbd, StatusDot, type ChipColor } from './_bui';

export { Avatar, Badge, Chip, Kbd, StatusDot };
export type { ChipColor };
export default Chip;

const COLORS: ChipColor[] = ['lime', 'rose', 'yellow', 'cyan', 'blue', 'purple', 'orange', 'neutral', 'gray', 'soft'];

export function Demo() {
  return (
    <div className="bui bui-demo is-center is-stack bui-chips-demo">
      <div className="row" role="group" aria-label="Chip colours (bold)">{COLORS.map((c) => <Chip key={c} color={c}>{c}</Chip>)}</div>
      <div className="row" role="group" aria-label="Chip variants"><Chip variant="bold" color="lime">Shipped</Chip><Chip variant="subtle" color="gray">$1,240</Chip><Chip variant="caption" color="blue">Admin</Chip></div>
      <div className="row" role="group" aria-label="Counter badges"><Badge color="primary">152</Badge><Badge>94</Badge><span className="lbl">Messages</span></div>
      <div className="row" role="group" aria-label="Status dots"><StatusDot color="green" /> <span className="lbl">Completed</span> <StatusDot color="yellow" /> <span className="lbl">Waiting</span> <StatusDot color="indigo" /> <span className="lbl">Processing</span></div>
      <div className="row"><span className="lbl">Quick search</span><Kbd>/</Kbd><Kbd>Ctrl K</Kbd></div>
    </div>
  );
}
