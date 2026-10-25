#!/usr/bin/env node
// Sitewright audits: reads a RUNNING site in a real browser and reports what a careful reviewer would, with the exact fix.
//
//   node <skill>/scripts/audit.mjs --url http://localhost:3000 [--mode all|a11y|critique|responsive] [--routes /,/login]
//                                  [--themes light,dark] [--widths 320,390,768,1280] [--out ./audit-out]
//                                  [--cookie name=value] [--fail-on blocking|important|none] [--max-pages 8]
//
// a11y        measured contrast ratios (each failure comes with the nearest passing colour), names, alt text, headings, language,
//             viewport, tap targets, keyboard focus.
// critique    a ranked design critique: type scale and size, hierarchy, line length and leading, spacing rhythm, consistency.
// responsive  the same pages at phone, tablet and desktop widths: sideways scroll (with the element to blame), clipped text, columns that
//             do not stack, small tap targets, input zoom; plus a phone-next-to-desktop picture of each page.
//
// Findings are ranked blocking > important > polish, every one with WHAT / WHY / FIX. Output: report.md, report.json, fixes.css
// (suggestions, never applied) and screenshots. Exit code 1 if anything at or above --fail-on (default blocking) was found.
// Needs Playwright resolvable from the cwd (`npm i playwright && npx playwright install chromium`). Run it against `npm start`
// (or `npm run dev`); it only reads pages and never submits anything.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { a11yRules, critiqueRules, responsiveRules, sortFindings, card, fixesCss, SEVERITY } from './lib/audit-rules.mjs';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const all = (k) => argv.flatMap((a, i) => (a === `--${k}` ? [argv[i + 1]] : []));
const URL0 = (arg('url', '') || '').replace(/\/$/, '');
if (!URL0) { console.error('usage: node audit.mjs --url http://localhost:3000 [--mode all|a11y|critique|responsive] [--routes /,/login] [--out ./audit-out]'); process.exit(2); }
const MODES = (arg('mode', 'all') === 'all' ? 'a11y,critique,responsive' : arg('mode')).split(',');
const THEMES = arg('themes', 'light,dark').split(',');
const WIDTHS = arg('widths', '390,768,1280').split(',').map(Number);
const OUT = path.resolve(arg('out', './audit-out'));
const FAIL_ON = arg('fail-on', 'blocking');
const MAX_PAGES = Number(arg('max-pages', '8'));
const COOKIES = all('cookie').map((c) => ({ name: c.slice(0, c.indexOf('=')), value: c.slice(c.indexOf('=') + 1), url: URL0 }));
fs.mkdirSync(OUT, { recursive: true });

const require = createRequire(path.join(process.cwd(), 'noop.js'));
const { chromium } = require('playwright');

