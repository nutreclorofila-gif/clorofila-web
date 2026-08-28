/* Dos cosas que se rompen sin que se note mirando el sitio:
 * la versión de los assets y la imagen social de cada página.
 *
 * El CSS y el JS se sirven con caché: el `?v=` del HTML es lo único que hace
 * que un visitante que ya estuvo en el sitio reciba la versión nueva. Si se
 * edita base.css y una página queda con el `?v=` viejo, esa página sigue
 * mostrando el diseño anterior, y es de las cosas que no se notan mirando el
 * sitio recién publicado. Este chequeo la encuentra antes de subirla.
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const ASSETS = ['base.css', 'consent.js', 'track.js', 'pagina.js'];

const htmlFiles = fs.readdirSync(root).filter((f) => f.endsWith('.html'));
const articulosDir = path.join(root, 'articulos');
if (fs.existsSync(articulosDir)) {
  htmlFiles.push(
    ...fs
      .readdirSync(articulosDir)
      .filter((f) => f.endsWith('.html'))
      .map((f) => path.join('articulos', f))
  );
}

// La verificación de Google Search Console es un archivo de una línea, no una
// página del sitio.
const EXCLUIDOS = new Set(['googledccf1cf7e028ebab.html']);

const versiones = {};
let errors = 0;

for (const file of htmlFiles) {
  if (EXCLUIDOS.has(file)) continue;
  const html = fs.readFileSync(path.join(root, file), 'utf8');

  for (const asset of ASSETS) {
    const regex = new RegExp(`(?:href|src)="[^"]*${asset.replace('.', '\\.')}(\\?v=([^"]*))?"`);
    const match = html.match(regex);

    if (!match) {
      console.error(`[${file}] no carga ${asset}`);
      errors++;
      continue;
    }
    if (!match[2]) {
      console.error(`[${file}] carga ${asset} sin ?v=: los visitantes que ya estuvieron van a seguir con la versión vieja`);
      errors++;
      continue;
    }
    if (!versiones[asset]) {
      versiones[asset] = { version: match[2], file };
    } else if (versiones[asset].version !== match[2]) {
      console.error(
        `[${file}] pide ${asset}?v=${match[2]} pero ${versiones[asset].file} pide ?v=${versiones[asset].version}`
      );
      errors++;
    }
  }
}

/* Cada página con imagen social propia tiene que usarla.
 *
 * Las imágenes de og/ están hechas una por página, pero es fácil copiar el
 * <head> de otra página y quedarse con la de la home: el sitio se ve igual y
 * el error solo aparece cuando alguien comparte el link por WhatsApp y sale
 * la foto equivocada. Si existe og/og-<pagina>.jpg, la página tiene que
 * pedirla, en og:image y en twitter:image. */
const PORTADA = { 'index.html': 'og-home.jpg' };

for (const file of htmlFiles) {
  if (EXCLUIDOS.has(file) || file.startsWith('articulos' + path.sep)) continue;
  const propia = PORTADA[file] || 'og-' + path.basename(file, '.html') + '.jpg';
  if (!fs.existsSync(path.join(root, 'og', propia))) continue;

  const html = fs.readFileSync(path.join(root, file), 'utf8');
  for (const etiqueta of ['og:image', 'twitter:image']) {
    const m = html.match(new RegExp(`"${etiqueta}"\\s+content="[^"]*/(og-[^"/]+)"`));
    if (!m) {
      console.error(`[${file}] no declara ${etiqueta}`);
      errors++;
    } else if (m[1] !== propia) {
      console.error(`[${file}] ${etiqueta} usa ${m[1]} pero tiene la suya: og/${propia}`);
      errors++;
    }
  }
}

if (errors > 0) {
  console.error(`\n${errors} problema(s) de assets (versiones o imagen social).`);
  process.exit(1);
} else {
  const detalle = ASSETS.map((a) => `${a}?v=${versiones[a].version}`).join(', ');
  console.log(
    `OK: ${htmlFiles.length - EXCLUIDOS.size} páginas con los mismos assets (${detalle}) y su imagen social propia.`
  );
}
