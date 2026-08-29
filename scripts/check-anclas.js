/* Los enlaces con # los saltea check-links a propósito: no son archivos.
   Pero un botón que apunta a una sección que ya no existe deja al visitante
   arriba de todo sin entender por qué, y eso no lo ve ningún otro chequeo.
   Acá se resuelve cada ancla contra los id= de la página a la que apunta. */
const fs = require('fs');
const path = require('path');

const raiz = process.cwd();
const paginas = [
  ...fs.readdirSync(raiz).filter(function (f) { return f.endsWith('.html'); }),
];
const dirArt = path.join(raiz, 'articulos');
if (fs.existsSync(dirArt)) {
  paginas.push.apply(paginas, fs.readdirSync(dirArt)
    .filter(function (f) { return f.endsWith('.html'); })
    .map(function (f) { return path.join('articulos', f); }));
}

// La URL canónica de cada página: curso.html se sirve en /curso, index en /.
function comoUrl(p) {
  const sinExt = p.replace(/\.html$/, '').split(path.sep).join('/');
  return sinExt === 'index' ? '/' : '/' + sinExt;
}

const idsPorUrl = {};
for (const p of paginas) {
  const html = fs.readFileSync(path.join(raiz, p), 'utf8');
  idsPorUrl[comoUrl(p)] = new Set(
    [...html.matchAll(/\sid="([^"]+)"/g)].map(function (m) { return m[1]; })
  );
}

let errores = 0;
let revisados = 0;

for (const p of paginas) {
  const html = fs.readFileSync(path.join(raiz, p), 'utf8');
  for (const m of html.matchAll(/href="([^"]*#[^"]+)"/g)) {
    const crudo = m[1];
    if (/^(https?:|mailto:|tel:)/.test(crudo)) continue;
    const partes = crudo.split('#');
    const ancla = partes[1];
    if (!ancla) continue;
    revisados++;
    // Sin ruta, el ancla es de la propia página.
    const destino = partes[0] === '' ? comoUrl(p) : (partes[0].replace(/\/$/, '') || '/');
    const ids = idsPorUrl[destino];
    if (!ids) {
      console.error('[' + p + '] "' + crudo + '": no existe la página destino');
      errores++;
    } else if (!ids.has(ancla)) {
      console.error('[' + p + '] "' + crudo + '": la sección #' + ancla + ' no existe en ' + destino);
      errores++;
    }
  }
}

if (errores) {
  console.error('\n' + errores + ' enlace(s) a una sección que no existe.');
  process.exit(1);
}
console.log('anclas: ' + revisados + ' enlaces a secciones, todos llegan.');
