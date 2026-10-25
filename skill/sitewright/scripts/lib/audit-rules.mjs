// The judgement half of the audit: pure functions from page measurements to findings. No browser in here, so the rules
// can be tested with plain objects (tools/audit-test.mjs does) and every fix suggestion can be checked by recomputing it.

import { contrast, ensureContrast, hexToRgb, rgbToHex } from './color.mjs';

export const SEVERITY = ['blocking', 'important', 'polish'];
const rank = (s) => SEVERITY.indexOf(s);

const WCAG = 'WCAG 2.2 AA';

/** Smallest change to the text colour that reaches `min` on `bg`: lightness moves, hue stays; falls back to black or white. */
export function fixTextColour(fg, bg, min) {
  let to = ensureContrast(fg, bg, min);
  if (contrast(to, bg) < min) to = contrast('#ffffff', bg) >= contrast('#000000', bg) ? '#ffffff' : '#000000';
  return { to, ratio: contrast(to, bg) };
}

const short = (s, n = 38) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const f1 = (n) => (Math.round(n * 100) / 100).toString();

/** Group findings that share a rule and a key so one card can say "and 7 more". */
function group(items) {
  const out = new Map();
  for (const it of items) {
    const k = it.id + '|' + (it.key ?? '');
    const g = out.get(k);
    if (g) { g.count++; if (g.examples.length < 3) g.examples.push(it.where); } else out.set(k, { ...it, count: 1, examples: [it.where] });
  }
  return [...out.values()];
}