// ---- what the page looks like, measured in the browser (rules live in lib/audit-rules.mjs) -------------------------------------
const MEASURE = () => {
  const px = (v) => parseFloat(v) || 0;
  const cv = document.createElement('canvas').getContext('2d', { willReadFrequently: true }); cv.canvas.width = cv.canvas.height = 1; const cache = new Map();
  // Computed colours can come back as color-mix(), color(srgb ...), oklch()...; a one-pixel canvas turns any of them into plain RGBA
  const parse = (c) => {
    const m = c.match(/^rgba?\(([^)]+)\)$/);
    if (m) { const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; }
    if (cache.has(c)) return cache.get(c);
    cv.clearRect(0, 0, 1, 1); cv.fillStyle = '#000'; cv.fillStyle = c; cv.fillRect(0, 0, 1, 1);
    const d = cv.getImageData(0, 0, 1, 1).data; const out = [d[0], d[1], d[2], d[3] / 255]; cache.set(c, out); return out;
  };
  const over = (top, bot) => { const a = top[3] + bot[3] * (1 - top[3]); if (!a) return [0, 0, 0, 0]; return [0, 1, 2].map((i) => (top[i] * top[3] + bot[i] * bot[3] * (1 - top[3])) / a).concat(a); };
  const hex = (c) => '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  const visible = (e) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const sel = (e) => {
    const parts = [];
    for (let n = e; n && n.nodeType === 1 && parts.length < 3 && n !== document.body; n = n.parentElement) {
      if (n.id && !/\d{3,}|:/.test(n.id)) { parts.unshift('#' + CSS.escape(n.id)); break; }
      const cls = [...n.classList].filter((c) => !/^(_|css-|\d)|[:\[\]]/.test(c)).slice(0, 2).map((c) => '.' + CSS.escape(c)).join('');
      parts.unshift(n.tagName.toLowerCase() + cls);
    }
    return parts.join(' > ');
  };
  const clippedAway = (el) => { // text pushed outside a box that clips it is not on screen
    const t = el.getBoundingClientRect(), cx = (t.left + t.right) / 2, cy = (t.top + t.bottom) / 2;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a); if (/(hidden|clip)/.test(o.overflowX + o.overflowY)) { const r = a.getBoundingClientRect(); if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return true; } }
    return false;
  };
  const pictureBehind = (el) => { // an absolutely positioned svg/img/canvas/video under the text: the real background is a picture
    const t = el.getBoundingClientRect();
    for (let a = el.parentElement, i = 0; a && i < 5; a = a.parentElement, i++) for (const c of a.children) { if (c.contains(el)) continue; const cs = getComputedStyle(c); if (cs.position !== 'absolute' && cs.position !== 'fixed') continue; if (!/^(SVG|IMG|CANVAS|VIDEO|PICTURE)$/i.test(c.tagName) && cs.backgroundImage === 'none' && !c.querySelector('svg,img,canvas,video')) continue; const r = c.getBoundingClientRect(); const cx = (t.left + t.right) / 2, cy = (t.top + t.bottom) / 2; if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) return true; }
    return false;
  };
  const effective = (el) => {
    let op = 1, bg = [0, 0, 0, 0], unknown = pictureBehind(el);
    for (let n = el; n; n = n.parentElement) op *= Number(getComputedStyle(n).opacity);
    for (let n = el; n && bg[3] < 0.99 && !unknown; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage !== 'none') { unknown = true; break; }
      bg = over(bg, parse(cs.backgroundColor));
      if (n === document.documentElement) break;
    }
    if (bg[3] < 0.99 && !unknown) bg = over(bg, [255, 255, 255, 1]); // the canvas
    return { bg, op, unknown };
  };
  const out = { decorative: 0, text: [], interactive: [], images: [], headings: [], fontSizes: {}, paragraphs: [], spacing: [], buttons: [], inputs: [], offenders: [], clipped: [], rows: [] };
  const seen = new Set();
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n; (n = tw.nextNode());) {
    const t = n.textContent.trim(); const el = n.parentElement;
    if (!t || !el || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(el.tagName) || !visible(el)) continue;
    if (el.closest('[aria-hidden="true"]')) { out.decorative++; continue; } // mock-ups and ornaments: not content, not judged
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.bottom < 0 || clippedAway(el)) continue;
    const cs = getComputedStyle(el); const size = px(cs.fontSize); const weight = Number(cs.fontWeight) || 400;
    out.fontSizes[size] = (out.fontSizes[size] ?? 0) + t.length;
    const { bg, op, unknown } = effective(el);
    if (op < 0.5) continue; // still fading in, or hidden on purpose
    if (op < 0.99) { let looping = false; for (let a = el; a && !looping; a = a.parentElement) looping = a.getAnimations().some((x) => x.effect?.getComputedTiming?.().iterations === Infinity); if (looping) continue; } // a word that cycles in and out is not a fixed colour
    const fgRaw = parse(cs.color); fgRaw[3] *= op;
    const fg = over(fgRaw, unknown ? [255, 255, 255, 1] : bg);
    const key = sel(el) + cs.color; if (seen.has(key)) continue; seen.add(key);
    out.text.push({ sel: sel(el), text: t.slice(0, 80), fg: hex(fg), bg: unknown ? null : hex(bg), unknownBg: unknown, size, weight, large: size >= 24 || (size >= 18.66 && weight >= 700) });
    if (out.text.length > 500) break;
  }
  for (const e of document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=tab],[role=menuitem],[role=checkbox],[role=switch]')) {
    if (!visible(e) || e.closest('[aria-hidden="true"]')) continue;
    const r = e.getBoundingClientRect();
    const lab = e.id && document.querySelector(`label[for="${CSS.escape(e.id)}"]`);
    const ids = (e.getAttribute('aria-labelledby') || '').split(/\s+/).map((i) => document.getElementById(i)?.textContent || '').join(' ').trim();
    const name = (e.getAttribute('aria-label') || ids || (lab && lab.textContent) || e.closest('label')?.textContent || (e.tagName === 'INPUT' && /^(button|submit|reset)$/.test(e.type) ? e.value : '') || e.textContent || e.getAttribute('title') || e.querySelector('img[alt]')?.getAttribute('alt') || '').trim();
    const inline = e.tagName === 'A' && getComputedStyle(e).display === 'inline' && !!e.closest('p,li,span,td,dd');
    out.interactive.push({ sel: sel(e), tag: e.tagName.toLowerCase(), type: e.type, w: r.width, h: r.height, name, placeholder: !name && !!e.getAttribute('placeholder'), inline: inline || (e.tagName === 'INPUT' && /^(checkbox|radio)$/.test(e.type) && !!e.closest('label')) });
    if (e.tagName === 'BUTTON' || e.getAttribute('role') === 'button') out.buttons.push({ h: r.height, radius: getComputedStyle(e).borderTopLeftRadius });
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.tagName) && !/^(checkbox|radio|range|color|file|hidden|submit|button)$/.test(e.type)) out.inputs.push({ sel: sel(e), size: px(getComputedStyle(e).fontSize) });
  }
  for (const i of document.querySelectorAll('img')) if (visible(i)) out.images.push({ sel: sel(i), hasAlt: i.hasAttribute('alt') });
  for (const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) if (visible(h)) out.headings.push({ level: Number(h.tagName[1]), sel: sel(h), text: h.textContent.trim().slice(0, 60), size: px(getComputedStyle(h).fontSize) });
  for (const p of document.querySelectorAll('p,li')) {
    if (!visible(p) || p.textContent.trim().length < 80) continue;
    const cs = getComputedStyle(p), r = p.getBoundingClientRect(), size = px(cs.fontSize), lh = px(cs.lineHeight) || size * 1.2;
    out.paragraphs.push({ sel: sel(p), w: r.width, size, lh, lines: Math.round(r.height / lh), cpl: r.width / (size * 0.5) });
    if (out.paragraphs.length > 60) break;
  }
  let nEl = 0;
  for (const e of document.body.querySelectorAll('*')) {
    if (!visible(e)) continue; if (++nEl > 1500) break;
    const cs = getComputedStyle(e);
    for (const k of ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'marginTop', 'marginBottom', 'rowGap', 'columnGap']) { const v = Math.round(px(cs[k])); if (v > 0 && v < 200) out.spacing.push(v); }
    const r = e.getBoundingClientRect();
    if (r.right > innerWidth + 1 && !/^(HTML|BODY)$/.test(e.tagName) && cs.position !== 'fixed') {
      let clipped = false; for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a); if (/(auto|scroll|hidden|clip)/.test(o.overflowX)) { clipped = true; break; } }
      if (!clipped && out.offenders.length < 30) out.offenders.push({ sel: sel(e), tag: e.tagName.toLowerCase(), right: r.right, fixedW: /px$/.test(cs.width) && r.width > innerWidth ? r.width : 0 });
    }
    if (e.children.length === 0 && e.textContent.trim() && e.scrollWidth > e.clientWidth + 2 && /(hidden|clip)/.test(cs.overflowX) && cs.textOverflow !== 'ellipsis' && out.clipped.length < 8) out.clipped.push({ sel: sel(e), tag: e.tagName.toLowerCase(), text: e.textContent.trim(), scrollW: e.scrollWidth, clientW: e.clientWidth });
    if (!e.closest('header,nav,footer') && ((cs.display === 'flex' && cs.flexDirection.startsWith('row') && cs.flexWrap === 'nowrap') || cs.display === 'grid')) {
      const kids = [...e.children].filter(visible); const cols = cs.display === 'grid' ? cs.gridTemplateColumns.split(' ').length : kids.length;
      if (kids.length >= 3 && cols >= 3 && innerWidth <= 480) { const top = kids[0].getBoundingClientRect().top, row = kids.filter((k) => Math.abs(k.getBoundingClientRect().top - top) < 4); const avg = row.reduce((s, k) => s + k.getBoundingClientRect().width, 0) / row.length; if (row.length >= 3 && avg < 120 && e.textContent.trim().length > 12 * row.length && out.rows.length < 6) out.rows.push({ sel: sel(e), n: row.length, avg }); }
    }
  }
  out.overflowX = document.documentElement.scrollWidth - innerWidth;
  out.lang = !!document.documentElement.lang; out.title = !!document.title.trim();
  out.viewport = document.querySelector('meta[name=viewport]')?.getAttribute('content') ?? null;
  out.links = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => h && h.startsWith('/') && !h.startsWith('//') && !/\.(png|jpg|svg|ico|pdf|zip|apk|xml|txt)(\?|$)/.test(h)).map((h) => h.split('#')[0].split('?')[0]);
  return out;
};

