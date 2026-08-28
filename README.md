# clorofila.uy

Sitio estático del Estudio de Cocina Clorofila. Deploy automático vía Netlify al hacer push a `main`.

## Fechas, precios y cupos: se editan sin programar

Todo lo que cambia seguido vive en [`data/ofertas.json`](data/ofertas.json).
Se edita ese archivo, se publica, y la web se regenera sola en el build.

👉 **[Cómo editarlo, paso a paso](docs/editar-ofertas.md)**

Una fecha que ya pasó se retira sola: no quedan banners viejos colgados.

## Links de Instagram

Todos los links importantes llevan UTM para poder medir qué canal vende.
👉 **[Links armados, listos para copiar](docs/links-instagram.md)**

## Si tocás base.css

Todo el CSS del sitio está en `base.css` (más lo específico de cada página, en
un `<style>` dentro de su propio HTML).

La regla global de imágenes es `img{display:block;max-width:100%;height:auto}`.
El `height:auto` no es decorativo: sin él, el atributo `height` del HTML queda
como altura fija y la foto se **deforma** al angostarse el contenedor. Si alguna
vez se toca esa regla, revisar que las fotos no queden estiradas.

## Al editar CSS o JS: subí el `?v=`

`base.css`, `consent.js`, `track.js` y `pagina.js` se sirven con caché. El `?v=`
del HTML es lo único que hace que quien ya visitó el sitio reciba la versión
nueva: si no se cambia, **esa gente sigue viendo la versión vieja**. Se cambia
en todas las páginas de una vez (`perl` viene en macOS y en Linux; `sed` cambia
de sintaxis entre los dos):

```bash
perl -pi -e 's/base\.css\?v=[\w.-]+/base.css?v=AAAAMMDD/g' *.html articulos/*.html
npm run check:assets   # falla si quedó alguna página con la versión vieja
```

## Comandos

```bash
npm run ofertas   # aplica data/ofertas.json al HTML
npm test          # revisa fechas, links, versiones de assets, JSON-LD, sitemap y HTML
npm audit         # vulnerabilidades de las dependencias de desarrollo
```
