# Qué cambia cuando se publique — rama `claude/nice-thompson-d2c69f`

93 commits desde lo que está en vivo. 46 archivos: las 27 páginas, 4 scripts,
2 imágenes, el sitemap, el manifest, `llms.txt`, la plantilla de `llms.txt` y
6 documentos. **No cambia `netlify.toml` ni `robots.txt`**, así que las
cabeceras, el CSP y las redirecciones quedan como están.

`check:integridad` contra `main`: ninguna página pierde título, texto,
enlaces, imágenes, precios ni bloques de schema. Los 17 chequeos en verde.

## Lo que se ve

**El texto.** El cierre de cada página deja de pedir la venta y de apurar con
los lugares: «Reservá tu lugar. Los grupos son chicos» pasa a «Si te quedan
dudas, escribinos». Lo mismo en las otras cinco páginas que lo hacían. Se va
«sos de los primeros en enterarte», que prometía una ventaja sobre otras
personas. Y se van los pies de foto que iban encima de la imagen.

**La tipografía.** El sitio declaraba 69 tamaños de letra distintos, once de
ellos metidos entre 13,6 y 15,7px. Ahora son siete pasos. En /curso el título
de la página salía más chico que sus propios subtítulos —40px contra 51,2—;
ahora el h1 siempre es el más grande, entre 1,4 y 1,8 veces el h2.

**Las cajas.** Se van las filas de etiquetitas del hero en cinco páginas —en
/talleres había veinte y quince decían lo mismo—, la barra de seis chips de
/curso, y la última grilla de testimonios en caja. /talleres pasa de 32 cajas
cerradas a 14.

**La barra de arriba.** Los ocho enlaces pesaban lo mismo; ahora los tres que
se reservan van pegados a la marca y los cuatro que se leen al otro extremo.
La barra es opaca. En el celular el menú es un índice alineado a la izquierda.

**El celular.** El aviso de cookies estaba arriba y tapaba el título de la
portada: vuelve abajo. /leonardo tardaba 8,3 pantallas en ofrecer una salida
—y ahí cae el enlace más clickeado del anuncio de Google—; ahora 0,3.

**El ecosistema.** /servicios no tenía un solo enlace saliente, desde /curso
no se llegaba a los talleres, y ninguna actividad enlazaba un artículo. Las
seis páginas de actividad ahora tienen salida a las otras. /programa, /pastas
y /contacto tenían una sola salida cada una, las tres al curso.

**La puerta cerrada.** La Cena y Taller de Tapeo está agotada desde el 9, y el
sitio la ofrecía como paso siguiente en cuatro lugares de mucho tráfico: el
ítem «Experiencias» del menú en las 25 páginas, la frase de cierre de los doce
artículos —idéntica en los doce—, el segundo botón del inicio y la barra fija
de /experiencias. Esto ya estaba medido afuera: el anuncio del tapeo se dejó
corriendo tres días después de llenarse, costó $614 y trajo veinte personas
que escribieron para una noche sin lugares; ninguna se anotó para la próxima.
Ahora, con la fecha llena, cada uno de esos cuatro lugares lleva a algo que sí
se puede empezar, y vuelven solos a la cena cuando haya fecha. La cuenta
regresiva también se calla: decía «Empieza en 3 días» al lado de «Agotado».

**La barra fija.** En /sobre y /leonardo decía «Reservar mi lugar» mientras el
cierre de esas mismas páginas ofrece «Ver el curso» y deja reservar en segundo
lugar: la barra contradecía a la página desde la primera pantalla.

**El trato del temario.** Veinticuatro botones pedían un mail a cambio del
«contenido completo del curso», que está publicado en /programa y enlazado
desde las 27 páginas. Ahora el programa se da, y el mail se pide sólo por lo
que no está publicado: cuándo abre la próxima edición.

## Lo que queda igual a propósito

La paleta, las dos tipografías, las fotos, los precios, las fechas, los cupos
y todo lo que sale de `data/ofertas.json`. La comanda —el ticket de /curso y
/tapeo— sigue siendo el único objeto con profundidad del sitio.

## Lo que es decisión de Leo, y el sitio no puede resolver

- **El grupo de la mañana.** Jueves 10 a 12 fracasó dos veces, 1 de 15 y 0 de
  15, y el sitio lo muestra igual que el de la noche.
- **El PDF de 19 MB.** El programa está publicado; mandarlo como adjunto a 200
  personas, sin saber quién lo abre, es del flujo de correo.
- **Los 1.200 alumnos y los cero enlaces externos.** Ningún sitio enlaza a
  clorofila.uy, y ésa es la causa de fondo del techo en Google.
