// Build one combined PDF per language from docs/manual/<loc>/{index,learner,instructor,admin}.md
//
// Pipeline: concat Markdown -> render to HTML (markdown-it + anchors) -> print to
// PDF with Chromium (Playwright, already a project dev-dependency). Screenshots are
// resolved through a temp HTML file written next to the locale's Markdown so the
// existing `../screenshots/<loc>/...` relative paths just work.
//
// Run from the repo root:  node scripts/build-manual-pdf.mjs
// (resolves node_modules from quizonline-frontend, where markdown-it + Playwright live)

import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync, rmSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const MANUAL_DIR = join(REPO_ROOT, 'docs', 'manual');

// markdown-it + Playwright are installed under the frontend workspace.
const require = createRequire(join(REPO_ROOT, 'quizonline-frontend', 'package.json'));
const MarkdownIt = require('markdown-it');
const anchor = require('markdown-it-anchor');
const { chromium } = require('@playwright/test');

const FILES = ['index', 'learner', 'instructor', 'admin'];

// Per-locale cover/footer wording (no hardcoded strings leaking into user-facing UI;
// this is build tooling, but we still localise the generated artefact).
const STRINGS = {
  fr: { contents: 'Table des matières', generated: 'Généré le', page: 'Page', of: 'sur' },
  en: { contents: 'Table of contents', generated: 'Generated on', page: 'Page', of: 'of' },
  nl: { contents: 'Inhoudsopgave', generated: 'Gegenereerd op', page: 'Pagina', of: 'van' },
};
const LOCALE_TAG = { fr: 'fr-FR', en: 'en-GB', nl: 'nl-NL' };

