#!/usr/bin/env node
/**
 * Red de seguridad: compara el sitio contra una versión anterior y avisa si
 * algo se perdió por el camino. No mira el diseño, mira lo que no se puede
 * romper: que cada página siga teniendo su título, su texto, sus enlaces,
 * su schema válido y sus datos.
 *
 * Uso:  node scripts/check-integridad.js            (foto del estado actual)
 *       node scripts/check-integridad.js <rama>     (compara contra esa rama)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const raiz = path.join(__dirname, '..');
const contra = process.argv[2];

function paginas() {
  const out = [];
  for (const f of fs.readdirSync(raiz)) if (f.endsWith('.html')) out.push(f);
  const dir = path.join(raiz, 'articulos');
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (f.endsWith('.html')) out.push('articulos/' + f);
  return out.sort();
}

function medir(html, nombre) {
  const sinScripts = html.replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ');
  const texto = sinScripts.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const t = html.match(/<title>([\s\S]*?)<\/title>/);
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const jsonld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  let bloquesValidos = 0;
  for (const m of jsonld) { try { JSON.parse(m[1]); bloquesValidos++; } catch (e) { /* inválido */ } }
  return {
    pagina: nombre,
    palabras: texto ? texto.split(' ').length : 0,
    title: t ? t[1].trim() : '',
    h1: h1 ? h1[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '',
    enlaces: (html.match(/<a\b[^>]*href=/g) || []).length,
    imagenes: (html.match(/<img\b/g) || []).length,
    jsonld: jsonld.length,
    jsonldValidos: bloquesValidos,
    precios: (texto.match(/\$\s?[\d.]{3,}/g) || []).length
  };
}

const ahora = paginas().map(function (f) {
  return medir(fs.readFileSync(path.join(raiz, f), 'utf8'), f);
});

if (!contra) {
  const totales = ahora.reduce(function (a, p) {
    a.palabras += p.palabras; a.enlaces += p.enlaces; a.imagenes += p.imagenes;
    a.jsonld += p.jsonld; a.rotos += (p.jsonld - p.jsonldValidos); return a;
  }, { palabras: 0, enlaces: 0, imagenes: 0, jsonld: 0, rotos: 0 });
  console.log('integridad: ' + ahora.length + ' páginas · ' + totales.palabras + ' palabras · ' +
    totales.enlaces + ' enlaces · ' + totales.imagenes + ' imágenes · ' +
    totales.jsonld + ' bloques de schema (' + totales.rotos + ' rotos)');
  if (totales.rotos) { console.error('✗ Hay ' + totales.rotos + ' bloques de schema rotos.'); process.exit(1); }
  process.exit(0);
}

// Comparación contra otra rama o commit
const problemas = [];
const antesPorNombre = {};
for (const f of paginas()) {
  let viejo;
  try { viejo = execSync('git show ' + contra + ':"' + f + '"', { cwd: raiz, encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }); }
  catch (e) { continue; } // página nueva: no hay con qué comparar
  antesPorNombre[f] = medir(viejo, f);
}

for (const p of ahora) {
  const a = antesPorNombre[p.pagina];
  if (!a) { console.log('  + ' + p.pagina + ' (página nueva)'); continue; }
  if (!p.title && a.title) problemas.push(p.pagina + ': se quedó sin <title>');
  if (!p.h1 && a.h1) problemas.push(p.pagina + ': se quedó sin <h1>');
  if (p.jsonld < a.jsonld) problemas.push(p.pagina + ': perdió ' + (a.jsonld - p.jsonld) + ' bloque(s) de schema');
  if (p.jsonldValidos < p.jsonld) problemas.push(p.pagina + ': tiene ' + (p.jsonld - p.jsonldValidos) + ' bloque(s) de schema rotos');
  if (p.enlaces < a.enlaces * 0.9) problemas.push(p.pagina + ': perdió ' + (a.enlaces - p.enlaces) + ' enlaces (tenía ' + a.enlaces + ')');
  if (p.imagenes < a.imagenes) problemas.push(p.pagina + ': perdió ' + (a.imagenes - p.imagenes) + ' imagen(es)');
  if (p.palabras < a.palabras * 0.8) problemas.push(p.pagina + ': perdió ' + (a.palabras - p.palabras) + ' palabras (tenía ' + a.palabras + ')');
  if (a.precios && !p.precios) problemas.push(p.pagina + ': se quedó sin precios (tenía ' + a.precios + ')');
}

if (problemas.length) {
  console.error('✗ integridad: ' + problemas.length + ' problema(s) contra ' + contra + ':');
  for (const x of problemas) console.error('  - ' + x);
  process.exit(1);
}
console.log('integridad: ninguna página perdió título, texto, enlaces, imágenes, precios ni schema contra ' + contra + '.');
