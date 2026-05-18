/**
 * Print a human-readable inventory of the Angular build output, sorted
 * by size descending, with a top-of-output summary of the initial
 * (browser-only) bundle. Designed to run after ``ng build`` so CI logs
 * carry the exact byte budget the build delivered — easier than
 * digging through ``stats.json``, and surfaces regressions before
 * they hit the ``maximumWarning`` / ``maximumError`` thresholds
 * configured in ``angular.json``.
 *
 * Exit codes:
 *   0 — report rendered (no judgment, ng's own budgets are the gate).
 *   1 — dist directory missing (build did not run).
 *
 * Usage::
 *
 *   npm run build
 *   node scripts/report-bundle-size.mjs
 */
import {readdirSync, statSync} from 'node:fs';
import {join, basename} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST_ROOT = join(__dirname, '..', 'dist', 'quizonline-frontend', 'browser');

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} kB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      out.push(...walk(full));
    } else {
      out.push({path: full, size: s.size});
    }
  }
  return out;
}

let files;
try {
  files = walk(DIST_ROOT);
} catch (err) {
  console.error(`Bundle directory not found: ${DIST_ROOT}`);
  console.error('Run `npm run build` first.');
  process.exit(1);
}

// JS + CSS only — the initial bundle is what the browser downloads
// before the app renders. Assets (images, fonts, locales) are listed
// separately for the operator's reference.
const isAppBundle = (p) => /\.(js|css)$/.test(p) && !/\.map$/.test(p);
const appFiles = files.filter((f) => isAppBundle(f.path));
const assetFiles = files.filter((f) => !isAppBundle(f.path) && !f.path.endsWith('.map'));

const appTotal = appFiles.reduce((sum, f) => sum + f.size, 0);
const assetTotal = assetFiles.reduce((sum, f) => sum + f.size, 0);

console.log('Bundle size report');
console.log('==================');
console.log(`App bundle (js + css):  ${formatBytes(appTotal)} (${appFiles.length} files)`);
console.log(`Assets (img/font/...):  ${formatBytes(assetTotal)} (${assetFiles.length} files)`);
console.log('');
console.log('Top 20 chunks by size:');

appFiles
  .sort((a, b) => b.size - a.size)
  .slice(0, 20)
  .forEach((f) => {
    const name = basename(f.path).padEnd(50);
    console.log(`  ${name} ${formatBytes(f.size).padStart(10)}`);
  });