/** Accessibility: measured ratios, names, structure, focus. `m` is one page at one theme and width. */
export function a11yRules(m, ctx) {
  const f = [];
  for (const t of m.text) {
    if (t.unknownBg || !t.bg) { f.push({ id: 'contrast-unmeasured', severity: 'polish', key: t.sel, where: t.sel, title: 'Contrast could not be measured', what: `Text "${short(t.text)}" sits on a gradient or image`, why: 'No single background colour exists to measure against, so a ratio cannot be computed.', fix: 'Put a solid or semi-opaque panel behind the text, or check the worst spot by eye.', manual: true }); continue; }
    const min = t.large ? 3 : 4.5;
    const r = contrast(t.fg, t.bg);
    if (r >= min) continue;
    const fx = fixTextColour(t.fg, t.bg, min);
    f.push({ id: 'contrast', severity: 'blocking', key: `${t.fg}|${t.bg}|${t.large}`, where: t.sel, title: `Contrast ${f1(r)}:1`, what: `Text ${t.fg} on ${t.bg} is ${f1(r)}:1 (${t.large ? 'large text' : 'normal text'}, needs ${min}:1). e.g. "${short(t.text)}"`, why: `Fails ${WCAG} 1.4.3. People with low vision, in sunlight or on dim screens cannot read it.`, fix: `Set the text colour to ${fx.to} (${f1(fx.ratio)}:1).`, patch: { property: 'color', from: t.fg, to: fx.to, ratio: fx.ratio, theme: ctx.theme } });
  }
  for (const el of m.interactive) {
    if (!el.name && el.placeholder) f.push({ id: 'placeholder-name', severity: 'important', key: el.tag, where: el.sel, title: 'Field named only by its placeholder', what: `${el.tag} has a placeholder but no label`, why: 'The hint disappears as soon as someone types, and some screen readers skip it.', fix: 'Add a <label for> (or at least aria-label) with the same words.' });
    else if (!el.name) f.push({ id: 'name', severity: 'blocking', key: el.tag + (el.type ?? ''), where: el.sel, title: 'Control has no accessible name', what: `${el.tag}${el.type ? `[type=${el.type}]` : ''} with no label, text or aria-label`, why: `Fails ${WCAG} 4.1.2. A screen reader announces it as just "${el.tag === 'a' ? 'link' : el.tag === 'button' ? 'button' : 'edit text'}".`, fix: el.tag === 'input' ? 'Add a <label for> (or aria-label) that says what to enter.' : 'Add visible text or aria-label that says what it does.' });
  }
  for (const im of m.images) if (!im.hasAlt) f.push({ id: 'alt', severity: 'blocking', key: 'img', where: im.sel, title: 'Image without alt text', what: `<img> has no alt attribute`, why: `Fails ${WCAG} 1.1.1. Screen readers read out the file name.`, fix: 'Add alt="" if the image is decoration, otherwise a short description.' });
  if (!m.lang) f.push({ id: 'lang', severity: 'blocking', key: 'lang', where: 'html', title: 'Page language not set', what: '<html> has no lang attribute', why: 'Screen readers pick the wrong voice and hyphenation.', fix: 'Add lang="en" (or the page language) to <html>.' });
  if (!m.title) f.push({ id: 'title', severity: 'important', key: 'title', where: 'head', title: 'Page has no title', what: '<title> is empty', why: 'Tabs, history and screen readers all rely on it.', fix: 'Give every page a short, specific <title>.' });
  if (m.viewport === null || /user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/.test(m.viewport ?? '')) f.push({ id: 'viewport', severity: 'blocking', key: 'viewport', where: 'head', title: m.viewport === null ? 'No viewport meta tag' : 'Zoom is disabled', what: m.viewport === null ? 'Phones render the page at desktop width' : `viewport = "${m.viewport}"`, why: 'People who need to zoom cannot. Fails WCAG 1.4.4.', fix: 'Use <meta name="viewport" content="width=device-width, initial-scale=1">.' });
  const h1s = m.headings.filter((h) => h.level === 1).length;
  if (!h1s) f.push({ id: 'h1', severity: 'important', key: 'h1', where: 'body', title: 'No main heading', what: 'The page has no <h1>', why: 'Screen reader users jump by headings; the h1 says what the page is.', fix: 'Add one h1 that names the page.' });
  else if (h1s > 1) f.push({ id: 'h1-many', severity: 'polish', key: 'h1', where: 'body', title: 'More than one h1', what: `${h1s} h1 elements`, why: 'Muddies the outline.', fix: 'Keep one h1; demote the rest to h2.' });
  let prev = 0;
  for (const h of m.headings) { if (prev && h.level > prev + 1) f.push({ id: 'heading-skip', severity: 'important', key: `${prev}>${h.level}`, where: h.sel, title: 'Heading level skipped', what: `h${prev} is followed by h${h.level} ("${short(h.text)}")`, why: 'The outline jumps, which confuses heading navigation.', fix: `Use h${prev + 1}, and style it to look as you want.` }); prev = h.level; }
  const mobile = ctx.width <= 480;
  for (const el of m.interactive) {
    if (el.inline) continue;
    const small = Math.min(el.w, el.h);
    if (small < 24) f.push({ id: 'target-24', severity: 'blocking', key: `${Math.round(el.w)}x${Math.round(el.h)}`, where: el.sel, title: 'Tap target under 24px', what: `${el.tag} is ${Math.round(el.w)}×${Math.round(el.h)}px`, why: `Fails ${WCAG} 2.5.8 (minimum 24×24 CSS px).`, fix: 'Give it min-height and min-width of 44px (padding is fine).', patch: { property: 'min-height', to: '44px', extra: 'min-width: 44px' } });
    else if (mobile && small < 44) f.push({ id: 'target-44', severity: 'important', key: `${Math.round(el.w)}x${Math.round(el.h)}`, where: el.sel, title: 'Tap target under 44px on a phone', what: `${el.tag} is ${Math.round(el.w)}×${Math.round(el.h)}px`, why: 'Thumbs miss small targets; 44×44 is the usual comfortable minimum.', fix: 'min-height: 44px (and min-width for icon buttons).', patch: { property: 'min-height', to: '44px', extra: 'min-width: 44px' } });
  }
  if (ctx.focus) for (const el of ctx.focus) if (!el.visible) f.push({ id: 'focus', severity: 'blocking', key: 'focus', where: el.sel, title: 'No visible focus indicator', what: `Tabbing to ${el.sel} shows no outline, ring or shadow`, why: `Fails ${WCAG} 2.4.7. Keyboard users cannot see where they are.`, fix: 'Add :focus-visible { outline: 2px solid currentColor; outline-offset: 2px }.', patch: { property: 'outline', to: '2px solid currentColor', extra: 'outline-offset: 2px', pseudo: ':focus-visible' } });
  return group(f);
}

