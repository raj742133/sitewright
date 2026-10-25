# Audits

`scripts/audit.mjs` reads a **running** site in a real browser and reports what a careful reviewer would, each finding with the
exact fix. It is three audits in one command, and it never submits anything or changes the site.

```bash
node ~/.claude/skills/sitewright/scripts/audit.mjs --url http://localhost:3000 --out ./audit-out
node ~/.claude/skills/sitewright/scripts/audit.mjs --url http://localhost:3000 --mode a11y --routes /,/login --fail-on important
```

Needs Playwright resolvable from the cwd (same as `verify.mjs`). Point it at `npm start` or `npm run dev`.

| flag | default | |
| --- | --- | --- |
| `--url` | required | the site's origin |
| `--mode` | `all` | `a11y`, `critique`, `responsive`, or a comma list |
| `--routes` | `/` plus same-site links found on it | pages to audit; add `--cookie name=value` (repeatable) for pages behind sign-in |
| `--themes` | `light,dark` | each page is measured in both |
| `--widths` | `390,768,1280` | phone, tablet, desktop |
| `--max-pages` | 8 | cap for the automatic page discovery |
| `--fail-on` | `blocking` | exit code 1 if anything at or above this was found (`blocking`, `important`, `polish`, `none`) |
| `--out` | `./audit-out` | `report.md`, `report.json`, `fixes.css`, and one `<page>-responsive.png` (phone next to desktop) per page |

## How to read a finding

Severity is `blocking` (a real barrier or a plainly broken layout), `important` (should be fixed before shipping) or `polish`. Every card says
**WHAT** is wrong (with the measured numbers), **WHERE** (a selector), **WHY** it matters and **FIX** (the concrete change). Where the fix is
a colour or a size, `fixes.css` holds the rule. It is a suggestion file: nothing is applied for you, and you should read each rule.

```
#### [blocking] Contrast 2.02:1
- WHAT Text #a3a9b8 on #006fe6 is 2.02:1 (normal text, needs 4.5:1). e.g. "Real ratios without eyeballing"
- WHERE `p.lead`
- WHY Fails WCAG 2.2 AA 1.4.3. People with low vision, in sunlight or on dim screens cannot read it.
- FIX Set the text colour to #f9fafb (4.55:1).
```

## What each audit checks

**a11y** (WCAG 2.2 AA)
- measured contrast of every visible text run against its real background: text colour, opacity of every ancestor and the stacked backgrounds are composited; large text (24px, or 18.66px bold) needs 3:1, the rest 4.5:1; the fix is the nearest passing colour with the same hue
- controls with no accessible name, images with no `alt`, no `lang`, no `<title>`, no or zoom-disabling viewport meta
- one `h1`, no skipped heading levels
- tap targets under 24px (blocking), under 44px on a phone (important); links inside sentences are exempt
- keyboard: tabs through the first controls and flags any with no visible focus ring

**critique** (ranked design review)
- text under 12px, body under 14px, too many font sizes, a weak h1 against body text
- line length past 85 characters, tight line spacing, spacing that is not on a 4px step
- many text colours, buttons that differ in height or corner radius

**responsive** (the same page squeezed)
- page that scrolls sideways, with the element to blame and the right fix for its kind (image, table, `pre`, fixed width, flex child)
- clipped text, columns that stay side by side at phone width, inputs under 16px (iPhones zoom the page), tiny text, small tap targets

## What it does not do

- Text over a gradient or a photo has no single background, so it is listed as "check by eye", not scored.
- Anything inside `aria-hidden="true"` is treated as decoration (phone mock-ups, ornaments) and not judged.
- It checks pages as loaded and scrolled once; states behind a click (open menus, dialogs, error messages) need a route that shows them.
- It finds the machine-checkable part of `reference/better-interface.md`; the rest of that list needs a person.
- It is not a screen-reader test. Run the real thing before claiming a site is accessible.

`tools/audit-test.mjs` tests the audit against a page that is wrong in known ways and one that is right, and applies a suggested fix to
check the finding disappears. `tools/regress.mjs` runs the accessibility and responsive audits on every site it builds and fails on
anything blocking.