function slugify(s) {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function discoverLocales() {
  return readdirSync(MANUAL_DIR)
    .filter((name) => name !== 'screenshots')
    .filter((name) => {
      const p = join(MANUAL_DIR, name);
      return statSync(p).isDirectory() && existsSync(join(p, 'index.md'));
    })
    .sort();
}

function buildLocaleMarkdown(loc) {
  // Concatenate the four role files, prefixing each with a stable HTML anchor so
  // cross-file links (learner.md, instructor.md#x, ...) keep working in one document.
  const parts = [];
  for (const name of FILES) {
    const file = join(MANUAL_DIR, loc, `${name}.md`);
    if (!existsSync(file)) continue;
    let md = readFileSync(file, 'utf8');
    // Rewrite intra-manual links: foo.md -> #file-foo ; foo.md#frag -> #frag
    md = md.replace(/\]\((index|learner|instructor|admin)\.md(#[^)]+)?\)/g, (_m, target, frag) =>
      frag ? `](${frag})` : `](#file-${target})`,
    );
    parts.push(`\n\n<a id="file-${name}"></a>\n\n${md}\n`);
  }
  return parts.join('\n');
}

function renderHtml(loc) {
  const s = STRINGS[loc] ?? STRINGS.en;
  const headings = [];
  const md = new MarkdownIt({ html: true, linkify: true, typographer: true }).use(anchor, {
    slugify,
    callback: (token, info) => {
      if (token.tag === 'h1' || token.tag === 'h2') {
        headings.push({ level: Number(token.tag.slice(1)), title: info.title, slug: info.slug });
      }
    },
  });

  const body = md.render(buildLocaleMarkdown(loc));

  // Table of contents (H1 + H2). The cover's own H1 is the first heading.
  const toc = headings
    .map(
      (h) =>
        `<li class="toc-l${h.level}"><a href="#${h.slug}">${h.title}</a></li>`,
    )
    .join('\n');

  const coverTitle = headings.find((h) => h.level === 1)?.title ?? 'QuizOnline';
  const generated = new Date().toLocaleDateString(LOCALE_TAG[loc] ?? 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `<!doctype html>
<html lang="${loc}">
<head>
<meta charset="utf-8">
<style>
  :root { --accent: #4338ca; --ink: #1f2937; --muted: #6b7280; --line: #e5e7eb; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: "Segoe UI", system-ui, -apple-system, Arial, sans-serif;
    color: var(--ink); font-size: 11pt; line-height: 1.55; margin: 0;
  }
  /* Cover */
  .cover { height: 100vh; display: flex; flex-direction: column; justify-content: center;
           align-items: center; text-align: center; break-after: page; }
  .cover .brand { font-size: 13pt; letter-spacing: .35em; color: var(--accent);
                  text-transform: uppercase; margin-bottom: 1.5rem; }
  .cover h1 { font-size: 30pt; margin: 0 0 1rem; border: 0; color: var(--ink); }
  .cover .meta { color: var(--muted); font-size: 11pt; margin-top: 2rem; }
  /* TOC */
  .toc { break-after: page; }
  .toc h2 { color: var(--accent); border: 0; }
  .toc ul { list-style: none; padding: 0; }
  .toc li { margin: .15rem 0; }
  .toc a { color: var(--ink); text-decoration: none; }
  .toc .toc-l1 { font-weight: 600; margin-top: .8rem; }
  .toc .toc-l2 { padding-left: 1.4rem; color: #374151; font-size: 10.5pt; }
  /* Content */
  .content h1 { font-size: 20pt; color: var(--accent); break-before: page;
                padding-bottom: .3rem; border-bottom: 2px solid var(--accent); margin-top: 0; }
  .content h2 { font-size: 15pt; margin-top: 1.6rem; border-bottom: 1px solid var(--line);
                padding-bottom: .2rem; }
  .content h3 { font-size: 12.5pt; color: #374151; }
  .content a { color: var(--accent); }
  .content code { background: #f3f4f6; padding: .1em .35em; border-radius: 4px;
                  font-size: .9em; font-family: "Cascadia Code", Consolas, monospace; }
  .content pre { background: #f8fafc; border: 1px solid var(--line); border-radius: 8px;
                 padding: .8rem 1rem; overflow: auto; }
  .content pre code { background: none; padding: 0; }
  .content img { max-width: 100%; height: auto; border: 1px solid var(--line);
                 border-radius: 8px; margin: .6rem 0; display: block; }
  .content table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: 10pt; }
  .content th, .content td { border: 1px solid var(--line); padding: .45rem .6rem;
                             text-align: left; vertical-align: top; }
  .content th { background: #f3f4f6; }
  .content blockquote { border-left: 4px solid var(--accent); margin: 1rem 0;
                        padding: .2rem 1rem; color: #374151; background: #f8fafc; }
  .content figure, .content img, .content table, .content pre { break-inside: avoid; }
  .content h1, .content h2, .content h3 { break-after: avoid; }
</style>
</head>
<body>
  <section class="cover">
    <div class="brand">QuizOnline</div>
    <h1>${coverTitle}</h1>
    <div class="meta">${s.generated} ${generated}</div>
  </section>
  <nav class="toc">
    <h2>${s.contents}</h2>
    <ul>${toc}</ul>
  </nav>
  <main class="content">${body}</main>
</body>
</html>`;
}

async function buildPdf(browser, loc) {
  const s = STRINGS[loc] ?? STRINGS.en;
  const html = renderHtml(loc);
  // Write the temp HTML INTO the locale dir so `../screenshots/<loc>/...` resolves.
  const tmp = join(MANUAL_DIR, loc, `.manual-build.html`);
  writeFileSync(tmp, html, 'utf8');
  const out = join(MANUAL_DIR, `QuizOnline-Manuel-${loc}.pdf`);
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(tmp).href, { waitUntil: 'networkidle' });
    await page.pdf({
      path: out,
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', bottom: '20mm', left: '16mm', right: '16mm' },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `<div style="font-size:8pt;color:#9ca3af;width:100%;padding:0 16mm;
        display:flex;justify-content:space-between;">
        <span>QuizOnline — ${loc.toUpperCase()}</span>
        <span>${s.page} <span class="pageNumber"></span> ${s.of} <span class="totalPages"></span></span>
      </div>`,
    });
    await page.close();
  } finally {
    rmSync(tmp, { force: true });
  }
  const kb = Math.round(statSync(out).size / 1024);
  console.log(`  ✓ ${out}  (${kb} KB)`);
  return out;
}

(async () => {
  const locales = discoverLocales();
  console.log(`Building manual PDFs for: ${locales.join(', ')}`);
  const browser = await chromium.launch();
  try {
    for (const loc of locales) {
      console.log(`[${loc}]`);
      await buildPdf(browser, loc);
    }
  } finally {
    await browser.close();
  }
  console.log('Done.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
