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
  "cupos_total": 12,
  "cupos_disponibles": 12
}
```

- `fecha_iso` es la fecha en formato año-mes-día. **Es la que manda**: si ya pasó,
  la web retira la fecha sola y vuelve a "próxima fecha a confirmar".
  Nunca más queda un banner viejo colgado.
- `fecha_texto` es lo que lee la gente. Escribilo como lo dirías.
- `precio` es lo que se muestra; `precio_num` es solo el número, para Google.
- `cupos_disponibles` es el que vas bajando a medida que reservan.

## Los estados

| `estado` | Qué muestra la web |
|---|---|
| `sin-fecha` | "Próxima fecha a confirmar" y el botón pasa a *avisame la próxima fecha*. No se ofrece nada que no exista. |
| `abierto` | Fecha, hora, precio y "quedan X de 12 lugares". Botón de reservar. |
| `ultimos` | Igual, con el aviso de últimos lugares. |
| `agotado` | "Sin lugares disponibles" y el botón pasa a *avisame si se libera un lugar*. |

Dos cosas se calculan solas, así que no hace falta acordarse:

- Si `cupos_disponibles` baja a 4 o menos, pasa a `ultimos`.
- Si llega a 0, pasa a `agotado`.

Es decir: para el día a día alcanza con bajar `cupos_disponibles`.

## Cerrar o abrir un grupo del curso

Cada grupo tiene su `estado` (`abierto` o `cerrado`) y su `inicio_iso`.
Un grupo cuya fecha de inicio ya pasó se marca cerrado solo, se ve gris en la página
y deja de ofrecerse en Google como disponible.

Para la próxima edición: cambiás `inicio_iso`, `inicio_texto` y ponés `estado: "abierto"`.

## El menú y el recorrido del tapeo

Son las dos listas dentro de `"tapeo"`. Agregar, sacar o reordenar renglones
cambia directamente lo que se ve en la landing.

## Si algo sale mal

El archivo tiene que seguir siendo JSON válido: comillas dobles, coma entre renglones,
sin coma después del último. Si te comés una coma, el deploy falla y **la web queda como
estaba** — no se rompe nada publicado. Corregís y volvés a guardar.

Para probar antes de publicar, desde la carpeta del sitio:

```bash
npm run ofertas && npm test
```
