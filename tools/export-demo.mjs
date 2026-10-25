#!/usr/bin/env node
// Builds the live gallery (the generated /effects site, every effect, component and template) as a static export and copies it to site/demo/.
// The website embeds these pages (/demo/effects/c/<id>/ for components, /demo/effects/b/<id>/ for templates, /f/ figures, /bg/ backgrounds).
//   node tools/export-demo.mjs [--modules <node_modules folder to reuse>] [--keep]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-demo-'));
const site = path.join(work, 'gallery');
const run = (cmd, args, opts = {}) => { const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' && /^(npm|npx)$/.test(cmd), ...opts }); if (r.status) { console.error(`failed: ${cmd} ${args.join(' ')}`); process.exit(r.status); } };

run(process.execPath, [path.join(ROOT, 'skill/sitewright/scripts/scaffold.mjs'), '--config', path.join(HERE, 'gallery-site.json'), '--out', site, '--quiet', '--offline-icons', '--components', 'all', '--templates', 'all']);
const modules = arg('modules', '');
if (modules) fs.symlinkSync(path.resolve(modules), path.join(site, 'node_modules'), 'junction'); else run('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: site });
run('npx', ['tsc', '--noEmit'], { cwd: site });
run('npx', ['next', 'build'], { cwd: site, env: { ...process.env, SITEWRIGHT_EXPORT: '1', SITEWRIGHT_BASE_PATH: '/demo', NEXT_TELEMETRY_DISABLED: '1' } });
const dest = path.join(ROOT, 'site', 'demo');
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(path.join(site, 'out'), dest, { recursive: true });
console.log(`exported to ${dest}`);
if (!argv.includes('--keep')) fs.rmSync(work, { recursive: true, force: true });
