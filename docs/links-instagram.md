# Links con etiqueta (UTM)

Cada link importante lleva UTM. Sin eso, en Google Analytics todo el tráfico aparece
mezclado y no se puede saber qué propuesta y qué canal venden.

**Regla simple: nunca pegar `clorofila.uy` pelado.** Siempre uno de estos.

## Por qué esto importa ahora (medido el 20/8/2026)

En 30 días Meta gastó **$U 9.442** y generó **236 conversaciones**, y el sitio recibió
**71 sesiones** — solo **13** desde Instagram. Las ocho campañas van a mensajes
directos, no a una página: Meta reporta **cero vistas de landing** en todas.

La conversación ya está pagada. Mandar el link del producto **dentro** de esa
conversación no cuesta un peso más, y le da a la persona algo para leer, ver las fotos
y mostrarle a quien decide con ella. Es el movimiento más barato que hay disponible.

## ManyChat y WhatsApp — los que faltan

Estos son los que hoy no se están usando y son los que más rinden, porque van a gente
que ya levantó la mano:

```
https://clorofila.uy/curso?utm_source=manychat&utm_medium=dm&utm_campaign=curso
https://clorofila.uy/tapeo?utm_source=manychat&utm_medium=dm&utm_campaign=tapeo
https://clorofila.uy/pastas?utm_source=manychat&utm_medium=dm&utm_campaign=pastas
https://clorofila.uy/programa?utm_source=manychat&utm_medium=dm&utm_campaign=programa
```

Para responder por WhatsApp:

```
https://clorofila.uy/curso?utm_source=whatsapp&utm_medium=dm&utm_campaign=curso
https://clorofila.uy/tapeo?utm_source=whatsapp&utm_medium=dm&utm_campaign=tapeo
```

Si estos empiezan a aparecer en Analytics como origen `manychat`, quiere decir que el
sitio entró al embudo. Hoy la línea base son 71 sesiones al mes.

## Link de la bio

Que no vaya a la home genérica. Que vaya a lo que se puede reservar ahora:

```
https://clorofila.uy/tapeo?utm_source=instagram&utm_medium=bio&utm_campaign=tapeo
```

Cuando lo que se está vendiendo es el curso:

```
https://clorofila.uy/curso?utm_source=instagram&utm_medium=bio&utm_campaign=curso
```

## Historias y reels

```
https://clorofila.uy/tapeo?utm_source=instagram&utm_medium=story&utm_campaign=tapeo
https://clorofila.uy/tapeo?utm_source=instagram&utm_medium=reel&utm_campaign=tapeo
https://clorofila.uy/curso?utm_source=instagram&utm_medium=story&utm_campaign=curso_agosto
```

## Anuncios pagos

```
https://clorofila.uy/tapeo?utm_source=instagram&utm_medium=paid_social&utm_campaign=tapeo_setiembre
https://clorofila.uy/curso?utm_source=instagram&utm_medium=paid_social&utm_campaign=curso_setiembre
```

Cambiá `utm_campaign` por edición (`tapeo_setiembre`, `tapeo_octubre`), así se pueden
comparar entre sí.

## Talleres

Los dos que se venden hoy tienen landing propia:

```
https://clorofila.uy/tapeo
https://clorofila.uy/pastas
```

El resto tiene URL propia y corta, que lleva a su bloque:

```
https://clorofila.uy/fermentacion
https://clorofila.uy/pan-sin-gluten
https://clorofila.uy/alfajores
https://clorofila.uy/quesos-vegetales
https://clorofila.uy/buncheo
```

Con UTM, igual que arriba:
`https://clorofila.uy/fermentacion?utm_source=instagram&utm_medium=story&utm_campaign=fermentacion`

## Qué se puede leer después en Analytics

Cada acción queda registrada con **producto** y **origen**. Estos son los nombres tal
como aparecen en GA4 (verificados el 20/8/2026 sobre 120 días de datos):

| Nombre en GA4 | Qué significa | Veces en 120 días |
|---|---|---|
| `view_producto` | Alguien miró esa propuesta | 9 |
| `whatsapp_click` | Tocó el botón de WhatsApp | 6 |
| `generate_lead` | Lo mismo, contado como lead | 5 |
| `tally_form_open` | Abrió el formulario | 3 |
| `sign_up` | Completó el formulario | 2 |
| `begin_reservation` | Empezó una reserva | 0 |
| `reserva_recibida` | Llegó a la página de gracias | 0 |

**Ojo con dos cosas:**

1. **El nombre en el código no es el nombre en GA4.** `track.js` manda
   `click_whatsapp`, pero en GA4 llega como `whatsapp_click` — hay una regla creada
   en el panel de GA4 que lo renombra. Los conteos lo confirman: 6 `whatsapp_click`
   contra 5 `generate_lead`, que se disparan juntos en el mismo clic. No se pierde
   dato, pero si buscás `click_whatsapp` en GA4 no vas a encontrar nada.

2. **`reserva_recibida` está en cero.** Nadie llegó nunca a `/gracias`, porque las
   reservas se cierran por DM y por Tikzet, fuera del sitio. No está roto: es que ese
   camino no se usa.

Con esto se responde la pregunta que hoy no se puede responder:
*de las personas que mandó ManyChat al curso, ¿cuántas escribieron?*
