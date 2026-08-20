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

## Si tocás shared.css

La regla global de imágenes es `img{display:block;max-width:100%;height:auto}`.
El `height:auto` no es decorativo: sin él, el atributo `height` del HTML queda
como altura fija y la foto se **deforma** al angostarse el contenedor. Si alguna
vez se toca esa regla, revisar que las fotos no queden estiradas.


`shared.css` se sirve con caché de un año (`immutable`). Si cambiás el CSS y no
cambiás el `?v=` con el que se pide en el HTML, **quien ya visitó el sitio sigue
viendo el CSS viejo**. Al editarlo, actualizá la versión en todas las páginas:

```bash
grep -rl 'shared.css?v=' *.html articulos/*.html partials/ | xargs sed -i '' 's/shared.css?v=[0-9]*/shared.css?v=AAAAMMDD/'
```

## Comandos

```bash
npm run ofertas   # aplica data/ofertas.json al HTML
npm test          # revisa links, fechas, JSON-LD, sitemap, HTML y navegación
```
