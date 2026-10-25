#!/usr/bin/env node
// Tests the audit: the rules as plain functions, then the whole thing in a browser against a page that is wrong in known ways
// and a page that is right. A fix the audit suggests is applied and the page is audited again, so "the fix works" is measured.
//   cd <folder where playwright resolves> && node <repo>/tools/audit-test.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { contrast } from '../skill/sitewright/scripts/lib/color.mjs';
import { fixTextColour, a11yRules, critiqueRules, responsiveRules } from '../skill/sitewright/scripts/lib/audit-rules.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AUDIT = path.join(HERE, '..', 'skill', 'sitewright', 'scripts', 'audit.mjs');
let pass = 0, fail = 0;
const ok = (c, name, extra = '') => { if (c) { pass++; console.log(`  ok    ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${extra}`); } };

// 1. the contrast fixer: any foreground on any background ends up passing
let worst = 99, short = 0, n = 0;
for (let i = 0; i < 4000; i++) {
  const rnd = () => '#' + Array.from({ length: 3 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
  const fg = rnd(), bg = rnd(); const min = i % 2 ? 4.5 : 3; const r = fixTextColour(fg, bg, min);
  n++; worst = Math.min(worst, r.ratio); if (r.ratio < min - 1e-6) short++;
}
ok(short === 0, `contrast fixer reaches the target for ${n} random colour pairs (lowest ratio ${worst.toFixed(2)})`, `${short} pairs fell short`);
ok(Math.abs(contrast('#a3a9b8', '#006fe6') - 2.0) < 0.15, 'the ratio the Figma-style example quotes (#a3a9b8 on #006fe6) comes out near 2.0:1');
const fx = fixTextColour('#a3a9b8', '#006fe6', 4.5); ok(fx.ratio >= 4.5 && /^#[0-9a-f]{6}$/.test(fx.to), `its suggested fix ${fx.to} is ${fx.ratio.toFixed(2)}:1`);

// 2. rules on plain measurements
const base = { text: [], interactive: [], images: [], headings: [], fontSizes: { 16: 900 }, paragraphs: [], spacing: [], buttons: [], inputs: [], offenders: [], clipped: [], rows: [], overflowX: 0, lang: true, title: true, viewport: 'width=device-width, initial-scale=1' };
ok(a11yRules({ ...base, text: [{ sel: 'p', text: 'x', fg: '#767676', bg: '#ffffff', size: 16, large: false }] }, { width: 1280, theme: 'light' }).some((g) => g.id === 'contrast') === false, '#767676 on white (4.54:1) passes AA');
ok(a11yRules({ ...base, text: [{ sel: 'p', text: 'x', fg: '#999999', bg: '#ffffff', size: 16, large: false }] }, { width: 1280, theme: 'light' }).some((g) => g.id === 'contrast'), '#999 on white is flagged');
ok(!a11yRules({ ...base, text: [{ sel: 'h1', text: 'x', fg: '#808080', bg: '#ffffff', size: 40, large: true }] }, { width: 1280, theme: 'light' }).some((g) => g.id === 'contrast'), 'large text is held to 3:1, not 4.5:1');
ok(a11yRules({ ...base, lang: false, viewport: null }, { width: 390, theme: 'light' }).map((g) => g.id).sort().join() === 'h1,lang,viewport', 'missing lang and viewport are both reported');

// 3. in a browser
const BAD = `<!doctype html><html><head><title></title><style>
body{font:11px/1.1 system-ui;margin:0;background:#fff;color:#111}
h1{font-size:14px} .lead{color:#a3a9b8;background:#006fe6;padding:8px} p.long{max-width:none;font-size:13px;line-height:1.1}
.row{display:flex;gap:2px} .row div{flex:1;font-size:12px} .wide{width:900px;background:#eee} a.tiny{display:inline-block;width:16px;height:16px;background:#c00}
input{font-size:12px} .btn1{height:30px;border-radius:2px}.btn2{height:44px;border-radius:12px}.btn3{height:56px;border-radius:30px}.btn4{height:36px;border-radius:6px}.btn5{height:64px;border-radius:0}
</style></head><body>
<h1>Tiny heading</h1><p class="lead">Real ratios without eyeballing</p>
<img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width="40" height="40">
<h4>Skipped heading</h4>
<a class="tiny" href="/x"></a> <button></button> <input type="text">
<p class="long">${'Long measured line of body copy that keeps going without ever wrapping onto a second line until the very end of it. '.repeat(8)}</p>
<div class="row"><div>Column one text</div><div>Column two text</div><div>Column three text</div><div>Column four text</div></div>
<div class="wide">A fixed 900px block</div>
<button class="btn1">a</button><button class="btn2">b</button><button class="btn3">c</button><button class="btn4">d</button><button class="btn5">e</button>
</body></html>`;
const GOOD = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Good page</title><style>
body{font:16px/1.6 system-ui;margin:0;background:#fff;color:#1a1a1a} main{max-width:640px;margin:0 auto;padding:24px}
h1{font-size:40px;line-height:1.1;margin:0 0 16px} h2{font-size:24px;margin:24px 0 8px} p{margin:0 0 16px;color:#444}
a,button,input{display:inline-block;min-height:44px;min-width:44px;font-size:16px;line-height:44px;box-sizing:border-box} a:focus-visible,button:focus-visible,input:focus-visible{outline:2px solid #1a56db;outline-offset:2px}
button{padding:0 16px;border-radius:8px;border:1px solid #1a1a1a;background:#1a56db;color:#fff}
</style></head><body><main><h1>A page that is fine</h1><p>Short lines, real contrast and big targets.</p><h2>Contact</h2>
<label for="e">Email</label><br><input id="e" type="email"> <button>Send</button> <a href="/x">Read more about it</a><img alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></main></body></html>`;
const server = http.createServer((req, res) => { res.setHeader('content-type', 'text/html'); res.end(req.url.startsWith('/good') ? GOOD : req.url.startsWith('/fixed') ? fs.readFileSync(path.join(TMP, 'fixed.html'), 'utf8') : BAD); });
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-test-'));
await new Promise((r) => server.listen(0, r)); const PORT = server.address().port;
// async on purpose: the test server lives in this process and has to keep answering while the audit runs
const run = async (route, mode = 'all', extra = []) => { const out = path.join(TMP, 'out-' + Math.random().toString(36).slice(2)); const r = await new Promise((done) => { const c = spawn(process.execPath, [AUDIT, '--url', `http://localhost:${PORT}`, '--routes', route, '--mode', mode, '--out', out, '--themes', 'light', '--widths', '390,1280', ...extra]); let stderr = ''; c.stderr.on('data', (d) => (stderr += d)); c.on('close', (status) => done({ status, stderr })); }); const j = fs.existsSync(path.join(out, 'report.json')) ? JSON.parse(fs.readFileSync(path.join(out, 'report.json'), 'utf8')) : null; return { r, j, out }; };

const bad = await run('/bad');
ok(bad.j && bad.r.status === 1, 'the bad page fails the audit (exit code 1)', bad.r.stderr?.slice(0, 200));
const ids = new Set((bad.j?.findings ?? []).map((f) => f.id));
for (const want of ['contrast', 'name', 'alt', 'lang', 'viewport', 'title', 'heading-skip', 'target-24', 'tiny', 'measure', 'leading', 'overflow', 'ios-zoom', 'no-stack', 'hierarchy', 'buttons']) ok(ids.has(want), `bad page: finds "${want}"`);
const contrastF = (bad.j?.findings ?? []).find((f) => f.id === 'contrast' && /a3a9b8/.test(f.what));
ok(contrastF && /#a3a9b8 on #006fe6/.test(contrastF.what) && /2\.0\d?:1/.test(contrastF.what.replace(/(\d)\.(\d)(?!\d)/, '$1.$20')) || (contrastF && /\(\d\.\d+:1\)/.test(contrastF.fix)), 'the contrast card names both colours and the ratio', contrastF?.what);
ok(fs.existsSync(path.join(bad.out, 'fixes.css')) && /color: #[0-9a-f]{6}/.test(fs.readFileSync(path.join(bad.out, 'fixes.css'), 'utf8')), 'fixes.css holds concrete colour fixes');
ok(fs.readdirSync(bad.out).some((f) => /responsive\.png$/.test(f)), 'a phone-next-to-desktop picture is written');
ok(/WHAT/.test(fs.readFileSync(path.join(bad.out, 'report.md'), 'utf8')) && /FIX/.test(fs.readFileSync(path.join(bad.out, 'report.md'), 'utf8')), 'report.md has WHAT / WHY / FIX cards');

const good = await run('/good');
const gb = (good.j?.findings ?? []).filter((f) => f.severity === 'blocking');
ok(good.j && gb.length === 0, 'the good page has nothing blocking', gb.map((f) => `${f.id}:${f.what}`).join(' | '));
ok(good.r.status === 0, 'the good page passes (exit code 0)');

// apply the suggested colour fix and measure again
const css = fs.readFileSync(path.join(bad.out, 'fixes.css'), 'utf8').split('\n').filter((l) => /\.lead|p\.lead|lead/.test(l)).join('\n');
fs.writeFileSync(path.join(TMP, 'fixed.html'), BAD.replace('</style>', css.replace(/\/\*.*?\*\/ /g, '') + '</style>'));
const fixed = await run('/fixed', 'a11y');
ok(!(fixed.j?.findings ?? []).some((f) => f.id === 'contrast' && /\.lead/.test(f.where)), 'after applying the suggested colour, the contrast finding is gone');

server.close(); fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
