#!/usr/bin/env node
// Chequea el texto de cara al público contra GUIA-DE-TEXTO.md.
// No valida gramática: busca los vicios concretos que ya se rechazaron una vez.
'use strict';

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');

const CLICHES = [
  'manos en la masa', 'de la mano de', 'el secreto está', 'el secreto de',
  'sacarle el jugo', 'poner en valor', 'vivir la experiencia', 'no es magia',
  'un antes y un después', 'llevar al siguiente nivel', 'sin lugar a dudas',
  'a otro nivel', 'el arte de', 'todo un mundo', 'el mundo de la cocina',
];

// Promesas sobre lo que el lector va a sentir o retener.
const PROMESAS = [
  /\bte queda\b/i, /\bte sale\b/i, /\bte salga\b/i, /\bte va a quedar\b/i,
  /\blo entendés de verdad\b/i, /\btambién enseña\b/i, /\bte cambia la\b/i,
  /\bte vas sabiendo\b/i, /\bpara siempre\b/i,
  /\bcocin[áa]s sin receta\b/i, /\bsin mirar la receta\b/i,
  // "te deja" y "te da el" son la misma promesa con otra cara: prometen un
  // resultado sobre el lector en vez de contar lo que pasa en la clase.
  /\bte deja\b/i, /\bte da el\b/i, /\bte da la\b/i,
];

/* Vender una propuesta por lo que NO es, en vez de contar qué es. Leo ya había
   rechazado "vivir Clorofila sin el compromiso de un curso" y la frase volvió a
   aparecer entera en /experiencias, en la página y en la descripción que sale en
   Google. No aplica a los artículos: ahí "no es X, es Y" es la forma correcta de
   corregir una creencia, y es de lo que trata el artículo. */
const POR_LO_QUE_NO_ES = [
  /\bsin el compromiso\b/i,
  /\bla t[ée]cnica cerrada\b/i,
  /\bsin la exigencia\b/i,
  /\bsin tener que comprometerte\b/i,
];

// «sabiendo hacerla» es agramatical: saber pide «sabiendo cómo hacerla»
// o un sustantivo («sabiendo la técnica»).
const GERUNDIO_SABER = /\bsabiendo (?!c[óo]mo|qu[ée]|cu[áa]l|d[óo]nde|cu[áa]ndo)[a-záéíóúñ]+(ar|er|ir)\b/i;

const NEXOS = [
  /\bas[ií] que cuando\b/i, /\bpero cuando adem[áa]s\b/i, /\by que cuando\b/i,
  /\bpero como que\b/i, /\baunque si bien\b/i, /\bya que como\b/i,
  /\bpor eso cuando\b/i, /\bde manera que cuando\b/i,
];

const NO_RIOPLATENSE = [/\bcada quien\b/i, /\bt[úu] pod[ée]s\b/i, /\bvosotros\b/i, /\bcoger\b/i];

// Impersonal donde cabe vos/nosotros. Verbos de la actividad del estudio.
const IMPERSONAL = /\bse (cocina|trabaja|aprende|practica|enseña|amasa|fermenta|puede llegar|hace todo)\b/i;

// Palabras vacías que no cuentan como repetición título ↔ párrafo.
const VACIAS = new Set(('a al algo alguna algunas alguno algunos ante antes aquí cada como con contra cual cuando ' +
  'de del desde donde dos el ella ellas ellos en entre era eran es esa esas ese eso esos esta estas este esto estos ' +
  'ha hasta hay la las le les lo los más me mi mis mucho muy nada ni no nos nuestra nuestro o otra otras otro otros ' +
  'para pero poco por porque que qué quien se sea según ser si sí sin sobre solo son su sus también tanto te tener ' +
  'tiene todo toda todas todos tu tus un una uno unas unos vos y ya').split(' '));

function textoPlano(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&mdash;/g, '—')
    .replace(/&#?[a-z0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Deja solo la prosa que escribimos nosotros: fuera el chrome de la página y
// las citas textuales de terceros, que se transcriben como las dijeron.
function prosa(html) {
  let c = html.slice(html.indexOf('<body'));
  c = c.replace(/<!--[\s\S]*?-->/g, '');
  c = c.replace(/<div class="faq-item"[\s\S]*?<\/div>/gi, ' ');
  /* 'header' no se saca: en este sitio cada página envuelve su hero en
     <header class="hero-*">, así que excluirlo dejaba sin revisar el texto que
     más se lee, el primero de cada página. La navegación ya sale por <nav>.
     Así fue como sobrevivió "vivir Clorofila sin el compromiso de un curso",
     que Leo había rechazado a mano. */
  for (const tag of ['script', 'style', 'svg', 'nav', 'footer', 'blockquote', 'cite', 'figcaption']) {
    c = c.replace(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, 'gi'), ' ');
  }
  return c;
}

// Cada bloque de texto se analiza por separado: si no, el extractor pega el
// final de un párrafo con el título siguiente e inventa oraciones de 40 palabras.
function bloques(c) {
  const re = /<(p|h1|h2|h3|li|summary)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  const salida = [];
  let m;
  while ((m = re.exec(c))) {
    if (/<(p|li)\b/i.test(m[2])) continue; // contenedor: ya vendrán sus hijos
    const t = textoPlano(m[2]);
    if (t.length > 12) salida.push(t);
  }
  return salida;
}

