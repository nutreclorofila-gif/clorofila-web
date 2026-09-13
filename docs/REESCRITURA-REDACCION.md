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

- Los 12 artículos del blog. Son divulgación técnica, tienen otra vara en la
  guía y traen el 39% de la visibilidad del sitio. No se toca su redacción.
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

- [x] La guía y el chequeo: separar la promesa de efecto de la de capacidad,
      y dos redes nuevas (el envase al frente, y "aprendé a cocinar")
- [ ] `index.html`
- [ ] `curso.html`
- [ ] `programa.html`
- [ ] `talleres.html`
- [ ] `pastas.html`
- [ ] `tapeo.html`
- [ ] `experiencias.html`
- [ ] `leonardo.html`
- [ ] `sobre.html`
- [ ] `servicios.html`
- [ ] `contacto.html`
- [ ] `articulos.html`
- [ ] `gracias.html`
