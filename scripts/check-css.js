#!/usr/bin/env node
// Una grilla con `minmax(360px, 1fr)` no entra en un teléfono de 375px: la
// columna es más ancha que el viewport menos el padding, y la página gana
// scroll horizontal. `minmax(min(360px, 100%), 1fr)` se comporta igual en
// pantallas grandes y colapsa bien en las chicas.
'use strict';
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');

const archivos = [
  ...fs.readdirSync(raiz).filter((f) => f.endsWith('.html') || f.endsWith('.css')),
  ...fs.readdirSync(path.join(raiz, 'articulos')).filter((f) => f.endsWith('.html')).map((f) => 'articulos/' + f),
];

const fallas = [];
for (const archivo of archivos) {
  const texto = fs.readFileSync(path.join(raiz, archivo), 'utf8');
  const re = /minmax\(\s*(\d+)px\s*,/g;
  let m;
  while ((m = re.exec(texto))) {
    const linea = texto.slice(0, m.index).split('\n').length;
    fallas.push(`${archivo}:${linea} minmax(${m[1]}px, …) → minmax(min(${m[1]}px, 100%), …)`);
  }
}

if (fallas.length) {
  console.error('Grillas que desbordan en pantallas chicas:\n  ' + fallas.join('\n  '));
  process.exit(1);
}
console.log(`css: ${archivos.length} archivos, ninguna grilla con ancho fijo.`);
