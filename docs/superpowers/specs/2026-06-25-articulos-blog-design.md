# Diseño: convertir "Artículos" en un blog real indexable

**Fecha:** 2026-06-25
**Contexto:** auditoría amplia del sitio (diseño, SEO, marketing) encontró que la página `/recetas.html` ("Artículos" en el menú) no tiene contenido propio: cada tarjeta es un teaser que redirige al perfil genérico de Instagram (`instagram.com/clorofilaclases`), sin enlazar a un post específico. Esto es la pérdida de SEO más grande detectada: contenido ya escrito (y pagado en tiempo de redacción) que no genera tráfico orgánico ni autoridad de dominio porque vive solo en una plataforma que Google no indexa como contenido propio del sitio.

Este es el primero de tres proyectos de mejora priorizados por el usuario (orden: 1. blog/artículos, 2. prueba social y conversión, 3. mejoras de UX/funnel — los proyectos 2 y 3 tienen su propio ciclo de diseño, fuera de alcance de este documento).

## Objetivo

Migrar el contenido que hoy solo existe como captions de Instagram a posts propios, indexables, con SEO técnico completo, mientras se resuelve de paso un problema de mantenimiento ya confirmado (duplicación del `<nav>` y su script en cada página HTML).

## Alcance

### 1. URLs y redirects

- El hub (`recetas.html`, grilla de tarjetas) se renombra a `articulos.html`.
- Redirect 301 en `netlify.toml`: `/recetas` y `/recetas.html` → `/articulos`.
- 4 posts nuevos en una carpeta `articulos/`:
  - `articulos/aceite-de-oliva-punto-de-humo.html`
  - `articulos/omega-3-lino-horneado.html`
  - `articulos/lavado-de-frutas-bicarbonato.html`
  - `articulos/mas-alla-del-colesterol-total.html`
- Todos los links internos a `recetas.html` (nav de las 13 páginas, footer) se actualizan a `articulos.html`.
- `sitemap.xml`: se quita `/recetas`, se agregan `/articulos` (priority 0.7, changefreq weekly) y los 4 posts (priority 0.6, changefreq monthly).
- `robots.txt`: sin cambios.

### 2. Sistema de partials para el `<nav>` + script de menú compartido

**Problema confirmado:** el `<nav>` está duplicado en las 9 páginas existentes (ya se tuvo que tocar las 9 a mano en una sesión anterior para un fix de accesibilidad). El script inline de apertura/cierre del menú móvil también está duplicado, y ya tiene nombres de variables distintos entre archivos (`navClose` vs `_ncls`, confirmado por inspección), señal de drift por copy-paste. Agregar 4-5 páginas nuevas sin resolver esto sube el problema a 13-14 archivos.

**Decisión de alcance:** NO se introduce un build step para todo el sitio ni se tocan los `<footer>` (que tienen variación legítima entre páginas — ej. `curso.html` usa un botón que abre un overlay de Tally en vez de un link directo). Se resuelve solo la parte que es genuinamente idéntica y donde está el riesgo real:

- **`partials/nav.html`**: el HTML del `<nav>` sin clase `active` en ningún link.
- **Marcador en cada página:**
  ```html
  <!--#include nav active="curso"-->
  ...contenido actual del nav, sera reemplazado...
  <!--#include-end nav-->
  ```
  El atributo `active` indica qué link recibe `class="active" aria-current="page"`.
- **`scripts/sync-partials.js`**: lee cada `*.html` (incluyendo `articulos/*.html`), reemplaza el contenido entre los marcadores con `partials/nav.html` + la clase activa correspondiente. Comando: `npm run sync:partials`.
- **`scripts/check-partials.js`** (o flag `--check` en el mismo script): corre el sync en modo dry-run; si algún archivo cambiaría, falla con exit code 1 (detecta drift). Se agrega a la cadena de `npm test`.
- **`nav.js`** (archivo nuevo, ~12 líneas): contiene el script de abrir/cerrar menú (hamburger, close, Escape, clase `nav-open` en `body`). Cada página lo referencia con `<script src="nav.js" defer></script>` (o `../nav.js` desde `articulos/`) en vez de tener el bloque inline duplicado. Esto resuelve la duplicación de JS sin necesitar build step — es un solo archivo, una sola fuente de verdad.
- El `<footer>` sigue siendo manual por página, sin cambios — está fuera de alcance porque su contenido varía legítimamente.
- **No cambia el pipeline de deploy de Netlify**: sigue siendo HTML estático, `publish="."`, sin build command. El sync es una herramienta de mantenimiento (local + verificada en CI vía `npm test`), no un paso de build de Netlify.

### 3. Plantilla de artículo

Cada post en `articulos/slug.html`:

- Mismo `<head>` que el resto del sitio (fonts, CSS, CSP-compatible — nada que requiera nuevos orígenes externos).
- Header de artículo: categoría (ej. "ACEITES Y GRASAS"), H1, bajada de 1 línea, fecha de publicación. **Sin firma de autor visible** (decisión del usuario).
- Cuerpo en `<article>`, subtítulos H2, estructura mecanismo → qué significa en la práctica → qué hacer en tu cocina.
- Cita/dato destacado con el mismo estilo de tarjeta "antes/con criterio" ya usado en el home (consistencia visual), donde aplique.
- **Sin imagen de cabecera** — solo tipografía (decisión del usuario, consistente con el tono editorial/científico ya usado en las tarjetas "antes/después").
- Cierre con CTA conectando el tema al curso o talleres (ej. "Esto es justo el tipo de criterio que se trabaja en el curso de 3 meses →").
- Al pie: 2-3 "Artículos relacionados" (links a los otros 3 posts) — refuerza linking interno como cluster temático.
- Botón "Volver a Artículos" hacia `/articulos`.
- **JSON-LD `Article`**: headline, autor = `"Clorofila"` (organización, no persona — sin firma individual), fecha de publicación, `publisher` (Clorofila, reusando los mismos datos que el `LocalBusiness` existente en `index.html`), `isPartOf` apuntando al sitio.
- **JSON-LD `BreadcrumbList`**: Inicio / Artículos / [Título del post].
- Breadcrumb visual simple en la página, mismo patrón.

### 4. Contenido de los 4 artículos

| # | Título | Keyword objetivo | Extensión aprox. |
|---|---|---|---|
| 1 | Aceite de oliva y punto de humo: el mito que no muere | "aceite de oliva punto de humo" | 700-800 palabras |
| 2 | ¿Qué le pasa al omega-3 del lino cuando horneás? | "omega 3 lino horno" / "ALA semilla de lino" | 700-800 palabras |
| 3 | Lavado de frutas: bicarbonato vs agua sola | "lavar frutas bicarbonato" / "quitar pesticidas frutas" | 600-700 palabras |
| 4 | Más allá del colesterol total | "colesterol total HDL LDL" / "Apo-B colesterol" | 800-900 palabras |

Cada uno desarrolla la idea ya resumida en la tarjeta actual de `/recetas.html`, con la voz de marca existente ("sin alarmismo, con evidencia y criterio").

**Restricción de rigor de contenido de salud (importante):** el contenido se redacta explicando mecanismos y consensos generales de forma cualitativa, **sin inventar estadísticas, porcentajes exactos, ni citar estudios/papers específicos no verificables**. Si el texto necesita un dato numérico preciso que no se pueda verificar de forma confiable, se marca inline como `[VERIFICAR: dato con fuente]` para que el equipo de Clorofila lo complete con la cifra real en vez de fabricar evidencia. Esto es no negociable: contenido de salud/nutrición con datos inventados es un riesgo de credibilidad y, potencialmente, legal.

### 5. Cambios técnicos adicionales

- `netlify.toml`: redirect nuevo (sección 1). Headers existentes (`/*`) ya cubren `/articulos/*` por wildcard, sin reglas nuevas necesarias.
- `scripts/check-sitemap.js`: revisar/ajustar si hace falta para que resuelva bien URLs dentro de `articulos/`.
- `scripts/check-links.js`: confirmar que resuelve paths relativos desde `articulos/*.html` (ej. `../shared.css`, `../nav.js`).

### 6. Testing y verificación

1. Local: `npm run sync:partials` + revisar diff, luego `npm test` completo (incluye el nuevo `check:partials`).
2. Deploy preview de Netlify en una rama nueva (sin tocar `main`):
   - Verificación visual de los 4 posts (desktop + mobile) vía MCP de Chrome.
   - Confirmar redirect `/recetas` → `/articulos` (301, sin loop).
   - Confirmar que el menú móvil sigue funcionando en una página vieja y una nueva (valida que `nav.js` compartido no rompió nada).
   - Revisar consola por errores JS / violaciones de CSP.
   - PageSpeed Insights sobre `/articulos` y un post — confirmar Accesibilidad/SEO/Best Practices en 100.
3. Antes de mergear a `main`: mostrar capturas y pedir confirmación explícita del usuario (mergear dispara deploy a producción).
4. Post-merge: re-verificar en `clorofila.uy` real con fetch sin caché.

## Fuera de alcance (explícitamente)

- Proyecto 2 (prueba social: testimonios con atribución real + `Review`/`AggregateRating` schema) y proyecto 3 (mejoras de funnel/UX) — quedan para sus propios ciclos de diseño posteriores.
- Unificación del `<footer>` — tiene variación legítima entre páginas, no se toca.
- Imágenes de cabecera para los artículos — decisión explícita de no usar (tono tipográfico/editorial).
- Cualquier cambio al curso, talleres, precios o estructura de servicios.
