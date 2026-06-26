# Diseño: tracking de conversiones + countdown real al curso

**Fecha:** 2026-06-26
**Contexto:** proyecto 3 de la auditoría amplia (diseño/SEO/marketing) + hallazgo de la auditoría de integraciones: GA4 y Meta Pixel están instalados pero solo trackean `PageView` automático, sin ningún evento de conversión. Se agrupan dos mejoras en un solo proyecto/merge para minimizar el consumo de créditos de Netlify (cada merge a `main` cuesta ~15 créditos fijos, quedan ~71 este ciclo).

## Parte 1 — Tracking de conversiones

**Archivo nuevo:** `track.js` (sin dependencias, mismo patrón que `nav.js`). Se referencia con `<script src="track.js" defer></script>` (o `../track.js` desde `articulos/`) en las 13 páginas, después de `nav.js`.

**Mapeo de eventos** (basado en los dos patrones de integración con Tally que ya existen en el código — enlace directo a `tally.so` vs botón `data-tally-open` que abre un overlay embebido):

| Disparador | Selector | GA4 | Meta Pixel |
|---|---|---|---|
| Click en botón `[data-tally-open]` (abre overlay embebido en la página) | `[data-tally-open]` — hay 3 en el código: `curso.html` (x2) e `index.html` (x1), con distintas clases CSS, por eso se matchea por el atributo, no por clase | `gtag('event','tally_form_open')` | `fbq('track','InitiateCheckout')` |
| Click en "Inscribirme" que navega directo a `tally.so` (sale del sitio) | `.nav-cta, .cta-main` — pero excluyendo los que ya tienen `data-tally-open` (se revisa ese primero) | `gtag('event','generate_lead',{method:'inscribirme_click'})` | `fbq('track','Lead')` |
| Formulario de Tally completado (solo detectable cuando el form está embebido vía overlay, no cuando se navegó afuera) | `window.postMessage` con `event === 'Tally.FormSubmitted'` (formato documentado del embed de Tally) | `gtag('event','sign_up',{method:'tally_form'})` | `fbq('track','CompleteRegistration')` |
| Click en cualquier link de WhatsApp | `a[href*="wa.me"]` (delegado, cubre el botón flotante y cualquier link de contacto) | `gtag('event','whatsapp_click')` | `fbq('track','Contact')` |

**Implementación (`track.js` completo):**

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

**Nota sobre consentimiento de cookies:** `gtag`/`fbq` solo existen como funciones reales después de `window.loadAnalytics()` (que ya está condicionado a `cookieConsent === 'accepted'`). Antes de eso, `typeof gtag === 'function'` es `false` (no están definidas como funciones reales) así que los `if` simplemente no disparan nada — no se necesita lógica de consentimiento nueva, ya queda cubierto por el guard existente en cada página.

## Parte 2 — Countdown real al inicio del curso

Sin escasez fabricada (sin contador de cupos falso) — solo se calcula en el cliente cuántas semanas faltan hasta la fecha real ya publicada ("semana del 11 de agosto de 2026") y se muestra en lugar del texto estático "Agosto 2026".

**`index.html` línea 254**, dentro de `.announce-bar`, se agrega un `<span id="curso-countdown">` que un script chico (inline, en la misma página, no amerita archivo nuevo) completa al cargar:

```html
Inscripciones abiertas · cupos limitados · <span id="curso-countdown">Agosto 2026</span>
```

```js
(function () {
  var el = document.getElementById('curso-countdown');
  if (!el) return;
  var start = new Date('2026-08-11T00:00:00');
  var days = Math.ceil((start - new Date()) / 86400000);
  if (days > 0) {
    var weeks = Math.ceil(days / 7);
    el.textContent = 'Empieza en ' + weeks + ' semana' + (weeks === 1 ? '' : 's') + ' · 11 de agosto';
  } else {
    el.textContent = '11 de agosto';
  }
})();
```

**`curso.html` línea 295**, el `<span class="hero-tag">Agosto 2026</span>` se reemplaza por `<span class="hero-tag" id="curso-countdown-tag">Agosto 2026</span>`, con su propio script inline (no comparte archivo con el de `index.html` — son 2 usos triviales, no amerita un archivo compartido):

```js
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
```

Si la fecha ya pasó al momento de la visita, el script muestra solo la fecha sin "empieza en X semanas" (evita mostrar "empieza en 0 semanas" o números negativos).

## Archivos tocados

- Nuevo: `track.js`
- 13 páginas (`*.html` + `articulos/*.html`): agregar `<script src="track.js" defer></script>` (con el prefijo `../` correspondiente en `articulos/`)
- `index.html`: countdown en announce-bar
- `curso.html`: countdown en hero-tag

## Verificación

- `npm test` (sin cambios a los scripts de chequeo, solo contenido HTML/JS nuevo).
- Deploy preview: simular clicks en cada selector y confirmar en la consola (`window.dataLayer`, `fbq.queue` o logs manuales agregados temporalmente) que cada evento se dispara una sola vez por click. Confirmar visualmente el countdown muestra un número de semanas razonable (con la fecha actual del sistema, ~6 semanas).
- **Un solo merge a `main`** para esta parte 1 + parte 2 juntas, según la regla de créditos de Netlify ya establecida.

## Fuera de alcance

- No se agrega newsletter/email marketing (proyecto separado, requiere elegir e integrar un ESP).
- No se verifica si Tally está conectado a Sheets/CRM — eso se configura en el dashboard de Tally, fuera del repo.
- No se tocan más elementos de UX/funnel además del countdown (se evaluó y descartado: diferenciación visual curso/talleres en nav ya está bien resuelta hoy — solo "Inscribirme" tiene estilo de botón, el resto son links de texto plano).