async function focusProbe(page) {
  await page.evaluate(() => document.activeElement?.blur());
  const out = [];
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      const e = document.activeElement; if (!e || e === document.body) return null;
      const cs = getComputedStyle(e);
      const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow !== 'none' && !/^rgba?\(0, 0, 0, 0\)/.test(cs.boxShadow));
      const own = /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName) && ring === false && cs.borderColor !== getComputedStyle(document.body).borderColor;
      const n = e.id ? '#' + e.id : e.tagName.toLowerCase() + ([...e.classList][0] ? '.' + [...e.classList][0] : '');
      return { sel: n, visible: ring || own };
    });
    if (r) out.push(r);
  }
  return out;
}

// ---- run ---------------------------------------------------------------------------------------------------------------------
const browser = await chromium.launch();
const findings = []; const shots = [];
const pages = new Set(arg('routes', '').split(',').filter(Boolean));
const slug = (r) => (r === '/' ? 'home' : r.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, ''));
const ctxFor = async (width, theme) => { const c = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme, hasTouch: width <= 480 }); if (COOKIES.length) await c.addCookies(COOKIES); return c; };

if (!pages.size) { // discover same-site pages from the home page
  const c = await ctxFor(1280, 'light'); const p = await c.newPage();
  const resp = await p.goto(URL0 + '/', { waitUntil: 'load' }).catch(() => null);
  if (!resp) { console.error(`Cannot reach ${URL0}/ - is the site running?`); process.exit(2); }
  await p.waitForTimeout(800);
  const m = await p.evaluate(MEASURE); pages.add('/'); for (const l of [...new Set(m.links)].slice(0, MAX_PAGES - 1)) pages.add(l);
  await c.close();
}
console.log(`Auditing ${[...pages].join(' ')} (${MODES.join(', ')}; ${THEMES.join('/')}; ${WIDTHS.join('/')}px)`);

