# Reescribir la redacción del sitio — alcance y avance

Arrancó el 12/9/2026. Leo: *"la redacción tiene una forma que es muy dura o no
llega"*, *"damos un curso de tres meses eso no dice nada"*, *"tenés que pensar
lo que funciona, no lo que crees que funciona"*.

## Alcance (filtro duro, escrito antes de empezar)

**Entran, en este orden** —de la más vista a la menos—:

1. `index.html` · 2. `curso.html` · 3. `programa.html` · 4. `talleres.html`
5. `pastas.html` · 6. `tapeo.html` · 7. `experiencias.html` · 8. `leonardo.html`
9. `sobre.html` · 10. `servicios.html` · 11. `contacto.html` ·
12. `articulos.html` · 13. `gracias.html`

**No entran:**

- El cuerpo de los 12 artículos del blog. Son divulgación técnica, tienen
  otra vara en la guía y traen el 39% de la visibilidad del sitio. **Sí se
  tocó su bloque de cierre**, que no es divulgación y era el mismo en los
  doce: ver más abajo.
- `404.html`, `privacidad.html` (legal), `googledccf1cf7e028ebab.html`.
- Fechas, precios, cupos y horarios: salen de `data/ofertas.json`. No se tocan
  a mano en el HTML ni se cambian de valor.
- Diseño, contraste, foco, tamaños táctiles, peso, schema, menú móvil,
  jerarquía de encabezados: ya verificados y sanos el 12/9.

**No se publica.** Leo: *"después del 15 de septiembre lo podemos subir
nuevamente"*. Todo va commiteado a la rama.

## La causa, que no estaba en el diagnóstico

El sitio tiene una guía de estilo propia, `GUIA-DE-TEXTO.md`, con un chequeo
que la hace cumplir (`npm run texto`). Su regla madre era:

> **Contá el hecho, no prometas el efecto.**

Esa regla nació bien: salió de frases que Leo leyó en voz alta y rechazó por
sonar a folleto. Pero se aplicó entera y sin matiz, y el resultado es el sitio
que él está marcando: **273 frases que describen y 43 que le hablan al lector.**

El chequeo llegó a prohibir la frase de sus propios alumnos. En la reseña de
Matías Acevedo, que está publicada en /curso, dice: *"Ahora improviso con lo
que hay en casa y me sale bien."* La regla `te sale` prohibía escribir eso en
la página.

**La línea que faltaba: si lo podés filmar, se escribe.** Se puede filmar a
alguien arreglando una salsa cortada sin buscar nada. No se puede filmar
"te queda" ni "te cambia la forma de cocinar". Lo primero es un hecho sobre lo
que alguien va a poder hacer, y es lo único que se compra. Lo segundo es
folleto y sigue prohibido.

## Avance

Las trece páginas del alcance, hechas. Los 17 chequeos en verde en cada
commit. **Sin publicar**, como pidió Leo.

| Página | Qué se tocó |
|---|---|
| `index.html` | h1, bajada, los dos h2 de producto, la lista de seis, el botón de la pantalla 2,4 |
| `curso.html` | h1, tesis, bajada, 3 de las 7 cosas que vas a poder, los 3 títulos de mes, 2 impersonales |
| `programa.html` | h1, bajada, 2 títulos de mes |
| `talleres.html` | h1, la bajada (que la dibuja el build), la respuesta de cuánto dura |
| `pastas.html` | h1, volanta, tesis, bajada, el párrafo de las dos masas |
| `tapeo.html` | h1, volanta, tesis, bajada, el párrafo del menú |
| `experiencias.html` | la volanta |
| `leonardo.html` | la bajada del hero y el cierre del párrafo de la investigación |
| `sobre.html` | el párrafo del "ecosistema" |
| `servicios.html` | cinco fichas que eran frases sin verbo |
| `contacto.html` | la nota del curso, que era solo el envase |
| `articulos.html` | el cierre de Instagram |
| `gracias.html` | el pase al curso, que era solo el envase |
| `articulos/*.html` | el bloque de cierre de los 12, igual en todos |

## Lo que quedó decidido y por qué

- **El h1 de /servicios sigue siendo "Trabajamos con empresas, proyectos y
  eventos".** Es B2B y ahí "trabajamos con" es el registro correcto: el que
  llega es el que contrata, no el que cocina.
- **El h1 de /sobre sigue siendo "Una cocina con historia".** Es la página
  del estudio: hablar del estudio ahí no es el problema.
- **"Próximas fechas" en el home sigue igual.** Es el rótulo de una agenda.
  Convertirlo en una promesa lo haría peor.
- **Los artículos no se tocaron.** Otra vara, y traen el 39% de la
  visibilidad del sitio.

## Lo que sigue pendiente de Leo

1. **El orden del home.** El botón de la pantalla 2,4 ya no pide $12.200
   —ahora dice "Ver el curso"—, pero el primer argumento sigue llegando en
   la pantalla 4,9. Subir el bloque del método por encima del bloque del
   curso es una decisión de estructura, no de redacción, y no está hecha.
2. **Las cinco imágenes al doble de tamaño** (`img-bts`, `img-espacio`,
   `img-sandwich`, `img-cheesecake`, `img-alfajores`): faltan las `-700.webp`
   y no hay herramienta para generarlas en este macOS.
3. **Un puente distinto por artículo.** El cierre de los doce ya no dice
   "Sin compromiso" ni ofrece el envase, pero sigue siendo el mismo texto
   para los doce. Lo que probablemente mueva la aguja es que el artículo de
   pan lleve al taller de pan y el de fermentación al de chucrut. Son 12
   textos nuevos.
4. **Los enlaces internos no se miden como conversión.** Al cambiar el botón
   del home de WhatsApp a /curso, ese clic dejó de contarse. Agregarlo a
   `track.js` obliga a subir el `?v=` en las 27 páginas.
