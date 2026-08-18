# Links de Instagram (con UTM)

Cada link importante lleva UTM. Sin eso, en Google Analytics todo el tráfico de
Instagram aparece mezclado y no se puede saber qué propuesta y qué contenido venden.

**Regla simple: nunca pegar `clorofila.uy` pelado en Instagram.** Siempre uno de estos.

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

Cada taller tiene URL propia y corta:

```
https://clorofila.uy/fermentacion
https://clorofila.uy/pan-sin-gluten
https://clorofila.uy/pastas-sin-gluten
https://clorofila.uy/alfajores
https://clorofila.uy/quesos-vegetales
https://clorofila.uy/buncheo
```

Con UTM, igual que arriba:
`https://clorofila.uy/fermentacion?utm_source=instagram&utm_medium=story&utm_campaign=fermentacion`

## Qué se puede leer después en Analytics

Cada acción queda registrada con **producto** y **origen**:

| Evento | Qué significa |
|---|---|
| `view_producto` | Alguien miró esa propuesta |
| `click_whatsapp` | Tocó el botón de WhatsApp (dice de qué producto) |
| `begin_reservation` | Abrió el formulario de inscripción |
| `sign_up` | Completó el formulario |
| `reserva_recibida` | Llegó a la página de gracias |

Con eso se responde la pregunta que hoy no se puede responder:
*de las visitas que mandó Instagram al tapeo, ¿cuántas escribieron?*
