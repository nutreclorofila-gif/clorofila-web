# Lo que queda por mejorar en clorofila.uy — Plan de implementación

> **Para quien ejecute esto:** usar `superpowers:subagent-driven-development` o
> `superpowers:executing-plans`. Los pasos van con casilla (`- [ ]`).

**Objetivo:** cerrar lo que quedó pendiente en el sitio después de 70 commits de
revisión, separando lo que se puede hacer solo de lo que necesita un dato de Leo.

**Enfoque:** el sitio es HTML+CSS+JS a mano, sin framework. Los datos de negocio
salen de `data/ofertas.json` y los aplica `scripts/render-ofertas.js`. Cada tarea
termina con `npm test` (15 chequeos), una verificación medida en el navegador y
un commit.

**Herramientas:** Node sin dependencias, el servidor local `npm run dev` (8123),
y el navegador para medir. Nada de librerías nuevas.

## Restricciones globales

Copiadas de CLAUDE.md y de lo que Leo dejó dicho. Valen para TODAS las tareas.

- **Nunca pushear a `main`.** Dispara el deploy de Netlify. Leo dijo el 7/9/2026
  "no lo publiques aún" y no hay que volver a ofrecerlo.
- **Correr `npm test` antes de cada commit.** Son 15 chequeos.
- **Avisar cuántos archivos toca un cambio antes de hacerlo.**
- **Nunca editar a mano fechas, precios ni cupos en el HTML.** Salen de
  `data/ofertas.json` vía `npm run ofertas`.
- **Al tocar `base.css`, `pagina.js`, `track.js` o `consent.js`, subir el `?v=`
  en las 27 páginas.** Hoy: `base.css?v=28`, `pagina.js?v=29`.
- **Todo el texto en español rioplatense (voseo).** Los comentarios del código
  también.
- **Registro de instituto, no de WhatsApp.** Nada de "fijate", "enterate antes
  que el resto", ni prometer ventaja sobre otras personas.
- **No cambiar los colores de marca.**
- **No borrar archivos.** Crear y modificar sí; borrar lo decide Leo.
- **Un solo lector de scroll:** `enScroll()` en `pagina.js`. Nada de
  `addEventListener('scroll')` suelto.
- **Verificar antes de reportar.** En esta revisión hubo cinco falsos positivos
  por medir con la herramienta equivocada (regex sobre HTML, `.focus()` por JS
  para `:focus-visible`, el texto en vez del área táctil). Medir con el parser y
  el motor reales del navegador.

---

## Estado al 9/9/2026

| Tarea | Estado |
|---|---|
| 1 · El schema promete pan y el temario no lo tiene | hecha — Leo confirmó que el curso NO da pan; commit `1f94686` |
| 2 · Completar el schema del curso | hecha — commit `43fd4ae` |
| 3 · Cuenta regresiva en /programa | hecha — commit `d7316bf` |
| 4 · Los alt de dos fotos | hecha — commit `6f99f60` |
| 5 · Decisiones de Leo | el cupo ya está (12 por grupo, commit `1f94686`); quedan las imágenes sin usar y publicar |

---

### Tarea 1: El schema promete pan y el programa no lo tiene

**Bloqueada:** necesita que Leo diga cuál de las dos es la verdad.

**Archivos:**
- Leer: `curso.html:39` (bloque `Course`, campo `teaches`)
- Leer: `programa.html` (el temario mes a mes)
- Modificar, según la respuesta: uno de los dos

**Qué se encontró:** el schema de `/curso` declara

```json
"teaches":["Cocina basada en plantas","Fermentación","Panificación sin gluten",
           "Pastelería sin lácteos ni huevos","Criterio culinario"]
```

pero el temario publicado en `programa.html` es este, y no menciona pan ni masa
madre en ninguno de los tres meses:

- **Mes 1 · Fundamentos** — Técnicas de corte y organización · Bases vegetales ·
  Batidos verdes y sopas · Primera fermentación.
- **Mes 2 · Profundización** — Kéfir, kombucha, kimchi · Cocina con hongos ·
  Platos salados complejos · Quesos vegetales · Seguridad alimentaria en
  fermentaciones.
- **Mes 3 · Integración** — Pastelería basada en plantas · Sushi vegetal ·
  Pastas y dal · Menú completo · Recetario final.

Buscando "pan", "panes", "masa madre" y "levadura" en esa página no aparece
ninguno. Ojo también con el otro campo: el schema dice "Pastelería sin lácteos
ni huevos" y el temario dice "Pastelería basada en plantas" — eso no es una
contradicción, pero conviene que digan lo mismo.

Google levanta `teaches` para el resultado enriquecido del curso. Hoy le está
diciendo que se enseña algo que el programa publicado no lista.

