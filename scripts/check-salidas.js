/* Clorofila tiene cinco actividades —el curso, los talleres, las cenas, los
   eventos y los artículos— y durante meses el sitio las trató como un embudo
   hacia una sola. Medido el 14/9/2026: de 195 enlaces internos en el cuerpo de
   las 27 páginas, los talleres se llevaban el 6,7% y eventos el 1,5%;
   /servicios no tenía un solo enlace saliente, y desde /curso no se llegaba a
   los talleres, que son la puerta chica.

   Leo lo dijo así: "pensá siempre en conjunto en todo el ecosistema de
   Clorofila, el diseño o el embudo tiene que estar pensado para todas las
   actividades".

   Este chequeo corta si alguna página queda encerrada en su propia actividad.
   No mide cantidad ni reparto —eso es criterio, no regla—: mide que exista al
   menos una puerta hacia otra cosa, en el cuerpo, donde el lector la ve. La
   barra y el pie no cuentan: están en las 27 páginas y taparían el problema. */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');

// A qué actividad pertenece cada página, y a cuál lleva cada enlace.
const ACTIVIDAD = {
  '/curso': 'curso', '/programa': 'curso',
  '/talleres': 'talleres', '/pastas': 'talleres',
  '/tapeo': 'experiencias', '/experiencias': 'experiencias',
  '/servicios': 'eventos',
  '/articulos': 'articulos',
};
const actividadDe = (ruta) =>
  ruta.startsWith('/articulos/') ? 'articulos' : (ACTIVIDAD[ruta] || null);

// Las páginas que presentan algo. Quedan fuera las de trámite —gracias, 404,
// privacidad— y la de contacto, que es el final de todos los caminos.
const PROPIAS = {
  'index.html': null, // la portada no es de ninguna actividad: tiene que nombrarlas
  'curso.html': 'curso', 'programa.html': 'curso',
  'talleres.html': 'talleres', 'pastas.html': 'talleres',
  'tapeo.html': 'experiencias', 'experiencias.html': 'experiencias',
  'servicios.html': 'eventos',
  'articulos.html': 'articulos',
  'sobre.html': null, 'leonardo.html': null, 'contacto.html': null,
};
for (const f of fs.readdirSync(path.join(raiz, 'articulos'))) {
  if (f.endsWith('.html')) PROPIAS[path.join('articulos', f)] = 'articulos';
}

// La portada nombra las cinco; el resto, al menos una que no sea la suya.
const MINIMO_PORTADA = 5;

let fallas = 0;
const resumen = [];
for (const [rel, propia] of Object.entries(PROPIAS)) {
  const html = fs.readFileSync(path.join(raiz, rel), 'utf8')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  const destinos = new Set();
  for (const m of html.matchAll(/href="(\/[^"#?]*)"/g)) {
    const a = actividadDe(m[1]);
    if (a) destinos.add(a);
  }
  const otras = [...destinos].filter(a => a !== propia);
  resumen.push({ rel, otras: otras.length });

  if (rel === 'index.html') {
    if (destinos.size < MINIMO_PORTADA) {
      fallas++;
      console.error('\n✗ ' + rel + ': la portada nombra ' + destinos.size + ' de las ' +
        MINIMO_PORTADA + ' actividades en el cuerpo (' + [...destinos].join(', ') + ')');
    }
  } else if (otras.length === 0) {
    fallas++;
    console.error('\n✗ ' + rel + ': no tiene ni una salida a otra actividad' +
      (propia ? ' (sólo lleva a ' + propia + ')' : ' (no lleva a ninguna)'));
  }
}

if (fallas) {
  console.error('\nUna página sin salida deja a quien llegó buscando otra cosa sin dónde ir.');
  console.error('Se resuelve con una línea de texto en el cierre, no con un botón nuevo:');
  console.error('mirá el bloque <p class="otras"> de /curso, /talleres o /servicios.');
  process.exit(1);
}
console.log('salidas: ' + resumen.length + ' páginas, ninguna encerrada en su propia actividad.');