for (const route of [...pages].slice(0, MAX_PAGES)) {
  const picture = {};
  for (const width of WIDTHS) for (const theme of THEMES) {
    const c = await ctxFor(width, theme); const p = await c.newPage();
    await p.route('**/*', (r) => (/fonts\.(googleapis|gstatic)\.com/.test(r.request().url()) ? r.abort() : r.continue()));
    const resp = await p.goto(URL0 + route, { waitUntil: 'load' }).catch(() => null);
    if (!resp || resp.status() >= 400) { findings.push({ mode: 'a11y', route, severity: 'important', id: 'status', title: `Page answered ${resp?.status() ?? 'nothing'}`, what: `${route} could not be audited`, where: route, why: 'A page that does not load cannot be reviewed.', fix: 'Check the route, or pass --cookie for pages behind sign-in.', count: 1, examples: [route] }); await c.close(); continue; }
    await p.evaluate((t) => { document.documentElement.dataset.theme = t; }, theme); await p.waitForTimeout(700);
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo({ top: 0, behavior: 'instant' }); });
    await p.evaluate(() => { for (const a of document.getAnimations()) { try { const t = a.effect?.getComputedTiming?.(); if (t && Number.isFinite(t.endTime)) a.finish(); } catch { /* infinite or already done */ } } });
    await p.waitForTimeout(500);
    const m = await p.evaluate(MEASURE); const ctx = { width, theme, route };
    const add = (mode, list) => { for (const g of list) findings.push({ ...g, mode, route, width, theme }); };
    if (MODES.includes('a11y') && (theme !== THEMES[0] || width === WIDTHS[WIDTHS.length - 1] || width <= 480)) { ctx.focus = width > 480 && theme === THEMES[0] ? await focusProbe(p) : undefined; add('a11y', a11yRules(m, ctx)); }
    if (MODES.includes('critique') && width === WIDTHS[WIDTHS.length - 1]) add('critique', critiqueRules(m, ctx, { withContrast: !MODES.includes('a11y') }));
    if (MODES.includes('responsive')) add('responsive', responsiveRules(m, ctx));
    if (theme === THEMES[0] && (width === 390 || width === WIDTHS[WIDTHS.length - 1])) { picture[width] = (await p.screenshot({ fullPage: true })).toString('base64'); }
    await c.close();
  }
  const keys = Object.keys(picture).map(Number).sort((a, b) => a - b);
  if (keys.length) { // phone next to desktop, one image per page
    const c = await browser.newContext({ viewport: { width: 1500, height: 900 } }); const p = await c.newPage();
    await p.setContent(`<body style="margin:0;background:#222;display:flex;gap:24px;padding:24px;align-items:flex-start;font:12px system-ui;color:#ccc">${keys.map((k) => `<figure style="margin:0"><div style="margin-bottom:6px">${k}px</div><img style="width:${k <= 480 ? 300 : 1000}px;display:block;border-radius:6px" src="data:image/png;base64,${picture[k]}"></figure>`).join('')}</body>`);
    await p.waitForTimeout(300); const f = path.join(OUT, `${slug(route)}-responsive.png`); await p.screenshot({ path: f, fullPage: true }); shots.push(f); await c.close();
  }
}
await browser.close();