**La pregunta para Leo, exacta:** *¿el curso de tres meses enseña panificación
sin gluten o masa madre? Si la enseña, falta en el temario de /programa. Si no,
hay que sacarla del dato que lee Google.*

- [ ] **Paso 1: Preguntarle a Leo** y esperar. No elegir por él: una rama
      agranda lo que se promete y la otra lo achica.

- [ ] **Paso 2A — si el curso SÍ enseña pan:** sumar la línea al temario de
      `programa.html`, en el mes que corresponda, con el mismo formato que las
      otras (`Kéfir, kombucha, kimchi · Cocina con hongos · …`). Después corre
      `npm run citas` no; corre `npm test`.

- [ ] **Paso 2B — si NO lo enseña:** sacar `"Panificación sin gluten"` del array
      `teaches` en `curso.html:39`, dejando los otros cuatro.

- [ ] **Paso 3: Verificar que el schema sigue siendo válido**

```bash
npm run check:jsonld && npm test
```
Esperado: los 15 chequeos en verde.

- [ ] **Paso 4: Commit**

```bash
git add curso.html programa.html
git commit -m "El schema del curso prometía panificación y el temario no la tenía"
```

- [ ] **Paso 5 (solo si sale 2A):** revisar los dos artículos que hoy rematan en
      un taller sin fecha —`articulos/masa-madre-digestibilidad.html` y
      `articulos/pan-sin-gluten-no-es-saludable.html`— y agregarles el enlace al
      curso, copiando el patrón que ya tiene
      `articulos/como-funciona-la-fermentacion.html`:

```html
<p style="margin:1.25rem 0 0;font-size:.88rem;color:var(--cal-baja)">El taller
se abre por demanda. El <a href="/curso" class="enlace-vivo"
data-producto="curso">curso de tres meses</a>, que ya tiene fecha, también
trabaja panificación sin gluten.</p>
```

La clase `.enlace-vivo` no es opcional: sin ella el enlace hereda el color del
párrafo y no se ve que sea un enlace. Ya pasó una vez.

---

### Tarea 2: Completar el schema del curso con lo que Google recomienda

**No bloqueada.** Los tres datos ya están en el sitio.

**Archivos:**
- Modificar: `curso.html:39` (el bloque `Course` del `@graph`)

**Interfaces:**
- Consume: el temario que ya está escrito en `programa.html` y la respuesta
  "¿Necesito experiencia previa?" de la FAQ de `curso.html`.
- Produce: nada que otras tareas usen.

**Qué falta:** los campos obligatorios están completos. De los recomendados
faltan cinco; tres se pueden llenar con datos que ya existen y dos no
(`totalHistoricalEnrollment` necesita un número de Leo, `financialAidEligible`
no aplica).

- [ ] **Paso 1: Ver el estado actual**

```bash
node -e 'const t=require("fs").readFileSync("curso.html","utf8");for(const m of t.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){let j;try{j=JSON.parse(m[1])}catch(e){continue}(function r(n){if(!n||typeof n!=="object")return;if(Array.isArray(n))return n.forEach(r);if(n["@type"]==="Course")console.log(Object.keys(n).join(", "));Object.values(n).forEach(r)})(j)}'
```
Esperado: una lista que NO incluye `coursePrerequisites`, `syllabusSections` ni
`availableLanguage`.

- [ ] **Paso 2: Agregar los tres campos**

Insertar dentro del objeto `Course`, después de `"courseWorkload":"PT24H"`:

```json
"coursePrerequisites":"No hace falta experiencia previa. Se arranca desde las bases.",
"availableLanguage":"es-UY",
"syllabusSections":[
 {"@type":"Syllabus","name":"Mes 1 · Fundamentos","description":"Técnicas de corte y organización · Bases vegetales · Batidos verdes y sopas · Primera fermentación."},
 {"@type":"Syllabus","name":"Mes 2 · Profundización","description":"Kéfir, kombucha, kimchi · Cocina con hongos · Platos salados complejos · Quesos vegetales · Seguridad alimentaria en fermentaciones."},
 {"@type":"Syllabus","name":"Mes 3 · Integración","description":"Pastelería basada en plantas · Sushi vegetal · Pastas y dal · Menú completo · Recetario final."}
]
```

Esas tres descripciones son el temario tal como está publicado hoy en
`programa.html` — copiado textual, incluidos los separadores `·`. Si alguien
edita el temario de la página, hay que editar esto también: es el mismo dato en
dos lugares, y esa duplicación es justo el problema de la Tarea 1.

