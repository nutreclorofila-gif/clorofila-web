const fs = require('fs');
const path = require('path');

const root = process.cwd();
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);

let errors = 0;

for (const loc of locs) {
  const url = new URL(loc);
  const slug = url.pathname.replace(/^\/|\/$/g, '');
  const file = slug === '' ? 'index.html' : `${slug}.html`;
  const ruta = path.join(root, file);
  if (!fs.existsSync(ruta)) {
    console.error(`sitemap.xml references "${loc}" but ${file} does not exist`);
    errors++;
    continue;
  }
  // Una pagina con noindex dentro del sitemap le dice a Google dos cosas
  // opuestas: Search Console lo reporta como "Excluida por una etiqueta
  // noindex" y el aviso vuelve en cada rastreo. Si no se quiere indexar,
  // tampoco va en el sitemap.
  const html = fs.readFileSync(ruta, 'utf8');
  const robots = html.match(/<meta[^>]+name=["']robots["'][^>]*>/i);
  if (robots && /noindex/i.test(robots[0])) {
    console.error(`sitemap.xml incluye "${loc}" pero ${file} tiene noindex: saca la URL del sitemap o el noindex de la pagina`);
    errors++;
  }
}

if (errors > 0) {
  console.error(`\n${errors} entrada(s) del sitemap con problemas.`);
  process.exit(1);
} else {
  console.log(`OK: all ${locs.length} sitemap.xml entries resolve to an existing page.`);
}
