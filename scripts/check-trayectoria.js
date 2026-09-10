/* Los números que el sitio afirma sobre Leonardo y Clorofila —años cocinando,
   años enseñando, personas formadas, año de fundación— están escritos a mano
   en el texto de siete páginas, quince veces en total. No salen de
   ofertas.json porque son parte de frases, no datos sueltos.
   Hoy coinciden. El día que cambien —y cambian solos, cada 1 de enero— es
   fácil actualizar cuatro lugares y dejar once diciendo lo de antes: el sitio
   quedaría afirmando dos cosas distintas sobre la misma persona, y nadie se
   entera hasta que lo nota alguien de afuera.
   Este chequeo no decide cuál es el número correcto. Solo exige que sea uno
   solo en todo el sitio. */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const paginas = [
  ...fs.readdirSync(raiz).filter(f => f.endsWith('.html') && !f.startsWith('google')),
  ...fs.readdirSync(path.join(raiz, 'articulos'))
    .filter(f => f.endsWith('.html')).map(f => path.join('articulos', f))
];

/* Cada concepto con las formas en que el sitio lo escribe. El grupo 1 es el
   número. `cerca` existe por el año de fundación: el sitio también dice "Desde
   2020" hablando de la nutricionista que acompaña el curso, y sin pedir que
   Clorofila o Parque Rodó estén en la misma frase, ese 2020 se leía como una
   segunda fecha de fundación. */
const conceptos = [
  { nombre: 'años cocinando',    patron: /(\d{1,2})\s*(?:a|A)ños?\s*(?:cocinando|de\s+(?:experiencia|cocina)\b)/g },
    // El sitio también lo escribe corto: "25 años cocinando, 13 enseñando".
  { nombre: 'años enseñando',    patron: /(\d{1,2})\s*(?:(?:a|A)ños?\s*)?enseñando/g },
  { nombre: 'personas formadas', patron: /\+?\s*([\d.]{3,6})\s*(?:p|P)ersonas\s*formadas/g },
  { nombre: 'año de fundación',  patron: /(?:desde|Desde|fundación en Parque Rodó\s*)\s*(20\d{2})/g,
    cerca: /Clorofila|Parque Rod/ }
];

function textoVisible(html) {
  const i = html.indexOf('<main');
  if (i < 0) return '';
  return html.slice(i)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
}

let fallas = 0;
let total = 0;
for (const { nombre, patron, cerca } of conceptos) {
  const vistos = new Map();
  for (const p of paginas) {
    const visible = textoVisible(fs.readFileSync(path.join(raiz, p), 'utf8'));
    for (const m of visible.matchAll(patron)) {
      // La ventana es la frase: 70 caracteres antes alcanzan y no se cruzan
      // con la oración anterior.
      if (cerca && !cerca.test(visible.slice(Math.max(0, m.index - 70), m.index))) continue;
      const valor = m[1];
      if (!vistos.has(valor)) vistos.set(valor, []);
      vistos.get(valor).push(p);
      total++;
    }
  }
  if (vistos.size === 0) continue;
  if (vistos.size === 1) continue;

  fallas++;
  console.error('\n✗ "' + nombre + '" no dice lo mismo en todo el sitio:');
  for (const [valor, donde] of [...vistos].sort((a, b) => b[1].length - a[1].length)) {
    const unicos = [...new Set(donde)];
    console.error('    ' + String(valor).padEnd(7) + '→ ' + unicos.join(', ') +
      (donde.length > unicos.length ? ' (' + donde.length + ' veces)' : ''));
  }
  console.error('  Elegí el valor correcto y dejalo igual en todas.');
}

if (fallas) {
  console.error('\ntrayectoria: ' + fallas + ' número' + (fallas === 1 ? '' : 's') +
    ' con más de una versión en el sitio.');
  process.exit(1);
}
console.log('trayectoria: ' + total + ' menciones a los años y las personas formadas, todas de acuerdo.');