El texto de `coursePrerequisites` sale de la respuesta "¿Necesito experiencia
previa?" de la FAQ de `curso.html`: "No. El curso está pensado tanto para
quienes recién empiezan como para quienes ya cocinan y quieren profundizar.
Arrancamos desde las bases."

- [ ] **Paso 3: Verificar que parsea y que Google lo va a leer**

```bash
npm run check:jsonld
```
Esperado: sin errores.

```bash
node -e 'const t=require("fs").readFileSync("curso.html","utf8");for(const m of t.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){let j;try{j=JSON.parse(m[1])}catch(e){continue}(function r(n){if(!n||typeof n!=="object")return;if(Array.isArray(n))return n.forEach(r);if(n["@type"]==="Course"){console.log("prerequisitos:",!!n.coursePrerequisites);console.log("idioma:",n.availableLanguage);console.log("secciones:",(n.syllabusSections||[]).length)}Object.values(n).forEach(r)})(j)}'
```
Esperado: `prerequisitos: true`, `idioma: es-UY`, `secciones: 3`.

- [ ] **Paso 4: `npm test`**

Esperado: 15 chequeos en verde. Ojo con `check:integridad`, que compara contra
producción: agregar campos al schema no debería hacerlo fallar, pero si se queja
hay que leer qué dice antes de tocar nada.

- [ ] **Paso 5: Commit**

```bash
git add curso.html
git commit -m "El schema del curso no declaraba temario ni requisitos previos"
```

---

### Tarea 3: /programa no dice cuánto falta para empezar

**No bloqueada.**

**Archivos:**
- Modificar: `programa.html:124` (la ficha de datos del curso)

**Interfaces:**
- Consume: `cuantoFalta(iso)` de `pagina.js`, que ya corre en todas las páginas.
  Busca elementos con `data-inicio-iso` y les escribe adentro, o dentro de su
  hijo marcado con `data-cuenta` si existe.
- Produce: nada.

**Qué pasa:** `/curso` y la home muestran "Empieza en 4 semanas" y se actualiza
solo. `/programa` no, y es la página que lee quien está por decidirse.

- [ ] **Paso 1: Confirmar que hoy no la tiene**

```bash
grep -c "data-inicio-iso" programa.html
```
Esperado: `0`.

- [ ] **Paso 2: Ver el patrón que ya funciona en /curso**

```bash
sed -n '226p' curso.html | cut -c1-220
```
Esperado: un `<span>` con `data-set="data-inicio-iso=curso.inicio_iso"` y
`data-inicio-iso="2026-10-07"`.

El `data-set=` es lo que hace que `npm run ofertas` mantenga la fecha al día
desde `ofertas.json`. Sin eso, la fecha queda escrita a mano y se pudre.

- [ ] **Paso 3: Agregar la cuenta a /programa**

En `programa.html`, junto al `<span>` de `curso.horarios_chip` de la línea 124,
sumar:

```html
<span class="dato" data-set="data-inicio-iso=curso.inicio_iso" data-inicio-iso="2026-10-07"><!--o:curso.inicio_texto-->Arranca el miércoles 7 de octubre<!--/o--></span>
```

- [ ] **Paso 4: Regenerar y verificar en el navegador**

```bash
npm run ofertas
```

Después, con el servidor levantado, medir que el texto se haya reemplazado por
la cuenta:

```js
// en /programa
const el = document.querySelector('[data-inicio-iso]');
({ texto: el.textContent.trim(), fecha: el.getAttribute('data-inicio-iso') })
```
Esperado: `texto` dice "Empieza en N semanas" (no la fecha original), y `fecha`
es `2026-10-07`.

- [ ] **Paso 5: `npm test`** — esperado: 15 en verde, incluido `check:ofertas`,
      que falla si el HTML se despegó de `ofertas.json`.

- [ ] **Paso 6: Commit**

```bash
git add programa.html
git commit -m "/programa no decía cuánto falta para que empiece"
```

---

### Tarea 4: Dos fotos con nombre que no corresponde a lo que muestran

**No bloqueada, pero hay que MIRAR las fotos.**

**Archivos:**
- Leer: `img-sandwich.jpg`, `img-cheesecake.jpg`
- Modificar según lo que se vea: `talleres.html` (los `alt`), o nada

**Qué se encontró:**

| archivo | alt que tiene hoy |
|---|---|
| `img-sandwich.jpg` | "Pan sin gluten con masa madre" |
| `img-cheesecake.jpg` | "Quesos vegetales elaborados en Clorofila" |

Un cheesecake no es un queso vegetal y un sándwich no es un pan. O el `alt`
describe mal la foto —y entonces miente a quien no la puede ver— o la foto no es
la que corresponde a ese taller.

