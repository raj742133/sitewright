#!/usr/bin/env node
// Generates the static pages of the Sitewright website from the skill's registry (components and templates), so the site never drifts from the kit:
//   node tools/build-site.mjs
// Writes: site/index.html, site/components/index.html, site/components/<id>/index.html (one per component), site/dashboards/index.html, site/search.json,
// site/sitemap.xml. The shared header, footer, theme bootstrap and head tags live here too (tools/make-icon-gallery.mjs imports them), so every page has
// the same chrome. Re-running it is idempotent. Styles: site/style.css (brand, home, chrome, palette) and site/catalog.css (catalogue, detail);
// behaviour: site/catalog.js (theme, menu, palette, catalogue, detail) and site/app.js (home page only).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { UI, TPL } from '../skill/sitewright/scripts/ui.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const SITE_DIR = path.join(ROOT, 'site');
export const ORIGIN = 'https://sitewright-skill.vercel.app';
export const GH = 'https://github.com/raj742133/sitewright';
const FONTS = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&amp;family=Inter:wght@400;500;600&amp;family=JetBrains+Mono:wght@400;500;600&amp;display=swap';
const PREVIEW_QS = '?theme=light&primary=%23c2410c&signal=%230f766e';

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const firstSentence = (s) => { const m = s.match(/^.*?[.!?](?=\s+[A-Z(]|$)/s); return (m ? m[0] : s).trim(); };
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const trunc = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');

// ---- facts from the registry and the export -------------------------------------------------------------------------------
const N_UI = Object.keys(UI).length;
const N_TPL = Object.keys(TPL).length;
const countDirs = (p) => (fs.existsSync(p) ? fs.readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).length : 0);
const N_FIG = countDirs(path.join(SITE_DIR, 'demo/effects/f'));
const N_BG = countDirs(path.join(SITE_DIR, 'demo/effects/bg'));
const iconsHtml = fs.existsSync(path.join(SITE_DIR, 'icons/index.html')) ? fs.readFileSync(path.join(SITE_DIR, 'icons/index.html'), 'utf8') : '';
const N_ICONS = (iconsHtml.match(/data-name="/g) || []).length;

const GROUP_ORDER = ['buttons', 'inputs', 'cards', 'charts', 'navigation', 'text', 'motion', 'media', 'backgrounds', 'hover', 'loaders', 'feedback'];
const groups = [...new Set(Object.values(UI).map((e) => e.group))].sort((a, b) => (GROUP_ORDER.indexOf(a) + 100) % 100 - (GROUP_ORDER.indexOf(b) + 100) % 100);
const groupLabel = (g) => cap(g);
const byGroup = (g) => Object.values(UI).filter((e) => e.group === g);
export const tplUrl = (id) => `/dashboards/${id}/`;

// ---- shared chrome ---------------------------------------------------------------------------------------------------------
const LOGO = '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="2" y="2" width="44" height="44" rx="12" fill="var(--primary)"/><g fill="var(--primary-ink)"><rect x="11" y="10" width="26" height="7" rx="3.5"/><rect x="11" y="10" width="7" height="14" rx="3.5"/><rect x="11" y="20.5" width="26" height="7" rx="3.5"/><rect x="30" y="20.5" width="7" height="17.5" rx="3.5"/><rect x="11" y="31" width="26" height="7" rx="3.5"/></g></svg>';
const GH_MARK = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg>';
const SEARCH_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
const NAV = [['components', 'Components', '/components/'], ['dashboards', 'Dashboards', '/dashboards/'], ['effects', 'Effects', '/demo/effects/'], ['icons', 'Icons', '/icons/']];

export function header(current = '') {
  const links = NAV.map(([id, label, href]) => `<a href="${href}"${id === current ? ' aria-current="page"' : ''}>${label}</a>`).join('\n        ');
  return `<header class="top">
  <div class="wrap top-in">
    <a class="brand" href="/" aria-label="Sitewright home">${LOGO}Sitewright</a>
    <nav id="nav" aria-label="Main">
        ${links}
        <a class="ext" href="${GH}#readme" rel="noopener">Docs<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg></a>
        <a class="nav-gh" href="${GH}" rel="noopener">${GH_MARK}GitHub</a>
    </nav>
    <button class="search-btn" id="search" type="button" aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K /" aria-label="Search components and pages">${SEARCH_ICON}<span class="search-t">Search</span><kbd id="kbd">Ctrl K</kbd></button>
    <button class="icon-btn" id="theme" type="button" aria-label="Switch colour theme" title="Switch colour theme"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"/></svg></button>
    <a class="icon-btn gh-btn" href="${GH}" rel="noopener" aria-label="Sitewright on GitHub" title="Star Sitewright on GitHub">${GH_MARK}</a>
    <button class="icon-btn menu-btn" id="menu" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="nav"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
  </div>
</header>`;
}

export function footer() {
  return `<footer>
  <div class="wrap foot">
    <div><b class="foot-b">Sitewright</b> &middot; a Claude Code skill &middot; MIT licence<br>Screenshots show fictional brands and data.</div>
    <nav aria-label="Footer">
      <a href="/components/">Components</a>
      <a href="/dashboards/">Dashboards</a>
      <a href="/demo/effects/">Effects</a>
      <a href="/icons/">Icons</a>
      <a href="${GH}" rel="noopener">GitHub</a>
      <a href="${GH}/issues" rel="noopener">Issues</a>
    </nav>
  </div>
</footer>`;
}

/** A whole page: head tags, header, <main> body, footer and scripts. `p` is the URL path ('/components/'). */
export function page({ title, desc, p, current = '', main, css = [], js = ['/catalog.js'], mainClass = '', ogTitle, after = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#f4f2ec" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0c0c0b" media="(prefers-color-scheme: dark)">
<meta property="og:title" content="${esc(ogTitle || title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:image" content="${ORIGIN}/assets/og.png">
<meta property="og:url" content="${ORIGIN}${p}">
<link rel="canonical" href="${ORIGIN}${p}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="/style.css">
${css.map((c) => `<link rel="stylesheet" href="${c}">`).join('\n')}
<script>try{var t=localStorage.getItem('sitewright-theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${header(current)}
<main id="main"${mainClass ? ` class="${mainClass}"` : ''}>
${main}
</main>
${footer()}
${js.map((j) => `<script src="${j}" defer></script>`).join('\n')}
${after}
</body>
</html>
`;
}

const write = (rel, content) => { const f = path.join(SITE_DIR, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, content); };
const copyBtn = (text) => `<button class="copy" type="button" data-copy="${esc(text).replace(/\n/g, '&#10;')}">Copy</button>`;
const codeBlock = (label, code, lang = '') => `<div class="code"><span class="lbl">${label}</span><pre tabindex="0"${lang ? ` data-lang="${lang}"` : ''}><code>${esc(code)}</code></pre>${copyBtn(code)}</div>`;

// =============================================================================================================================
// /components/  (the catalogue)
// =============================================================================================================================
const hasDemo = (id) => fs.existsSync(path.join(SITE_DIR, 'demo/effects/c', id, 'index.html'));
function previewBox(id) {
  const e = UI[id];
  if (!hasDemo(id)) return `<div class="prev prev-none" aria-hidden="true"><span>Live preview after the next demo export</span></div>`;
  return `<div class="prev" aria-hidden="true" data-prev="/demo/effects/c/${id}/" data-title="Live preview: ${esc(e.label)}"><span class="prev-sk"></span></div>`;
}
function interleaved() {
  const lists = groups.map(byGroup); const out = [];
  for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (l[i]) out.push(l[i]);
  return out;
}
function tile(e) {
  const k = `${e.id} ${e.group} ${e.source} ${e.use}`.toLowerCase();
  return `<li class="tile" data-id="${e.id}" data-g="${e.group}" data-k="${esc(k)}">
${previewBox(e.id)}
<div class="tile-b"><div class="tile-t"><h2><a href="/components/${e.id}/">${esc(e.label)}</a></h2><span class="tag">${groupLabel(e.group)}</span></div>
<p class="tile-d">${esc(firstSentence(e.desc))}</p><p class="tile-s">${esc(e.source)}</p></div>
</li>`;
}

function catalogue() {
  const side = [`<li><a href="/components/" data-g="" aria-current="true"><span>All</span><i>${N_UI}</i></a></li>`, ...groups.map((g) => `<li><a href="/components/?g=${g}" data-g="${g}"><span>${groupLabel(g)}</span><i>${byGroup(g).length}</i></a></li>`)].join('\n');
  const main = `<div class="wrap cat">
  <div class="cat-head">
    <span class="eyebrow">Components</span>
    <h1><span id="cat-n">${N_UI}</span> components you can import</h1>
    <p>Small interactive React pieces, original code with no animation or chart library. Pick one by name in <code>site.json</code> and it is one line in your site.</p>
  </div>
  <div class="cat-grid">
    <aside class="cat-side" aria-label="Filter components">
      <label class="cat-search"><span class="sr">Search components</span>${SEARCH_ICON}<input id="cat-q" type="search" placeholder="Search" autocomplete="off" spellcheck="false" aria-keyshortcuts="/"><kbd aria-hidden="true">/</kbd></label>
      <nav aria-label="Groups"><ul class="groups" id="groups">
${side}
      </ul></nav>
    </aside>
    <section class="cat-main" aria-label="Component catalogue">
      <div class="cat-bar"><p class="cat-count" id="cat-count" role="status" aria-live="polite">${N_UI} components</p><button class="btn-s" id="cat-clear" type="button" hidden>Clear filters</button></div>
      <ul class="tiles" id="tiles">
${interleaved().map(tile).join('\n')}
      </ul>
      <div class="cat-more"><button class="btn" id="cat-more" type="button" hidden>Show more</button></div>
      <div class="cat-empty" id="cat-empty" hidden><h2>Nothing matches <q id="cat-eq"></q></h2><p>Try a shorter word, a group name such as <a href="/components/?g=charts">charts</a>, or a source such as Kokonut UI.</p><button class="btn" id="cat-reset" type="button">Show all ${N_UI} components</button></div>
      <noscript><p class="muted">Turn on JavaScript to see the live previews. Every component has its own page; the names above link to them.</p></noscript>
    </section>
  </div>
</div>`;
  return page({
    title: `Components · ${N_UI} live React components · Sitewright`, p: '/components/', current: 'components', main, css: ['/catalog.css'],
    desc: `Browse ${N_UI} live, dependency-free React components for your site: buttons, inputs, cards, charts and more. Search, preview in light and dark, copy the one line that adds it.`,
  });
}

// =============================================================================================================================
// /components/<id>/  (detail)
// =============================================================================================================================
function detail(e) {
  const list = byGroup(e.group), i = list.findIndex((x) => x.id === e.id);
  const prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
  const first = firstSentence(e.desc), rest = e.desc.slice(first.length).trim();
  const gl = groupLabel(e.group);
  const siteJson = `"effects": { "components": ["${e.id}"] }`;
  const cli = `node ~/.claude/skills/sitewright/scripts/scaffold.mjs --config site.json --out ./my-site --components ${e.id}`;
  const imp = `import { ${e.component} } from '@/components/fx/ui';`;
  const files = e.files.map((f) => `<li><code>components/fx/ui/${esc(f)}</code></li>`).join('') + e.css.map((c) => `<li><code>${esc(c)}.css</code> <span class="muted">styles</span></li>`).join('');
  const rail = list.map((x) => `<li><a href="/components/${x.id}/"${x.id === e.id ? ' aria-current="page"' : ''}>${esc(x.label)}</a></li>`).join('');
  const pn = list.length > 1 ? `<div class="pn"><a rel="prev" href="/components/${prev.id}/"><small>&larr; Previous</small><b>${esc(prev.label)}</b></a><a rel="next" href="/components/${next.id}/"><small>Next &rarr;</small><b>${esc(next.label)}</b></a></div>` : '';
  const credit = e.source === 'Original' ? 'Original to Sitewright. MIT licensed.' : `Idea from <b>${esc(e.source)}</b>; the code is written for this kit.`;
  const main = `<div class="wrap det">
  <div class="det-main">
    <nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="/components/">Components</a></li><li><a href="/components/?g=${e.group}">${gl}</a></li><li aria-current="page">${esc(e.label)}</li></ol></nav>
    <h1>${esc(e.label)}</h1>
    <p class="det-sub">${esc(first)}</p>

    ${hasDemo(e.id) ? '' : '<p class="nodemo">The live preview for this component is added with the next demo export.</p>'}
    <section class="stage-wrap" aria-label="Live preview" id="stage-wrap" data-id="${e.id}"${hasDemo(e.id) ? '' : ' hidden'}>
      <div class="toolbar" role="toolbar" aria-label="Preview controls">
        <div class="seg" role="group" aria-label="Preview theme"><button type="button" data-theme="light" aria-pressed="true">Light</button><button type="button" data-theme="dark" aria-pressed="false">Dark</button></div>
        <div class="seg" role="group" aria-label="Stage width"><button type="button" data-w="320" aria-pressed="false">Compact<small>320</small></button><button type="button" data-w="480" aria-pressed="true">Default<small>480</small></button><button type="button" data-w="760" aria-pressed="false">Wide<small>760</small></button></div>
        <div class="tb-end"><button type="button" class="btn-s" id="replay">Replay</button><a class="btn-s" id="full" href="/demo/effects/c/${e.id}/${PREVIEW_QS}">Full screen</a></div>
      </div>
      <div class="stage" id="stage" data-theme="light">
        <iframe id="pv" title="Live preview of ${esc(e.label)}" data-src="/demo/effects/c/${e.id}/"></iframe>
        <span class="stage-w" id="stage-w" aria-hidden="true">480 px</span>
      </div>
      <noscript><p class="muted">Turn on JavaScript to run the live preview, or <a href="/demo/effects/c/${e.id}/">open it full screen</a>.</p></noscript>
    </section>

    <section class="blk"><h2>What it is for</h2><p>${esc(e.use || first)}</p>${rest ? `<p class="muted">${esc(rest)}</p>` : ''}</section>

    <section class="blk"><h2>Use it</h2>
      <div class="codes">
        ${codeBlock('1 &middot; site.json', siteJson)}
        ${codeBlock('or on the command line', cli)}
        ${codeBlock('2 &middot; import it', imp)}
      </div>
    </section>

    <section class="blk two">
      <div><h2>Files</h2><ul class="files">${files}</ul></div>
      <div><h2>Source</h2><p>${credit}</p><p class="muted small">Credits and licences: <a href="${GH}/blob/main/THIRD_PARTY_NOTICES.md" rel="noopener">third-party notices</a>.</p></div>
    </section>

    <section class="blk"><h2>Accessibility</h2>
      <ul class="a11y">
        <li><b>Keyboard.</b> Components in the kit are written to be reached and used with the keyboard. Try it: press Tab inside the preview.</li>
        <li><b>Reduced motion.</b> With <code>prefers-reduced-motion</code> on, animation settles to its finished state at once.</li>
        <li><b>Touch.</b> Pointer-follow effects are skipped on touch screens; controls stay finger-sized.</li>
      </ul>
    </section>
    ${pn}
  </div>
  <aside class="rail" aria-label="More in ${gl}">
    ${pn}
    <h2>More in ${gl} <span>${list.length}</span></h2>
    <ul class="rail-list">${rail}</ul>
    <a class="rail-all" href="/components/?g=${e.group}">All ${gl.toLowerCase()} &rarr;</a>
  </aside>
</div>`;
  return page({ title: `${e.label} · React component · Sitewright`, ogTitle: `${e.label}: a Sitewright component`, desc: trunc(`${e.desc} ${e.use || ''}`.trim(), 158), p: `/components/${e.id}/`, current: 'components', main, css: ['/catalog.css'] });
}

// =============================================================================================================================
// /dashboards/ (gallery of whole screens at real size) and /dashboards/<id>/ (full-size live preview with a device switch)
// =============================================================================================================================
const TPL_LABEL = { dashboard: 'Dashboards', page: 'Pages', brand: 'Brand boards' };
const tplGroups = ['dashboard', 'page', 'brand'].filter((g) => Object.values(TPL).some((t) => t.group === g));
const hasTplDemo = (id) => fs.existsSync(path.join(SITE_DIR, 'demo/effects/b', id, 'index.html'));
const tplComp = (e) => e.component;
function tplCard(e) {
  const prev = hasTplDemo(e.id)
    ? `<div class="prev tprev" aria-hidden="true" data-prev="/demo/effects/b/${e.id}/" data-w="1280" data-title="Live preview: ${esc(e.label)}"><span class="prev-sk"></span></div>`
    : `<div class="prev tprev prev-none" aria-hidden="true"><span>Live preview after the next demo export</span></div>`;
  return `<li class="tcard" data-g="${e.group}"><a class="tcard-a" href="/dashboards/${e.id}/" aria-label="${esc(e.label)}: open the live preview">${prev}</a>
<div class="tcard-b"><div class="tcard-t"><h3><a href="/dashboards/${e.id}/">${esc(e.label)}</a></h3><span class="tag">${esc(TPL_LABEL[e.group] ? TPL_LABEL[e.group].replace(/s$/, '') : cap(e.group))}</span></div>
<p>${esc(firstSentence(e.desc))}</p></div></li>`;
}
function dashboards() {
  const sections = tplGroups.map((g) => `<section class="tpl-g" aria-labelledby="g-${g}"><h2 id="g-${g}">${TPL_LABEL[g] || cap(g)} <span>${Object.values(TPL).filter((t) => t.group === g).length}</span></h2>
<ul class="tgrid">${Object.values(TPL).filter((t) => t.group === g).map(tplCard).join('\n')}</ul></section>`).join('\n');
  const main = `<div class="wrap cat">
  <div class="cat-head"><span class="eyebrow">Dashboards &amp; pages</span><h1>${N_TPL} whole screens to start from</h1>
  <p>Not components: complete, working screens with their own data and interactions. Open one to try it at full size, squeeze it to a tablet or a phone, and copy the line that adds it to your site.</p>
  <nav class="tpl-jump" aria-label="Jump to">${tplGroups.map((g) => `<a href="#g-${g}">${TPL_LABEL[g] || cap(g)}</a>`).join('')}</nav></div>
  ${sections}
</div>`;
  return page({ title: 'Dashboards & pages · Sitewright', p: '/dashboards/', current: 'dashboards', main, css: ['/catalog.css'], desc: `${N_TPL} whole-screen templates for generated sites: analytics, finance, sales, project, inbox, operations and AI-assistant dashboards, landing and 404 pages and a brand board.` });
}
function tplDetail(e) {
  const list = Object.values(TPL).filter((t) => t.group === e.group), i = list.findIndex((x) => x.id === e.id);
  const prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length];
  const gl = TPL_LABEL[e.group] || cap(e.group);
  const first = firstSentence(e.desc), rest = e.desc.slice(first.length).trim();
  const siteJson = `"effects": { "templates": ["${e.id}"] }`;
  const cli = `node ~/.claude/skills/sitewright/scripts/scaffold.mjs --config site.json --out ./my-site --templates ${e.id}`;
  const imp = `import ${tplComp(e)} from '@/components/fx/tpl/${tplComp(e)}';`;
  const files = e.files.map((f) => `<li><code>components/fx/tpl/${esc(f)}</code></li>`).join('') + e.css.map((c) => `<li><code>${esc(c)}.css</code> <span class="muted">styles</span></li>`).join('');
  const rail = list.map((x) => `<li><a href="/dashboards/${x.id}/"${x.id === e.id ? ' aria-current="page"' : ''}>${esc(x.label)}</a></li>`).join('');
  const pn = list.length > 1 ? `<div class="pn"><a rel="prev" href="/dashboards/${prev.id}/"><small>&larr; Previous</small><b>${esc(prev.label)}</b></a><a rel="next" href="/dashboards/${next.id}/"><small>Next &rarr;</small><b>${esc(next.label)}</b></a></div>` : '';
  const live = hasTplDemo(e.id);
  const main = `<div class="wrap det tdet">
  <div class="det-main">
    <nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="/dashboards/">Dashboards &amp; pages</a></li><li><a href="/dashboards/#g-${e.group}">${gl}</a></li><li aria-current="page">${esc(e.label)}</li></ol></nav>
    <h1>${esc(e.label)}</h1>
    <p class="det-sub">${esc(first)}</p>
    ${live ? '' : '<p class="nodemo">The live preview for this template is added with the next demo export.</p>'}
    <section class="stage-wrap tstage-wrap" aria-label="Live preview" id="tstage-wrap" data-id="${e.id}"${live ? '' : ' hidden'}>
      <div class="toolbar" role="toolbar" aria-label="Preview controls">
        <div class="seg" role="group" aria-label="Preview theme"><button type="button" data-theme="light" aria-pressed="true">Light</button><button type="button" data-theme="dark" aria-pressed="false">Dark</button></div>
        <div class="seg" role="group" aria-label="Device width"><button type="button" data-d="desktop" aria-pressed="true">Desktop</button><button type="button" data-d="tablet" aria-pressed="false">Tablet<small>820</small></button><button type="button" data-d="phone" aria-pressed="false">Phone<small>390</small></button></div>
        <div class="tb-end"><button type="button" class="btn-s" id="treplay">Replay</button><a class="btn-s" id="tfull" href="/demo/effects/b/${e.id}/${PREVIEW_QS}">Full screen</a></div>
      </div>
      <div class="tstage" id="tstage" data-d="desktop"><div class="tframe" id="tframe"><iframe id="tpv" title="Live preview of ${esc(e.label)}" data-src="/demo/effects/b/${e.id}/"></iframe></div></div>
      <noscript><p class="muted">Turn on JavaScript to run the live preview, or <a href="/demo/effects/b/${e.id}/">open it full screen</a>.</p></noscript>
    </section>
    <section class="blk"><h2>What it is for</h2><p>${esc(e.use || first)}</p>${rest ? `<p class="muted">${esc(rest)}</p>` : ''}</section>
    <section class="blk"><h2>Add it to a site</h2>
      <div class="codes">
        ${codeBlock('1 &middot; site.json', siteJson)}
        ${codeBlock('or on the command line', cli)}
        ${codeBlock('2 &middot; import it', imp)}
      </div>
    </section>
    <section class="blk two">
      <div><h2>Files</h2><ul class="files">${files}</ul></div>
      <div><h2>About it</h2><p>${e.source === 'Original' ? 'Original to Sitewright. MIT licensed.' : `Idea from <b>${esc(e.source)}</b>; the code is written for this kit.`} Demo data is fictional and deterministic. Every control on the page works, so try it before you take it.</p><p class="muted small">It answers its own width rather than the screen's, so the tablet and phone buttons show the real responsive behaviour. Templates are not components: they are chosen with <code>templates</code>, not <code>components</code>.</p></div>
    </section>
    ${pn}
  </div>
  <aside class="rail" aria-label="More in ${gl}">
    ${pn}
    <h2>More in ${gl} <span>${list.length}</span></h2>
    <ul class="rail-list">${rail}</ul>
    <a class="rail-all" href="/dashboards/#g-${e.group}">All ${gl.toLowerCase()} &rarr;</a>
  </aside>
</div>`;
  return page({ title: `${e.label} · ${gl.replace(/s$/, '')} template · Sitewright`, ogTitle: `${e.label}: a Sitewright template`, desc: trunc(`${e.desc} ${e.use || ''}`.trim(), 158), p: `/dashboards/${e.id}/`, current: 'dashboards', main, css: ['/catalog.css'], js: ['/catalog.js', '/dashboards.js'] });
}

// =============================================================================================================================
// search.json and sitemap
// =============================================================================================================================
function searchIndex() {
  const out = [];
  for (const e of Object.values(UI)) out.push({ t: 'component', id: e.id, title: e.label, url: `/components/${e.id}/`, group: groupLabel(e.group), desc: firstSentence(e.desc), k: `${e.id} ${e.source} ${e.use}`.toLowerCase() });
  for (const e of Object.values(TPL)) out.push({ t: 'template', id: e.id, title: e.label, url: tplUrl(e.id), group: (TPL_LABEL[e.group] || cap(e.group)), desc: firstSentence(e.desc), k: `${e.id} ${e.source} ${e.use}`.toLowerCase() });
  const pages = [['Components', '/components/', `Browse all ${N_UI} components`], ['Dashboards & pages', '/dashboards/', `${N_TPL} whole screens`], ['Effects lab', '/demo/effects/', 'Backgrounds, headlines, buttons and cards, live'], ['Icons', '/icons/', `${N_ICONS} icons that work offline`], ['Install', '/#install', 'Two minutes, then ask Claude'], ['FAQ', '/#faq', 'Questions people ask'], ['GitHub', GH, 'Source, issues and docs']];
  for (const [title, url, desc] of pages) out.push({ t: 'page', id: url, title, url, group: 'Page', desc, k: '' });
  return out;
}
const label2 = (g) => ({ dashboard: 'Dashboard', page: 'Page', brand: 'Brand' }[g] || cap(g));

// =============================================================================================================================
// Home
// =============================================================================================================================
const MODULES = [
  { id: 'landing', name: 'Landing page', shot: 'coffee/landing-story', alt: 'Landing page story section with a phone mock-up', pages: ['/'], api: [], needs: [],
    text: 'A public home page with an animated mark, a scroll-driven story with phone mock-ups, proof numbers, features, FAQ and a download card with a QR code.',
    pts: ['Headline, steps and FAQ come from your config', 'Proof and feature sections stay off until you give real facts'] },
  { id: 'signin', name: 'Sign in', shot: 'coffee/signin', alt: 'Shared password sign-in page', pages: ['/login'], api: ['/api/login', '/api/logout'], needs: [],
    text: 'A shared-password gate in front of the private pages: signed cookie, constant-time compare, safe ?next= redirect, edge middleware.',
    pts: ['API callers get 401, not a redirect page', 'Open-redirect attempts are ignored'] },
  { id: 'mfa', name: 'MFA accounts', shot: 'coffee/admin-enroll', alt: 'Authenticator enrolment screen with a QR code', pages: ['/admin', '/admin/enroll', '/admin/gate', '/admin/join', '/admin/login', '/admin/setup', '/admin/verify'],
    api: ['/api/admin/enroll', '/api/admin/gate', '/api/admin/invites', '/api/admin/join', '/api/admin/login', '/api/admin/logout', '/api/admin/people/[username]', '/api/admin/setup', '/api/admin/verify'], needs: [],
    text: 'Named accounts with password and authenticator-app codes. First-run setup, single-use invite links, lockout and an activity log.',
    pts: ['TOTP ±1 step, a used code is refused', '5 wrong tries lock the account for 15 minutes'] },
  { id: 'publishing', name: 'Publishing', shot: 'coffee/admin-publish-form', alt: 'Publishing form with file drop zone and release notes editor', pages: [],
    api: ['/api/admin/releases', '/api/admin/releases/[code]', '/api/admin/testers', '/api/admin/testers/[id]', '/api/app/download', '/api/app/latest', '/api/app/public/download', '/api/app/public/unlock', '/api/app/tester'], needs: ['mfa'],
    text: 'Upload a version, write notes in a rich editor, choose stable or testing, show it on the home page. Real APK parsing, or any file types you list.',
    pts: ['Build numbers must rise; downloads are byte-identical', 'Testers get codes and see testing builds only'] },
  { id: 'dashboard', name: 'Dashboard', shot: 'coffee/dashboard', alt: 'Dashboard with stat cards, filter chips and record cards', pages: ['/dashboard', '/records/[id]'], api: ['/api/records/[id]'], needs: ['signin', 'api'],
    text: 'Stat cards, status chips, search and facet filters over a card grid of records, plus a detail page with files, line items and one-click status changes.',
    pts: ['You name the statuses, labels and metrics', 'Fed by the ingest API, idempotent per record id'] },
  { id: 'connect', name: 'Connect to phone', shot: 'coffee/connect', alt: 'Connect page showing the link, a copy button and the latest download', pages: ['/connect'], api: [], needs: ['signin', 'api'],
    text: 'A page that shows the one link (address plus key) to paste into the client, a copy button, a curl example and the latest download.',
    pts: ['The key travels in the URL fragment', 'Shows the latest published download'] },
];
const TESTED = [['Bean & Barrel', 'all six modules, PDF/ZIP publishing, testers', 88], ['PulseFit', 'all six modules; real-APK checks need the APK files, not run in the latest pass', 65], ['Halden Legal', 'landing, sign-in, dashboard, connect; monogram logo, navy and gold', 61], ['Pixel Studio', 'landing and MFA only', 35], ['Sunny Side Bakery', 'near-white brand colours (contrast adjustment)', 76], ['Midnight Courier', 'near-black brand colours, other fonts, PDF/CSV publishing', 76], ['Quotes, tags, braces', 'a brand name full of quotes, tags, braces, backticks and a backslash', 76], ['Orbit Labs', 'a single module: landing only', 13], ['Field Notes Press', 'a single module: publishing only (brings MFA and the API)', 25], ['Acme Co', 'just a brand name, everything else defaulted', 76], ['Bean & Barrel + effects', 'aurora-glass preset, beams behind the sign-in card, cursor glow, scroll progress, count-up', 113], ['Play House', 'particles, split letters, ripple buttons, tilt cards, click sparks, stars on sign-in', 70], ['Ripple Works', 'waves, rotating headline word, magnetic buttons, glow-border cards, slide reveal', 60], ['Grid Labs', 'tech-grid preset: perspective grid, decode headline, spotlight cards', 65], ['Effect Lab', 'the live effects gallery: every background, headline, button, card, reveal and extra', 11]];
const T_CHECKS = TESTED.reduce((a, r) => a + r[2], 0);

function iconSvgs(names) {
  return names.map((n) => { const m = iconsHtml.match(new RegExp(`data-id="lucide:${n}"[^>]*>(<svg[\\s\\S]*?</svg>)`)); return m ? `<li title="${n}">${m[1].replace(/width="\d+" height="\d+"/, 'width="26" height="26"')}</li>` : ''; }).join('');
}
const themed = (src, alt, dark, w, h) => `<img class="only-light" src="/assets/shots/${src}.jpg" width="${w}" height="${h}" alt="${esc(alt)}" loading="lazy"><img class="only-dark" src="/assets/shots/${dark}.jpg" width="${w}" height="${h}" alt="" aria-hidden="true" loading="lazy">`;

function home() {
  const chips = (arr) => (arr.length ? arr.map((x) => `<li>${esc(x)}</li>`).join('') : '<li class="none">none</li>');
  const tabs = MODULES.map((m, i) => `<button type="button" role="tab" id="mt-${m.id}" aria-controls="mp-${m.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${m.name}</button>`).join('');
  const panels = MODULES.map((m, i) => `<div class="mod-panel" role="tabpanel" id="mp-${m.id}" aria-labelledby="mt-${m.id}"${i ? ' hidden' : ''}>
        <div class="mod-text">
          <h3>${m.name} <code>${m.id}</code></h3>
          <p>${esc(m.text)}</p>
          <ul class="ticks">${m.pts.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
          <div class="mod-adds"><h4>Pages</h4><ul class="chips">${chips(m.pages)}</ul><h4>API routes</h4><ul class="chips">${chips(m.api)}</ul></div>
          ${m.needs.length ? `<p class="needs">needs: ${m.needs.join(', ')} (added automatically)</p>` : ''}
        </div>
        <div class="browser mod-shot"><div class="browser-bar"><i></i><i></i><i></i><span>beanandbarrel.example &mdash; generated</span></div><img src="/assets/shots/${m.shot}.jpg" width="1440" height="900" alt="${esc(m.alt)}" loading="lazy"></div>
      </div>`).join('\n      ');
  const steps = [['Ask', 'Claude asks which modules you want, then your brand name, two colours and what you call things: orders, cases, scans.'], ['Configure', 'Your answers become one <code>site.json</code>. Skip anything and a sensible default fills in; nothing factual is invented.'], ['Generate', 'A complete Next.js project: pages, API routes, database schema, storage, middleware, a README.'], ['Verify', 'It builds the site and drives it in Chromium at 1280, 390 and 360 px, then shows what passed.']];
  const faq = [
    ['Does the generated site depend on Sitewright?', 'No. You get a normal Next.js project in a folder of your choice. Delete the skill and the site keeps working.'],
    ['Where does my data live?', 'In your own database and storage. In development it is an embedded Postgres in a folder inside the project plus local files. For production you point <code>DATABASE_URL</code> at Postgres and choose local, S3/R2 or Azure Blob storage.'],
    ['Does it make up numbers or testimonials?', 'No. Sections that need facts (proof numbers, feature lists, compatibility) are off until you give real content. The demo screenshots here use clearly fictional data.'],
    ['How secure is the sign-in?', 'It follows common practice: scrypt hashes, signed cookies, authenticator codes that cannot be reused, lockout after repeated failures. It has not had an independent security audit, so review it before putting anything sensitive behind it.'],
    ['Where do the effects come from? Is this React Bits?', 'No. Those libraries’ licences do not allow redistributing them inside another package, so these effects are written fresh for this kit, need no animation library, and are MIT licensed. Nineteen of the line figures are <a href="https://github.com/lucasmarkes/hairline" rel="noopener">Hairline</a> by Lucas Marques, also MIT, included with its licence notice; three more are new here. Icons come from the open sets behind Iconify, each under its own licence, which the generated site records.'],
    ['Can I change the design afterwards?', 'Yes. The colours are CSS variables at the top of <code>globals.css</code>, the logo is one file, and everything else is ordinary React you can edit.'],
  ];
  const tableRows = TESTED.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td class="ok">${r[2]} / ${r[2]}</td></tr>`).join('\n');
  const cmd = 'git clone https://github.com/raj742133/sitewright && cd sitewright && ./install.sh';
  const main = `<!-- ============================ HERO ============================ -->
<div class="hero" id="top">
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <span class="pill"><i></i> A skill for Claude Code &middot; MIT licensed</span>
      <h1>Describe your site. Get the <em>whole thing</em>.</h1>
      <p class="lead">Sitewright builds a complete Next.js site, backend included, from the pieces you pick, then drives it in a real browser to prove it works. Add motion, icons and ${N_UI} ready-made components with a single line. Your colours, your words, your data.</p>
      <div class="cta">
        <a class="btn primary" href="#install">Install the skill</a>
        <a class="btn" href="/components/">Browse ${N_UI} components</a>
      </div>
      <div class="copyline">
        <code tabindex="0"><b>$</b> ${esc(cmd)}</code>
        <button class="copy" type="button" data-copy="${esc(cmd)}">Copy</button>
      </div>
    </div>

    <div class="theatre" id="theatre" data-step="5">
      <div class="th-win">
        <div class="th-bar"><i></i><i></i><i></i><span>claude &mdash; Sitewright</span><button class="th-replay" id="th-replay" type="button" aria-label="Replay the demo">&#8635; Replay</button></div>
        <div class="th-chat">
          <p class="th-you"><b>you</b><span><span id="th-typed">Make a landing page, a dashboard and a connect page for my coffee roastery, Bean &amp; Barrel.</span><u class="th-caret" aria-hidden="true"></u></span></p>
          <div class="th-mods" role="list" aria-label="Modules Claude picked">
            <span role="listitem" class="on">Landing</span><span role="listitem" class="on">Dashboard</span><span role="listitem" class="on">Connect</span><span role="listitem" class="auto">+ Sign in</span><span role="listitem" class="auto">+ API</span><span role="listitem">MFA</span><span role="listitem">Publishing</span>
          </div>
          <ul class="th-log">
            <li><i>&#10003;</i> scaffold <em>56 files written</em></li>
            <li><i>&#10003;</i> type-check <em>clean</em></li>
            <li><i>&#10003;</i> production build <em>ok</em></li>
            <li><i>&#10003;</i> browser checks <em>pass at 1280, 390 and 360 px</em></li>
          </ul>
          <div class="th-prog" aria-hidden="true"><i></i></div>
        </div>
      </div>
      <div class="th-site">
        <div class="browser"><div class="browser-bar"><i></i><i></i><i></i><span>beanandbarrel.example &mdash; generated by Sitewright</span></div>
          <img src="/assets/shots/coffee/landing-hero.jpg" width="1440" height="900" alt="A generated landing page for a fictional coffee roaster, Bean &amp; Barrel: headline, download card with QR code, brown and amber palette"></div>
        <div class="phone"><img src="/assets/shots/coffee/landing-mobile.jpg" width="780" height="1688" alt="The same landing page on a phone" loading="lazy"></div>
      </div>
    </div>
  </div>
</div>

<!-- ============================ MODULES ============================ -->
<section id="modules">
  <div class="wrap">
    <div class="sec-head">
      <span class="eyebrow">Modules</span>
      <h2>Pick the pieces.</h2>
      <p>Each module is a self-contained slice of the site with its own pages, API routes and settings. Choose one or all six; dependencies are added for you.</p>
    </div>
    <div class="mods" id="mods">
      <div class="mod-tabs" role="tablist" aria-label="Modules">${tabs}</div>
      ${panels}
    </div>
  </div>
</section>

<!-- ============================ THE KIT ============================ -->
<section id="kit" class="band">
  <div class="wrap">
    <div class="sec-head">
      <span class="eyebrow">What&rsquo;s in the kit</span>
      <h2>Four shelves, all live.</h2>
      <p>Everything runs from the same code a generated site gets: original React, CSS and SVG, no animation or chart library.</p>
    </div>
    <div class="kit-tiles">
      <a class="kit-tile" href="/components/">
        <div class="kit-prev" aria-hidden="true" data-prev="/demo/effects/c/liquid-gauge/" data-title="Live preview: Liquid gauge" data-eager><span class="prev-sk"></span></div>
        <div class="kit-b"><h3>Components <b>${N_UI}</b></h3><p>Buttons, inputs, cards, loaders and ${byGroup('charts').length} charts. Search, preview in light and dark, copy one line.</p><span class="kit-go">Browse components &rarr;</span></div>
      </a>
      <a class="kit-tile" href="/dashboards/">
        <div class="kit-prev kit-shot" aria-hidden="true">${themed('coffee/dashboard', 'A generated dashboard with stat cards and record cards', 'coffee/dashboard-dark', 1440, 900)}</div>
        <div class="kit-b"><h3>Dashboards &amp; pages <b>${N_TPL}</b></h3><p>Whole screens to drop in: analytics, finance and sales dashboards, landing and 404 pages, a brand board.</p><span class="kit-go">See dashboards &rarr;</span></div>
      </a>
      <a class="kit-tile" href="/demo/effects/">
        <div class="kit-prev" aria-hidden="true" data-prev="/demo/effects/f/terrain/" data-title="Live preview: Terrain figure" data-eager><span class="prev-sk"></span></div>
        <div class="kit-b"><h3>Effects <b>${N_BG + N_FIG}+</b></h3><p>${N_BG} hero backgrounds and ${N_FIG} line figures, plus headline, button, card and reveal animations. Try every one in the lab.</p><span class="kit-go">Open the effects lab &rarr;</span></div>
      </a>
      <a class="kit-tile" href="/icons/">
        <div class="kit-prev kit-icons" aria-hidden="true"><ul>${iconSvgs(['coffee', 'truck', 'package', 'credit-card', 'chart-line', 'users', 'lock', 'smartphone', 'qr-code', 'calendar', 'mail', 'map-pin', 'shield-check', 'rocket', 'camera', 'bell'])}</ul></div>
        <div class="kit-b"><h3>Icons &amp; figures <b>${N_ICONS}</b></h3><p>${N_ICONS} icons that work with no network, and 200,000+ more by name. Write the icon where you want it.</p><span class="kit-go">Browse icons &rarr;</span></div>
      </a>
    </div>
  </div>
</section>

<!-- ============================ HOW IT WORKS ============================ -->
<section id="how">
  <div class="wrap">
    <div class="sec-head"><span class="eyebrow">How it works</span><h2>Four steps, one conversation.</h2></div>
    <ol class="how">
${steps.map((s, i) => `      <li><span class="n">${i + 1}</span><h3>${s[0]}</h3><p>${s[1]}</p></li>`).join('\n')}
    </ol>
  </div>
</section>

<!-- ============================ INSTALL ============================ -->
<section id="install" class="band">
  <div class="wrap">
    <div class="sec-head"><span class="eyebrow">Install</span><h2>Two minutes, then ask Claude.</h2><p>A skill is a folder Claude Code reads at the start of a session. Installing Sitewright means copying one folder into <code>~/.claude/skills/</code>.</p></div>
    <div class="install">
      <div>
        <div class="os-tabs" role="tablist" aria-label="Operating system">
          <button type="button" role="tab" aria-selected="true" data-os="mac">macOS / Linux</button>
          <button type="button" role="tab" aria-selected="false" data-os="win">Windows</button>
          <button type="button" role="tab" aria-selected="false" data-os="manual">Manual</button>
        </div>
        <div class="panel on" data-panel="mac">${codeBlock('Get the repo and install', 'git clone https://github.com/raj742133/sitewright\ncd sitewright\n./install.sh')}</div>
        <div class="panel" data-panel="win">${codeBlock('PowerShell', 'git clone https://github.com/raj742133/sitewright\ncd sitewright\n.\\install.ps1')}</div>
        <div class="panel" data-panel="manual">${codeBlock('Copy the folder yourself', 'git clone https://github.com/raj742133/sitewright\nmkdir -p ~/.claude/skills\ncp -R sitewright/skill/sitewright ~/.claude/skills/')}</div>
        ${codeBlock('Once, for the browser tests', 'npm i playwright\nnpx playwright install chromium')}
        <p class="ask">Then start a new Claude Code session and ask: <q>Use Sitewright to make a landing page and a dashboard for my business.</q></p>
      </div>
      <aside class="req">
        <h3>What you need</h3>
        <ul>
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg><span><b>Claude Code</b>, any recent version that supports skills</span></li>
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg><span><b>Node.js 20 or newer</b> (tested on 24)</span></li>
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg><span><b>~700 MB</b> of disk for the generated project&rsquo;s install</span></li>
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg><span><b>Playwright + Chromium</b> for the verification step (optional but recommended)</span></li>
        </ul>
      </aside>
    </div>

    <div class="tested" id="tested">
      <div class="tested-strip" role="list" aria-label="Test results">
        <div role="listitem"><b>${TESTED.length}</b><span>different sites generated and run</span></div>
        <div role="listitem"><b>${T_CHECKS}</b><span>browser checks passed across them</span></div>
        <div role="listitem"><b>3</b><span>viewports: 1280, 390, 360 px</span></div>
        <div role="listitem"><b>2</b><span>real Android APKs parsed, published and downloaded back</span></div>
      </div>
      <details class="tested-more"><summary>See all ${TESTED.length} results</summary>
        <div class="table-wrap" tabindex="0" role="region" aria-label="Test results by example site"><table><thead><tr><th>Site</th><th>What it exercises</th><th>Result</th></tr></thead><tbody>
${tableRows}
        </tbody></table></div>
      </details>
    </div>
  </div>
</section>

<!-- ============================ FAQ ============================ -->
<section id="faq">
  <div class="wrap">
    <div class="sec-head"><span class="eyebrow">FAQ</span><h2>Questions people ask.</h2></div>
    <div class="faq">
${faq.map((f) => `      <details><summary>${f[0]}</summary><p>${f[1]}</p></details>`).join('\n')}
    </div>
  </div>
</section>

<section class="finale">
  <div class="wrap">
    <h2>Describe it once. Ship the whole thing.</h2>
    <p>Free and open source. One command, then ask Claude.</p>
    <div class="cta"><a class="btn primary" href="#install">Install the skill</a><a class="btn" href="${GH}" rel="noopener">Star it on GitHub</a></div>
  </div>
</section>`;
  return page({
    title: 'Sitewright · a Claude Code skill that builds your website', ogTitle: 'Sitewright - a Claude Code skill that builds your website', p: '/', main, css: [], js: ['/catalog.js', '/app.js'],
    desc: `Pick the modules, give it your brand. Get a working Next.js site with a real backend, motion, icons and ${N_UI} live components, tested at desktop and phone sizes.`,
  });
}

// =============================================================================================================================
function main() {
  write('index.html', home());
  write('components/index.html', catalogue());
  for (const e of Object.values(UI)) write(`components/${e.id}/index.html`, detail(e));
  write('dashboards/index.html', dashboards());
  for (const e of Object.values(TPL)) write(`dashboards/${e.id}/index.html`, tplDetail(e));
  write('search.json', JSON.stringify(searchIndex()));
  const urls = ['/', '/components/', '/dashboards/', '/icons/', ...Object.keys(UI).map((id) => `/components/${id}/`), ...Object.keys(TPL).map((id) => `/dashboards/${id}/`)];
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${ORIGIN}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
  console.log(`build-site: home, catalogue, ${N_UI} component pages, dashboards gallery + ${N_TPL} template pages, search.json (${searchIndex().length} entries), sitemap.xml`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
