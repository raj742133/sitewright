#!/usr/bin/env node
// Behavioural smoke test for catalogue components: opens each component's demo page in Chromium and checks what a build cannot.
//
//   cd <folder where `npm i playwright` has been run>
//   node component-smoke.mjs --url http://localhost:4401 --ids a,b,c [--path "/g/{id}/"] [--out report.json]
//
// Per component (every check is recorded; a component "passes" only when all of them do):
//   render       no page error, no console error, the demo has a real size and is not a blank picture
//   phone        at 390px wide the page does not scroll sideways
//   keyboard     if the demo has focusable elements, Tab reaches one and it shows a visible focus indicator
//   reduced      with prefers-reduced-motion the picture is still 1.2 s later (continuous animation stopped) and there is no error
//   no-webgl     with WebGL switched off the demo still renders something and throws nothing
//   cleanup      after navigating away no error is raised (listeners and loops released)
// Exit code 0 only when every component passes.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const BASE = arg('url', 'http://localhost:4401').replace(/\/$/, '');
const IDS = (arg('ids', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
const PATTERN = arg('path', '/g/{id}/');
const OUT = arg('out', '');
const SKIP = new Set((arg('skip', '') || '').split(',').filter(Boolean)); // checks to skip, e.g. --skip reduced
if (!IDS.length) { console.error('--ids a,b,c is required'); process.exit(2); }
const require = createRequire(path.join(process.cwd(), 'noop.js'));
const { chromium } = require('playwright');

const IGNORED = /ERR_CERT|net::ERR|Failed to load resource|favicon|fonts\.(googleapis|gstatic)/;
const hash = (buf) => crypto.createHash('md5').update(buf).digest('hex');

/** Fraction of pixels that differ from the most common colour: a blank or flat picture gives ~0. */
async function busy(page, clip) {
  return page.evaluate(async () => 1).then(async () => {
    const buf = await page.screenshot({ clip, type: 'png' });
    const b64 = buf.toString('base64');
    return page.evaluate(async (b) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b; await img.decode();
      const c = document.createElement('canvas'); c.width = Math.min(img.width, 160); c.height = Math.min(img.height, 120);
      const x = c.getContext('2d'); x.drawImage(img, 0, 0, c.width, c.height);
      const d = x.getImageData(0, 0, c.width, c.height).data; const counts = new Map();
      for (let i = 0; i < d.length; i += 4) { const k = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4); counts.set(k, (counts.get(k) || 0) + 1); }
      const top = Math.max(...counts.values()); return 1 - top / (d.length / 4);
    }, b64);
  });
}

async function open(browser, id, { reduced = false, noWebgl = false, width = 900, height = 600 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error' && !IGNORED.test(m.text())) errs.push(m.text().slice(0, 160)); });
  if (noWebgl) await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...a) { return /webgl/i.test(String(type)) ? null : orig.call(this, type, ...a); };
  });
  await page.route('**/*', (r) => (/fonts\.(googleapis|gstatic)/.test(r.request().url()) ? r.abort() : r.continue()));
  await page.goto(BASE + PATTERN.replace('{id}', id), { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(1400);
  return { page, ctx, errs };
}

const results = [];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const id of IDS) {
  const r = { id, checks: {} };
  const rec = (name, ok, why = '') => { if (!SKIP.has(name)) r.checks[name] = ok ? 'pass' : `FAIL ${why}`; };
  try {
    // render + phone + keyboard
    {
      const { page, ctx, errs } = await open(browser, id);
      const box = await page.evaluate(() => { // the demo's size: the largest element inside the page (works for the scratch /g/ pages and the gallery embed pages)
        let w = 0, h = 0; for (const e of document.querySelectorAll('body *')) { const r = e.getBoundingClientRect(); if (r.width * r.height > w * h && r.width > 0) { w = Math.round(r.width); h = Math.round(r.height); } } return { w, h }; });
      const v = await busy(page, { x: 0, y: 0, width: 900, height: 600 }).catch(() => 0);
      rec('render', errs.length === 0 && box.w > 40 && box.h > 40 && v > 0.02, `errors=${errs.slice(0, 2).join(' | ')} size=${box.w}x${box.h} busy=${v.toFixed(3)}`);
      const nf = await page.evaluate(() => document.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"]), [role="button"], [role="tab"], [role="switch"], [role="slider"]').length);
      if (nf === 0) rec('keyboard', true);
      else {
        await page.keyboard.press('Tab'); await page.waitForTimeout(150);
        const f = await page.evaluate(() => {
          const e = document.activeElement; if (!e || e === document.body) return { ok: false, why: 'Tab did not reach an element' };
          const cs = getComputedStyle(e); const out = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0;
          const sh = cs.boxShadow !== 'none'; const ring = !!e.closest('[data-focus-visible], .focus-visible'); return { ok: out || sh || ring, why: `outline=${cs.outlineStyle}/${cs.outlineWidth} shadow=${sh}` };
        });
        rec('keyboard', f.ok, f.why);
      }
      await ctx.close();
      const p2 = await open(browser, id, { width: 390, height: 800 });
      const over = await p2.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      rec('phone', over <= 1 && p2.errs.length === 0, `scrollWidth overflow=${over}px errors=${p2.errs.slice(0, 1).join('')}`);
      await p2.ctx.close();
    }
    // reduced motion: static after settling
    {
      const { page, ctx, errs } = await open(browser, id, { reduced: true });
      await page.addStyleTag({ content: '*, *::before, *::after { caret-color: transparent !important }' }); // a blinking text caret is browser behaviour, not component animation
      const a = hash(await page.screenshot({ clip: { x: 0, y: 0, width: 900, height: 600 } })); await page.waitForTimeout(1200);
      const b = hash(await page.screenshot({ clip: { x: 0, y: 0, width: 900, height: 600 } }));
      rec('reduced', errs.length === 0 && a === b, errs.length ? errs[0] : 'picture still changing under prefers-reduced-motion');
      await ctx.close();
    }
    // no webgl
    {
      const { page, ctx, errs } = await open(browser, id, { noWebgl: true });
      const v = await busy(page, { x: 0, y: 0, width: 900, height: 600 }).catch(() => 0);
      rec('no-webgl', errs.length === 0 && v > 0.02, `errors=${errs.slice(0, 2).join(' | ')} busy=${v.toFixed(3)}`);
      await ctx.close();
    }
    // cleanup: leave the page, nothing should throw afterwards
    {
      const { page, ctx, errs } = await open(browser, id);
      await page.goto('about:blank'); await page.waitForTimeout(500);
      rec('cleanup', errs.length === 0, errs[0] ?? '');
      await ctx.close();
    }
  } catch (e) { r.checks.run = `FAIL ${String(e.message).split('\n')[0]}`; }
  r.pass = Object.values(r.checks).every((v) => v === 'pass');
  results.push(r);
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${id}${r.pass ? '' : '  ' + Object.entries(r.checks).filter(([, v]) => v !== 'pass').map(([k, v]) => `${k}: ${v}`).join('; ')}`);
}
await browser.close();
const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} components pass every check`);
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ base: BASE, date: new Date().toISOString(), total: results.length, passed, results }, null, 1) + '\n');
process.exit(passed === results.length ? 0 : 1);
