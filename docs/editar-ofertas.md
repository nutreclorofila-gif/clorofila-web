# Cambiar fechas, precios y cupos sin programador

Todo lo que cambia seguido —fechas, precios, cupos, estado de inscripción, menú del
tapeo— vive en **un solo archivo**: [`data/ofertas.json`](../data/ofertas.json).

Editás ese archivo, guardás, y la web se actualiza sola: la home, la landing del tapeo,
la página del curso, el resumen para buscadores y la ficha que ve Google.
No hay que tocar HTML.

## Cómo se edita (desde el navegador, sin instalar nada)

1. Entrá a `https://github.com/nutreclorofila-gif/clorofila-web/blob/main/data/ofertas.json`
2. Botón del lápiz (**Edit this file**).
3. Cambiá lo que necesites — respetando las comillas y las comas.
4. Abajo, **Commit changes**.
5. En 1–2 minutos la web está actualizada. No hace falta avisar a nadie.

## Publicar una fecha de tapeo

```json
"tapeo": {
  "estado": "abierto",
  "fecha_iso": "2026-09-05",
  "fecha_texto": "viernes 5 de septiembre",
  "hora": "19:00",
  "hora_fin": "23:00",
  "precio": "$1.900",
  "precio_num": "1900",
  "cupos_total": 12
}
```

- `fecha_iso` es la fecha en formato año-mes-día. **Es la que manda**: si ya pasó,
  la web retira la fecha sola y vuelve a "próxima fecha a confirmar".
  Nunca más queda un banner viejo colgado.
- `fecha_texto` es lo que lee la gente. Escribilo como lo dirías.
- `precio` es lo que se muestra; `precio_num` es solo el número, para Google.

## Los estados

| `estado` | Qué muestra la web |
|---|---|
| `sin-fecha` | "Próxima fecha a confirmar" y el botón pasa a *avisame la próxima fecha*. No se ofrece nada que no exista. |
| `abierto` | Fecha, hora, precio y el cupo total. Botón de reservar o comprar. |
| `ultimos` | Igual, con el aviso de últimos lugares. Se pone a mano cuando de verdad quedan pocos. |
| `agotado` | "Sin lugares disponibles" y el botón pasa a *avisame si se libera un lugar*. |

**La web no dice cuántos lugares quedan, a propósito.** Es un dato que depende de
que alguien lo actualice a mano cada vez que entra una reserva, y no hay forma de
garantizar eso. Se publica el cupo total (`cupos_total`), que es fijo.

Si en algún momento querés apurar una fecha que se está llenando, poné el estado
en `ultimos` a mano, y en `agotado` cuando se llenó.


## Vender online (Tikzet)

Si el evento se vende por Tikzet, pegá el link en `link_compra`:

```json
"link_compra": "https://www.tikzet.com/events/cena-y-taller-de-tapeo-clorofila"
```

Con ese campo cargado, el botón principal pasa de "reservar por WhatsApp" a
**"Comprar mi entrada"** y lleva directo al pago. WhatsApp queda como segunda
opción, para quien prefiere preguntar antes.

El link sale del panel de Tikzet: Eventos → el evento → **Enlace del evento**.

## Dos fechas del mismo taller

Cuando abrís dos fechas seguidas (por ejemplo jueves y viernes), la segunda se
carga así:

```json
"segunda_fecha": {
  "texto": "viernes 21 de agosto",
  "link": "https://www.tikzet.com/events/cena-y-taller-de-tapeo-clorofila-4384"
}
```

Aparece como "¿No podés ese día? También hay fecha el…" y en la agenda de la home.

## Publicar la fecha sin saber todavía el precio o los cupos

- Si `precio` queda vacío, la fila de precio **no se muestra** (mejor eso que un
  "a confirmar" ocupando el lugar más importante de la ficha).
- El cupo que se muestra es siempre `cupos_total`, nunca cuántos quedan.

Así se puede publicar una fecha el mismo día sin inventar nada.

## Cerrar o abrir un grupo del curso

Cada grupo tiene su `estado` (`abierto` o `cerrado`) y su `inicio_iso`.
Un grupo cuya fecha de inicio ya pasó se marca cerrado solo, se ve gris en la página
y deja de ofrecerse en Google como disponible.

Para la próxima edición: cambiás `inicio_iso`, `inicio_texto` y ponés `estado: "abierto"`.

## Cambiar de edición (agregar o sacar grupos)

Se hace entero en `data/ofertas.json`, dentro de `"curso"`: cambiás `edicion` y
reescribís la lista `grupos`. **No hay que tocar ningún HTML**, ni siquiera si la
edición nueva tiene otra cantidad de grupos o cae en otros días.

Cada grupo lleva:

```json
{
  "id": "jueves",
  "nombre": "Jueves",
  "horario": "19:00 a 21:00 h",
  "inicio_iso": "2026-10-08",
  "inicio_texto": "Arranca el jueves 8 de octubre",
  "detalle": "Clase semanal · 12 encuentros. Para quienes salen de trabajar.",
  "estado": "abierto"
}
```

A partir de eso se dibujan solos: los bloques de grupo de `/curso`, el título
"Edición octubre 2026", la frase "3 meses · miércoles y jueves", la lista de
modalidades, el texto del cierre, la respuesta de la FAQ sobre cómo se organiza
la cursada, la bajada de `/programa` y los `CourseInstance` que ve Google (con
su fecha, su precio y si está disponible o agotado).

El `id` solo tiene que ser único; ya no hay HTML que dependa de que se llame
`martes` o `sabados`.

## Abrir la fecha de un taller

Los seis talleres (`fermentacion`, `pan-sin-gluten`, `pastas-sin-gluten`, `alfajores`,
`quesos-vegetales`, `buncheo`) funcionan **igual que el tapeo**, con los mismos estados:

```json
"fermentacion": {
  "nombre": "Fermentación de vegetales",
  "estado": "abierto",
  "fecha_iso": "2026-09-13",
  "fecha_texto": "sábado 13 de septiembre",
  "hora": "10:00 a 14:00 h",
  "precio": "$1.400",
  "cupos_total": 10
}
```

En `/talleres` eso cambia solo tres cosas, que son las que deciden la compra:
la etiqueta de estado, la línea de fecha y precio, y el botón —que pasa de
*avisame cuando haya fecha* a *reservar mi lugar*, con el WhatsApp ya escrito
mencionando el taller y la fecha.

Si un taller no tiene fecha pero querés decir algo distinto a lo genérico, agregale
`"linea_sin_fecha": "el texto que quieras"` (así está el Domingo de Buncheo, que se
anuncia por Instagram).

## El menú y el recorrido del tapeo

Son las dos listas dentro de `"tapeo"`. Agregar, sacar o reordenar renglones
cambia directamente lo que se ve en la landing.

## La lista de espera del curso

Cuando **ningún grupo del curso está abierto**, los botones de la web cambian
solos: dejan de decir "Reservar mi lugar" y pasan a **"Sumate a la lista de
espera"**, abriendo el formulario. No hay que tocar nada: se activa por fecha.

Cuando abrís la próxima edición (ponés un grupo en `"estado": "abierto"` con su
`inicio_iso`), los botones vuelven a ser de reserva.

## Si algo sale mal

El archivo tiene que seguir siendo JSON válido: comillas dobles, coma entre renglones,
sin coma después del último. Si te comés una coma, el deploy falla y **la web queda como
estaba** — no se rompe nada publicado. Corregís y volvés a guardar.

Para probar antes de publicar, desde la carpeta del sitio:

```bash
npm run ofertas && npm test
```
