# Diseño: schema Review/AggregateRating para testimonios

**Fecha:** 2026-06-25
**Contexto:** proyecto 2 de la auditoría amplia (diseño/SEO/marketing). El hallazgo original asumía que los testimonios no tenían atribución real — **eso era incorrecto**: `index.html` ya tiene nombres reales (Valentina Pedreira, Matías Acevedo, Lucía Fernández) con contexto ("Alumna/o · Curso de 3 meses") en cada tarjeta de testimonio. El usuario confirmó dejar esos nombres como están. Lo único que falta es el dato estructurado para que Google pueda mostrar las estrellitas en el resultado de búsqueda.

## Alcance

Agregar `review` (array de 3 `Review`) y `aggregateRating` al JSON-LD `LocalBusiness` que ya existe en `index.html` (línea 220), usando los nombres y citas ya publicados visualmente en la página — no se inventa ningún dato, solo se estructura lo que ya está visible.

**Sin cambios de HTML/CSS visual** — las tarjetas de testimonios quedan exactamente igual.

## JSON-LD final

Se agrega a la propiedad `"LocalBusiness"` existente:

```json
"aggregateRating":{"@type":"AggregateRating","ratingValue":"5.0","reviewCount":"3"},
"review":[
  {"@type":"Review","author":{"@type":"Person","name":"Valentina Pedreira"},"reviewRating":{"@type":"Rating","ratingValue":"5","bestRating":"5"},"reviewBody":"No son recetas que seguís como instrucciones — aprendés a pensar. Eso no lo encontré en ningún otro lado."},
  {"@type":"Review","author":{"@type":"Person","name":"Matías Acevedo"},"reviewRating":{"@type":"Rating","ratingValue":"5","bestRating":"5"},"reviewBody":"Lo que más me sorprendió fue entender el por qué de cada técnica. Ahora improviso con lo que hay en casa y me sale bien. Eso antes no me pasaba."},
  {"@type":"Review","author":{"@type":"Person","name":"Lucía Fernández"},"reviewRating":{"@type":"Rating","ratingValue":"5","bestRating":"5"},"reviewBody":"No es un curso de recetas. Es aprender a pensar la cocina de otra manera. Cambió completamente mi relación con la comida y con el tiempo que le dedico."}
]
```

## Verificación

- `npm run check:jsonld` (valida que el JSON sigue siendo parseable).
- Google Rich Results Test (manual, fuera del repo) para confirmar que el snippet es elegible — no se puede correr desde este entorno, pero el usuario puede verificarlo en `search.google.com/test/rich-results` después del deploy.

## Fuera de alcance

- No se tocan los testimonios existentes (nombres, texto, estrellas visuales).
- No se agregan más testimonios.
- Proyecto 3 (funnel/UX + tracking de conversiones de integraciones) queda para el siguiente ciclo de diseño.
