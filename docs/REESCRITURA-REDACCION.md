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

## El giro del 13/9: la voz estaba escrita y no la había leído

Leo rechazó la primera reescritura entera: *"no tiene nada que ver con lo que
trasmito lo que estás escribiendo, necesito que sea más formal y similar a lo
que propongo"*. Y después: *"el tema de seguir una receta al pie de la letra es
algo que lo tomaste como algo exagerado, pienso que es mejor decir todo lo que
logramos que aprendas como trasmite el pdf"*.

**La fuente estaba a mano y nunca la había abierto:** el PDF «Contenido del
curso agosto 2026», que él manda por correo todos los días, y el mail con el
que contesta cada consulta. Están en Gmail (`nutreclorofila`, en **/mail/u/1/**
del Chrome de Leo); el PDF no está en Drive, así que se lee abriéndolo ahí.

Lo que cambió, y quedó escrito en `GUIA-DE-TEXTO.md`, sección «De dónde sale
la voz»:

1. **El registro es formal y cuidado.** Él escribe «proponemos un espacio de
   disfrute», no «te las arreglás». Corregir que la redacción era dura no
   quería decir escribir suelto.
2. **El argumento es todo lo que se aprende a elaborar.** Media hoja del PDF es
   una lista larga y concreta, y esa abundancia es el argumento. Hacer eje en
   «sin depender de seguir una receta al pie de la letra» suena exagerado.
3. **Sus palabras:** alimentación consciente, criterio propio, disfrute,
   autonomía, creativa, nutritiva. «Alimentación consciente» está hasta en su
   firma de correo y no aparecía en ninguna parte del sitio.
4. **Su «nosotros» no es el del negocio.** «Aprenderemos juntos» y «empezamos
   por las bases» sí; «somos un estudio» y «damos un curso», no.

Todo el sitio quedó pasado a ese registro. Dos páginas volvieron a como
estaban —`/tapeo` y `/pastas`—: sus frases originales eran de él y estaban
bien donde estaban.

## Las tres auditorías del 13/9

Leo pidió "al menos 3 auditorías completas, revisa todo bien". Las tres
corrieron sobre las 27 páginas.

**1 · El registro.** Dieciocho frases que no estaban en el registro del PDF:
muletillas ("de verdad" dos veces, "meter las manos"), promesas de
sentimiento ("sin miedo", "más confianza"), coloquialismos ("arreglártelas
solo", "el horno ande distinto", "que la masa le salga"), tres fichas de
/servicios sin verbo conjugado, y dos incoherencias: el bloque de talleres
de la portada decía otra cosa que /talleres, y la lista de "vas a poder"
tenía dos veces armar un menú.

**2 · Contra las fuentes.** Precio, cuotas, tarjeta, los dos grupos con su
horario e inicio, y la fecha, la hora, el precio y el cupo del tapeo:
cruzados uno por uno contra el mail y el carrusel, todos coinciden. De las
32 elaboraciones del PDF faltaba una (crocante de manzana) y los helados no
estaban nombrados. Y **"autonomía", una de sus tres palabras, no aparecía
en ninguna de las 27 páginas.**

**3 · Que nada se rompió.** Los 17 chequeos en verde. Las 13 páginas
medidas a 375 px: ninguna desborda, los h1 van de 1 a 4 líneas y ninguno
corta con una cola huérfana. Los errores de consola en local son los
recursos externos que a propósito no cargan fuera de clorofila.uy.

## Lo que sigue pendiente de Leo

Al 13/9 quedan dos cosas, y las dos son decisiones, no trabajo.

1. **Los títulos.** La voz es de Leo. Los títulos están puestos en su
   registro; si alguno no suena a él, se cambia.
2. **El puente por artículo manda a talleres sin fecha.** Los doce cierres
   ya nombran el taller que corresponde (pan, fermentación, alfajores),
   pero ninguno de los cinco talleres tiene fecha abierta. Mientras no la
   tengan, el que hace clic cae en "dejanos tu interés".

## Lo que se cerró el 13/9

- **El orden del home.** El bloque del método subió arriba de todo: el
  primer argumento pasó de la pantalla 4,9 a la 1,4. Es un commit solo y
  se revierte sin tocar nada más.
- **Las cinco imágenes.** Tres eran falsa alarma: `img-sandwich`,
  `img-cheesecake` e `img-alfajores` miden 667 px para un hueco de 335, que
  es exactamente lo que pide una pantalla al doble. Las dos que sí sobraban
  —`img-bts` e `img-espacio`, de 867— ya tienen su versión de 700: 23 KB y
  16 KB menos. La herramienta existía: Pillow está instalado y escribe webp.
- **El puente de los doce artículos**, cada uno con el suyo.

## Lo que se decidió NO hacer

**Medir el clic del botón "Ver el curso" del home.** Al pasarlo de WhatsApp
a un enlace interno, ese clic dejó de disparar un evento. Agregarlo a
`track.js` obliga a subir el `?v=` en las 27 páginas, y no hace falta: GA4
ya mide el camino de la portada a /curso como navegación, que es de donde
salió el dato de las 25 personas por mes.
