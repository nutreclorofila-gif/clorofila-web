/* Los doce artículos cierran con su lista de fuentes, pero el JSON-LD no las
   declaraba: Google veía un artículo sin respaldo aparente. schema.org tiene
   "citation" justo para esto, y es de las señales que mira para juzgar si un
   contenido es confiable.
   Este script las copia del HTML visible al schema, así no hay dos listas que
   mantener: la que vale es la que lee la persona. Con --check no escribe, solo
   avisa si alguna quedó desincronizada (lo usa npm test). */
const fs = require('fs');
const path = require('path');

const CHECK = process.argv.includes('--check');
const dir = path.join(process.cwd(), 'articulos');
let tocados = 0, desfasados = [];

for (const archivo of fs.readdirSync(dir).filter(f => f.endsWith('.html'))) {
  const ruta = path.join(dir, archivo);
  let html = fs.readFileSync(ruta, 'utf8');

  // Las fuentes visibles: cada <li> de la lista, con su enlace y su título.
  const bloque = html.match(/<ul class="fuentes">([\s\S]*?)<\/ul>/);
  if (!bloque) continue;
  const citas = [];
  for (const li of bloque[1].matchAll(/<li>([\s\S]*?)<\/li>/g)) {
    const url = (li[1].match(/href="(https?:\/\/[^"]+)"/) || [])[1];
    const titulo = (li[1].match(/<em>([\s\S]*?)<\/em>/) || [])[1];
    if (!url) continue;
    const cita = { '@type': 'CreativeWork', url };
    if (titulo) cita.name = titulo.replace(/<[^>]+>/g, '').trim();
    citas.push(cita);
  }
  if (!citas.length) continue;

  const antes = html;
  html = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g, function (todo, json) {
    let data;
    try { data = JSON.parse(json); } catch (e) { return todo; }
    const lista = data['@graph'] || (Array.isArray(data) ? data : [data]);
    let cambio = false;
    for (const nodo of lista) {
      if (!/Article/.test(String(nodo['@type'] || ''))) continue;
      const actual = JSON.stringify(nodo.citation || null);
      if (actual === JSON.stringify(citas)) continue;
      nodo.citation = citas;
      cambio = true;
    }
    if (!cambio) return todo;
    return '<script type="application/ld+json">' +
      JSON.stringify(data, null, 0).replace(/","/g, '", "') + '</script>';
  });

  if (html !== antes) {
    tocados++;
    desfasados.push('  ' + archivo + ': ' + citas.length + ' fuente(s) sin declarar en el schema');
    if (!CHECK) fs.writeFileSync(ruta, html);
  }
}

if (CHECK) {
  if (tocados) {
    console.error('✗ ' + tocados + ' artículo(s) con las fuentes fuera del schema. Corré: npm run citas');
    console.error(desfasados.join('\n'));
    process.exit(1);
  }
  console.log('citas: los artículos declaran sus fuentes en el schema.');
} else {
  console.log(tocados ? 'citas: ' + tocados + ' artículo(s) actualizado(s).' : 'citas: ya estaban al día.');
}