/** Design critique: type, hierarchy, rhythm, consistency. Ranked by severity. */
export function critiqueRules(m, ctx, { withContrast = false } = {}) {
  const f = [];
  const sizes = Object.entries(m.fontSizes).map(([k, v]) => [Number(k), v]).sort((a, b) => b[1] - a[1]);
  const body = sizes[0]?.[0] ?? 16;
  const tiny = m.text.filter((t) => t.size < 12 && !t.unknownBg);
  for (const t of tiny.slice(0, 40)) f.push({ id: 'tiny', severity: t.size < 11 ? 'blocking' : 'important', key: String(Math.round(t.size)), where: t.sel, title: `Text at ${f1(t.size)}px`, what: `"${short(t.text)}" is ${f1(t.size)}px`, why: 'Below 12px is hard to read for most people, and worse on phones.', fix: 'Use 12px at the very least; 14px+ for anything people need to read.', patch: { property: 'font-size', to: t.size < 11 ? '12px' : '13px' } });
  if (body < 14) f.push({ id: 'body-size', severity: 'important', key: 'body', where: 'body', title: 'Body text is small', what: `Most text is ${f1(body)}px`, why: 'Reading comfort drops fast under 14px.', fix: 'Set body copy to 16px (15px at the very least).' });
  const h1 = m.headings.find((h) => h.level === 1);
  if (h1 && body > 0 && h1.size / body < 1.8) f.push({ id: 'hierarchy', severity: 'important', key: 'h1', where: h1.sel, title: 'Weak hierarchy', what: `The h1 is ${f1(h1.size)}px against ${f1(body)}px body text (${f1(h1.size / body)}×)`, why: 'The page title barely stands out from the copy, so the eye has no entry point.', fix: `Make the h1 at least ${Math.ceil(body * 2)}px (2× body), or add weight contrast.` });
  const distinct = sizes.length;
  if (distinct > 9) f.push({ id: 'type-scale', severity: 'important', key: 'scale', where: 'body', title: 'Too many font sizes', what: `${distinct} different sizes: ${sizes.slice(0, 10).map((s) => s[0]).sort((a, b) => a - b).join(', ')}px…`, why: 'A scale of 5 to 7 sizes reads as designed; more reads as accumulated.', fix: 'Pick a scale (12, 14, 16, 20, 24, 32, 48) and snap every size to it.' });
  else if (distinct > 7) f.push({ id: 'type-scale', severity: 'polish', key: 'scale', where: 'body', title: 'Many font sizes', what: `${distinct} different sizes`, why: 'Close sizes (15 vs 16) look like mistakes.', fix: 'Merge sizes that differ by 1 or 2px.' });
  for (const p of m.paragraphs) {
    if (p.cpl > 100) f.push({ id: 'measure', severity: 'important', key: 'long', where: p.sel, title: 'Lines too long', what: `About ${Math.round(p.cpl)} characters per line`, why: 'Past ~90 characters the eye loses its place on the next line.', fix: `max-width: ${Math.round(p.size * 0.5 * 75)}px (about 75 characters).`, patch: { property: 'max-width', to: `${Math.round(p.size * 0.5 * 75)}px` } });
    else if (p.cpl > 85) f.push({ id: 'measure', severity: 'polish', key: 'long', where: p.sel, title: 'Long lines', what: `About ${Math.round(p.cpl)} characters per line`, why: 'The comfortable range is 45 to 80.', fix: `max-width: ${Math.round(p.size * 0.5 * 75)}px.`, patch: { property: 'max-width', to: `${Math.round(p.size * 0.5 * 75)}px` } });
    if (p.lh && p.lh / p.size < 1.35 && p.lines > 1) f.push({ id: 'leading', severity: 'important', key: 'tight', where: p.sel, title: 'Tight line spacing', what: `Line height is ${f1(p.lh / p.size)}× on multi-line text`, why: 'Cramped leading makes paragraphs read as a wall.', fix: 'line-height: 1.5 for body copy.', patch: { property: 'line-height', to: '1.5' } });
  }
  const offGrid = m.spacing.filter((v) => v % 4 !== 0 && v > 0);
  if (m.spacing.length > 30 && offGrid.length / m.spacing.length > 0.35) f.push({ id: 'rhythm', severity: 'polish', key: 'grid', where: 'body', title: 'Spacing is off a grid', what: `${Math.round((offGrid.length / m.spacing.length) * 100)}% of padding, margin and gap values are not multiples of 4px`, why: 'A shared step (4 or 8px) is what makes spacing feel deliberate.', fix: 'Round spacing to a 4px scale: 4, 8, 12, 16, 24, 32, 48, 64.' });
  const colours = new Set(m.text.filter((t) => !t.unknownBg).map((t) => t.fg));
  if (colours.size > 8) f.push({ id: 'colours', severity: 'polish', key: 'text', where: 'body', title: 'Many text colours', what: `${colours.size} distinct text colours`, why: 'Ink, muted, link and one accent are usually enough.', fix: 'Collapse near-duplicates into 3 or 4 tokens.' });
  const btnH = new Set(m.buttons.map((b) => Math.round(b.h / 4) * 4)), btnR = new Set(m.buttons.map((b) => b.radius));
  if (m.buttons.length > 3 && btnH.size > 3) f.push({ id: 'buttons', severity: 'polish', key: 'h', where: 'button', title: 'Buttons are inconsistent', what: `${m.buttons.length} buttons in ${btnH.size} different heights`, why: 'Matching buttons are the cheapest way to look professional.', fix: 'Define sm / md / lg heights once and reuse them.' });
  else if (m.buttons.length > 3 && btnR.size > 3) f.push({ id: 'buttons', severity: 'polish', key: 'r', where: 'button', title: 'Corner radii are inconsistent', what: `${btnR.size} different button corner radii`, why: 'Mixed radii look accidental.', fix: 'Use one radius token for controls.' });
  return [...group(f), ...(withContrast ? a11yRules(m, ctx).filter((g) => g.id === 'contrast') : [])];
}

