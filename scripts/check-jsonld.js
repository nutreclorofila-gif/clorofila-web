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
    // Un articulo copiado de otro como plantilla se lleva el headline del
    // original: el lector ve un titulo y Google indexa otro. Paso una vez con
    // la guia del tofu, calcada de la de legumbres.
    const h1m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1m) {
      const h1 = normalizar(h1m[1].replace(/<[^>]+>/g, ''));
      const lista = Array.isArray(data) ? data : data['@graph'] || [data];
      for (const nodo of lista) {
        const hl = nodo.headline;
        if (hl && normalizar(hl) !== h1) {
          console.error(`[${file}] el headline del JSON-LD no es el <h1>: "${hl}" vs "${h1m[1].replace(/<[^>]+>/g, '').trim()}"`);
          errors++;
        }
      }
    }

    /* Los campos que Google exige por tipo. Si faltan, el bloque sigue siendo
       JSON valido -y este chequeo pasaba- pero Google lo descarta y la pagina
       pierde el resultado enriquecido. Paso con los doce articulos del indice
       sin fecha y con el evento de /experiencias sin lugar. */
    const OBLIGATORIOS = {
      Event: ['name', 'startDate', 'location'],
      Course: ['name', 'description', 'provider'],
      FAQPage: ['mainEntity'],
      Review: ['author', 'reviewRating'],
      AggregateRating: ['ratingValue', 'reviewCount'],
      Article: ['headline', 'datePublished'],
      BlogPosting: ['headline', 'datePublished'],
      LocalBusiness: ['name', 'address'],
    };
    (function revisar(nodo, ruta) {
      if (!nodo || typeof nodo !== 'object') return;
      if (Array.isArray(nodo)) {
        nodo.forEach(function (n, i) { revisar(n, ruta + '[' + i + ']'); });
        return;
      }
      for (const tipo of [].concat(nodo['@type'] || [])) {
        const pide = OBLIGATORIOS[tipo];
        if (!pide) continue;
        const faltan = pide.filter(function (k) { return nodo[k] === undefined; });
        if (faltan.length) {
          console.error(`[${file}] ${tipo}${ruta ? ' en ' + ruta : ''}: le falta ${faltan.join(', ')}, que Google pide`);
          errors++;
        }
      }
      for (const [k, v] of Object.entries(nodo)) {
        if (k !== '@type' && v && typeof v === 'object') revisar(v, ruta ? ruta + '.' + k : k);
      }
    })(data, '');

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
