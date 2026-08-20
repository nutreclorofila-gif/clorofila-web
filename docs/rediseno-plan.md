# Rediseño de clorofila.uy — plan de dirección

## El problema, con nombre propio

La skill de diseño de Claude documenta que el diseño generado por IA hoy se agrupa
en tres looks reconocibles. El número uno es:

> fondo crema (~#F4F1EA) + serif de alto contraste + acento terracota

El sitio actual es exactamente eso: `#f5f0e7` + Fraunces + `#bf5220`. No es un
error de gusto: es el default que sale cuando nadie eligió. Por eso "se parece a
todas las webs de Claude".

Los otros dos defaults, que también hay que evitar:
- negro casi puro con un verde ácido o bermellón,
- maqueta de diario con filetes finos y cero redondeo.

## De dónde sale la dirección nueva

Del mundo real de Clorofila, no de un moodboard genérico:

- Una mesa larga, doce personas alrededor, en un estudio de Parque Rodó.
- La noche: el tapeo va de 19:00 a 22:30, con luz cálida y ventanales.
- La fermentación: frascos, tiempo, transformación, cosas vivas.
- La tesis de la marca: **no se siguen números, se leen señales**.
- Leonardo: 25 años de cocina, permacultura, medicina tradicional china.

## Los tokens

**Color — "invernadero de noche".** El fondo deja de ser crema y pasa a ser un
verde profundo, casi tinta. Las fotos —que son el mejor activo del sitio y son
todas de noche, con luz cálida— dejan de flotar sobre papel y pasan a ser la
fuente de luz de la página.

- `--tinta` `#0E1A13` — el fondo, verde muy oscuro, no negro
- `--musgo` `#17281D` — superficies elevadas
- `--cal` `#F4F1E9` — el texto claro (es crema, pero como tinta, no como papel)
- `--brote` `#8FC08A` — verde vivo para señales y foco
- `--fermento` `#C2456E` — magenta de remolacha fermentada: el acento
- `--miel` `#E8A33D` — ámbar de la luz del estudio, para datos y precios

El acento magenta es el riesgo deliberado. Sale de la remolacha, el kimchi y las
flores comestibles que están en las fotos, y es lo contrario del terracota que usa
todo el mundo.

**Tipografía.** Fuera Fraunces, que es el serif del default.

- Display: **Bricolage Grotesque** — variable, editorial, con carácter propio.
- Texto: **Karla** — humanista, cálida, legible en párrafos largos.
- Datos: **JetBrains Mono** — para fechas, precios, horarios y etiquetas.

El mono no es decoración: Clorofila enseña procesos, y los procesos se anotan.
Tiempos, temperaturas, hidrataciones. La tipografía de datos encoda eso.

**Estructura.** Fuera los marcadores `01 / 02 / 03`, que son otro default y que
además contradicen la tesis de la marca. En su lugar, **señales**: lo que se ve,
se huele y se toca. Un curso que enseña a no depender de números no puede
numerar todo.

**Firma.** La página se enciende. Al cargar, la luz del estudio sube sobre la
foto del hero, como cuando se prenden las luces antes de que llegue la gente. Es
un solo momento orquestado, no efectos sueltos por todos lados.

## Qué se respeta

Piso de calidad sin anunciarlo: responsive hasta 360px, foco de teclado visible,
`prefers-reduced-motion` respetado, contraste AA real medido, y las imágenes con
sus variantes chicas.
