# A better interface: the fundamentals

A checklist for the pages Sitewright generates and for anything added to them. Items marked **[audit]** are measured by
`scripts/audit.mjs` (see `reference/audits.md`); the rest need a person looking.

## Accessibility
- **[audit]** Text contrast 4.5:1 (3:1 for large text), in both themes. Muted text is the usual failure: check it on the card it sits on, not on the page.
- **[audit]** Every control has a name; every image has `alt` (empty for decoration); the page has `lang`, a title, one `h1`, no skipped levels.
- **[audit]** A visible focus ring on everything tabbable. Never `outline: none` without a replacement.
- **[audit]** Tap targets 44px on touch (24px is the floor).
- Colour is never the only signal (an error also has text or an icon).
- Everything works with the keyboard alone; focus moves somewhere sensible after a dialog opens or closes.
- Motion respects `prefers-reduced-motion`; nothing flashes.
- Form errors say what to do, are announced (`role="alert"`) and sit next to the field.

## Layout
- **[audit]** No sideways scroll at 320 to 1440px; wide tables scroll inside their card.
- **[audit]** Columns stack at phone width instead of squeezing.
- One clear primary action per screen. Related things sit closer together than unrelated things.
- Spacing comes from one scale (4, 8, 12, 16, 24, 32, 48, 64), not from eye.
- Alignment: pick a left edge and keep it. Two nearly-aligned edges look like a mistake.

## Typography
- **[audit]** Body 16px (never under 14); nothing under 12px.
- **[audit]** Line length 45 to 80 characters; line height about 1.5 for body, 1.1 to 1.2 for big headings.
- **[audit]** A scale of 5 to 7 sizes; the h1 at least twice the body size.
- Two typefaces at most. Weight and size make hierarchy before colour does.
- Numbers that line up (tabular figures) wherever they are compared.

## Writing
- Buttons say what happens ("Save changes", "Send invite"), not "Submit" or "OK".
- Empty states say what goes here and how to add it; errors say what happened and what to do next.
- Never invent a customer count, a testimonial or a benchmark. Placeholder copy is marked as placeholder.
- Sentence case; one idea per sentence; no filler ("simply", "just", "please note").

## Interaction
- **[audit]** Inputs are at least 16px on a phone (otherwise iPhones zoom in).
- Every action has a visible response in under 100ms (pressed state, spinner or a toast).
- Destructive actions are confirmed or undoable, and say what will be lost.
- Loading shows the shape of what is coming (skeletons) before a spinner.
- Disabled controls say why, or are hidden.

## Consistency
- **[audit]** Buttons share height and corner radius; one radius token for controls, a bigger one for cards.
- One icon style, one illustration style, one way to show a status.
- A component that appears twice is the same component.

## Before you ship
Run `audit.mjs` on the real build in both themes, open the `*-responsive.png` pictures, tab through the page once, zoom to 200%, and turn
on a screen reader for the first screen.