/** Responsive: what breaks when the same page is squeezed to a phone. */
export function responsiveRules(m, ctx) {
  const f = [];
  const w = ctx.width;
  if (m.overflowX > 1) for (const o of m.offenders.slice(0, 6)) {
    const tag = o.tag;
    const fix = tag === 'img' || tag === 'video' || tag === 'svg' || tag === 'iframe' ? 'max-width: 100%; height: auto;' : tag === 'table' ? 'Wrap it in a container with overflow-x: auto.' : tag === 'pre' ? 'overflow-x: auto; max-width: 100%;' : o.fixedW ? `width: 100%; max-width: ${Math.round(o.fixedW)}px;` : 'min-width: 0; overflow-wrap: anywhere; (a flex or grid child usually needs min-width: 0)';
    f.push({ id: 'overflow', severity: 'blocking', key: `${tag}|${w}`, where: o.sel, title: `Sideways scroll at ${w}px`, what: `${o.sel} reaches ${Math.round(o.right)}px on a ${w}px screen (page is ${Math.round(m.overflowX)}px too wide)`, why: 'The whole page pans sideways on a phone; it is the most visible mobile bug.', fix, patch: { property: tag === 'img' ? 'max-width' : 'min-width', to: tag === 'img' ? '100%' : '0' } });
  }
  for (const i of m.inputs) if (i.size < 16 && w <= 480) f.push({ id: 'ios-zoom', severity: 'important', key: 'input16', where: i.sel, title: 'Input text under 16px', what: `Field text is ${f1(i.size)}px`, why: 'iPhones zoom the page when a field with text under 16px is focused, and do not zoom back.', fix: 'font-size: 16px on inputs, selects and textareas.', patch: { property: 'font-size', to: '16px' } });
  for (const t of m.text) if (t.size < 12 && w <= 480 && !t.unknownBg) f.push({ id: 'phone-text', severity: 'important', key: 'small', where: t.sel, title: 'Tiny text on a phone', what: `"${short(t.text)}" is ${f1(t.size)}px`, why: 'Text under 12px is hard to read on a phone.', fix: 'Use 12px or more.', patch: { property: 'font-size', to: '12px' } });
  for (const c of m.clipped) f.push({ id: 'clipped', severity: 'important', key: c.tag, where: c.sel, title: 'Text is cut off', what: `"${short(c.text)}" is clipped at ${w}px (${Math.round(c.scrollW)}px of text in a ${Math.round(c.clientW)}px box)`, why: 'Words disappear instead of wrapping.', fix: 'Let it wrap (white-space: normal) or add text-overflow: ellipsis plus a title or tooltip.', patch: { property: 'white-space', to: 'normal' } });
  for (const r of m.rows) f.push({ id: 'no-stack', severity: 'important', key: 'row', where: r.sel, title: 'Columns do not stack', what: `${r.n} columns share one row at ${w}px (each about ${Math.round(r.avg)}px wide)`, why: 'Content is squeezed into slivers instead of stacking.', fix: 'flex-direction: column (or grid-template-columns: 1fr) under about 640px.', patch: { property: 'flex-direction', to: 'column', media: 640 } });
  if (m.viewport === null) f.push({ id: 'viewport', severity: 'blocking', key: 'vp', where: 'head', title: 'No viewport meta tag', what: 'Phones lay the page out at ~980px and shrink it', why: 'Everything looks tiny and zoomed out.', fix: '<meta name="viewport" content="width=device-width, initial-scale=1">' });
  return [...group(f), ...a11yRules(m, ctx).filter((g) => g.id === 'target-24' || g.id === 'target-44')];
}

