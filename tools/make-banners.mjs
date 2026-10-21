// Renders the README banner (1600x640) and the social-share image (1200x630) from banner.html with Playwright.
//   cd <folder where `npm i playwright` has been run> && node make-banners.mjs [--fonts <folder>]
// The page loads its fonts from Google Fonts. Offline (or behind a proxy), pass --fonts with a folder holding
// bricolage-grotesque-latin-wght-normal.woff2, inter-latin-wght-normal.woff2 and jetbrains-mono-latin-500-normal.woff2
// (from the @fontsource packages) and they are used instead.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(path.join(process.cwd(), 'noop.js'));
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const html = pathToFileURL(path.join(here, 'banner.html')).href;
const out = path.join(here, '..', 'site', 'assets');
const fi = process.argv.indexOf('--fonts');
const fontsDir = fi > -1 ? path.resolve(process.argv[fi + 1]) : null;
const face = (family, file, weight) => `@font-face{font-family:'${family}';src:url(${pathToFileURL(path.join(fontsDir, file)).href}) format('woff2');font-weight:${weight};font-display:block}`;
const localFonts = fontsDir ? [face('Bricolage Grotesque', 'bricolage-grotesque-latin-wght-normal.woff2', '200 800'), face('Inter', 'inter-latin-wght-normal.woff2', '100 900'), face('JetBrains Mono', 'jetbrains-mono-latin-500-normal.woff2', '500')].join('') : '';
const browser = await chromium.launch();
for (const [file, w, h, hash] of [['banner.png', 1600, 640, ''], ['og.png', 1200, 630, '#og']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  if (fontsDir) await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(html + hash);
  if (localFonts) await page.addStyleTag({ content: localFonts });
  await page.addStyleTag({ content: `:root{--w:${w}px;--h:${h}px}` });
  await page.waitForLoadState('networkidle'); await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(out, file) });
  console.log('wrote', file);
}
await browser.close();
