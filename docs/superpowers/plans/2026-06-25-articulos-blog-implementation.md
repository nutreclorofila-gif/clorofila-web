# Artículos Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Instagram-only "Artículos" teasers on `/recetas.html` into 4 real, indexable article pages under `/articulos/`, and fix the confirmed `<nav>`/menu-script duplication across all HTML pages as part of the same effort.

**Architecture:** Pure static HTML site, no build step, deployed via Netlify (`publish = "."`, no build command). A new Node maintenance script (`scripts/sync-partials.js`) keeps the `<nav>` element identical across pages by reading a single source (`partials/nav.html`) and writing the rendered result into HTML comment-delimited regions in each page; a `--check` mode lets CI catch drift. The mobile-menu toggle script is extracted into one shared `nav.js` file referenced via `<script src>`. Existing `npm test` check scripts (`check-links.js`, `check-jsonld.js`) are extended to also scan the new `articulos/` subdirectory.

**Tech Stack:** Plain HTML/CSS/JS, Node.js (no framework) for maintenance scripts, html-validate for markup linting, Netlify for hosting/redirects/headers.

## Global Constraints

- No build step is introduced for Netlify — `netlify.toml`'s `[build]` section keeps `publish = "."` with no build command. `sync-partials.js` is a local/CI maintenance tool, not a deploy-time step.
- The `<footer>` element is NOT touched by the partial system — it has legitimate per-page variation (confirmed: `curso.html`'s sticky CTA opens a Tally overlay button instead of a direct link, and its footer omits the Instagram line). Out of scope.
- No images are added to article pages — typographic/editorial treatment only, per spec.
- No individual author byline is shown on articles; JSON-LD `author` is the organization `"Clorofila"`, not a person.
- Article content must not contain fabricated statistics, percentages, or citations to unverifiable studies. Where a precise figure would otherwise be needed, write `[VERIFICAR: <what's needed>]` inline instead of inventing a number.
- Every step that touches `main` (merging) requires explicit user confirmation first — this plan only covers work on a feature branch (`claude/articulos-blog`, already created) plus opening a PR. Do not merge to `main` without asking the user first, per the existing house rule established this session (Netlify auto-deploys `main` to production).

---

### Task 1: Shared mobile-menu script (`nav.js`)

**Files:**
- Create: `nav.js`

**Interfaces:**
- Produces: a script that, when loaded on any page containing `#nav-hamburger`, `#nav-close`, and `#nav-links` elements, wires up open/close/Escape behavior identical to the current per-page inline scripts. Later tasks reference it via `<script src="nav.js" defer></script>` (root pages) or `<script src="../nav.js" defer></script>` (pages under `articulos/`).

- [ ] **Step 1: Create `nav.js`**

```js
(function () {
  const hamburger = document.getElementById('nav-hamburger');
  const navClose = document.getElementById('nav-close');
  const navLinks = document.getElementById('nav-links');

  function openNav() {
    navLinks.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('nav-open');
  }

  function closeNav() {
    navLinks.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
  }

  hamburger.addEventListener('click', openNav);
  navClose.addEventListener('click', closeNav);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('open')) closeNav();
  });
})();
```

- [ ] **Step 2: Verify syntax is valid**

Run: `node --check nav.js`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add nav.js
git commit -m "Add shared nav.js, replacing per-page duplicated/drifted menu script"
```

---

### Task 2: Nav partial + sync/check tool + npm wiring

**Files:**
- Create: `partials/nav.html`
- Create: `scripts/sync-partials.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `npm run sync:partials` (writes), `npm run check:partials` (dry-run, exits 1 on drift or missing markers). `partials/nav.html` is the single source of truth later tasks must keep in sync with via the marker convention `<!--#include nav active="HREF"-->...<!--#include-end nav-->` (optionally `<!--#include nav active="HREF" base="absolute"-->` for pages needing root-absolute paths, used only by `404.html`).

- [ ] **Step 1: Create `partials/nav.html`**

```html
<nav class="nav" aria-label="Principal">
  <div class="nav-inner">
    <a href="index.html" class="nav-logo"><span>Clorofila</span><span>Estudio de Cocina</span></a>
    <button type="button" class="nav-close" id="nav-close" aria-label="Cerrar menú">✕</button>
    <ul class="nav-links" id="nav-links">
      <li><a href="curso.html">El curso</a></li>
      <li><a href="talleres.html">Talleres</a></li>
      <li><a href="articulos.html">Artículos</a></li>
      <li><a href="leonardo.html">Leonardo</a></li>
      <li><a href="servicios.html">Trabajemos juntos</a></li>
      <li><a href="sobre.html">Sobre</a></li>
      <li><a href="contacto.html">Contacto</a></li>
      <li><a href="https://tally.so/r/EkMbWL" target="_blank" rel="noopener noreferrer" class="nav-cta">Inscribirme →</a></li>
    </ul>
    <button class="nav-hamburger" id="nav-hamburger" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav-links">☰</button>
  </div>
</nav>
```

- [ ] **Step 2: Create `scripts/sync-partials.js`**

```js
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
```

- [ ] **Step 3: Wire up `package.json`**

Modify the `"scripts"` block in `package.json` to:

```json
"scripts": {
    "check:links": "node scripts/check-links.js",
    "check:jsonld": "node scripts/check-jsonld.js",
    "check:sitemap": "node scripts/check-sitemap.js",
    "check:partials": "node scripts/sync-partials.js --check",
    "check:html": "html-validate --config .htmlvalidate.json *.html articulos/*.html",
    "sync:partials": "node scripts/sync-partials.js",
    "test": "npm run check:partials && npm run check:links && npm run check:jsonld && npm run check:sitemap && npm run check:html"
  },
```

- [ ] **Step 4: Run the check against the current (not-yet-converted) repo and confirm it correctly fails**

Run: `npm run check:partials`
Expected: exits with code 1, lists `index.html`, `curso.html`, `talleres.html`, `leonardo.html`, `servicios.html`, `sobre.html`, `contacto.html`, `404.html`, and `recetas.html` does NOT appear under this name (it will appear as a missing-file error for `articulos.html` and the 4 `articulos/*.html` files, since they don't exist yet) — total **13 reported problems** (9 "missing nav include markers" for existing pages still under their old `<nav>` markup, since `articulos.html` doesn't exist yet it's reported as "file does not exist", and the 4 article files likewise). This confirms the tool correctly detects everything that hasn't been converted yet.

- [ ] **Step 5: Commit**

```bash
git add partials/nav.html scripts/sync-partials.js package.json
git commit -m "Add nav partial-sync tool (scripts/sync-partials.js)

Single source of truth for the <nav> element (partials/nav.html),
synced into pages via HTML comment markers. npm run check:partials
runs in CI (via npm test) to catch drift; npm run sync:partials writes
the result. Does not change the Netlify deploy pipeline — still plain
static HTML, publish=\".\", no build command."
```

---

### Task 3: Rename `recetas.html` → `articulos.html`, convert it to the real hub, adopt nav partial

**Files:**
- Rename: `recetas.html` → `articulos.html`
- Modify: `articulos.html` (post-rename)

**Interfaces:**
- Consumes: `partials/nav.html` (Task 2), `nav.js` (Task 1).
- Produces: `articulos.html` is now the canonical hub page; cards 01-04 link to real article pages (created in Tasks 6-9) instead of Instagram.

- [ ] **Step 1: Rename the file**

```bash
git mv recetas.html articulos.html
```

- [ ] **Step 2: Update `<head>` metadata**

In `articulos.html`, replace:

```html
  <title>Artículos — Clorofila Estudio de Cocina</title>
  <meta name="description" content="Ciencia aplicada a la cocina cotidiana. Aceites, omega-3, fermentación, lavado de frutas. Sin alarmismo, con evidencia y criterio.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://clorofila.uy/recetas">
  <meta property="og:type"        content="website">
  <meta property="og:url"         content="https://clorofila.uy/recetas">
```

with:

```html
  <title>Artículos — Clorofila Estudio de Cocina</title>
  <meta name="description" content="Ciencia aplicada a la cocina cotidiana. Aceites, omega-3, fermentación, lavado de frutas. Sin alarmismo, con evidencia y criterio.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://clorofila.uy/articulos">
  <meta property="og:type"        content="website">
  <meta property="og:url"         content="https://clorofila.uy/articulos">
```

- [ ] **Step 3: Replace the `<nav>` block with include markers**

Replace:

```html
<nav class="nav" aria-label="Principal">
  <div class="nav-inner">
    <a href="index.html" class="nav-logo"><span>Clorofila</span><span>Estudio de Cocina</span></a>
    <button type="button" class="nav-close" id="nav-close" aria-label="Cerrar menú">✕</button>
    <ul class="nav-links" id="nav-links">
      <li><a href="curso.html">El curso</a></li>
      <li><a href="talleres.html">Talleres</a></li>
      <li><a href="recetas.html" class="active" aria-current="page">Artículos</a></li>
      <li><a href="leonardo.html">Leonardo</a></li>
      <li><a href="servicios.html">Trabajemos juntos</a></li>
      <li><a href="sobre.html">Sobre</a></li>
      <li><a href="contacto.html">Contacto</a></li>
      <li><a href="https://tally.so/r/EkMbWL" target="_blank" rel="noopener noreferrer" class="nav-cta">Inscribirme →</a></li>
    </ul>
    <button class="nav-hamburger" id="nav-hamburger" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav-links">☰</button>
  </div>
</nav>
```

with:

```html
<!--#include nav active="articulos.html"-->
<nav class="nav" aria-label="Principal">
  <div class="nav-inner">
    <a href="index.html" class="nav-logo"><span>Clorofila</span><span>Estudio de Cocina</span></a>
    <button type="button" class="nav-close" id="nav-close" aria-label="Cerrar menú">✕</button>
    <ul class="nav-links" id="nav-links">
      <li><a href="curso.html">El curso</a></li>
      <li><a href="talleres.html">Talleres</a></li>
      <li><a href="articulos.html" class="active" aria-current="page">Artículos</a></li>
      <li><a href="leonardo.html">Leonardo</a></li>
      <li><a href="servicios.html">Trabajemos juntos</a></li>
      <li><a href="sobre.html">Sobre</a></li>
      <li><a href="contacto.html">Contacto</a></li>
      <li><a href="https://tally.so/r/EkMbWL" target="_blank" rel="noopener noreferrer" class="nav-cta">Inscribirme →</a></li>
    </ul>
    <button class="nav-hamburger" id="nav-hamburger" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav-links">☰</button>
  </div>
</nav>
<!--#include-end nav-->
```

- [ ] **Step 4: Convert cards 01-03 from Instagram-only to real article links**

Replace each of these three blocks (card 01, 02, 03):

```html
      <div class="art-footer"><a href="https://instagram.com/clorofilaclases" target="_blank" rel="noopener noreferrer" class="art-link">Lo contamos en Instagram →</a></div>
```

(appears 3 times, once per card 01/02/03 — replace each individually since the surrounding card content differs) with, respectively:

Card 01 (Aceite de oliva):
```html
      <div class="art-footer"><a href="articulos/aceite-de-oliva-punto-de-humo.html" class="art-link">Leer el artículo →</a></div>
```

Card 02 (Omega-3):
```html
      <div class="art-footer"><a href="articulos/omega-3-lino-horneado.html" class="art-link">Leer el artículo →</a></div>
```

Card 03 (Lavado de frutas):
```html
      <div class="art-footer"><a href="articulos/lavado-de-frutas-bicarbonato.html" class="art-link">Leer el artículo →</a></div>
```

- [ ] **Step 5: Convert card 04 (colesterol) from "en preparación" to "publicado"**

Replace:

```html
    <div class="art-card proximo fade-up" style="transition-delay:.3s">
      <div class="art-header"><span class="art-num">04</span><span class="art-badge badge-prox">En preparación</span></div>
      <p class="art-area">Grasas y salud</p>
      <h3>Más allá del colesterol total</h3>
      <p>Apo-B, tamaño de partícula LDL, TMAO y microbioma dan una imagen más completa. El análisis con marcadores modernos cambia el ranking de las grasas.</p>
      <div class="art-footer"><span class="art-coming">Próximamente</span></div>
    </div>
```

with:

```html
    <div class="art-card publicado fade-up" style="transition-delay:.3s">
      <div class="art-header"><span class="art-num">04</span><span class="art-badge badge-pub">Publicado</span></div>
      <p class="art-area">Grasas y salud</p>
      <h3>Más allá del colesterol total</h3>
      <p>Apo-B, tamaño de partícula LDL, TMAO y microbioma dan una imagen más completa. El análisis con marcadores modernos cambia el ranking de las grasas.</p>
      <div class="art-footer"><a href="articulos/mas-alla-del-colesterol-total.html" class="art-link">Leer el artículo →</a></div>
    </div>
```

- [ ] **Step 6: Update the footer link**

Replace:

```html
    <div><h2>Propuesta</h2><ul><li><a href="curso.html">El curso</a></li><li><a href="talleres.html">Talleres</a></li><li><a href="servicios.html">Trabajemos juntos</a></li><li><a href="recetas.html">Artículos</a></li></ul></div>
```

with:

```html
    <div><h2>Propuesta</h2><ul><li><a href="curso.html">El curso</a></li><li><a href="talleres.html">Talleres</a></li><li><a href="servicios.html">Trabajemos juntos</a></li><li><a href="articulos.html">Artículos</a></li></ul></div>
```

- [ ] **Step 7: Replace the inline nav-toggle script with the shared `nav.js`**

Replace:

```html
<script>
  const _nbtn = document.getElementById('nav-hamburger');
  const _nul  = document.getElementById('nav-links');
  const _ncls = document.getElementById('nav-close');
  function _openNav()  { _nul.classList.add('open');    _nbtn.setAttribute('aria-expanded','true'); document.body.classList.add('nav-open'); }
  function _closeNav() { _nul.classList.remove('open'); _nbtn.setAttribute('aria-expanded','false'); document.body.classList.remove('nav-open'); }
  _nbtn.addEventListener('click', _openNav);
  _ncls.addEventListener('click', _closeNav);
  document.addEventListener('keydown', e => { if(e.key==='Escape' && _nul.classList.contains('open')) _closeNav(); });
  const obs = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } }); }, { threshold: 0.06 });
```

with:

```html
<script src="nav.js" defer></script>
<script>
  const obs = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } }); }, { threshold: 0.06 });
```

(keep the rest of that `<script>` block — the `IntersectionObserver`/`fade-up`/sticky-cta scroll logic — unchanged; it stays page-local since it isn't part of the nav duplication problem.)

- [ ] **Step 8: Run sync and check**

Run: `npm run sync:partials`
Expected: `[articulos.html] nav synced` (or no output for this file if it already matches — either is fine) plus errors for the other 8 root pages and 4 article files still being unconverted (expected at this point, fixed in later tasks).

Run: `node scripts/sync-partials.js --check articulos.html` — there's no per-file flag, so instead just confirm `articulos.html`'s nav block now reads identically to `partials/nav.html` with `articulos.html` marked active:

```bash
grep -A2 'id="nav-links"' articulos.html | head -3
```

Expected output includes:
```
    <ul class="nav-links" id="nav-links">
      <li><a href="curso.html">El curso</a></li>
      <li><a href="talleres.html">Talleres</a></li>
```

- [ ] **Step 9: Commit**

```bash
git add articulos.html
git commit -m "Rename recetas.html to articulos.html, link cards 01-04 to real articles

Cards 01-03 (aceite de oliva, omega-3, lavado de frutas) and card 04
(colesterol, promoted from 'en preparación' to 'publicado') now link
to real pages under /articulos/ instead of the generic Instagram
profile. Cards 05-10 remain 'Próximamente' placeholders — no content
exists for them yet, so nothing to migrate."
```

---

### Task 4: Adopt nav partial + `nav.js` on the remaining 8 root pages

**Files:**
- Modify: `index.html`, `curso.html`, `talleres.html`, `leonardo.html`, `servicios.html`, `sobre.html`, `contacto.html`, `404.html`

**Interfaces:**
- Consumes: `partials/nav.html` (Task 2), `nav.js` (Task 1).
- Produces: all 9 root pages now use the include-marker convention; `npm run check:partials` passes for all of them.

For **each** of the 8 files below, perform the same two edits: (a) replace the `<nav>...</nav>` block with markers wrapping the same nav content but with that page's own `active` href, and (b) replace the inline nav-toggle script lines with `<script src="nav.js" defer></script>`. The link list inside the nav (`href="recetas.html"` → `href="articulos.html"` for the Articles item) changes on every page too, since none of them have been touched since the rename.

- [ ] **Step 1: `index.html`** — active link: none (homepage has no current-page indicator in the nav, matching today's behavior)

Replace the `<nav>` block with:

```html
<!--#include nav active=""-->
<nav class="nav" aria-label="Principal">
  <div class="nav-inner">
    <a href="index.html" class="nav-logo"><span>Clorofila</span><span>Estudio de Cocina</span></a>
    <button type="button" class="nav-close" id="nav-close" aria-label="Cerrar menú">✕</button>
    <ul class="nav-links" id="nav-links">
      <li><a href="curso.html">El curso</a></li>
      <li><a href="talleres.html">Talleres</a></li>
      <li><a href="articulos.html">Artículos</a></li>
      <li><a href="leonardo.html">Leonardo</a></li>
      <li><a href="servicios.html">Trabajemos juntos</a></li>
      <li><a href="sobre.html">Sobre</a></li>
      <li><a href="contacto.html">Contacto</a></li>
      <li><a href="https://tally.so/r/EkMbWL" target="_blank" rel="noopener noreferrer" class="nav-cta">Inscribirme →</a></li>
    </ul>
    <button class="nav-hamburger" id="nav-hamburger" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav-links">☰</button>
  </div>
</nav>
<!--#include-end nav-->
```

Find the inline `<script>` block containing `getElementById('nav-hamburger')` and replace its first 9 lines (from `const hamburger = ...` through the `document.addEventListener('keydown', ...)` line) with `<script src="nav.js" defer></script>`, keeping the `IntersectionObserver`/scroll-handling lines that follow it in the same `<script>` tag as page-local code (do not delete those).

- [ ] **Step 2: `curso.html`** — active link: `curso.html`

Replace the `<nav>` block with:

```html
<!--#include nav active="curso.html"-->
<nav class="nav" aria-label="Principal">
  <div class="nav-inner">
    <a href="index.html" class="nav-logo"><span>Clorofila</span><span>Estudio de Cocina</span></a>
    <button type="button" class="nav-close" id="nav-close" aria-label="Cerrar menú">✕</button>
    <ul class="nav-links" id="nav-links">
      <li><a href="curso.html" class="active" aria-current="page">El curso</a></li>
      <li><a href="talleres.html">Talleres</a></li>
      <li><a href="articulos.html">Artículos</a></li>
      <li><a href="leonardo.html">Leonardo</a></li>
      <li><a href="servicios.html">Trabajemos juntos</a></li>
      <li><a href="sobre.html">Sobre</a></li>
      <li><a href="contacto.html">Contacto</a></li>
      <li><a href="https://tally.so/r/EkMbWL" target="_blank" rel="noopener noreferrer" class="nav-cta">Inscribirme →</a></li>
    </ul>
    <button class="nav-hamburger" id="nav-hamburger" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav-links">☰</button>
  </div>
</nav>
<!--#include-end nav-->
```

`curso.html`'s inline script (inside the page's main `<script>` tag, after the cookie banner markup) currently reads exactly:

```html
  const _nbtn = document.getElementById('nav-hamburger');
  const _nul  = document.getElementById('nav-links');
  const _ncls = document.getElementById('nav-close');
  function _openNav()  { _nul.classList.add('open');    _nbtn.setAttribute('aria-expanded','true'); document.body.classList.add('nav-open'); }
  function _closeNav() { _nul.classList.remove('open'); _nbtn.setAttribute('aria-expanded','false'); document.body.classList.remove('nav-open'); }
  _nbtn.addEventListener('click', _openNav);
  _ncls.addEventListener('click', _closeNav);
  document.addEventListener('keydown', e => { if(e.key==='Escape' && _nul.classList.contains('open')) _closeNav(); });
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected','false'); });
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected','true');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
  document.querySelectorAll('.faq-q').forEach(q => q.addEventListener('click', () => q.parentElement.classList.toggle('open')));
  const obs = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } }); }, { threshold: 0.06 });
```

Replace the first 8 lines (from `const _nbtn = ...` through the `document.addEventListener('keydown', ...)` line) with `<script src="nav.js" defer></script>` placed immediately before the `<script>` tag that contains the rest. Keep the `.tab-btn` block, the `.faq-q` line, and the `IntersectionObserver` line exactly as they are (they are page-specific, not part of the nav duplication problem).

- [ ] **Step 3: `talleres.html`, `leonardo.html`, `servicios.html`, `sobre.html`, `contacto.html`** — these 5 files currently have an *identical* inline nav-toggle script to each other:

```html
  const _nbtn = document.getElementById('nav-hamburger');
  const _nul  = document.getElementById('nav-links');
  const _ncls = document.getElementById('nav-close');
  function _openNav()  { _nul.classList.add('open');    _nbtn.setAttribute('aria-expanded','true'); document.body.classList.add('nav-open'); }
  function _closeNav() { _nul.classList.remove('open'); _nbtn.setAttribute('aria-expanded','false'); document.body.classList.remove('nav-open'); }
  _nbtn.addEventListener('click', _openNav);
  _ncls.addEventListener('click', _closeNav);
  document.addEventListener('keydown', e => { if(e.key==='Escape' && _nul.classList.contains('open')) _closeNav(); });
  const obs = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } }); }, { threshold: 0.06 });
```

For each of these 5 files: replace the first 8 lines (from `const _nbtn = ...` through `document.addEventListener('keydown', ...)`) with `<script src="nav.js" defer></script>` placed immediately before the `<script>` tag containing the rest. Keep the `IntersectionObserver` line and everything after it untouched.

For the `<nav>` block, use the same structure as Step 2 for each file, changing only the `active` marker value and which `<li>` gets ` class="active" aria-current="page"` added:

- `talleres.html`: `<!--#include nav active="talleres.html"-->`, active item: `<li><a href="talleres.html" class="active" aria-current="page">Talleres</a></li>`
- `leonardo.html`: `<!--#include nav active="leonardo.html"-->`, active item: `<li><a href="leonardo.html" class="active" aria-current="page">Leonardo</a></li>`
- `servicios.html`: `<!--#include nav active="servicios.html"-->`, active item: `<li><a href="servicios.html" class="active" aria-current="page">Trabajemos juntos</a></li>`
- `sobre.html`: `<!--#include nav active="sobre.html"-->`, active item: `<li><a href="sobre.html" class="active" aria-current="page">Sobre</a></li>`
- `contacto.html`: `<!--#include nav active="contacto.html"-->`, active item: `<li><a href="contacto.html" class="active" aria-current="page">Contacto</a></li>`

All other `<li>` items in each file's nav stay exactly as in Step 1's block (plain, no active class), with `href="articulos.html"` for the Artículos item (not `recetas.html`).

- [ ] **Step 8: `404.html`** — active link: none, **and uses absolute paths** (confirmed: this page currently uses `href="/curso.html"` style links, not relative, because Netlify serves it for missing URLs at any depth).

Replace the `<nav>` block with:

```html
<!--#include nav active="" base="absolute"-->
<nav class="nav" aria-label="Principal">
  <div class="nav-inner">
    <a href="/index.html" class="nav-logo"><span>Clorofila</span><span>Estudio de Cocina</span></a>
    <button type="button" class="nav-close" id="nav-close" aria-label="Cerrar menú">✕</button>
    <ul class="nav-links" id="nav-links">
      <li><a href="/curso.html">El curso</a></li>
      <li><a href="/talleres.html">Talleres</a></li>
      <li><a href="/articulos.html">Artículos</a></li>
      <li><a href="/leonardo.html">Leonardo</a></li>
      <li><a href="/servicios.html">Trabajemos juntos</a></li>
      <li><a href="/sobre.html">Sobre</a></li>
      <li><a href="/contacto.html">Contacto</a></li>
      <li><a href="https://tally.so/r/EkMbWL" target="_blank" rel="noopener noreferrer" class="nav-cta">Inscribirme →</a></li>
    </ul>
    <button class="nav-hamburger" id="nav-hamburger" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav-links">☰</button>
  </div>
</nav>
<!--#include-end nav-->
```

`404.html`'s inline script currently reads exactly:

```html
  const _nbtn = document.getElementById('nav-hamburger');
  const _nul  = document.getElementById('nav-links');
  const _ncls = document.getElementById('nav-close');
  function _openNav()  { _nul.classList.add('open');    _nbtn.setAttribute('aria-expanded','true'); document.body.classList.add('nav-open'); }
  function _closeNav() { _nul.classList.remove('open'); _nbtn.setAttribute('aria-expanded','false'); document.body.classList.remove('nav-open'); }
  _nbtn.addEventListener('click', _openNav);
  _ncls.addEventListener('click', _closeNav);
  document.addEventListener('keydown', e => { if(e.key==='Escape' && _nul.classList.contains('open')) _closeNav(); });
</script>
```

(it is the entire contents of that `<script>` tag — there is no `IntersectionObserver` or other page-local code after it on this page). Replace the whole tag with `<script src="/nav.js" defer></script>`, using the absolute path since this page already uses absolute paths for `shared.css` and the nav links too.

- [ ] **Step 9: Run sync and check**

```bash
npm run sync:partials
npm run check:partials
```

Expected for `check:partials`: `OK: nav is in sync across 13 file(s).` (9 root pages + 4 article files — the 4 article files don't exist yet, so this will actually still fail at this point reporting them as missing; that's expected and resolved in Tasks 6-9. Re-run scoped mentally: confirm the error output now lists ONLY the 4 `articulos/*.html` files as "file does not exist", and zero errors for any of the 9 root pages.)

- [ ] **Step 10: Run the full existing test suite (sitemap/jsonld/links/html checks will still reference old state until later tasks, so run what's safe now)**

```bash
node scripts/check-links.js
node scripts/check-jsonld.js
```

Expected: both print `OK: ...` with no errors (these don't yet need the `articulos/` subdirectory awareness — that's added in Task 5).

- [ ] **Step 11: Commit**

```bash
git add index.html curso.html talleres.html leonardo.html servicios.html sobre.html contacto.html 404.html
git commit -m "Adopt shared nav partial and nav.js on all 9 root pages

Replaces the duplicated (and already-drifted) inline <nav> markup and
menu-toggle script with the partials/nav.html + nav.js convention
introduced in the previous two commits."
```

---

### Task 5: Make `check-links.js` and `check-jsonld.js` subdirectory-aware

**Files:**
- Modify: `scripts/check-links.js`
- Modify: `scripts/check-jsonld.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: both scripts now also scan `articulos/*.html` (if that directory exists) and resolve relative references against each file's own directory instead of always the repo root.

- [ ] **Step 1: Replace the full contents of `scripts/check-links.js`**

```js
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const htmlFiles = [
  ...fs.readdirSync(root).filter((f) => f.endsWith('.html')),
];
const articulosDir = path.join(root, 'articulos');
if (fs.existsSync(articulosDir)) {
  htmlFiles.push(
    ...fs
      .readdirSync(articulosDir)
      .filter((f) => f.endsWith('.html'))
      .map((f) => path.join('articulos', f))
  );
}

let errors = 0;

for (const file of htmlFiles) {
  const fileDir = path.dirname(path.join(root, file));
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const hrefSrcRegex = /(?:href|src)\s*=\s*["']([^"']+)["']/g;
  const srcsetRegex = /srcset\s*=\s*["']([^"']+)["']/g;

  function checkRef(raw) {
    if (
      raw.startsWith('http://') ||
      raw.startsWith('https://') ||
      raw.startsWith('mailto:') ||
      raw.startsWith('tel:') ||
      raw.startsWith('#') ||
      raw.startsWith('data:') ||
      raw.startsWith('//')
    ) {
      return;
    }
    const [target] = raw.split('#')[0].split('?');
    if (!target) return;
    const base = target.startsWith('/') ? root : fileDir;
    const resolved = path.join(base, target);
    if (!fs.existsSync(resolved)) {
      console.error(`[${file}] broken local reference: "${raw}"`);
      errors++;
    }
  }

  let match;
  while ((match = hrefSrcRegex.exec(html))) {
    checkRef(match[1]);
  }
  while ((match = srcsetRegex.exec(html))) {
    for (const entry of match[1].split(',')) {
      const url = entry.trim().split(/\s+/)[0];
      if (url) checkRef(url);
    }
  }
}

if (errors > 0) {
  console.error(`\n${errors} broken link(s)/asset reference(s) found.`);
  process.exit(1);
} else {
  console.log(`OK: checked ${htmlFiles.length} HTML files, no broken local links/assets found.`);
}
```

(Note the added `target.startsWith('/') ? root : fileDir` — this makes root-absolute references like `404.html`'s `href="/curso.html"` resolve against the repo root regardless of which directory the referencing file lives in, while plain relative references like `../shared.css` from an `articulos/` page resolve against that file's own directory.)

- [ ] **Step 2: Replace the full contents of `scripts/check-jsonld.js`**

```js
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const htmlFiles = [
  ...fs.readdirSync(root).filter((f) => f.endsWith('.html')),
];
const articulosDir = path.join(root, 'articulos');
if (fs.existsSync(articulosDir)) {
  htmlFiles.push(
    ...fs
      .readdirSync(articulosDir)
      .filter((f) => f.endsWith('.html'))
      .map((f) => path.join('articulos', f))
  );
}

let errors = 0;
let checked = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g;
  let match;
  while ((match = scriptRegex.exec(html))) {
    checked++;
    try {
      JSON.parse(match[1]);
    } catch (e) {
      console.error(`[${file}] invalid JSON-LD: ${e.message}`);
      errors++;
    }
  }
}

if (errors > 0) {
  console.error(`\n${errors} invalid JSON-LD block(s) found.`);
  process.exit(1);
} else {
  console.log(`OK: checked ${checked} JSON-LD block(s) across ${htmlFiles.length} files, all valid.`);
}
```

- [ ] **Step 3: Run both checks against the current repo state (articulos/ doesn't exist yet)**

```bash
node scripts/check-links.js
node scripts/check-jsonld.js
```

Expected: both still print `OK: ...` (identical behavior to before, since `fs.existsSync(articulosDir)` is false and both scripts skip the subdirectory scan gracefully).

- [ ] **Step 4: Commit**

```bash
git add scripts/check-links.js scripts/check-jsonld.js
git commit -m "Make check-links.js and check-jsonld.js scan articulos/ subdirectory

Also fixes check-links.js to resolve relative references (e.g.
../shared.css from an articulos/ page) against each file's own
directory instead of always the repo root, while root-absolute
references (404.html's /curso.html style) still resolve against root."
```

---

### Task 6: Article 1 — "Aceite de oliva y punto de humo: el mito que no muere"

**Files:**
- Create: `articulos/aceite-de-oliva-punto-de-humo.html`

**Interfaces:**
- Consumes: `partials/nav.html` rendering convention (Task 2/4), `nav.js` (Task 1).
- Produces: a page reachable from `articulos.html` card 01 (already linked in Task 3).

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p articulos
```

Create `articulos/aceite-de-oliva-punto-de-humo.html`:

```html
<!DOCTYPE html>
<html lang="es-UY">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://tally.so">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="icon" href="../favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="../apple-touch-icon.png">
  <link rel="manifest" href="../site.webmanifest">
  <meta name="theme-color" content="#20301f">
  <title>Aceite de oliva y punto de humo: el mito que no muere — Clorofila</title>
  <meta name="description" content="El punto de humo no es el indicador relevante para saber si un aceite aguanta el calor. Lo que importa es el perfil de ácidos grasos y los antioxidantes.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://clorofila.uy/articulos/aceite-de-oliva-punto-de-humo">
  <meta property="og:type"        content="article">
  <meta property="og:url"         content="https://clorofila.uy/articulos/aceite-de-oliva-punto-de-humo">
  <meta property="og:title"       content="Aceite de oliva y punto de humo: el mito que no muere — Clorofila">
  <meta property="og:description" content="El punto de humo no es el indicador relevante para saber si un aceite aguanta el calor. Lo que importa es el perfil de ácidos grasos y los antioxidantes.">
  <meta property="og:image"       content="https://clorofila.uy/img-leo-cocina.jpg">
  <meta property="og:locale"      content="es_UY">
  <meta name="twitter:card"       content="summary_large_image">
  <meta name="twitter:image"      content="https://clorofila.uy/img-leo-cocina.jpg">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Jost:wght@300;400;500;600&display=swap">
  <link rel="stylesheet" href="../shared.css?v=20260625">
  <style>
    .articulo-hero { background: var(--verde); padding: 4rem 2rem 3rem; }
    .articulo-hero-inner { max-width: var(--max-narrow); margin: 0 auto; }
    .articulo-breadcrumb { font-size: .78rem; color: rgba(255,255,255,.55); margin-bottom: 1.5rem; }
    .articulo-breadcrumb a { color: rgba(255,255,255,.75); }
    .articulo-breadcrumb a:hover { color: var(--crema); }
    .articulo-hero h1 { color: var(--crema); margin-bottom: .75rem; }
    .articulo-fecha { font-size: .82rem; color: rgba(255,255,255,.55); }
    .articulo-body { max-width: var(--max-narrow); margin: 0 auto; padding: 3.5rem 2rem; }
    .articulo-body h2 { font-size: 1.5rem; margin: 2.5rem 0 1rem; }
    .articulo-body p { margin-bottom: 1.25rem; line-height: 1.8; }
    .articulo-destacado { background: var(--verde-tinte); border-left: 3px solid var(--verde-luz); border-radius: var(--r-md); padding: 1.5rem 1.75rem; margin: 2rem 0; font-style: italic; color: var(--texto); }
    .articulo-cta { background: var(--verde); border-radius: var(--r-lg); padding: 2rem; margin-top: 3rem; text-align: center; }
    .articulo-cta p { color: rgba(255,255,255,.75); margin-bottom: 1.25rem; }
    .articulo-relacionados { max-width: var(--max-narrow); margin: 0 auto 5rem; padding: 0 2rem; }
    .articulo-relacionados h2 { font-size: 1.1rem; margin-bottom: 1rem; }
    .articulo-relacionados ul { display: flex; flex-direction: column; gap: .6rem; }
    .articulo-relacionados a { color: var(--verde-med); font-weight: 500; }
    .articulo-relacionados a:hover { color: var(--acento); }
  </style>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Article","headline":"Aceite de oliva y punto de humo: el mito que no muere","author":{"@type":"Organization","name":"Clorofila"},"publisher":{"@type":"Organization","name":"Clorofila Estudio de Cocina","logo":{"@type":"ImageObject","url":"https://clorofila.uy/icon-512.png"}},"datePublished":"2026-06-25","mainEntityOfPage":"https://clorofila.uy/articulos/aceite-de-oliva-punto-de-humo","isPartOf":{"@type":"WebSite","name":"Clorofila","url":"https://clorofila.uy/"}}
  </script>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Inicio","item":"https://clorofila.uy/"},{"@type":"ListItem","position":2,"name":"Artículos","item":"https://clorofila.uy/articulos"},{"@type":"ListItem","position":3,"name":"Aceite de oliva y punto de humo","item":"https://clorofila.uy/articulos/aceite-de-oliva-punto-de-humo"}]}
  </script>
  <!-- Analítica con consentimiento (GA4 + Meta Pixel) — reemplazar los IDs -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.loadAnalytics = function () {
      if (window.__analyticsLoaded) return;
      if (location.hostname !== 'clorofila.uy' && location.hostname !== 'www.clorofila.uy') return;
      window.__analyticsLoaded = true;
      var ga = document.createElement('script');
      ga.async = true;
      ga.src = 'https://www.googletagmanager.com/gtag/js?id=G-BBLJT4TYCV';
      document.head.appendChild(ga);
      gtag('js', new Date());
      gtag('config', 'G-BBLJT4TYCV');
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
      document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init','2002873889966452');
      fbq('track','PageView');
    };
    if (localStorage.getItem('cookieConsent') === 'accepted') window.loadAnalytics();
  </script>
</head>
<body>
<a class="skip-link" href="#main-content">Ir al contenido principal</a>

<!--#include nav active="articulos.html"-->
<nav class="nav" aria-label="Principal">
  <div class="nav-inner">
    <a href="../index.html" class="nav-logo"><span>Clorofila</span><span>Estudio de Cocina</span></a>
    <button type="button" class="nav-close" id="nav-close" aria-label="Cerrar menú">✕</button>
    <ul class="nav-links" id="nav-links">
      <li><a href="../curso.html">El curso</a></li>
      <li><a href="../talleres.html">Talleres</a></li>
      <li><a href="../articulos.html" class="active" aria-current="page">Artículos</a></li>
      <li><a href="../leonardo.html">Leonardo</a></li>
      <li><a href="../servicios.html">Trabajemos juntos</a></li>
      <li><a href="../sobre.html">Sobre</a></li>
      <li><a href="../contacto.html">Contacto</a></li>
      <li><a href="https://tally.so/r/EkMbWL" target="_blank" rel="noopener noreferrer" class="nav-cta">Inscribirme →</a></li>
    </ul>
    <button class="nav-hamburger" id="nav-hamburger" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav-links">☰</button>
  </div>
</nav>
<!--#include-end nav-->

<main id="main-content">
<div class="articulo-hero">
  <div class="articulo-hero-inner">
    <p class="articulo-breadcrumb"><a href="../index.html">Inicio</a> / <a href="../articulos.html">Artículos</a> / Aceite de oliva y punto de humo</p>
    <span class="section-label" style="color:var(--verde-luz)">Aceites y grasas</span>
    <h1>Aceite de oliva y punto de humo: el mito que no muere</h1>
    <p class="articulo-fecha">Publicado el 25 de junio de 2026</p>
  </div>
</div>

<article class="articulo-body">
  <p>En casi todas las clases aparece la misma frase: "no puedo cocinar con aceite de oliva porque tiene el punto de humo bajo, se quema y se pone tóxico". Es uno de los mitos más repetidos de la cocina basada en plantas, y también uno de los más fáciles de desarmar si entendés qué mide realmente el punto de humo y qué no mide.</p>

  <h2>Qué es exactamente el punto de humo</h2>
  <p>El punto de humo es la temperatura a la que un aceite empieza a producir humo visible. Eso es todo lo que mide: el momento en que ciertos compuestos volátiles se liberan al aire en cantidad suficiente para verse. No mide estabilidad oxidativa, no mide si el aceite se está degradando de forma peligrosa, y no mide si el resultado es "tóxico". Es un dato visual, no un dato de seguridad.</p>
  <p>La confusión viene de mezclar dos cosas distintas: que un aceite humee no significa que se haya oxidado, y que un aceite no humee no significa que esté intacto. Son procesos relacionados, pero no son lo mismo.</p>

  <h2>Lo que sí determina si un aceite "aguanta" el calor</h2>
  <p>Lo que realmente predice cómo se comporta un aceite frente al calor es una combinación de dos factores: el perfil de ácidos grasos y la presencia de antioxidantes naturales.</p>
  <p>Los ácidos grasos saturados y monoinsaturados son química más estable: tienen menos puntos de la molécula donde el oxígeno puede "agarrarse" y empezar una reacción de oxidación. El ácido oleico, que es el ácido graso mayoritario del aceite de oliva, es monoinsaturado — más estable al calor que los poliinsaturados que predominan en aceites de semillas como el de girasol o el de maíz.</p>
  <p>El segundo factor es todavía más importante en el caso del aceite de oliva extra virgen: sus polifenoles y su vitamina E actúan como antioxidantes naturales. Retrasan la oxidación incluso cuando el aceite está expuesto a temperaturas altas, porque "absorben" parte del daño antes de que llegue a los ácidos grasos.</p>

  <div class="articulo-destacado">Un aceite con punto de humo más alto pero sin esos antioxidantes puede oxidarse antes, en términos químicos reales, que un extra virgen que humea a menor temperatura visible.</div>

  <h2>Por qué el extra virgen sigue ganando</h2>
  <p>Esto explica por qué el aceite de oliva extra virgen —con un punto de humo más bajo en la etiqueta que un aceite refinado de girasol, por ejemplo— suele comportarse mejor en cocciones domésticas reales: salteados, horneado, e incluso frituras cortas a temperatura moderada. La combinación de ácido oleico + antioxidantes le da una resistencia a la oxidación que el número de la etiqueta no refleja.</p>
  <p>Esto no significa que cualquier temperatura sea indiferente. A temperaturas extremas y sostenidas —frituras profundas e industriales, por ejemplo— sí importa elegir un aceite pensado para eso, generalmente más neutro y refinado. Pero esa no es la cocina de todos los días.</p>

  <h2>Qué hacer en tu cocina</h2>
  <p>Para la enorme mayoría de las preparaciones de una cocina casera —saltear, sofreír, hornear, hacer una fritura corta— el aceite de oliva extra virgen es una opción sólida, no un compromiso. Lo que sí vale la pena cuidar es la calidad del aceite en sí: comprarlo en envase oscuro, guardarlo lejos de la luz y el calor, y no reutilizarlo demasiadas veces, porque ahí es donde se pierden los antioxidantes que lo hacen resistente.</p>
  <p>Si ves humo en la sartén con un buen aceite de oliva a una temperatura normal de cocción doméstica, no es una señal de alarma automática — es, como mucho, una señal de que subiste demasiado el fuego para lo que estás cocinando.</p>

  <div class="articulo-cta">
    <p>Esto es justo el tipo de criterio que se trabaja en el curso de 3 meses: no memorizar reglas, sino entender el mecanismo detrás de cada decisión en la cocina.</p>
    <a href="../curso.html" class="btn btn-light">Conocer el curso →</a>
  </div>
</article>

<div class="articulo-relacionados">
  <h2>Seguí leyendo</h2>
  <ul>
    <li><a href="omega-3-lino-horneado.html">¿Qué le pasa al omega-3 del lino cuando horneás? →</a></li>
    <li><a href="lavado-de-frutas-bicarbonato.html">Lavado de frutas: bicarbonato vs agua sola →</a></li>
    <li><a href="mas-alla-del-colesterol-total.html">Más allá del colesterol total →</a></li>
  </ul>
</div>
</main>

<footer class="footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <span class="logo">Clorofila</span>
      <p class="tagline">No enseñamos recetas. <br>Enseñamos a entender.</p>
      <p class="sub">Maldonado 1976 esq. Blanes · Parque Rodó · Montevideo · Desde 2013</p>
    </div>
    <div><h2>Propuesta</h2><ul><li><a href="../curso.html">El curso</a></li><li><a href="../talleres.html">Talleres</a></li><li><a href="../servicios.html">Trabajemos juntos</a></li><li><a href="../articulos.html">Artículos</a></li></ul></div>
    <div><h2>Clorofila</h2><ul><li><a href="../leonardo.html">Leonardo Lemes</a></li><li><a href="../sobre.html">Sobre nosotros</a></li><li><a href="../contacto.html">Contacto</a></li><li><a href="https://instagram.com/clorofilaclases" target="_blank" rel="noopener noreferrer">Instagram</a></li></ul></div>
    <div><h2>Contacto</h2><ul><li><a href="mailto:nutreclorofila@gmail.com">nutreclorofila@gmail.com</a></li><li><a href="https://wa.me/59894064148">094 064 148</a></li></ul></div>
  </div>
  <div class="footer-bottom">© 2026 Clorofila Estudio de Cocina · Parque Rodó · Montevideo · Uruguay</div>
</footer>

<div class="sticky-cta" id="sticky-cta">
  <a href="https://tally.so/r/EkMbWL" target="_blank" rel="noopener noreferrer" class="cta-main">Inscribirme →</a>
  <a href="https://wa.me/59894064148?text=Hola%2C%20quiero%20info%20del%20curso%20de%20Clorofila." target="_blank" rel="noopener noreferrer" class="wa-btn" aria-label="Escribir por WhatsApp">💬</a>
</div>

<script src="../nav.js" defer></script>
<script>
  const obs = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } }); }, { threshold: 0.06, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.fade-up, .reveal-img').forEach(el => obs.observe(el));
  setTimeout(() => { document.querySelectorAll('.fade-up, .reveal-img').forEach(el => { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('visible'); }); }, 80);
  const cta = document.getElementById('sticky-cta');
  const navEl = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    cta.classList.toggle('visible', window.scrollY > 700);
    if (navEl) navEl.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
</script>
<div class="cookie-banner" id="cookie-banner" role="dialog" aria-label="Aviso de cookies">
  <p>Usamos cookies propias y de terceros para analítica y publicidad. Podés aceptar o rechazar su uso. <a href="../contacto.html">Más info</a></p>
  <div class="cookie-banner-actions">
    <button type="button" id="cookie-decline">Rechazar</button>
    <button type="button" id="cookie-accept">Aceptar</button>
  </div>
</div>
<script>
  (function () {
    const banner = document.getElementById('cookie-banner');
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setTimeout(() => banner.classList.add('visible'), 600);
    }
    document.getElementById('cookie-accept').addEventListener('click', () => {
      localStorage.setItem('cookieConsent', 'accepted');
      banner.classList.remove('visible');
      if (typeof window.loadAnalytics === 'function') window.loadAnalytics();
    });
    document.getElementById('cookie-decline').addEventListener('click', () => {
      localStorage.setItem('cookieConsent', 'declined');
      banner.classList.remove('visible');
    });
  })();
</script>
</body>
</html>
```

- [ ] **Step 2: Validate JSON-LD and links for this one file**

```bash
node scripts/check-jsonld.js
node scripts/check-links.js
```

Expected: both `OK: ...`, no errors mentioning `articulos/aceite-de-oliva-punto-de-humo.html`.

- [ ] **Step 3: Commit**

```bash
git add articulos/aceite-de-oliva-punto-de-humo.html
git commit -m "Add article: Aceite de oliva y punto de humo"
```

---

### Task 7: Article 2 — "¿Qué le pasa al omega-3 del lino cuando horneás?"

**Files:**
- Create: `articulos/omega-3-lino-horneado.html`

**Interfaces:**
- Consumes/Produces: same conventions as Task 6.

- [ ] **Step 1: Create `articulos/omega-3-lino-horneado.html`**

```html
<!DOCTYPE html>
<html lang="es-UY">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://tally.so">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="icon" href="../favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="../apple-touch-icon.png">
  <link rel="manifest" href="../site.webmanifest">
  <meta name="theme-color" content="#20301f">
  <title>¿Qué le pasa al omega-3 del lino cuando horneás? — Clorofila</title>
  <meta name="description" content="El ALA del lino es el ácido graso más inestable al calor. Qué le pasa cuando horneás a temperaturas reales, y qué podés hacer al respecto.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://clorofila.uy/articulos/omega-3-lino-horneado">
  <meta property="og:type"        content="article">
  <meta property="og:url"         content="https://clorofila.uy/articulos/omega-3-lino-horneado">
  <meta property="og:title"       content="¿Qué le pasa al omega-3 del lino cuando horneás? — Clorofila">
  <meta property="og:description" content="El ALA del lino es el ácido graso más inestable al calor. Qué le pasa cuando horneás a temperaturas reales, y qué podés hacer al respecto.">
  <meta property="og:image"       content="https://clorofila.uy/img-leo-cocina.jpg">
  <meta property="og:locale"      content="es_UY">
  <meta name="twitter:card"       content="summary_large_image">
  <meta name="twitter:image"      content="https://clorofila.uy/img-leo-cocina.jpg">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Jost:wght@300;400;500;600&display=swap">
  <link rel="stylesheet" href="../shared.css?v=20260625">
  <style>
    .articulo-hero { background: var(--verde); padding: 4rem 2rem 3rem; }
    .articulo-hero-inner { max-width: var(--max-narrow); margin: 0 auto; }
    .articulo-breadcrumb { font-size: .78rem; color: rgba(255,255,255,.55); margin-bottom: 1.5rem; }
    .articulo-breadcrumb a { color: rgba(255,255,255,.75); }
    .articulo-breadcrumb a:hover { color: var(--crema); }
    .articulo-hero h1 { color: var(--crema); margin-bottom: .75rem; }
    .articulo-fecha { font-size: .82rem; color: rgba(255,255,255,.55); }
    .articulo-body { max-width: var(--max-narrow); margin: 0 auto; padding: 3.5rem 2rem; }
    .articulo-body h2 { font-size: 1.5rem; margin: 2.5rem 0 1rem; }
    .articulo-body p { margin-bottom: 1.25rem; line-height: 1.8; }
    .articulo-destacado { background: var(--verde-tinte); border-left: 3px solid var(--verde-luz); border-radius: var(--r-md); padding: 1.5rem 1.75rem; margin: 2rem 0; font-style: italic; color: var(--texto); }
    .articulo-cta { background: var(--verde); border-radius: var(--r-lg); padding: 2rem; margin-top: 3rem; text-align: center; }
    .articulo-cta p { color: rgba(255,255,255,.75); margin-bottom: 1.25rem; }
    .articulo-relacionados { max-width: var(--max-narrow); margin: 0 auto 5rem; padding: 0 2rem; }
    .articulo-relacionados h2 { font-size: 1.1rem; margin-bottom: 1rem; }
    .articulo-relacionados ul { display: flex; flex-direction: column; gap: .6rem; }
    .articulo-relacionados a { color: var(--verde-med); font-weight: 500; }
    .articulo-relacionados a:hover { color: var(--acento); }
  </style>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Article","headline":"¿Qué le pasa al omega-3 del lino cuando horneás?","author":{"@type":"Organization","name":"Clorofila"},"publisher":{"@type":"Organization","name":"Clorofila Estudio de Cocina","logo":{"@type":"ImageObject","url":"https://clorofila.uy/icon-512.png"}},"datePublished":"2026-06-25","mainEntityOfPage":"https://clorofila.uy/articulos/omega-3-lino-horneado","isPartOf":{"@type":"WebSite","name":"Clorofila","url":"https://clorofila.uy/"}}
  </script>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Inicio","item":"https://clorofila.uy/"},{"@type":"ListItem","position":2,"name":"Artículos","item":"https://clorofila.uy/articulos"},{"@type":"ListItem","position":3,"name":"Omega-3 del lino al horno","item":"https://clorofila.uy/articulos/omega-3-lino-horneado"}]}
  </script>
  <!-- Analítica con consentimiento (GA4 + Meta Pixel) — reemplazar los IDs -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.loadAnalytics = function () {
      if (window.__analyticsLoaded) return;
      if (location.hostname !== 'clorofila.uy' && location.hostname !== 'www.clorofila.uy') return;
      window.__analyticsLoaded = true;
      var ga = document.createElement('script');
      ga.async = true;
      ga.src = 'https://www.googletagmanager.com/gtag/js?id=G-BBLJT4TYCV';
      document.head.appendChild(ga);
      gtag('js', new Date());
      gtag('config', 'G-BBLJT4TYCV');
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
      document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init','2002873889966452');
      fbq('track','PageView');
    };
    if (localStorage.getItem('cookieConsent') === 'accepted') window.loadAnalytics();
  </script>
</head>
<body>
<a class="skip-link" href="#main-content">Ir al contenido principal</a>

<!--#include nav active="articulos.html"-->
<nav class="nav" aria-label="Principal">
  <div class="nav-inner">
    <a href="../index.html" class="nav-logo"><span>Clorofila</span><span>Estudio de Cocina</span></a>
    <button type="button" class="nav-close" id="nav-close" aria-label="Cerrar menú">✕</button>
    <ul class="nav-links" id="nav-links">
      <li><a href="../curso.html">El curso</a></li>
      <li><a href="../talleres.html">Talleres</a></li>
      <li><a href="../articulos.html" class="active" aria-current="page">Artículos</a></li>
      <li><a href="../leonardo.html">Leonardo</a></li>
      <li><a href="../servicios.html">Trabajemos juntos</a></li>
      <li><a href="../sobre.html">Sobre</a></li>
      <li><a href="../contacto.html">Contacto</a></li>
      <li><a href="https://tally.so/r/EkMbWL" target="_blank" rel="noopener noreferrer" class="nav-cta">Inscribirme →</a></li>
    </ul>
    <button class="nav-hamburger" id="nav-hamburger" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav-links">☰</button>
  </div>
</nav>
<!--#include-end nav-->

<main id="main-content">
<div class="articulo-hero">
  <div class="articulo-hero-inner">
    <p class="articulo-breadcrumb"><a href="../index.html">Inicio</a> / <a href="../articulos.html">Artículos</a> / Omega-3 del lino al horno</p>
    <span class="section-label" style="color:var(--verde-luz)">Omega-3</span>
    <h1>¿Qué le pasa al omega-3 del lino cuando horneás?</h1>
    <p class="articulo-fecha">Publicado el 25 de junio de 2026</p>
  </div>
</div>

<article class="articulo-body">
  <p>La semilla de lino molida se volvió un agregado habitual en panes, bizcochuelos y mezclas horneadas — es una de las fuentes vegetales más concentradas de ácido alfa-linolénico (ALA), el omega-3 de origen vegetal. Pero el ALA tiene una particularidad química que rara vez se menciona cuando se recomienda "agregale lino a todo": es el ácido graso más sensible al calor y al oxígeno de los que se usan habitualmente en la cocina.</p>

  <h2>Por qué el ALA es distinto a otras grasas</h2>
  <p>Los ácidos grasos poliinsaturados como el ALA tienen varios dobles enlaces en su estructura química. Cada doble enlace es un punto donde el oxígeno puede reaccionar y romper la molécula — cuantos más dobles enlaces, más inestable es la grasa frente al calor y al aire. El ALA tiene tres, lo que lo ubica entre los ácidos grasos comunes más propensos a oxidarse cuando se expone a temperaturas de horneado sostenidas.</p>
  <p>Esto no es exclusivo del lino: pasa con cualquier fuente de omega-3 poliinsaturado sometida a calor prolongado. Pero como el lino se popularizó específicamente como "fuente de omega-3 para agregar a las recetas horneadas", vale la pena mirar qué le pasa en ese contexto concreto.</p>

  <h2>Qué significa "degradarse" en términos prácticos</h2>
  <p>Cuando el ALA se oxida, no se vuelve tóxico en las cantidades de una preparación casera — pero deja de aportar lo que se buscaba al agregarlo: dejó de estar disponible como omega-3 intacto. En otras palabras, el problema no es de seguridad, es de propósito: si agregaste lino a un pan pensando en el aporte de omega-3, parte de ese aporte se puede perder en el horno antes de que llegue a tu plato. <span>[VERIFICAR: porcentaje de pérdida de ALA en horneado a temperaturas domésticas habituales, con fuente]</span>.</p>
  <p>La semilla de lino entera es algo más estable que la molida, porque la cáscara protege parcialmente el aceite interno del contacto con el oxígeno. Pero la semilla entera tampoco se digiere bien sin moler — así que hay una tensión real entre "biodisponible" y "estable al calor" que no tiene una solución perfecta de un solo paso.</p>

  <div class="articulo-destacado">El lino agregado a una mezcla horneada sigue aportando fibra, lignanos y minerales intactos — lo que se pierde principalmente es la fracción de omega-3, no el resto del perfil nutricional de la semilla.</div>

  <h2>Qué podés hacer en tu cocina</h2>
  <p>Si tu objetivo principal al usar lino es el aporte de omega-3, conviene priorizarlo en preparaciones que no requieran calor: licuados, yogures, ensaladas, o espolvoreado sobre un plato ya servido. Ahí el ALA llega prácticamente intacto.</p>
  <p>Si el lino va en una mezcla horneada, sigue siendo una buena decisión por el resto de sus nutrientes (fibra soluble, lignanos con actividad antioxidante, minerales) — solo conviene no contar con que sea tu fuente principal de omega-3 en esa preparación. Para eso, las preparaciones sin calor directo son más confiables.</p>
  <p>Moler la semilla justo antes de usarla (en lugar de comprarla ya molida y guardada por semanas) también ayuda: minimiza el tiempo de exposición del aceite interno al oxígeno antes de que la comas.</p>

  <div class="articulo-cta">
    <p>Esto es justo el tipo de criterio que se trabaja en el curso de 3 meses: no memorizar reglas, sino entender el mecanismo detrás de cada decisión en la cocina.</p>
    <a href="../curso.html" class="btn btn-light">Conocer el curso →</a>
  </div>
</article>

<div class="articulo-relacionados">
  <h2>Seguí leyendo</h2>
  <ul>
    <li><a href="aceite-de-oliva-punto-de-humo.html">Aceite de oliva y punto de humo →</a></li>
    <li><a href="lavado-de-frutas-bicarbonato.html">Lavado de frutas: bicarbonato vs agua sola →</a></li>
    <li><a href="mas-alla-del-colesterol-total.html">Más allá del colesterol total →</a></li>
  </ul>
</div>
</main>

<footer class="footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <span class="logo">Clorofila</span>
      <p class="tagline">No enseñamos recetas. <br>Enseñamos a entender.</p>
      <p class="sub">Maldonado 1976 esq. Blanes · Parque Rodó · Montevideo · Desde 2013</p>
    </div>
    <div><h2>Propuesta</h2><ul><li><a href="../curso.html">El curso</a></li><li><a href="../talleres.html">Talleres</a></li><li><a href="../servicios.html">Trabajemos juntos</a></li><li><a href="../articulos.html">Artículos</a></li></ul></div>
    <div><h2>Clorofila</h2><ul><li><a href="../leonardo.html">Leonardo Lemes</a></li><li><a href="../sobre.html">Sobre nosotros</a></li><li><a href="../contacto.html">Contacto</a></li><li><a href="https://instagram.com/clorofilaclases" target="_blank" rel="noopener noreferrer">Instagram</a></li></ul></div>
    <div><h2>Contacto</h2><ul><li><a href="mailto:nutreclorofila@gmail.com">nutreclorofila@gmail.com</a></li><li><a href="https://wa.me/59894064148">094 064 148</a></li></ul></div>
  </div>
  <div class="footer-bottom">© 2026 Clorofila Estudio de Cocina · Parque Rodó · Montevideo · Uruguay</div>
</footer>

<div class="sticky-cta" id="sticky-cta">
  <a href="https://tally.so/r/EkMbWL" target="_blank" rel="noopener noreferrer" class="cta-main">Inscribirme →</a>
  <a href="https://wa.me/59894064148?text=Hola%2C%20quiero%20info%20del%20curso%20de%20Clorofila." target="_blank" rel="noopener noreferrer" class="wa-btn" aria-label="Escribir por WhatsApp">💬</a>
</div>

<script src="../nav.js" defer></script>
<script>
  const obs = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } }); }, { threshold: 0.06, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.fade-up, .reveal-img').forEach(el => obs.observe(el));
  setTimeout(() => { document.querySelectorAll('.fade-up, .reveal-img').forEach(el => { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('visible'); }); }, 80);
  const cta = document.getElementById('sticky-cta');
  const navEl = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    cta.classList.toggle('visible', window.scrollY > 700);
    if (navEl) navEl.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
</script>
<div class="cookie-banner" id="cookie-banner" role="dialog" aria-label="Aviso de cookies">
  <p>Usamos cookies propias y de terceros para analítica y publicidad. Podés aceptar o rechazar su uso. <a href="../contacto.html">Más info</a></p>
  <div class="cookie-banner-actions">
    <button type="button" id="cookie-decline">Rechazar</button>
    <button type="button" id="cookie-accept">Aceptar</button>
  </div>
</div>
<script>
  (function () {
    const banner = document.getElementById('cookie-banner');
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setTimeout(() => banner.classList.add('visible'), 600);
    }
    document.getElementById('cookie-accept').addEventListener('click', () => {
      localStorage.setItem('cookieConsent', 'accepted');
      banner.classList.remove('visible');
      if (typeof window.loadAnalytics === 'function') window.loadAnalytics();
    });
    document.getElementById('cookie-decline').addEventListener('click', () => {
      localStorage.setItem('cookieConsent', 'declined');
      banner.classList.remove('visible');
    });
  })();
</script>
</body>
</html>
```

- [ ] **Step 2: Validate**

```bash
node scripts/check-jsonld.js
node scripts/check-links.js
```

Expected: `OK: ...` for both, no errors mentioning this file.

- [ ] **Step 3: Commit**

```bash
git add articulos/omega-3-lino-horneado.html
git commit -m "Add article: Omega-3 del lino al horno"
```

---

### Task 8: Article 3 — "Lavado de frutas: bicarbonato vs agua sola"

**Files:**
- Create: `articulos/lavado-de-frutas-bicarbonato.html`

**Interfaces:**
- Consumes/Produces: same conventions as Task 6.

- [ ] **Step 1: Create `articulos/lavado-de-frutas-bicarbonato.html`**

```html
<!DOCTYPE html>
<html lang="es-UY">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://tally.so">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="icon" href="../favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="../apple-touch-icon.png">
  <link rel="manifest" href="../site.webmanifest">
  <meta name="theme-color" content="#20301f">
  <title>Lavado de frutas: bicarbonato vs agua sola — Clorofila</title>
  <meta name="description" content="El bicarbonato ayuda con residuos de contacto en la cáscara. Para plaguicidas sistémicos, ningún lavado alcanza. La distinción importa para saber qué esperar.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://clorofila.uy/articulos/lavado-de-frutas-bicarbonato">
  <meta property="og:type"        content="article">
  <meta property="og:url"         content="https://clorofila.uy/articulos/lavado-de-frutas-bicarbonato">
  <meta property="og:title"       content="Lavado de frutas: bicarbonato vs agua sola — Clorofila">
  <meta property="og:description" content="El bicarbonato ayuda con residuos de contacto en la cáscara. Para plaguicidas sistémicos, ningún lavado alcanza. La distinción importa para saber qué esperar.">
  <meta property="og:image"       content="https://clorofila.uy/img-leo-cocina.jpg">
  <meta property="og:locale"      content="es_UY">
  <meta name="twitter:card"       content="summary_large_image">
  <meta name="twitter:image"      content="https://clorofila.uy/img-leo-cocina.jpg">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Jost:wght@300;400;500;600&display=swap">
  <link rel="stylesheet" href="../shared.css?v=20260625">
  <style>
    .articulo-hero { background: var(--verde); padding: 4rem 2rem 3rem; }
    .articulo-hero-inner { max-width: var(--max-narrow); margin: 0 auto; }
    .articulo-breadcrumb { font-size: .78rem; color: rgba(255,255,255,.55); margin-bottom: 1.5rem; }
    .articulo-breadcrumb a { color: rgba(255,255,255,.75); }
    .articulo-breadcrumb a:hover { color: var(--crema); }
    .articulo-hero h1 { color: var(--crema); margin-bottom: .75rem; }
    .articulo-fecha { font-size: .82rem; color: rgba(255,255,255,.55); }
    .articulo-body { max-width: var(--max-narrow); margin: 0 auto; padding: 3.5rem 2rem; }
    .articulo-body h2 { font-size: 1.5rem; margin: 2.5rem 0 1rem; }
    .articulo-body p { margin-bottom: 1.25rem; line-height: 1.8; }
    .articulo-destacado { background: var(--verde-tinte); border-left: 3px solid var(--verde-luz); border-radius: var(--r-md); padding: 1.5rem 1.75rem; margin: 2rem 0; font-style: italic; color: var(--texto); }
    .articulo-cta { background: var(--verde); border-radius: var(--r-lg); padding: 2rem; margin-top: 3rem; text-align: center; }
    .articulo-cta p { color: rgba(255,255,255,.75); margin-bottom: 1.25rem; }
    .articulo-relacionados { max-width: var(--max-narrow); margin: 0 auto 5rem; padding: 0 2rem; }
    .articulo-relacionados h2 { font-size: 1.1rem; margin-bottom: 1rem; }
    .articulo-relacionados ul { display: flex; flex-direction: column; gap: .6rem; }
    .articulo-relacionados a { color: var(--verde-med); font-weight: 500; }
    .articulo-relacionados a:hover { color: var(--acento); }
  </style>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Article","headline":"Lavado de frutas: bicarbonato vs agua sola","author":{"@type":"Organization","name":"Clorofila"},"publisher":{"@type":"Organization","name":"Clorofila Estudio de Cocina","logo":{"@type":"ImageObject","url":"https://clorofila.uy/icon-512.png"}},"datePublished":"2026-06-25","mainEntityOfPage":"https://clorofila.uy/articulos/lavado-de-frutas-bicarbonato","isPartOf":{"@type":"WebSite","name":"Clorofila","url":"https://clorofila.uy/"}}
  </script>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Inicio","item":"https://clorofila.uy/"},{"@type":"ListItem","position":2,"name":"Artículos","item":"https://clorofila.uy/articulos"},{"@type":"ListItem","position":3,"name":"Lavado de frutas con bicarbonato","item":"https://clorofila.uy/articulos/lavado-de-frutas-bicarbonato"}]}
  </script>
  <!-- Analítica con consentimiento (GA4 + Meta Pixel) — reemplazar los IDs -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.loadAnalytics = function () {
      if (window.__analyticsLoaded) return;
      if (location.hostname !== 'clorofila.uy' && location.hostname !== 'www.clorofila.uy') return;
      window.__analyticsLoaded = true;
      var ga = document.createElement('script');
      ga.async = true;
      ga.src = 'https://www.googletagmanager.com/gtag/js?id=G-BBLJT4TYCV';
      document.head.appendChild(ga);
      gtag('js', new Date());
      gtag('config', 'G-BBLJT4TYCV');
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
      document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init','2002873889966452');
      fbq('track','PageView');
    };
    if (localStorage.getItem('cookieConsent') === 'accepted') window.loadAnalytics();
  </script>
</head>
<body>
<a class="skip-link" href="#main-content">Ir al contenido principal</a>

<!--#include nav active="articulos.html"-->
<nav class="nav" aria-label="Principal">
  <div class="nav-inner">
    <a href="../index.html" class="nav-logo"><span>Clorofila</span><span>Estudio de Cocina</span></a>
    <button type="button" class="nav-close" id="nav-close" aria-label="Cerrar menú">✕</button>
    <ul class="nav-links" id="nav-links">
      <li><a href="../curso.html">El curso</a></li>
      <li><a href="../talleres.html">Talleres</a></li>
      <li><a href="../articulos.html" class="active" aria-current="page">Artículos</a></li>
      <li><a href="../leonardo.html">Leonardo</a></li>
      <li><a href="../servicios.html">Trabajemos juntos</a></li>
      <li><a href="../sobre.html">Sobre</a></li>
      <li><a href="../contacto.html">Contacto</a></li>
      <li><a href="https://tally.so/r/EkMbWL" target="_blank" rel="noopener noreferrer" class="nav-cta">Inscribirme →</a></li>
    </ul>
    <button class="nav-hamburger" id="nav-hamburger" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav-links">☰</button>
  </div>
</nav>
<!--#include-end nav-->

<main id="main-content">
<div class="articulo-hero">
  <div class="articulo-hero-inner">
    <p class="articulo-breadcrumb"><a href="../index.html">Inicio</a> / <a href="../articulos.html">Artículos</a> / Lavado de frutas con bicarbonato</p>
    <span class="section-label" style="color:var(--verde-luz)">Frutas y verduras</span>
    <h1>Lavado de frutas: bicarbonato vs agua sola</h1>
    <p class="articulo-fecha">Publicado el 25 de junio de 2026</p>
  </div>
</div>

<article class="articulo-body">
  <p>"Lavá la fruta con bicarbonato para sacarle los pesticidas" es un consejo que circula hace años, y tiene una parte de verdad y una parte que generalmente no se aclara: depende totalmente de en qué parte de la fruta está el residuo.</p>

  <h2>Dos tipos de residuo, dos comportamientos distintos</h2>
  <p>Los plaguicidas que se usan en la producción de frutas y verduras se dividen, a los fines de esta pregunta, en dos grandes grupos según cómo actúan: los de contacto, que quedan depositados sobre la superficie de la cáscara, y los sistémicos, que la planta absorbe y que terminan distribuidos dentro del tejido del fruto, no solo en la piel.</p>
  <p>Esta distinción es la que determina si lavar —con lo que sea— puede hacer alguna diferencia o no.</p>

  <h2>Dónde el bicarbonato sí ayuda</h2>
  <p>Para residuos de contacto, lavar con agua y un poco de bicarbonato de sodio puede ser más efectivo que el agua sola. El bicarbonato es levemente alcalino y tiene propiedades que ayudan a romper y disolver ciertos residuos de superficie (incluyendo algunas ceras y compuestos grasos que el agua sola no remueve tan bien), además de actuar mecánicamente al fregar la cáscara.</p>
  <p>En ese sentido, el consejo no está mal — funciona mejor que el agua sola para lo que efectivamente puede remover, que es el residuo superficial.</p>

  <div class="articulo-destacado">Ningún método de lavado casero —ni bicarbonato, ni vinagre, ni productos comerciales para frutas— puede sacar un residuo que ya está distribuido dentro del tejido del fruto. Eso no es un problema de técnica de lavado, es un problema de dónde está el residuo.</div>

  <h2>Dónde ningún lavado alcanza</h2>
  <p>Para los plaguicidas sistémicos, lavar la superficie —por más a fondo que se haga— no llega al residuo que está dentro de la pulpa. Ahí la única estrategia que cambia la exposición real es otra: elegir variedades o procedencias con menor uso de este tipo de productos, pelar cuando la fruta lo permite (sabiendo que se pierde parte de la fibra y los nutrientes de la cáscara), o priorizar producción orgánica o agroecológica cuando es una opción accesible.</p>
  <p>Esto no es un llamado al alarmismo: las dosis reguladas de plaguicidas autorizados están, en general, muy por debajo de los umbrales de riesgo establecidos por los organismos sanitarios. <span>[VERIFICAR: cita a la normativa o ente regulador uruguayo/regional aplicable, si se quiere agregar precisión]</span>. La idea no es asustarse, es entender qué hace exactamente cada método para no depender de uno que no resuelve lo que se espera de él.</p>

  <h2>Qué hacer en tu cocina</h2>
  <p>Un lavado con agua y bicarbonato, frotando bien la cáscara durante unos segundos y enjuagando después, es una rutina razonable para reducir residuos de superficie en frutas y verduras que se comen con cáscara. Para el resto —lo sistémico— la variable que realmente cambia algo es la elección de qué comprás y de dónde viene, no cómo lo lavás en la pileta de tu cocina.</p>

  <div class="articulo-cta">
    <p>Esto es justo el tipo de criterio que se trabaja en el curso de 3 meses: no memorizar reglas, sino entender el mecanismo detrás de cada decisión en la cocina.</p>
    <a href="../curso.html" class="btn btn-light">Conocer el curso →</a>
  </div>
</article>

<div class="articulo-relacionados">
  <h2>Seguí leyendo</h2>
  <ul>
    <li><a href="aceite-de-oliva-punto-de-humo.html">Aceite de oliva y punto de humo →</a></li>
    <li><a href="omega-3-lino-horneado.html">¿Qué le pasa al omega-3 del lino cuando horneás? →</a></li>
    <li><a href="mas-alla-del-colesterol-total.html">Más allá del colesterol total →</a></li>
  </ul>
</div>
</main>

<footer class="footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <span class="logo">Clorofila</span>
      <p class="tagline">No enseñamos recetas. <br>Enseñamos a entender.</p>
      <p class="sub">Maldonado 1976 esq. Blanes · Parque Rodó · Montevideo · Desde 2013</p>
    </div>
    <div><h2>Propuesta</h2><ul><li><a href="../curso.html">El curso</a></li><li><a href="../talleres.html">Talleres</a></li><li><a href="../servicios.html">Trabajemos juntos</a></li><li><a href="../articulos.html">Artículos</a></li></ul></div>
    <div><h2>Clorofila</h2><ul><li><a href="../leonardo.html">Leonardo Lemes</a></li><li><a href="../sobre.html">Sobre nosotros</a></li><li><a href="../contacto.html">Contacto</a></li><li><a href="https://instagram.com/clorofilaclases" target="_blank" rel="noopener noreferrer">Instagram</a></li></ul></div>
    <div><h2>Contacto</h2><ul><li><a href="mailto:nutreclorofila@gmail.com">nutreclorofila@gmail.com</a></li><li><a href="https://wa.me/59894064148">094 064 148</a></li></ul></div>
  </div>
  <div class="footer-bottom">© 2026 Clorofila Estudio de Cocina · Parque Rodó · Montevideo · Uruguay</div>
</footer>

<div class="sticky-cta" id="sticky-cta">
  <a href="https://tally.so/r/EkMbWL" target="_blank" rel="noopener noreferrer" class="cta-main">Inscribirme →</a>
  <a href="https://wa.me/59894064148?text=Hola%2C%20quiero%20info%20del%20curso%20de%20Clorofila." target="_blank" rel="noopener noreferrer" class="wa-btn" aria-label="Escribir por WhatsApp">💬</a>
</div>

<script src="../nav.js" defer></script>
<script>
  const obs = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } }); }, { threshold: 0.06, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.fade-up, .reveal-img').forEach(el => obs.observe(el));
  setTimeout(() => { document.querySelectorAll('.fade-up, .reveal-img').forEach(el => { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('visible'); }); }, 80);
  const cta = document.getElementById('sticky-cta');
  const navEl = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    cta.classList.toggle('visible', window.scrollY > 700);
    if (navEl) navEl.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
</script>
<div class="cookie-banner" id="cookie-banner" role="dialog" aria-label="Aviso de cookies">
  <p>Usamos cookies propias y de terceros para analítica y publicidad. Podés aceptar o rechazar su uso. <a href="../contacto.html">Más info</a></p>
  <div class="cookie-banner-actions">
    <button type="button" id="cookie-decline">Rechazar</button>
    <button type="button" id="cookie-accept">Aceptar</button>
  </div>
</div>
<script>
  (function () {
    const banner = document.getElementById('cookie-banner');
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setTimeout(() => banner.classList.add('visible'), 600);
    }
    document.getElementById('cookie-accept').addEventListener('click', () => {
      localStorage.setItem('cookieConsent', 'accepted');
      banner.classList.remove('visible');
      if (typeof window.loadAnalytics === 'function') window.loadAnalytics();
    });
    document.getElementById('cookie-decline').addEventListener('click', () => {
      localStorage.setItem('cookieConsent', 'declined');
      banner.classList.remove('visible');
    });
  })();
</script>
</body>
</html>
```

- [ ] **Step 2: Validate**

```bash
node scripts/check-jsonld.js
node scripts/check-links.js
```

Expected: `OK: ...` for both.

- [ ] **Step 3: Commit**

```bash
git add articulos/lavado-de-frutas-bicarbonato.html
git commit -m "Add article: Lavado de frutas con bicarbonato"
```

---

### Task 9: Article 4 — "Más allá del colesterol total"

**Files:**
- Create: `articulos/mas-alla-del-colesterol-total.html`

**Interfaces:**
- Consumes/Produces: same conventions as Task 6.

- [ ] **Step 1: Create `articulos/mas-alla-del-colesterol-total.html`**

```html
<!DOCTYPE html>
<html lang="es-UY">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="preconnect" href="https://tally.so">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="icon" href="../favicon.svg" type="image/svg+xml">
  <link rel="icon" href="../favicon-32.png" sizes="32x32" type="image/png">
  <link rel="apple-touch-icon" href="../apple-touch-icon.png">
  <link rel="manifest" href="../site.webmanifest">
  <meta name="theme-color" content="#20301f">
  <title>Más allá del colesterol total — Clorofila</title>
  <meta name="description" content="Apo-B, tamaño de partícula LDL y otros marcadores dan una imagen más completa que el colesterol total solo. Qué significan y por qué cambian el panorama.">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://clorofila.uy/articulos/mas-alla-del-colesterol-total">
  <meta property="og:type"        content="article">
  <meta property="og:url"         content="https://clorofila.uy/articulos/mas-alla-del-colesterol-total">
  <meta property="og:title"       content="Más allá del colesterol total — Clorofila">
  <meta property="og:description" content="Apo-B, tamaño de partícula LDL y otros marcadores dan una imagen más completa que el colesterol total solo. Qué significan y por qué cambian el panorama.">
  <meta property="og:image"       content="https://clorofila.uy/img-leo-cocina.jpg">
  <meta property="og:locale"      content="es_UY">
  <meta name="twitter:card"       content="summary_large_image">
  <meta name="twitter:image"      content="https://clorofila.uy/img-leo-cocina.jpg">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Jost:wght@300;400;500;600&display=swap">
  <link rel="stylesheet" href="../shared.css?v=20260625">
  <style>
    .articulo-hero { background: var(--verde); padding: 4rem 2rem 3rem; }
    .articulo-hero-inner { max-width: var(--max-narrow); margin: 0 auto; }
    .articulo-breadcrumb { font-size: .78rem; color: rgba(255,255,255,.55); margin-bottom: 1.5rem; }
    .articulo-breadcrumb a { color: rgba(255,255,255,.75); }
    .articulo-breadcrumb a:hover { color: var(--crema); }
    .articulo-hero h1 { color: var(--crema); margin-bottom: .75rem; }
    .articulo-fecha { font-size: .82rem; color: rgba(255,255,255,.55); }
    .articulo-body { max-width: var(--max-narrow); margin: 0 auto; padding: 3.5rem 2rem; }
    .articulo-body h2 { font-size: 1.5rem; margin: 2.5rem 0 1rem; }
    .articulo-body p { margin-bottom: 1.25rem; line-height: 1.8; }
    .articulo-destacado { background: var(--verde-tinte); border-left: 3px solid var(--verde-luz); border-radius: var(--r-md); padding: 1.5rem 1.75rem; margin: 2rem 0; font-style: italic; color: var(--texto); }
    .articulo-cta { background: var(--verde); border-radius: var(--r-lg); padding: 2rem; margin-top: 3rem; text-align: center; }
    .articulo-cta p { color: rgba(255,255,255,.75); margin-bottom: 1.25rem; }
    .articulo-relacionados { max-width: var(--max-narrow); margin: 0 auto 5rem; padding: 0 2rem; }
    .articulo-relacionados h2 { font-size: 1.1rem; margin-bottom: 1rem; }
    .articulo-relacionados ul { display: flex; flex-direction: column; gap: .6rem; }
    .articulo-relacionados a { color: var(--verde-med); font-weight: 500; }
    .articulo-relacionados a:hover { color: var(--acento); }
  </style>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Article","headline":"Más allá del colesterol total","author":{"@type":"Organization","name":"Clorofila"},"publisher":{"@type":"Organization","name":"Clorofila Estudio de Cocina","logo":{"@type":"ImageObject","url":"https://clorofila.uy/icon-512.png"}},"datePublished":"2026-06-25","mainEntityOfPage":"https://clorofila.uy/articulos/mas-alla-del-colesterol-total","isPartOf":{"@type":"WebSite","name":"Clorofila","url":"https://clorofila.uy/"}}
  </script>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Inicio","item":"https://clorofila.uy/"},{"@type":"ListItem","position":2,"name":"Artículos","item":"https://clorofila.uy/articulos"},{"@type":"ListItem","position":3,"name":"Más allá del colesterol total","item":"https://clorofila.uy/articulos/mas-alla-del-colesterol-total"}]}
  </script>
  <!-- Analítica con consentimiento (GA4 + Meta Pixel) — reemplazar los IDs -->
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.loadAnalytics = function () {
      if (window.__analyticsLoaded) return;
      if (location.hostname !== 'clorofila.uy' && location.hostname !== 'www.clorofila.uy') return;
      window.__analyticsLoaded = true;
      var ga = document.createElement('script');
      ga.async = true;
      ga.src = 'https://www.googletagmanager.com/gtag/js?id=G-BBLJT4TYCV';
      document.head.appendChild(ga);
      gtag('js', new Date());
      gtag('config', 'G-BBLJT4TYCV');
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
      document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init','2002873889966452');
      fbq('track','PageView');
    };
    if (localStorage.getItem('cookieConsent') === 'accepted') window.loadAnalytics();
  </script>
</head>
<body>
<a class="skip-link" href="#main-content">Ir al contenido principal</a>

<!--#include nav active="articulos.html"-->
<nav class="nav" aria-label="Principal">
  <div class="nav-inner">
    <a href="../index.html" class="nav-logo"><span>Clorofila</span><span>Estudio de Cocina</span></a>
    <button type="button" class="nav-close" id="nav-close" aria-label="Cerrar menú">✕</button>
    <ul class="nav-links" id="nav-links">
      <li><a href="../curso.html">El curso</a></li>
      <li><a href="../talleres.html">Talleres</a></li>
      <li><a href="../articulos.html" class="active" aria-current="page">Artículos</a></li>
      <li><a href="../leonardo.html">Leonardo</a></li>
      <li><a href="../servicios.html">Trabajemos juntos</a></li>
      <li><a href="../sobre.html">Sobre</a></li>
      <li><a href="../contacto.html">Contacto</a></li>
      <li><a href="https://tally.so/r/EkMbWL" target="_blank" rel="noopener noreferrer" class="nav-cta">Inscribirme →</a></li>
    </ul>
    <button class="nav-hamburger" id="nav-hamburger" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav-links">☰</button>
  </div>
</nav>
<!--#include-end nav-->

<main id="main-content">
<div class="articulo-hero">
  <div class="articulo-hero-inner">
    <p class="articulo-breadcrumb"><a href="../index.html">Inicio</a> / <a href="../articulos.html">Artículos</a> / Más allá del colesterol total</p>
    <span class="section-label" style="color:var(--verde-luz)">Grasas y salud</span>
    <h1>Más allá del colesterol total</h1>
    <p class="articulo-fecha">Publicado el 25 de junio de 2026</p>
  </div>
</div>

<article class="articulo-body">
  <p>"Colesterol total" es el número que más se mira en un análisis de rutina, y también el que menos cuenta de la historia completa. No está mal medirlo — pero tomarlo como el único dato relevante deja afuera información que hoy se considera más útil para entender el riesgo cardiovascular real de una persona.</p>

  <h2>Por qué un solo número no alcanza</h2>
  <p>El colesterol total es la suma de varias fracciones distintas: el colesterol transportado por LDL, por HDL, y una porción menor transportada por otras lipoproteínas. Dos personas pueden tener el mismo colesterol total con perfiles de riesgo completamente distintos, según cómo se reparta ese total entre las fracciones — y, más allá de eso, según las características de esas partículas, no solo su cantidad.</p>

  <h2>Apo-B: contar partículas, no solo colesterol</h2>
  <p>La Apolipoproteína B (Apo-B) es una proteína que está presente en cada partícula de LDL (y en las demás lipoproteínas que se consideran aterogénicas, es decir, con potencial de favorecer la formación de placa en las arterias) — una por partícula. Esto la convierte en una forma de contar directamente cuántas partículas potencialmente problemáticas circulan, en lugar de medir solo cuánto colesterol llevan en conjunto.</p>
  <p>Es posible tener un LDL-colesterol "normal" en el análisis estándar y, al mismo tiempo, un número alto de partículas de LDL pequeñas y densas, cada una con poco colesterol pero numerosas en total — un patrón que varios estudios asocian a mayor riesgo cardiovascular que un número similar de partículas grandes. <span>[VERIFICAR: referencia a guías clínicas o consensos que respalden el uso de Apo-B como marcador adicional, si se quiere citar una fuente específica]</span>.</p>

  <div class="articulo-destacado">El tamaño y la cantidad de partículas de LDL pueden contar una historia distinta a la que cuenta el LDL-colesterol total por sí solo.</div>

  <h2>Tamaño de partícula LDL</h2>
  <p>Relacionado con lo anterior: las partículas de LDL no son todas iguales. Las partículas pequeñas y densas tienden a penetrar más fácilmente la pared arterial y a oxidarse con mayor facilidad que las partículas grandes y menos densas — dos características que las vuelven, en términos generales, más asociadas a la formación de placa. Este patrón de partículas pequeñas se relaciona con factores como la resistencia a la insulina y los niveles de triglicéridos, más que con el colesterol total en sí.</p>

  <h2>TMAO y microbioma: una pieza más reciente del rompecabezas</h2>
  <p>El TMAO (N-óxido de trimetilamina) es un compuesto que producen ciertas bacterias intestinales a partir de nutrientes presentes principalmente en productos de origen animal. Niveles elevados de TMAO se han asociado, en investigación reciente, con mayor riesgo cardiovascular — un mecanismo que es independiente del colesterol y que pone el foco en la composición del microbioma intestinal, no solo en las grasas de la dieta.</p>
  <p>Esto es un área de investigación activa y todavía en desarrollo, no un marcador establecido de uso clínico rutinario como el Apo-B — pero ilustra por qué "colesterol total" es, cada vez más, solo una parte de un panorama mucho más amplio.</p>

  <h2>Qué hacer con esta información</h2>
  <p>Esto no es una invitación a pedirte estudios de laboratorio avanzados por tu cuenta ni a ignorar lo que diga tu médico sobre tu colesterol total — es una invitación a entender que ese número es un punto de partida, no el panorama completo. Si te preocupa tu riesgo cardiovascular real, una conversación con un profesional de la salud sobre marcadores adicionales (como Apo-B, cuando esté disponible) puede dar una imagen más completa que el colesterol total solo.</p>
  <p>Desde la cocina, lo que sí está en tus manos es el patrón general de alimentación: priorizar grasas no saturadas, fibra soluble y alimentos de origen vegetal de forma sostenida influye en varios de estos marcadores a la vez, no solo en el colesterol total.</p>

  <div class="articulo-cta">
    <p>Esto es justo el tipo de criterio que se trabaja en el curso de 3 meses: no memorizar reglas, sino entender el mecanismo detrás de cada decisión en la cocina.</p>
    <a href="../curso.html" class="btn btn-light">Conocer el curso →</a>
  </div>
</article>

<div class="articulo-relacionados">
  <h2>Seguí leyendo</h2>
  <ul>
    <li><a href="aceite-de-oliva-punto-de-humo.html">Aceite de oliva y punto de humo →</a></li>
    <li><a href="omega-3-lino-horneado.html">¿Qué le pasa al omega-3 del lino cuando horneás? →</a></li>
    <li><a href="lavado-de-frutas-bicarbonato.html">Lavado de frutas: bicarbonato vs agua sola →</a></li>
  </ul>
</div>
</main>

<footer class="footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <span class="logo">Clorofila</span>
      <p class="tagline">No enseñamos recetas. <br>Enseñamos a entender.</p>
      <p class="sub">Maldonado 1976 esq. Blanes · Parque Rodó · Montevideo · Desde 2013</p>
    </div>
    <div><h2>Propuesta</h2><ul><li><a href="../curso.html">El curso</a></li><li><a href="../talleres.html">Talleres</a></li><li><a href="../servicios.html">Trabajemos juntos</a></li><li><a href="../articulos.html">Artículos</a></li></ul></div>
    <div><h2>Clorofila</h2><ul><li><a href="../leonardo.html">Leonardo Lemes</a></li><li><a href="../sobre.html">Sobre nosotros</a></li><li><a href="../contacto.html">Contacto</a></li><li><a href="https://instagram.com/clorofilaclases" target="_blank" rel="noopener noreferrer">Instagram</a></li></ul></div>
    <div><h2>Contacto</h2><ul><li><a href="mailto:nutreclorofila@gmail.com">nutreclorofila@gmail.com</a></li><li><a href="https://wa.me/59894064148">094 064 148</a></li></ul></div>
  </div>
  <div class="footer-bottom">© 2026 Clorofila Estudio de Cocina · Parque Rodó · Montevideo · Uruguay</div>
</footer>

<div class="sticky-cta" id="sticky-cta">
  <a href="https://tally.so/r/EkMbWL" target="_blank" rel="noopener noreferrer" class="cta-main">Inscribirme →</a>
  <a href="https://wa.me/59894064148?text=Hola%2C%20quiero%20info%20del%20curso%20de%20Clorofila." target="_blank" rel="noopener noreferrer" class="wa-btn" aria-label="Escribir por WhatsApp">💬</a>
</div>

<script src="../nav.js" defer></script>
<script>
  const obs = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } }); }, { threshold: 0.06, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.fade-up, .reveal-img').forEach(el => obs.observe(el));
  setTimeout(() => { document.querySelectorAll('.fade-up, .reveal-img').forEach(el => { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('visible'); }); }, 80);
  const cta = document.getElementById('sticky-cta');
  const navEl = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    cta.classList.toggle('visible', window.scrollY > 700);
    if (navEl) navEl.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
</script>
<div class="cookie-banner" id="cookie-banner" role="dialog" aria-label="Aviso de cookies">
  <p>Usamos cookies propias y de terceros para analítica y publicidad. Podés aceptar o rechazar su uso. <a href="../contacto.html">Más info</a></p>
  <div class="cookie-banner-actions">
    <button type="button" id="cookie-decline">Rechazar</button>
    <button type="button" id="cookie-accept">Aceptar</button>
  </div>
</div>
<script>
  (function () {
    const banner = document.getElementById('cookie-banner');
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setTimeout(() => banner.classList.add('visible'), 600);
    }
    document.getElementById('cookie-accept').addEventListener('click', () => {
      localStorage.setItem('cookieConsent', 'accepted');
      banner.classList.remove('visible');
      if (typeof window.loadAnalytics === 'function') window.loadAnalytics();
    });
    document.getElementById('cookie-decline').addEventListener('click', () => {
      localStorage.setItem('cookieConsent', 'declined');
      banner.classList.remove('visible');
    });
  })();
</script>
</body>
</html>
```

- [ ] **Step 2: Validate**

```bash
node scripts/check-jsonld.js
node scripts/check-links.js
```

Expected: `OK: ...` for both.

- [ ] **Step 3: Commit**

```bash
git add articulos/mas-alla-del-colesterol-total.html
git commit -m "Add article: Más allá del colesterol total"
```

---

### Task 10: Final integration — redirects, sitemap, full test suite

**Files:**
- Modify: `netlify.toml`
- Modify: `sitemap.xml`

**Interfaces:**
- Consumes: everything from Tasks 1-9.
- Produces: a fully passing `npm test`, ready for deploy-preview verification.

- [ ] **Step 1: Add the redirect to `netlify.toml`**

Add this new `[[redirects]]` block, placed before the existing `[[headers]]` blocks (i.e. with the other `[[redirects]]` entries near the top of the file):

```toml
[[redirects]]
  from = "/recetas"
  to   = "/articulos"
  status = 301
  force  = true

[[redirects]]
  from = "/recetas.html"
  to   = "/articulos"
  status = 301
  force  = true
```

- [ ] **Step 2: Update `sitemap.xml`**

Replace:

```xml
  <url><loc>https://clorofila.uy/recetas</loc><lastmod>2026-06-24</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>
```

with:

```xml
  <url><loc>https://clorofila.uy/articulos</loc><lastmod>2026-06-25</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>https://clorofila.uy/articulos/aceite-de-oliva-punto-de-humo</loc><lastmod>2026-06-25</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://clorofila.uy/articulos/omega-3-lino-horneado</loc><lastmod>2026-06-25</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://clorofila.uy/articulos/lavado-de-frutas-bicarbonato</loc><lastmod>2026-06-25</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://clorofila.uy/articulos/mas-alla-del-colesterol-total</loc><lastmod>2026-06-25</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>
```

- [ ] **Step 3: Run the full test suite**

```bash
npm install
npm test
```

Expected output ends with all of:
```
OK: nav is in sync across 13 file(s).
OK: checked 13 HTML files, no broken local links/assets found.
OK: checked N JSON-LD block(s) across 13 files, all valid.
OK: all 12 sitemap.xml entries resolve to an existing page.
```
(N = however many JSON-LD blocks exist; html-validate should print no errors for `*.html articulos/*.html`.)

If `check:links` reports broken references, re-check that every `articulos/*.html` file's `../shared.css?v=20260625`, `../nav.js`, and `../favicon*` references match files that exist at the repo root (they do — these are pre-existing root files, only the reference path changed).

- [ ] **Step 4: Commit**

```bash
git add netlify.toml sitemap.xml
git commit -m "Add /recetas -> /articulos redirect and update sitemap.xml

Closes out the articulos blog conversion: redirect preserves any
existing SEO value from /recetas, sitemap now lists /articulos and
the 4 new article pages instead of the old hub URL."
```

- [ ] **Step 5: Push the branch and open a PR (do NOT merge)**

```bash
git push -u origin claude/articulos-blog
gh pr create --title "Convert Artículos teasers into real indexable blog posts" --body "See docs/superpowers/specs/2026-06-25-articulos-blog-design.md for the full design. Adds 4 real article pages under /articulos/, fixes nav/menu-script duplication across all pages via a new partial-sync tool, and redirects /recetas to /articulos."
```

- [ ] **Step 6: Wait for Netlify deploy preview and CI checks, then verify manually**

Once the deploy preview is ready (check via `gh pr checks`), use the Claude in Chrome MCP to:
1. Visit the deploy preview's `/articulos` page — confirm cards 01-04 link to real pages, cards 05-10 still show "Próximamente".
2. Visit each of the 4 article pages — confirm they render correctly (desktop and a narrow/mobile width), confirm the breadcrumb, related-articles links, and CTA work.
3. Confirm `/recetas` redirects (301) to `/articulos` on the deploy preview.
4. Open the mobile hamburger menu on one old page (e.g. `/curso`) and one new page (e.g. an article) — confirm both open/close correctly (validates the shared `nav.js` didn't break anything).
5. Check the browser console for JS errors or CSP violations on at least one article page.
6. Run PageSpeed Insights against `/articulos` and one article page — confirm Accessibility/SEO/Best Practices scores stay at 100.

**Do not merge to `main` until the user has reviewed the deploy preview and explicitly confirms.** Merging triggers a production deploy on `clorofila.uy`.

---

## Plan Self-Review Notes

- **Spec coverage:** URLs/redirects (Task 10 + Task 3 rename) ✅; nav partial + nav.js (Tasks 1-2, 4) ✅; article template incl. JSON-LD/breadcrumb (Tasks 6-9) ✅; 4 articles' content (Tasks 6-9) ✅; technical changes to netlify.toml/sitemap/check scripts (Task 5, 10) ✅; testing/verification plan (Task 10 Step 6) ✅. Footer and images explicitly out of scope, matches spec.
- **Placeholder scan:** the only bracketed markers left in deliverable content are the intentional `[VERIFICAR: ...]` notes specified by the spec as a required pattern for unverifiable statistics — these are not plan placeholders, they're a designed content feature the spec explicitly calls for.
- **Type/interface consistency:** `partials/nav.html` (Task 2) is consumed identically by Tasks 3, 4, 6-9; the marker syntax `<!--#include nav active="X" base="Y"-->` / `<!--#include-end nav-->` is used identically everywhere it appears; `nav.js` (Task 1) is referenced as `nav.js` from root pages and `../nav.js` from `articulos/` pages, consistently.