export function sortFindings(list) {
  return list.slice().sort((a, b) => rank(a.severity) - rank(b.severity) || (b.count ?? 1) - (a.count ?? 1));
}

/** Markdown card for one finding. */
export function card(g) {
  const more = g.count > 1 ? `  \n_${g.count} places${g.examples?.length ? `, e.g. ${g.examples.map((e) => '`' + e + '`').join(', ')}` : ''}_` : '';
  return `#### [${g.severity}] ${g.title}\n\n- **WHAT** ${g.what}${g.count > 1 ? ` (and ${g.count - 1} more like it)` : ''}\n- **WHERE** \`${g.where}\`${more ? '' : ''}\n- **WHY** ${g.why}\n- **FIX** ${g.fix}${g.manual ? ' _(check by eye)_' : ''}${more}\n`;
}

/** A CSS file of the concrete fixes, grouped by theme. Never applied automatically. */
export function fixesCss(findings) {
  const seen = new Set(); const light = [], dark = [], any = [];
  for (const g of findings) {
    if (!g.patch || !g.where || /^(html|head|body)$/.test(g.where)) continue;
    const p = g.patch; const sel = p.pseudo ? `${g.where}${p.pseudo}` : g.where;
    const rule = `${sel} { ${p.property}: ${p.to};${p.extra ? ` ${p.extra};` : ''} }`;
    const wrapped = p.media ? `@media (max-width: ${p.media}px) { ${rule} }` : rule;
    if (seen.has(wrapped)) continue; seen.add(wrapped);
    (p.theme === 'dark' ? dark : p.theme === 'light' ? light : any).push(`/* ${g.title} */ ${wrapped}`);
  }
  return `/* Suggested fixes from audit.mjs. Review each one; nothing here is applied for you. */\n${any.join('\n')}\n\n/* light theme */\n${light.map((r) => r.replace(/^(\/\*[^*]*\*\/ )(.*) \{/, '$1:root:not([data-theme=\'dark\']) $2 {')).join('\n')}\n\n/* dark theme */\n${dark.map((r) => r.replace(/^(\/\*[^*]*\*\/ )(.*) \{/, '$1:root[data-theme=\'dark\'] $2 {')).join('\n')}\n`;
}
export { hexToRgb, rgbToHex };
