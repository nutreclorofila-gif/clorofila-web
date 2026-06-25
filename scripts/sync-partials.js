const fs = require('fs');
const path = require('path');

const root = process.cwd();
const checkMode = process.argv.includes('--check');

const ROOT_PAGES = [
  'index.html',
  'curso.html',
  'talleres.html',
  'articulos.html',
  'leonardo.html',
  'servicios.html',
  'sobre.html',
  'contacto.html',
  '404.html',
];

const ARTICLE_PAGES = [
  'articulos/aceite-de-oliva-punto-de-humo.html',
  'articulos/omega-3-lino-horneado.html',
  'articulos/lavado-de-frutas-bicarbonato.html',
  'articulos/mas-alla-del-colesterol-total.html',
];

const files = [...ROOT_PAGES, ...ARTICLE_PAGES];

const navPartial = fs.readFileSync(path.join(root, 'partials', 'nav.html'), 'utf8').trim();

const MARKER_REGEX = /<!--#include nav active="([^"]*)"(?: base="([^"]*)")?-->/;
const MARKER_END = '<!--#include-end nav-->';

function relativePrefix(relPath, baseMode) {
  if (baseMode === 'absolute') return '/';
  const depth = relPath.split('/').length - 1;
  return '../'.repeat(depth);
}

function renderNav(prefix, activeHref) {
  let html = navPartial;
  if (activeHref) {
    const activeTagRegex = new RegExp(`(<a href="${activeHref}")(>)`);
    html = html.replace(activeTagRegex, `$1 class="active" aria-current="page"$2`);
  }
  html = html.replace(/href="([a-zA-Z0-9_-]+\.html)"/g, (m, file) => `href="${prefix}${file}"`);
  return html;
}

let errors = 0;

for (const relPath of files) {
  const fullPath = path.join(root, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`[${relPath}] file does not exist`);
    errors++;
    continue;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  const startMatch = content.match(MARKER_REGEX);
  const endIdx = content.indexOf(MARKER_END);

  if (!startMatch || endIdx === -1) {
    console.error(`[${relPath}] missing nav include markers`);
    errors++;
    continue;
  }

  const [fullMarker, activeHref, baseMode] = startMatch;
  const prefix = relativePrefix(relPath, baseMode);
  const renderedNav = renderNav(prefix, activeHref);

  const startIdx = content.indexOf(fullMarker) + fullMarker.length;
  if (startIdx > endIdx) {
    console.error(`[${relPath}] include-end marker appears before include marker`);
    errors++;
    continue;
  }

  const before = content.slice(0, startIdx);
  const after = content.slice(endIdx);
  const newContent = `${before}\n${renderedNav}\n${after}`;

  if (checkMode) {
    if (newContent !== content) {
      console.error(`[${relPath}] nav is out of sync with partials/nav.html (run "npm run sync:partials")`);
      errors++;
    }
  } else if (newContent !== content) {
    fs.writeFileSync(fullPath, newContent);
    console.log(`[${relPath}] nav synced`);
  }
}

if (errors > 0) {
  console.error(`\n${errors} file(s) failed nav sync check.`);
  process.exit(1);
} else {
  console.log(
    checkMode
      ? `OK: nav is in sync across ${files.length} file(s).`
      : `OK: synced nav across ${files.length} file(s).`
  );
}
