# clorofila.uy

## Leé esto primero

1. **Si el pedido se puede entender de dos maneras, decí en una línea cómo lo
   entendiste y esperá.** No arranques a tocar archivos con la interpretación
   más cara. Pasó: "optimizá todo claude" se entendió como "optimizá el sitio",
   y el malentendido apareció recién después de 24 archivos modificados.
2. **Nunca pushear a `main`.** Dispara el deploy de Netlify. Pushear a una rama
   de trabajo no dispara nada.
3. **Avisá cuántos archivos toca un cambio antes de hacerlo.** Son 25 HTML con
   estructura repetida: es fácil que "un cambio chico" sean 24 archivos.
4. **Correr `npm test` antes de cada commit.**
5. **Todo en español rioplatense** (voseo), igual que el sitio.

Las reglas 2 y 4 están además forzadas por `.claude/settings.json`: no dependen
de que alguien las lea.

Sitio estático (HTML + CSS + JS a mano, sin framework ni bundler). Netlify
publica la raíz del repo al hacer push a `main`; el único paso de build es
`node scripts/render-ofertas.js`.

## Antes de tocar nada

```bash
npm ci        # una sola vez
npm test      # fechas, links, versiones de assets, JSON-LD, sitemap, HTML
```

`npm test` es rápido (segundos) y hay que correrlo antes de cada commit: es lo
mismo que corre CI (`.github/workflows/checks.yml`).

## Dónde está cada cosa

| Qué | Dónde |
|---|---|
| Fechas, precios, cupos, estado de cada propuesta | `data/ofertas.json` (**única fuente**) |
| Estilos de todo el sitio | `base.css` |
| Estilos de una sola página | `<style>` dentro de esa página |
| Analítica con consentimiento (GA4 + Meta Pixel) | `consent.js` |
| Medición de eventos (clics, conversiones) | `track.js` |
| Nav, menú móvil, animaciones, banner de cookies | `pagina.js` |
| Artículos del blog | `articulos/*.html` |
| Chequeos de CI | `scripts/check-*.js` |

## Reglas que importan

**Nunca editar a mano fechas, precios ni cupos en el HTML.** Salen de
`data/ofertas.json` vía `npm run ofertas`, que reescribe los bloques marcados
con `<!--o:...-->` y `data-set=`. Editar el HTML directamente hace fallar
`npm run check:ofertas` y se pierde en el siguiente build.

**Al editar `base.css`, `consent.js`, `track.js` o `pagina.js`, subir el `?v=`
en todas las páginas** (ver README). `npm run check:assets` falla si alguna
queda atrás. Sin eso, quien ya visitó el sitio sigue con la versión vieja.

**Cada página usa su propia imagen social.** Si existe `og/og-<pagina>.jpg`,
la página tiene que pedirla en `og:image` y en `twitter:image`. Copiar el
`<head>` de otra página es cómo se cuela la imagen equivocada, y solo se nota
cuando alguien comparte el link. `npm run check:assets` lo verifica.

**Los links de `data/ofertas.json` se validan en el build.** `render-ofertas.js`
corta el deploy si un link no empieza con `https://`, `mailto:`, `tel:`, `/`
o `#`, o si el JSON quedó mal escrito. El mensaje dice qué arreglar.

**La analítica solo corre en `clorofila.uy`.** `consent.js` verifica el
hostname, así que en local y en las previews de Netlify no se mide nada: es a
propósito, no un bug.

**El consentimiento se lee y escribe con `window.consentimiento`** (definido en
`consent.js`), no con `localStorage` directo: con las cookies bloqueadas,
acceder al almacenamiento lanza excepción.

**Un solo lector de scroll.** `pagina.js` usa `enScroll()`, que agrupa todo en
un `requestAnimationFrame`. Agregar un `addEventListener('scroll')` suelto que
mida posiciones traba el scroll en móviles.

**Todo el texto de cara al público está en español rioplatense** (voseo:
"editás", "podés"). Los comentarios del código, también.

## Cambios que tocan muchas páginas

Son 25 HTML con estructura repetida (head, nav, footer). Para un cambio
transversal conviene un script de Node de una sola vez sobre la lista de
archivos, y después `npm test`, en vez de 25 ediciones a mano.
