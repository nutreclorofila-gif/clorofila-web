#!/usr/bin/env node
/**
 * Servidor estático para ver el sitio en local. Sin dependencias.
 *
 * Antes esto era `npx serve`, que falla en algunos entornos porque npx
 * resuelve el paquete desde un directorio que no siempre puede leer
 * ("EPERM: uv_cwd"). Un archivo propio no descarga nada y arranca siempre.
 *
 * Imita a Netlify en lo que importa para revisar el sitio:
 *   /curso            → curso.html   (las URLs del sitio no llevan .html)
 *   /articulos/remojo → articulos/remojo.html
 *   /                 → index.html
 *   lo que no existe  → 404.html con código 404
 * Los redirects de netlify.toml no se aplican acá: para eso está
 * `npm run check:redirects`.
 *
 * Uso:  npm run serve   (o node scripts/servidor.js 8123)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const puerto = Number(process.argv[2] || process.env.PORT || 8123);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

function resolver(urlPath) {
  // Nunca salir de la raíz del sitio, aunque pidan ../../
  let crudo;
  try {
    crudo = decodeURIComponent(urlPath.split('?')[0]);
  } catch (e) {
    // Un % suelto en la URL hace saltar decodeURIComponent. Sin esto, una
    // dirección mal escrita tumbaba el servidor entero.
    return null;
  }
  const limpio = path.normalize(crudo).replace(/^(\.\.[/\\])+/, '');
  const dentro = path.join(raiz, limpio);
  if (!dentro.startsWith(raiz)) return null;

  const candidatos = limpio === '/' || limpio === '\\' || limpio === '.'
    ? [path.join(raiz, 'index.html')]
    : [dentro, dentro + '.html', path.join(dentro, 'index.html')];

  return candidatos.find(function (c) {
    return fs.existsSync(c) && fs.statSync(c).isFile();
  }) || null;
}

http.createServer(function (req, res) {
  const archivo = resolver(req.url);

  if (!archivo) {
    const p404 = path.join(raiz, '404.html');
    const cuerpo = fs.existsSync(p404) ? fs.readFileSync(p404) : 'No encontrado';
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(cuerpo);
  }

  res.writeHead(200, {
    'Content-Type': TIPOS[path.extname(archivo).toLowerCase()] || 'application/octet-stream',
    // Sin cache: en local siempre se ve el último cambio.
    'Cache-Control': 'no-store'
  });
  // Si el navegador corta la conexión a mitad de una imagen —pasa al navegar
  // rápido o al cerrar la pestaña— el stream emite 'error'. Sin este oyente,
  // ese error no lo escucha nadie y Node mata el proceso: el servidor se caía
  // sola en medio de una revisión, sin dejar rastro.
  const flujo = fs.createReadStream(archivo);
  flujo.on('error', function () { res.destroy(); });
  res.on('close', function () { flujo.destroy(); });
  flujo.pipe(res);
}).listen(puerto, function () {
  console.log('Clorofila en http://localhost:' + puerto);
});
