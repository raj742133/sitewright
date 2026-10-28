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

## Tactile Glass UI

Sitewright's ten glass components (`skill/sitewright/templates/fx/ui/Glass*.tsx`, the engine `_tg-engine.ts`, the synth `_tg-audio.ts`) are ported from
[Tactile Glass UI](https://github.com/uixninja/tactile-glass-ui) by uixNinja (red/blue theme edition). The WebGL2 shader, optical presets,
text-distance-field code and the procedural audio synth are upstream's; what changed:

- renamed (`TactileButton` -> `GlassButton`, ...), TypeScript strict, no `window`/`document` at module scope;
- the engine class is rewritten: lazy singleton, theme colours read from host tokens (`--primary`, `--signal`, `--ink`, `--surface`) instead of the hard-coded red/blue, light-theme shading, WebGL-missing / context-lost reporting with a CSS fallback, reduced-motion still frames, one IntersectionObserver, loop paused when hidden or off screen;
- the unused full-screen "stage" renderer is not included;
- `tokens.css` / `components.css` are replaced by `.ui-glass`-scoped `--tg-*` tokens; the optics props are grouped into one `optics` object;
- accessibility: labelled prompt box, native switch semantics, live region and slider values on the audio player, no autoplay, 44px touch targets;
- demos are new.

Tactile Glass UI is released under the MIT licence:

```
MIT License

Copyright (c) 2026 uixNinja

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

The `frosted-*` components and the `variant="frosted"` option are written for Sitewright (plain CSS: backdrop blur, grain, edge light); they reuse only the component structure and props of the ported glass components.

Every generated project that uses a glass component carries this notice in `src/components/fx/ui/LICENSE-tactile-glass.txt`.

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

## Catalogue expansion (clean-room, original)

The 226 components and 5 hero pages added under `docs/catalog-map.json` were checked against a personal design-library catalogue of 261 entries (218 labelled React Bits-origin, 43 labelled `tu`). None of that catalogue's source code, markup, shaders, artwork or text was read, copied, ported or used as a template.

- **React Bits-origin entries (MIT with the Commons Clause, (c) David Haz):** the licence does not allow redistributing the components, alone, in a bundle or as a ported version, so none of them is included. Each entry is either mapped to an existing Sitewright equivalent (30 entries, listed in `docs/catalog-map.json`) or was written from scratch from nothing more than the entry's plain name and category, by authors who were forbidden to open the library. Names such as "scroll float" or "ripple distortion" describe a technique, and a technique is not protected expression. If you believe any component here reproduces protected expression, open an issue and it will be rewritten or removed.
- **The 35 "Micro Interaction" entries** carry the `rb:` prefix but their folder is not part of the public React Bits layout, so their origin is unresolved; they were treated as restricted and written the same way.
- **`tu` entries** are complete works authored by third parties (several are described as "preserved unchanged"). Their code, artwork, copy, names and any company marks are not redistributed. Only the general technique behind each was re-implemented, with invented names, copy and art (for example a CRT-screen shader, a liquid-metal button, procedural terrain). The five hero pages are original compositions in the same genres, with their own invented brands; they do not reproduce those pages. Real company logos and marks are deliberately not recreated.
- **Tactile Glass UI (MIT, (c) 2026 uixNinja)** is the one ported piece; see its section above.

The per-entry status, provenance note and verification result is in `docs/catalog-manifest.json` and `docs/catalog-coverage.md`.

## Audits (ideas only)

`scripts/audit.mjs`, `reference/audits.md`, `reference/better-interface.md` and the bento board component take their *ideas* from the public descriptions
of five Figma community skills (accessibility-review, desktop-to-mobile, bento-board-ui, superfuture-design-review and better-interface; known only from
their titles and one-line descriptions in a social post). Nothing of those skills was seen or used. The audits are written for Sitewright, work on running
websites and not on Figma files, and share no code with them. WCAG is a W3C standard and is cited, not copied.
