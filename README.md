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

## Comandos

```bash
npm run ofertas   # aplica data/ofertas.json al HTML
npm test          # revisa links, fechas, JSON-LD, sitemap, HTML y navegación
```
