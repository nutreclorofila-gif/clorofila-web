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

/* El mismo criterio para el dateModified del JSON-LD de los artículos. Estaba
   escrito a mano y se quedó en julio y agosto mientras el <lastmod> del
   sitemap decía septiembre: dos señales contradictorias sobre la misma página,
   y la que Google muestra al lado del resultado es la del schema. Sale de la
   misma fuente, que es el historial. */
const articulos = fs.existsSync(path.join(raiz, 'articulos'))
  ? fs.readdirSync(path.join(raiz, 'articulos')).filter(f => f.endsWith('.html'))
  : [];
for (const nombre of articulos) {
  const rel = path.join('articulos', nombre);
  const real = fechaGit(rel);
  if (!real) continue;
  const ruta = path.join(raiz, rel);
  let html = fs.readFileSync(ruta, 'utf8');
  const actual = (html.match(/"dateModified"\s*:\s*"([^"]*)"/) || [])[1];
  if (!actual) continue;
  // La fecha de publicación no se toca nunca: sólo la de modificación.
  if (actual.slice(0, 10) === real) continue;
  cambios++;
  desfasadas.push(`  ${rel}: dateModified dice ${actual.slice(0, 10)}, el archivo cambió el ${real}`);
  if (!CHECK) {
    html = html.replace(/("dateModified"\s*:\s*")[^"]*(")/, '$1' + real + '$2');
    fs.writeFileSync(ruta, html);
  }
}

/* El índice /articulos repite las mismas fechas dentro de su Blog, una por
   artículo. Quedaban viejas por el mismo motivo, y ahora además contradecían
   a la página del artículo. Se rearman desde el dateModified de cada archivo,
   que a esta altura ya salió de git. */
{
  const indice = path.join(raiz, 'articulos.html');
  if (fs.existsSync(indice)) {
    let html = fs.readFileSync(indice, 'utf8');
    let tocado = 0;
    html = html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/, function (m, abre, cuerpo, cierra) {
      let ld;
      try { ld = JSON.parse(cuerpo); } catch (e) { return m; }
      const nodos = Array.isArray(ld) ? ld : (ld['@graph'] || [ld]);
      const blog = nodos.find(function (n) { return n && n['@type'] === 'Blog'; });
      if (!blog || !Array.isArray(blog.blogPost)) return m;
      for (const post of blog.blogPost) {
        const slug = String(post.url || '').split('/').pop();
        if (!slug) continue;
        const art = path.join(raiz, 'articulos', slug + '.html');
        if (!fs.existsSync(art)) continue;
        const real = (fs.readFileSync(art, 'utf8').match(/"dateModified"\s*:\s*"([^"]*)"/) || [])[1];
        if (!real || post.dateModified === real) continue;
        cambios++;
        desfasadas.push(`  articulos.html: ${slug} dice ${String(post.dateModified).slice(0, 10)}, el artículo dice ${real.slice(0, 10)}`);
        post.dateModified = real;
        tocado++;
      }
      if (!tocado) return m;
      return abre + JSON.stringify(ld).replace(/</g, '\\u003c') + cierra;
    });
    if (tocado && !CHECK) fs.writeFileSync(indice, html);
  }
}

if (CHECK) {
  if (cambios) {
    console.error('✗ Hay ' + cambios + ' fecha(s) vieja(s) en el sitemap o en el schema. Corré: npm run fechas');
    console.error(desfasadas.join('\n'));
    process.exit(1);
  }
  console.log('fechas: las ' + (xml.match(/<lastmod>/g) || []).length + ' del sitemap y las ' + articulos.length + ' de los artículos coinciden con el historial.');
} else {
  fs.writeFileSync(sitemap, xml);
  console.log(cambios ? 'fechas: ' + cambios + ' actualizada(s) desde git.' : 'fechas: sitemap y schema ya estaban al día.');
}
