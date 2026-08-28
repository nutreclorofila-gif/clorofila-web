const fs = require('fs');
const path = require('path');

const root = process.cwd();
const htmlFiles = [
  ...fs.readdirSync(root).filter((f) => f.endsWith('.html')),
];
const articulosDir = path.join(root, 'articulos');
if (fs.existsSync(articulosDir)) {
  htmlFiles.push(
    ...fs
      .readdirSync(articulosDir)
      .filter((f) => f.endsWith('.html'))
      .map((f) => path.join('articulos', f))
  );
}

// Texto visible de la pagina, sin scripts ni estilos, normalizado para comparar.
function textoVisible(html) {
  return normalizar(
    html
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;|&#\d+;/gi, ' ')
  );
}

function normalizar(t) {
  return t
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u00bf?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Recorre el @graph (o el nodo suelto) buscando FAQPage.
function faqsDe(data) {
  const nodos = Array.isArray(data) ? data : data['@graph'] || [data];
  return nodos.filter((n) => n && n['@type'] === 'FAQPage');
}

let errors = 0;

let checked = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/g;
  let match;
  while ((match = scriptRegex.exec(html))) {
    checked++;
    let data;
    try {
      data = JSON.parse(match[1]);
    } catch (e) {
      console.error(`[${file}] invalid JSON-LD: ${e.message}`);
      errors++;
      continue;
    }
    // Google descarta el FAQPage cuyas preguntas no estan visibles en la pagina.
    const visible = textoVisible(html);
    for (const faq of faqsDe(data)) {
      for (const q of faq.mainEntity || []) {
        if (!visible.includes(normalizar(q.name || ''))) {
          console.error(`[${file}] FAQPage declara una pregunta que no esta en el HTML visible: "${q.name}"`);
          errors++;
        }
      }
    }
  }
}

if (errors > 0) {
  console.error(`\n${errors} invalid JSON-LD block(s) found.`);
  process.exit(1);
} else {
  console.log(`OK: checked ${checked} JSON-LD block(s) across ${htmlFiles.length} files, all valid.`);
}
