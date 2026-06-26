# Conversion Tracking + Course Countdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GA4/Meta Pixel conversion event tracking (lead clicks, Tally form open/submit, WhatsApp clicks) and a real, date-driven countdown to the course start date, as a single project bound for one `main` merge.

**Architecture:** One new dependency-free script (`track.js`) using event delegation on `document` for clicks plus a `window.postMessage` listener for Tally's form-submitted event, loaded on every page the same way `nav.js` already is. Two small inline scripts (one per page) compute a countdown from a fixed date and write it into the DOM — no shared file, since there are only two call sites.

**Tech Stack:** Plain JS (no frameworks), existing `gtag`/`fbq` globals already loaded by each page's analytics consent flow.

## Global Constraints

- `track.js` must not call `gtag`/`fbq` directly without guarding with `typeof gtag === 'function'` / `typeof fbq === 'function'` — these are only real functions after cookie consent is accepted; before that, calling them would throw.
- No fabricated scarcity/urgency data — the countdown uses the real, already-published start date `2026-08-11`.
- This whole project lands in ONE PR and ONE merge to `main` (Netlify production deploys cost ~15 credits each, ~71 remaining this billing cycle) — do not open separate PRs for Part 1 (tracking) and Part 2 (countdown).
- `track.js` is referenced via `<script src="track.js" defer></script>` on the 9 root pages, `<script src="../track.js" defer></script>` on the 4 `articulos/*.html` pages, and `<script src="/track.js" defer></script>` on `404.html` (matches the exact pattern already used for `nav.js` on each of these files).

---

### Task 1: Create `track.js`

**Files:**
- Create: `track.js`

**Interfaces:**
- Produces: a script that, once loaded on any page, listens for clicks matching `[data-tally-open]`, `.nav-cta`, `.cta-main`, and `a[href*="wa.me"]`, plus a `message` event for Tally's `Tally.FormSubmitted` postMessage, and fires the corresponding `gtag`/`fbq` calls. No exports — pure side-effecting script, same style as `nav.js`.

- [ ] **Step 1: Create `track.js`**

```js
(function () {
  function fireLead() {
    if (typeof gtag === 'function') gtag('event', 'generate_lead', { method: 'inscribirme_click' });
    if (typeof fbq === 'function') fbq('track', 'Lead');
  }
  function fireFormOpen() {
    if (typeof gtag === 'function') gtag('event', 'tally_form_open');
    if (typeof fbq === 'function') fbq('track', 'InitiateCheckout');
  }
  function fireSignUp() {
    if (typeof gtag === 'function') gtag('event', 'sign_up', { method: 'tally_form' });
    if (typeof fbq === 'function') fbq('track', 'CompleteRegistration');
  }
  function fireWhatsApp() {
    if (typeof gtag === 'function') gtag('event', 'whatsapp_click');
    if (typeof fbq === 'function') fbq('track', 'Contact');
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-tally-open]')) {
      fireFormOpen();
      return;
    }
    if (e.target.closest('.nav-cta, .cta-main')) {
      fireLead();
      return;
    }
    if (e.target.closest('a[href*="wa.me"]')) {
      fireWhatsApp();
    }
  });

  window.addEventListener('message', function (e) {
    var data = e.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (err) { return; }
    }
    if (data && data.event === 'Tally.FormSubmitted') {
      fireSignUp();
    }
  });
})();
```

- [ ] **Step 2: Verify syntax is valid**

Run: `node --check track.js`
Expected: no output, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add track.js
git commit -m "Add track.js for GA4/Meta Pixel conversion event tracking

