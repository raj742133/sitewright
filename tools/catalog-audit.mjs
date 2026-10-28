#!/usr/bin/env node
// Reconciles the source catalogue (docs/catalog-map.json) with the Sitewright registry, the component files, the demos and the recorded verification results,
// and writes docs/catalog-manifest.json (one record per entry) and docs/catalog-coverage.md (the readable summary).
//
//   node tools/catalog-audit.mjs                       rebuild manifest + coverage report, print totals, exit 1 on an inconsistency
//   node tools/catalog-audit.mjs --record report.json  first merge a component-smoke report into docs/catalog-verification.json
//
// A record is `verified` only when the component is registered, its files exist, it exports a Demo and a smoke report says every check passed.
// "implemented" means the code exists; it is never reported as verified without a passing report.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILL = path.join(ROOT, 'skill', 'sitewright');
const DOCS = path.join(ROOT, 'docs');
const argv = process.argv.slice(2);
const rec = argv.indexOf('--record');
const verPath = path.join(DOCS, 'catalog-verification.json');
const ver = fs.existsSync(verPath) ? JSON.parse(fs.readFileSync(verPath, 'utf8')) : {};
if (rec >= 0) {
  const rep = JSON.parse(fs.readFileSync(path.resolve(argv[rec + 1]), 'utf8'));
  for (const r of rep.results) ver[r.id] = { pass: r.pass, checks: r.checks, date: rep.date };
  fs.writeFileSync(verPath, JSON.stringify(ver, null, 1) + '\n');
  console.log(`recorded ${rep.results.length} result(s) in docs/catalog-verification.json`);
}

const { UI, TPL } = await import(pathToFileURL(path.join(SKILL, 'scripts', 'ui.mjs')).href);
const map = JSON.parse(fs.readFileSync(path.join(DOCS, 'catalog-map.json'), 'utf8'));
const FX = path.join(SKILL, 'templates', 'fx');
const problems = [];
const exists = (p) => fs.existsSync(p);
const fxText = new Set(fs.readdirSync(path.join(FX, 'text')).map((f) => f.replace(/\.tsx?$/, '')));
const fxBg = new Set(fs.readdirSync(path.join(FX, 'bg')).map((f) => f.replace(/\.tsx?$/, '')));
const fxMicro = new Set(fs.readdirSync(path.join(FX, 'micro')).map((f) => f.replace(/\.tsx?$/, '')));

/** Registry entry -> where its files live + whether the main file exports a Demo and a default component. */
function inspect(e, dir) {
  const files = e.files.map((f) => path.join(dir, f));
  const missing = files.filter((f) => !exists(f));
  const css = (e.css ?? []).map((c) => path.join(FX, 'css', `${c}.css`)).filter((f) => !exists(f));
  const main = files[0] && exists(files[0]) ? fs.readFileSync(files[0], 'utf8') : '';
  return { missing: [...missing, ...css].map((f) => path.relative(ROOT, f)), demo: /export\s+(function|const)\s+Demo\b/.test(main), hasDefault: /export\s+default\b/.test(main), loc: main.split('\n').length };
}

const records = [];
for (const m of map) {
  const r = { catalogId: m.catalogId, label: m.label, catalogCategory: m.catalogCategory, origin: m.origin, kind: m.kind, strategy: m.strategy, package: m.package ?? null, provenanceNote: m.provenanceNote };
  if (m.strategy === 'existing') {
    const [kind, name] = m.existing.split(':');
    const ok = kind === 'ui' ? !!UI[name] : kind === 'fx-text' ? fxText.has(name) : kind === 'fx-bg' ? fxBg.has(name) : kind === 'fx-micro' ? fxMicro.has(name) : kind === 'fx' ? exists(path.join(FX, `${name}.tsx`)) : false;
    Object.assign(r, { existing: m.existing, status: ok ? 'existing' : 'blocked', license: 'Sitewright original (or its own recorded notice)', demo: 'existing', test: 'existing', outstanding: ok ? [] : [`existing target ${m.existing} not found`] });
    if (!ok) problems.push(`${m.catalogId}: existing target ${m.existing} is missing`);
  } else {
    const reg = m.destination === 'template' ? TPL[m.newId] : UI[m.newId];
    const dir = path.join(FX, m.destination === 'template' ? 'tpl' : 'ui');
    r.newId = m.newId; r.destination = m.destination;
    if (!reg) Object.assign(r, { status: m.blocked ? 'blocked' : 'planned', registryId: null, demo: 'none', test: 'none', outstanding: [m.blocked ?? 'not implemented yet'] });
    else {
      const i = inspect(reg, dir);
      const v = ver[m.newId];
      const out = [...i.missing.map((f) => `missing file ${f}`), ...(i.demo ? [] : ['no Demo export']), ...(i.hasDefault ? [] : ['no default export'])];
      Object.assign(r, { registryId: reg.id, destinationFile: path.relative(ROOT, path.join(dir, reg.files[0])), files: reg.files, css: reg.css, source: reg.source, demo: i.demo ? 'yes' : 'missing', test: v ? (v.pass ? 'pass' : 'FAIL') : 'not run', dependencies: 'none (react only)', license: reg.source === 'Original' ? 'Sitewright original' : reg.source, outstanding: out });
      r.status = out.length ? 'in_progress' : v?.pass ? 'verified' : 'implemented';
      if (out.length) problems.push(`${m.catalogId} (${m.newId}): ${out.join('; ')}`);
      if (v && !v.pass) r.outstanding.push('verification failed: ' + Object.entries(v.checks).filter(([, x]) => x !== 'pass').map(([k, x]) => `${k} ${x}`).join('; '));
    }
  }
  records.push(r);
}