// Pares encabezado → primer párrafo que le sigue.
function pares(c) {
  const re = /<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>([\s\S]{0,600}?)<p\b[^>]*>([\s\S]*?)<\/p>/gi;
  const salida = [];
  let m;
  while ((m = re.exec(c))) {
    if (/<h[1-3]\b/i.test(m[3])) continue; // hay otro título en el medio: no son par
    const titulo = textoPlano(m[2]);
    if (titulo.startsWith('¿')) continue; // pregunta y respuesta comparten el término
    // Un título corto sin punto es el nombre del producto, no una frase: puede
    // repetirse. El regex también arrastra listas enteras como si fueran título.
    const n = (titulo.match(/[\wáéíóúñü]+/gi) || []).length;
    if (n > 12 || (n <= 6 && !titulo.endsWith('.'))) continue;
    salida.push([titulo, textoPlano(m[4])]);
  }
  return salida;
}

function palabras(s) {
  return (s.toLowerCase().match(/[a-záéíóúñü]{4,}/g) || []).filter((p) => !VACIAS.has(p));
}

function oraciones(t) {
  return t.split(/(?<=[.!?…])\s+(?=[«"¿¡A-ZÁÉÍÓÚÑ])/).map((s) => s.trim()).filter(Boolean);
}

const archivos = [
  ...fs.readdirSync(raiz).filter((f) => f.endsWith('.html')).map((f) => f),
  ...fs.readdirSync(path.join(raiz, 'articulos')).filter((f) => f.endsWith('.html')).map((f) => 'articulos/' + f),
].sort();

const fallas = [];
const apunta = (archivo, regla, texto) => fallas.push({ archivo, regla, texto });
const recorta = (s, n = 110) => (s.length > n ? s.slice(0, n) + '…' : s);

for (const archivo of archivos) {
  const html = fs.readFileSync(path.join(raiz, archivo), 'utf8');
  const cuerpo = prosa(html);
  // Los artículos son divulgación técnica: ahí el subtítulo repite el término a
  // propósito y las frases son más largas. Se les aplica la vara del registro.
  const articulo = archivo.startsWith('articulos/');
  const maxPalabras = articulo ? 45 : 30;
  const maxQues = articulo ? 4 : 3;

  for (const frase of bloques(cuerpo).flatMap(oraciones)) {
    const bajo = frase.toLowerCase();

    for (const c of CLICHES) if (bajo.includes(c)) apunta(archivo, `cliché «${c}»`, frase);
    for (const p of PROMESAS) if (p.test(frase)) apunta(archivo, `promete un efecto en vez de contar el hecho`, frase);
    if (!articulo) {
      for (const p of POR_LO_QUE_NO_ES) {
        if (p.test(frase)) apunta(archivo, `vende por lo que no es «${frase.match(p)[0]}»: contá qué es`, frase);
      }
    }
    for (const n of NEXOS) if (n.test(frase)) apunta(archivo, `choque de nexos «${frase.match(n)[0]}»`, frase);
    for (const n of NO_RIOPLATENSE) if (n.test(frase)) apunta(archivo, `no es rioplatense «${frase.match(n)[0]}»`, frase);
    if (IMPERSONAL.test(frase)) apunta(archivo, `impersonal «${frase.match(IMPERSONAL)[0]}»: va vos o nosotros`, frase);
    if (GERUNDIO_SABER.test(frase)) apunta(archivo, `«${frase.match(GERUNDIO_SABER)[0]}»: falta el «cómo»`, frase);

    const ques = (bajo.match(/\bque\b/g) || []).length;
    if (ques >= maxQues) apunta(archivo, `${ques} «que» en una oración`, frase);

    const largo = (frase.match(/[\wáéíóúñü]+/gi) || []).length;
    if (largo > maxPalabras) apunta(archivo, `${largo} palabras en una oración (máximo ${maxPalabras})`, frase);
  }

  for (const [titulo, parrafo] of (articulo ? [] : pares(cuerpo))) {
    if (!titulo || !parrafo) continue;
    const enTitulo = new Set(palabras(titulo));
    if (!enTitulo.size) continue;
    const repetidas = [...new Set(palabras(parrafo))].filter((p) => enTitulo.has(p));
    if (repetidas.length) {
      apunta(archivo, `el párrafo repite el título (${repetidas.join(', ')})`, `«${recorta(titulo, 60)}» → «${recorta(parrafo, 90)}»`);
    }
  }
}

if (!fallas.length) {
  console.log(`texto: ${archivos.length} páginas, sin vicios de redacción.`);
  process.exit(0);
}

let ultimo = '';
for (const f of fallas) {
  if (f.archivo !== ultimo) { console.log(`\n${f.archivo}`); ultimo = f.archivo; }
  console.log(`  ${f.regla}\n    ${recorta(f.texto, 160)}`);
}
console.log(`\n${fallas.length} textos para revisar. Las reglas están en GUIA-DE-TEXTO.md.`);
process.exit(1);