Tracks: data-tally-open clicks (form opened), .nav-cta/.cta-main link
clicks that navigate to tally.so directly (lead intent), Tally's
postMessage on form submission (real conversion), and any wa.me link
click. Guards on typeof gtag/fbq === 'function' since both are only
defined after cookie consent is accepted."
```

---

### Task 2: Load `track.js` on all 13 pages

**Files:**
- Modify: `index.html:590`, `curso.html:495`, `talleres.html:261`, `articulos.html:253`, `leonardo.html:461`, `servicios.html:230`, `sobre.html:277`, `contacto.html:214`, `404.html:99`
- Modify: `articulos/aceite-de-oliva-punto-de-humo.html:170`, `articulos/omega-3-lino-horneado.html:166`, `articulos/lavado-de-frutas-bicarbonato.html:168`, `articulos/mas-alla-del-colesterol-total.html:171`

**Interfaces:**
- Consumes: `track.js` (Task 1).
- Produces: every page now loads tracking; later tasks don't depend on this directly but it must ship in the same merge as Tasks 1/3/4 per the Global Constraints.

Each of the 9 root-level files currently has this exact line (confirmed via `grep -n 'src="nav.js"' *.html`):

```html
<script src="nav.js" defer></script>
```

- [ ] **Step 1: Add the line immediately after it in each of the 9 root files** (`index.html`, `curso.html`, `talleres.html`, `articulos.html`, `leonardo.html`, `servicios.html`, `sobre.html`, `contacto.html`):

```html
<script src="nav.js" defer></script>
<script src="track.js" defer></script>
```

- [ ] **Step 2: `404.html` currently has this exact line:**

```html
<script src="/nav.js" defer></script>
```

Add immediately after it:

```html
<script src="/nav.js" defer></script>
<script src="/track.js" defer></script>
```

- [ ] **Step 3: Each of the 4 files in `articulos/` currently has this exact line:**

```html
<script src="../nav.js" defer></script>
```

Add immediately after it, in `articulos/aceite-de-oliva-punto-de-humo.html`, `articulos/omega-3-lino-horneado.html`, `articulos/lavado-de-frutas-bicarbonato.html`, and `articulos/mas-alla-del-colesterol-total.html`:

```html
<script src="../nav.js" defer></script>
<script src="../track.js" defer></script>
```

- [ ] **Step 4: Verify every page references it correctly**

Run: `grep -c 'src="track.js"\|src="\.\./track.js"\|src="/track.js"' *.html articulos/*.html`
Expected: every one of the 13 files (`404.html`, `articulos.html`, `contacto.html`, `curso.html`, `index.html`, `leonardo.html`, `servicios.html`, `sobre.html`, `talleres.html`, and the 4 `articulos/*.html` files) prints `1`.

- [ ] **Step 5: Run the existing link checker**

Run: `npm run check:links`
Expected: `OK: checked 14 HTML files, no broken local links/assets found.` (confirms `track.js` resolves correctly from every directory depth, including the `/track.js` absolute reference from `404.html`).

- [ ] **Step 6: Commit**

```bash
git add index.html curso.html talleres.html articulos.html leonardo.html servicios.html sobre.html contacto.html 404.html articulos/aceite-de-oliva-punto-de-humo.html articulos/omega-3-lino-horneado.html articulos/lavado-de-frutas-bicarbonato.html articulos/mas-alla-del-colesterol-total.html
git commit -m "Load track.js on all 13 pages"
```

---

### Task 3: Real countdown to course start on `index.html`

**Files:**
- Modify: `index.html:254`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: an element `#curso-countdown` whose text is computed client-side; no other task depends on it.

`index.html` currently has this exact block (confirmed via `grep -n -A3 'announce-bar"' index.html`):

```html
<div class="announce-bar">
  <span class="dot"></span>
  Agosto 2026 · Grupos reducidos · Inscripciones abiertas · cupos limitados
  <a href="curso.html">Conocer el curso →</a>
</div>
```

- [ ] **Step 1: Replace the static text with a span placeholder**

```html
<div class="announce-bar">
  <span class="dot"></span>
  <span id="curso-countdown">Agosto 2026</span> · Grupos reducidos · Inscripciones abiertas · cupos limitados
  <a href="curso.html">Conocer el curso →</a>
</div>
```

- [ ] **Step 2: Add the countdown script immediately before the closing `</body>` tag** (after the existing cookie-banner script block, consistent with where page-specific inline scripts already live on this file):

```html
<script>
  (function () {
    var el = document.getElementById('curso-countdown');
    if (!el) return;
    var start = new Date('2026-08-11T00:00:00');
    var days = Math.ceil((start - new Date()) / 86400000);
    if (days > 0) {
      var weeks = Math.ceil(days / 7);
      el.textContent = 'Empieza en ' + weeks + ' semana' + (weeks === 1 ? '' : 's');
    } else {
      el.textContent = '11 de agosto';
    }
  })();
</script>
```

- [ ] **Step 3: Verify in Node that the date math is correct**

Run:
```bash
node -e "
var start = new Date('2026-08-11T00:00:00');
var days = Math.ceil((start - new Date()) / 86400000);
var weeks = Math.ceil(days / 7);
console.log('days:', days, 'weeks:', weeks);
"
```
Expected: a positive `days` count (in the 40s, since today is 2026-06-26 and the target is 2026-08-11) and a positive `weeks` count (around 6-7). If `days` is negative, the hardcoded date `2026-08-11` is wrong relative to the current date — stop and re-check the source of truth at `curso.html:446` ("Inicio: Semana del 11 de agosto") before continuing.

- [ ] **Step 4: Run the HTML validator**

Run: `npm run check:html`
Expected: exit code 0, no errors.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "Add real countdown to course start date in announce bar

Computes weeks-until-2026-08-11 client-side from the date already
published at curso.html — no fabricated scarcity, just a dynamic
restatement of a real fact."
```

---

### Task 4: Real countdown to course start on `curso.html`

**Files:**
- Modify: `curso.html:295`

**Interfaces:**
- Consumes: nothing from earlier tasks (independent of Task 3 — different element id, different page).
- Produces: an element `#curso-countdown-tag` whose text is computed client-side.

`curso.html` currently has this exact line (confirmed via `sed -n '290,300p' curso.html`):

```html
      <li><span class="hero-tag">Agosto 2026</span></li>
```

- [ ] **Step 1: Replace it with**

```html
      <li><span class="hero-tag" id="curso-countdown-tag">Agosto 2026</span></li>
```

- [ ] **Step 2: Add the countdown script immediately before the closing `</body>` tag** (after the existing cookie-banner script block, same placement convention as Task 3):

```html
<script>
  (function () {
    var el = document.getElementById('curso-countdown-tag');
    if (!el) return;
    var start = new Date('2026-08-11T00:00:00');
    var days = Math.ceil((start - new Date()) / 86400000);
    if (days > 0) {
      var weeks = Math.ceil(days / 7);
      el.textContent = 'Empieza en ' + weeks + ' semana' + (weeks === 1 ? '' : 's');
    } else {
      el.textContent = '11 de agosto';
    }
  })();
</script>
```

- [ ] **Step 3: Run the HTML validator**

Run: `npm run check:html`
Expected: exit code 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add curso.html
git commit -m "Add real countdown to course start date in curso.html hero tag"
```

---

### Task 5: Full integration check, deploy preview verification, single PR

**Files:** none (verification only)

**Interfaces:**
- Consumes: Tasks 1-4 (all files committed on the same branch, `claude/conversion-tracking-funnel`).

- [ ] **Step 1: Run the full test suite**

```bash
npm test
```
Expected: `OK: nav is in sync across 13 file(s).`, `OK: checked 14 HTML files, no broken local links/assets found.`, the JSON-LD check, the sitemap check, and `check:html` all pass with no errors.

- [ ] **Step 2: Push the branch and open ONE pull request covering Tasks 1-4**

```bash
git push origin claude/conversion-tracking-funnel
gh pr create --title "Add conversion tracking (GA4/Meta Pixel) + real course-start countdown" --body "See docs/superpowers/specs/2026-06-26-conversion-tracking-funnel-design.md for the full design. Adds track.js (lead clicks, Tally form open/submit, WhatsApp clicks) and a real countdown to the 2026-08-11 course start date on index.html and curso.html. Single PR per the Netlify credit-saving rule — do not split into multiple merges."
```

- [ ] **Step 3: Wait for the deploy preview, then verify manually with the Claude in Chrome MCP**

Once `gh pr checks <N>` shows the deploy preview is ready:
1. Open the deploy preview homepage, accept cookies (so `gtag`/`fbq` become real functions), open DevTools-equivalent via `javascript_tool` and temporarily wrap `gtag`/`fbq` to log calls (e.g. `const origGtag = window.gtag; window.gtag = (...args) => { console.log('gtag', args); origGtag(...args); }` — same for `fbq`), then click "Inscribirme" in the nav and confirm a `generate_lead` event logs.
2. On the deploy preview's `/curso` page, click "Reservar mi lugar" (the `data-tally-open` button) and confirm `tally_form_open`/`InitiateCheckout` logs, and that the Tally overlay actually opens (functionality unaffected).
3. Click a WhatsApp link and confirm `whatsapp_click`/`Contact` logs.
4. Screenshot the announce bar on the homepage and the hero tag on `/curso` — confirm both show "Empieza en N semanas" with a sane single-digit-to-low-double-digit N, not "Agosto 2026" anymore and not a negative/garbage value.
5. Check the browser console for JS errors.

- [ ] **Step 4: Report results to the user and ask for explicit go-ahead before merging**

Do NOT merge without the user's explicit confirmation — merging triggers a production Netlify deploy, which costs ~15 credits against the ~71 remaining this billing cycle. This is the ONLY merge for this entire project (Tasks 1-4 combined), per the Global Constraints.

---

## Plan Self-Review Notes

- **Spec coverage:** Part 1 (tracking, all 4 event mappings) → Tasks 1-2 ✅. Part 2 (countdown, both pages) → Tasks 3-4 ✅. Single-merge constraint → Task 5 ✅.
- **Placeholder scan:** no TBD/TODO; the only bracket-style text is none — all code blocks are complete and copy-pasteable.
- **Consistency:** `track.js`'s guard pattern (`typeof gtag === 'function'`) is identical to the existing pattern already used elsewhere in these pages' own inline analytics scripts (checked against the spec, which documents this is intentional reuse of an existing guard idiom, not a new convention).
