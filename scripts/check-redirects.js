#!/usr/bin/env node
/**
 * Controla que cada redirect de netlify.toml llegue a algo que existe.
 *
 * Estas URLs cortas son las que se publican en Instagram y en los flyers
 * (clorofila.uy/pastas-sin-gluten, /brunch, /el-curso). Si el destino cambia de
 * nombre o el ancla deja de existir, el link sigue "funcionando" —devuelve 301
 * y una página— pero deja al visitante arriba de todo sin entender por qué.
 * No lo detecta ningún otro check: los redirects no son links dentro del HTML.
 */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const toml = fs.readFileSync(path.join(raiz, 'netlify.toml'), 'utf8');
const pares = [...toml.matchAll(/from\s*=\s*"([^"]+)"\s*\n\s*to\s*=\s*"([^"]+)"/g)];

const errores = [];
let revisados = 0;

for (const [, desde, hacia] of pares) {
  // Los redirects de dominio (http -> https, www -> sin www) no apuntan a un archivo.
  if (/^https?:\/\//.test(hacia)) continue;
  revisados++;

  const [ruta, ancla] = hacia.split('#');
  const limpia = ruta.replace(/^\/+|\/+$/g, '') || 'index';
  const candidatos = [limpia, limpia + '.html'];
  const archivo = candidatos.find(function (c) { return fs.existsSync(path.join(raiz, c)); });

  if (!archivo) {
    errores.push(desde + ' → ' + hacia + ': no existe esa página');
    continue;
  }
  if (ancla) {
    const html = fs.readFileSync(path.join(raiz, archivo), 'utf8');
    if (!html.includes('id="' + ancla + '"')) {
      errores.push(desde + ' → ' + hacia + ': ' + archivo + ' no tiene id="' + ancla + '"');
    }
  }
}

if (errores.length) {
  console.error('✗ ' + errores.length + ' redirect(s) de netlify.toml apuntan a la nada:');
  errores.forEach(function (e) { console.error('  - ' + e); });
  console.error('  Apuntalos a una página que exista, o sacá el redirect.');
  process.exit(1);
}
console.log('OK: los ' + revisados + ' redirects de netlify.toml llegan a una página real.');