// Registry / file cross-checks
const mapped = new Set(map.filter((m) => m.newId).map((m) => m.newId));
const extraDirect = new Set(['glass-background', 'glass-button', 'glass-card', 'glass-fx', 'glass-word', 'glass-heading', 'glass-prompt-input', 'glass-switch', 'glass-tabs', 'glass-audio-player']);
const tactile = [...extraDirect].map((id) => ({ id, registered: !!UI[id], files: UI[id] ? inspect(UI[id], path.join(FX, 'ui')) : null }));
for (const t of tactile) if (!t.registered || t.files?.missing.length || !t.files?.demo) problems.push(`tactile ${t.id}: incomplete`);
const labels = new Map();
for (const e of [...Object.values(UI), ...Object.values(TPL)]) { const k = e.label.trim().toLowerCase(); labels.set(k, [...(labels.get(k) ?? []), e.id]); }
for (const [k, ids] of labels) if (ids.length > 1) problems.push(`duplicate display name "${k}": ${ids.join(', ')}`);
const ids = new Set(Object.keys(UI));
const registeredNotMapped = [...Object.keys(UI)].filter((id) => !mapped.has(id));
const uiFiles = fs.readdirSync(path.join(FX, 'ui')).filter((f) => /\.tsx?$/.test(f));
const used = new Set(); for (const e of [...Object.values(UI), ...Object.values(TPL)]) for (const f of e.files) used.add(f);
const orphanFiles = uiFiles.filter((f) => !used.has(f) && !/^_/.test(f));
for (const f of orphanFiles) problems.push(`component file not in any registry entry: templates/fx/ui/${f}`);

const by = (f) => records.filter(f).length;
const total = records.length;
const tu = records.filter((r) => r.origin === 'third-party-tu');
const rb = records.filter((r) => r.origin === 'react-bits-origin');
const heroes = records.filter((r) => r.kind === 'full-page-hero');
const stat = (arr) => Object.fromEntries(['existing', 'planned', 'in_progress', 'implemented', 'verified', 'blocked'].map((s) => [s, arr.filter((r) => r.status === s).length]));
const summary = {
  generated: new Date().toISOString(), sourceCatalogEntries: total, uniqueEntries: new Set(records.map((r) => r.catalogId)).size,
  note: 'the 5 full-page heroes are 5 of the 43 tu entries (see overlap), so unique = rb + tu',
  reactBitsOrigin: { total: rb.length, ...stat(rb) }, thirdPartyTu: { total: tu.length, ...stat(tu) },
  fullPageHeroes: { total: heroes.length, completed: heroes.filter((r) => ['implemented', 'verified'].includes(r.status)).length, verified: heroes.filter((r) => r.status === 'verified').length },
  tactileGlass: { total: tactile.length, registered: tactile.filter((t) => t.registered).length, complete: tactile.filter((t) => t.registered && !t.files?.missing.length && t.files?.demo).length },
  existingReused: by((r) => r.status === 'existing'), newImplemented: by((r) => ['implemented', 'verified'].includes(r.status)), verified: by((r) => r.status === 'verified'),
  awaitingTests: by((r) => r.status === 'implemented'), failingTests: by((r) => r.test === 'FAIL'), blocked: by((r) => r.status === 'blocked'), remainingUnimplemented: by((r) => ['planned', 'in_progress'].includes(r.status)),
  registry: { components: Object.keys(UI).length, templates: Object.keys(TPL).length, registeredNotInCatalog: registeredNotMapped.length },
  problems,
};
fs.writeFileSync(path.join(DOCS, 'catalog-manifest.json'), JSON.stringify({ summary, records, tactileGlass: tactile.map((t) => ({ id: t.id, registered: t.registered, missing: t.files?.missing ?? [], demo: !!t.files?.demo })) }, null, 1) + '\n');