// ---- merge duplicates across themes and widths, rank, write -------------------------------------------------------------------
const merged = new Map();
for (const g of findings) {
  const k = [g.mode, g.route, g.id, g.key, g.where].join('|');
  const have = merged.get(k);
  if (have) { have.where2 = (have.where2 ?? new Set()).add(`${g.theme}/${g.width}px`); if (g.count > have.count) have.count = g.count; } else merged.set(k, { ...g, where2: new Set([`${g.theme}/${g.width}px`]) });
}
const list = sortFindings([...merged.values()]).map((g) => ({ ...g, seen: [...g.where2].join(', '), where2: undefined }));
const count = (s) => list.filter((g) => g.severity === s).length;
const worst = (m) => SEVERITY.filter((s) => list.some((g) => g.mode === m && g.severity === s))[0] ?? 'clean';
const TITLES = { a11y: 'Accessibility', critique: 'Design critique', responsive: 'Responsive' };
let md = `# Sitewright audit\n\n${URL0} · ${[...pages].join(' ')} · ${new Date().toISOString().slice(0, 10)}\n\n**${count('blocking')} blocking · ${count('important')} important · ${count('polish')} polish**\n\n`;
for (const mode of MODES) {
  const g = list.filter((x) => x.mode === mode);
  md += `## ${TITLES[mode]} (${g.length ? worst(mode) : 'clean'})\n\n${g.length ? '' : 'Nothing found.\n\n'}`;
  for (const s of SEVERITY) for (const x of g.filter((y) => y.severity === s)) md += card({ ...x, where: x.where }) + `- **SEEN** ${x.route} · ${x.seen}\n\n`;
}
if (shots.length) md += `## Pictures\n\n${shots.map((s) => `- ${path.basename(s)}`).join('\n')}\n`;
fs.writeFileSync(path.join(OUT, 'report.md'), md);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ url: URL0, pages: [...pages], counts: { blocking: count('blocking'), important: count('important'), polish: count('polish') }, findings: list }, null, 2));
fs.writeFileSync(path.join(OUT, 'fixes.css'), fixesCss(list));
console.log(`\n${count('blocking')} blocking, ${count('important')} important, ${count('polish')} polish  ->  ${path.join(OUT, 'report.md')}`);
for (const x of list.filter((y) => y.severity === 'blocking').slice(0, 8)) console.log(`  [blocking] ${x.mode}: ${x.title} - ${x.where} (${x.route})`);
const limit = FAIL_ON === 'none' ? 99 : SEVERITY.indexOf(FAIL_ON);
process.exit(list.some((g) => SEVERITY.indexOf(g.severity) <= limit) ? 1 : 0);
