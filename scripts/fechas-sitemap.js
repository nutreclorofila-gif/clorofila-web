/* El <lastmod> del sitemap estaba escrito a mano y se quedaba viejo: decía que
   doce páginas habían cambiado el 21 de agosto cuando en realidad se tocaron
   diez días después. Esa fecha es lo que mira Google para decidir si vuelve a
   rastrear una página, así que una fecha vieja retrasa que se vea lo nuevo.
   Acá sale de git: la fecha del último commit que tocó cada archivo.
   Con --check no escribe nada, solo avisa si alguna quedó atrás (lo usa npm test). */
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const CHECK = process.argv.includes('--check');
const raiz = process.cwd();
const sitemap = path.join(raiz, 'sitemap.xml');
let xml = fs.readFileSync(sitemap, 'utf8');

// La URL canónica de cada archivo: curso.html vive en /curso, index en /.
function archivoDe(url) {
  const ruta = url.replace('https://clorofila.uy', '') || '/';
  if (ruta === '/') return 'index.html';
  const limpio = ruta.replace(/^\//, '').replace(/\/$/, '');
  for (const cand of [limpio + '.html', path.join(limpio, 'index.html')]) {
    if (fs.existsSync(path.join(raiz, cand))) return cand;
  }
  return null;
}

function fechaGit(archivo) {
  try {
    const f = execSync(`git log -1 --format=%ad --date=short -- "${archivo}"`, { encoding: 'utf8' }).trim();
    return f || null;
  } catch (e) { return null; }
}

let cambios = 0;
const desfasadas = [];

xml = xml.replace(/<url>([\s\S]*?)<\/url>/g, function (bloque) {
  const url = (bloque.match(/<loc>([^<]+)<\/loc>/) || [])[1];
  if (!url) return bloque;
  const archivo = archivoDe(url);
  if (!archivo) return bloque;
  const real = fechaGit(archivo);
  if (!real) return bloque;
  const actual = (bloque.match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1];
  if (actual === real) return bloque;
  cambios++;
  desfasadas.push(`  ${url}: dice ${actual}, el archivo cambió el ${real}`);
  return bloque.replace(/<lastmod>[^<]+<\/lastmod>/, '<lastmod>' + real + '</lastmod>');
});

if (CHECK) {
  if (cambios) {
    console.error('✗ El sitemap tiene ' + cambios + ' fecha(s) vieja(s). Corré: npm run fechas');
    console.error(desfasadas.join('\n'));
    process.exit(1);
  }
  console.log('sitemap: las ' + (xml.match(/<lastmod>/g) || []).length + ' fechas coinciden con el historial.');
} else {
  fs.writeFileSync(sitemap, xml);
  console.log(cambios ? 'sitemap: ' + cambios + ' fecha(s) actualizada(s) desde git.' : 'sitemap: las fechas ya estaban al día.');
}