const row = (r) => `| \`${r.catalogId}\` | ${r.label} | ${r.status} | ${r.existing ? '`' + r.existing + '`' : r.registryId ? '`' + r.registryId + '`' : '-'} | ${r.test} | ${(r.outstanding ?? []).join('; ') || '-'} |`;
let md = `# Catalogue coverage\n\nGenerated by \`tools/catalog-audit.mjs\` from \`docs/catalog-map.json\`, the registry and \`docs/catalog-verification.json\`. Machine-readable: \`docs/catalog-manifest.json\`.\n\n`;
md += `Status vocabulary: **existing** (Sitewright already ships an equivalent), **planned**, **in_progress** (files present but incomplete), **implemented** (code, registry entry and demo exist; no passing smoke report yet), **verified** (all smoke checks passed), **blocked**.\n\n`;
md += `## Totals\n\n| Measure | Value |\n| --- | --- |\n`;
md += `| Source catalogue entries | ${summary.sourceCatalogEntries} (${rb.length} React Bits-origin + ${tu.length} \`tu\`) |\n| Unique entries | ${summary.uniqueEntries} (the 5 heroes are among the ${tu.length} \`tu\` entries) |\n| Existing Sitewright equivalents reused | ${summary.existingReused} |\n| New independent implementations present | ${summary.newImplemented} |\n| Verified (all smoke checks passed) | ${summary.verified} |\n| Implemented, awaiting tests | ${summary.awaitingTests} |\n| With failing tests | ${summary.failingTests} |\n| Blocked | ${summary.blocked} |\n| Remaining (planned / in progress) | ${summary.remainingUnimplemented} |\n| Full-page heroes completed | ${summary.fullPageHeroes.completed} / ${heroes.length} |\n| Tactile Glass components complete | ${summary.tactileGlass.complete} / ${tactile.length} |\n| Registry | ${summary.registry.components} components, ${summary.registry.templates} templates |\n\n`;
if (problems.length) md += `## Inconsistencies (${problems.length})\n\n${problems.map((p) => `- ${p}`).join('\n')}\n\n`;
md += `## Provenance and licence\n\n- React Bits-origin entries (MIT + Commons Clause, see THIRD_PARTY_NOTICES.md): the components are not redistributed. Every one is either mapped to a Sitewright equivalent or independently implemented from the entry's name and category; the implementing authors never opened upstream source, and none was ported.\n- \`tu\` entries are authored works by third parties; their source and artwork are not redistributed. The underlying techniques are implemented independently, without their names, text, artwork or any company marks.\n- The 35 "Micro Interaction" entries carry the \`rb:\` prefix but their folder is not part of the public React Bits layout: provenance unresolved, handled as restricted.\n- Tactile Glass UI (MIT, uixNinja) is redistributed with its licence and credit.\n\n`;
md += `## The 43 \`tu\` entries\n\n| Catalogue id | Label | Status | Sitewright id | Tests | Outstanding |\n| --- | --- | --- | --- | --- | --- |\n${tu.map(row).join('\n')}\n\n`;
md += `## Full-page heroes (5 of the above)\n\n| Catalogue id | Label | Status | Sitewright id | Tests | Outstanding |\n| --- | --- | --- | --- | --- | --- |\n${heroes.map(row).join('\n')}\n\n`;
md += `## The ${rb.length} React Bits-origin entries\n\n| Catalogue id | Label | Status | Sitewright id | Tests | Outstanding |\n| --- | --- | --- | --- | --- | --- |\n${rb.map(row).join('\n')}\n`;
fs.writeFileSync(path.join(DOCS, 'catalog-coverage.md'), md);
console.log(JSON.stringify({ ...summary, problems: problems.length }, null, 1));
if (problems.length) { console.log('\nProblems:\n' + problems.slice(0, 40).map((p) => ' - ' + p).join('\n')); process.exitCode = 1; }
