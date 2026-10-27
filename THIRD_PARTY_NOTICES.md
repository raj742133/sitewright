# Third-party notices

## Hairline

Sitewright's line figures (`skill/sitewright/templates/fx/figures/`) include the engine and nineteen figures of
[Hairline](https://github.com/lucasmarkes/hairline), copied with small changes (the figures are split into one module each, and
`intensity.ts` has three more entries). Three more figures (`bars`, `scanner`, `parcel`) are written for Sitewright on the same engine.

Hairline is released under the MIT licence:

```
MIT License

Copyright (c) 2026 Lucas Marques

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Every generated project that uses a figure carries this notice in `src/components/fx/figures/LICENSE-hairline.txt`.

## Better Icons and Iconify

Sitewright's icon support (`skill/sitewright/scripts/lib/icons.mjs`) follows the approach of
[Better Icons](https://github.com/better-auth/better-icons) by Better Auth Inc. (MIT, Copyright (c) 2026 Better Auth Inc.): icons
are looked up by `prefix:name` in the [Iconify](https://iconify.design) data (the API at `api.iconify.design`, and the
`@iconify-json/<set>` packages), aliases are followed to the real icon, and the answer is turned into an inline SVG. The code is
written for Sitewright rather than copied; the idea, the id format and the way aliases are resolved are theirs. Better Icons is also what the skill
suggests an agent use to search for icons.

## Lucide

The icons the kit ships so a site has icons with no network (`skill/sitewright/templates/icons/lucide.json`, about 200 of them) are from
[Lucide](https://lucide.dev), ISC licensed, with some derived from Feather (MIT, Copyright (c) 2013-present Cole Bemis). The full licence text is
inside the pack and is written to `src/components/icons/NOTICE.md` of every generated project that uses one of its icons. Icons from other sets
keep their own licences, which the same file records.

## Component library (ideas only)

The components under `skill/sitewright/templates/fx/ui/` take their *ideas* from the work of others: the experiments in
[Kitchen](https://www.dqnamo.com/kitchen) by dqnamo, the components of [Kokonut UI](https://kokonutui.com), the animation techniques of
[Anime.js](https://animejs.com) and [Motion](https://motion.dev), the chart types of [Bklit UI](https://bklit.com), the toast of [Sileo](https://sileo.aaryan.design), and the kinds of interface shown in the public posts of @code.xr on Instagram (one-time-code fields, payment cards, tabs, sidebar, carousel, chat, buttons, a stretching nav, dashboards, landing pages; known only from the post captions), and the hover ideas listed on components.janustiu.com. All of the code is
written for Sitewright; none of it is copied from those projects, and none of them is a dependency. Ideas are not covered by those
projects' licences, but credit is due and given here.

## 3D components and templates (original)

The 3D and shader components (`shader-gradient`, `shader-waves`, `particle-sphere`, `wire-terrain`, `plasma-orb`, `tilt-card-3d`, `cube-carousel`, `globe-arcs`, `phone-3d`, `lit-torus`) are written from scratch with raw WebGL and CSS 3D. They are inspired by the general category of 3D UI component libraries (for example threeui.com); no source, asset or text from any of them was seen, copied or used, and none is a dependency. The dashboard and page templates under `templates/fx/tpl/` are original code and original sample data.

## Audits (ideas only)

`scripts/audit.mjs`, `reference/audits.md`, `reference/better-interface.md` and the bento board component take their *ideas* from the public descriptions
of five Figma community skills (accessibility-review, desktop-to-mobile, bento-board-ui, superfuture-design-review and better-interface; known only from
their titles and one-line descriptions in a social post). Nothing of those skills was seen or used. The audits are written for Sitewright, work on running
websites and not on Figma files, and share no code with them. WCAG is a W3C standard and is cited, not copied.