- [ ] **Paso 1: Abrir las dos imágenes y mirarlas.** No deducir por el nombre.

- [ ] **Paso 2: Decidir con lo que se vio**
  - Si la foto muestra lo que dice el `alt`: no tocar nada, el nombre del archivo
    es lo único raro y renombrarlo obliga a tocar HTML por una ganancia nula.
  - Si el `alt` no describe la foto: reescribirlo para que describa **lo que se
    ve**, no lo que vende el taller. Quien usa lector de pantalla necesita saber
    qué hay en la imagen.

- [ ] **Paso 3: Verificar que el alt siga presente y no vacío**

```bash
node -e 'const t=require("fs").readFileSync("talleres.html","utf8");for(const m of t.matchAll(/<img[^>]*src="([^"]*(?:sandwich|cheesecake)[^"]*)"[^>]*alt="([^"]*)"/g))console.log(m[1],"→",m[2])'
```
Esperado: las dos con un `alt` que describa la foto.

- [ ] **Paso 4: `npm test` y commit**

```bash
git add talleres.html
git commit -m "Dos fotos decían en el alt algo distinto de lo que se ve"
```

---

### Tarea 5: Decisiones que son de Leo, no del código

No son tareas de implementación: son preguntas que hay que hacerle y esperar.
Van acá para que no se pierdan.

- [ ] **Cupo del curso.** `ofertas.json` tiene `cupos_total` en los talleres y en
      el tapeo. Los dos grupos del curso no lo tienen, y el sitio dice "grupos
      reducidos" sin número. Con el dato se carga en `ofertas.json` y aparece
      solo donde ya está el marcado.

- [ ] **21 imágenes sin usar, 1,3 MB.** Nadie las referencia. Borrarlas lo hace
      Leo. La lista se saca con:

```bash
node -e 'const fs=require("fs");let todo="";for(const f of [...fs.readdirSync(".").filter(f=>/\.(html|css|js|json|webmanifest|txt|xml)$/.test(f)),...fs.readdirSync("articulos").map(f=>"articulos/"+f),...fs.readdirSync("scripts").map(f=>"scripts/"+f),...fs.readdirSync("data").map(f=>"data/"+f)]){try{todo+=fs.readFileSync(f,"utf8")}catch(e){}}const imgs=[...fs.readdirSync(".").filter(f=>/\.(jpg|jpeg|png|webp|svg|avif)$/i.test(f)),...(fs.existsSync("og")?fs.readdirSync("og").map(f=>"og/"+f):[])];const h=imgs.filter(f=>!todo.includes(f.split("/").pop()));let b=0;h.forEach(f=>b+=fs.statSync(f).size);console.log(h.length+" sin usar, "+(b/1048576).toFixed(1)+" MB");h.forEach(f=>console.log("  "+f))'
```

- [ ] **El PDF del temario.** Está solo como adjunto de Gmail (9,3 MB) y no hay
      herramienta para bajarlo. Si Leo quiere que se revise, tiene que subirlo a
      Drive o al repo.

- [ ] **Publicar.** Son 70 commits sin publicar. Leo dijo que no el 7/9/2026 con
      el caso completo sobre la mesa. **No volver a ofrecerlo**: cuando quiera,
      lo pide.

---

## Lo que NO hay que hacer

Verificado en esta revisión y descartado. Está acá para que nadie lo vuelva a
"arreglar":

- **Los titles, descriptions, canonical y og:image** de las 27 páginas: sin un
  solo problema.
- **El contraste:** ningún texto por debajo de WCAG AA en las 27.
- **El indicador de foco:** `:focus-visible` con contorno de 2px y 8,57:1 de
  contraste. Medirlo con `.focus()` desde JS da 43 falsos positivos por página,
  porque `:focus-visible` no se dispara así.
- **El tamaño de lo que se toca:** los enlaces del pie miden 32px de alto, no 21.
  Medir el área del `<a>`, no la del texto.
- **La carga diferida de las imágenes:** las cuatro que parecían mal puestas
  están a 1.044px de altura o más abajo.
- **Los talleres "distinguidos solo por color":** dicen "Se abre por demanda".
- **Canibalización entre /curso y /programa:** lo que comparten es el pie y el
  formulario.
- **La FAQ:** ya responde qué pasa si faltás a una clase y que no hace falta
  experiencia previa.
- **Los enlaces entre artículos:** los 12 enlazan a 3 o 4 de los otros.
- **`modern-web-guidance` para diseño de botones:** sus 143 guías son de APIs
  web; la mejor coincidencia dio 0,46 de similitud. Para botones sirve
  `~/.claude/skills/ui-ux-pro-max/scripts/search.py "<consulta>" --domain ux`.
