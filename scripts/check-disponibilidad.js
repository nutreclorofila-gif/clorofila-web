/* El sitio afirma en varios lugares que algo está abierto, lleno o con
   lugares. Esas frases tienen que salir de data/ofertas.json, o al menos vivir
   dentro de un bloque que el estado enciende y apaga: si se escriben a mano,
   quedan mintiendo el día que la fecha se llena o se cae, y nadie se entera.
   Pasó de verdad: /tapeo cerraba con "También está abierto el Taller de Pastas
   sin gluten" y /pastas con "También está abierta la Cena y Taller de Tapeo",
   y las dos frases siguieron ahí después de que la cena se llenara y el taller
   perdiera la fecha. Cada página prometía la disponibilidad de la otra.

   Este chequeo busca esas afirmaciones fuera de todo control. Se considera
   controlada la frase que está dentro de un bloque <!--o:...--> (la escribe el
   build) o dentro de un elemento con clase solo-* (la enciende el estado). */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const paginas = [
  ...fs.readdirSync(raiz).filter(f => f.endsWith('.html') && !f.startsWith('google')),
  ...fs.readdirSync(path.join(raiz, 'articulos'))
    .filter(f => f.endsWith('.html')).map(f => path.join('articulos', f))
];

/* Solo afirmaciones comerciales. "disponible" a secas queda afuera a
   propósito: los artículos hablan de evidencia disponible y de calcio
   biodisponible, y ese ruido haría que el chequeo se ignore. */
const afirmaciones = [
  /est[áa]n?\s+abiert[oa]s?\b/gi,
  /qued[ae]n?\s+(?:pocos|algunos|\d+)\s+lugar/gi,
  /[úu]ltimos?\s+lugares?\b/gi,
  /hay\s+(?:fecha|cupo)\b/gi,
  /inscripciones\s+(?:abiertas|cerradas)/gi,
  /se\s+(?:llen[óo]|agot[óo])\b/gi
];
/* Una afirmación solo cuenta si habla de una propuesta nuestra: sin esto, "el
   DM está abierto" de /contacto entraba como fecha abierta. Los nombres van
   con límite de palabra y sin "clase", que aparece dentro de
   @clorofilaclases y volvía a colar esa misma línea. */
const propuestas = /\b(tapeo|taller(es)?|curso|cena|pastas)\b/i;

let fallas = 0;
for (const p of paginas) {
  const t = fs.readFileSync(path.join(raiz, p), 'utf8');
  const iMain = t.indexOf('<main');
  if (iMain < 0) continue;

  const cuerpo = t.slice(iMain)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    // lo que escribe el build
    .replace(/<!--o:[^>]*-->[\s\S]*?<!--\/o-->/g, ' ')
    // lo que enciende y apaga el estado
    .replace(/<(p|li|span|div)\b[^>]*class="[^"]*\bsolo-[^"]*"[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  const visible = cuerpo.replace(/<[^>]+>/g, ' ');
  const sueltas = [];
  for (const patron of afirmaciones) {
    for (const m of visible.matchAll(patron)) {
      const ctx = visible.slice(Math.max(0, m.index - 70), m.index + 75).replace(/\s+/g, ' ').trim();
      if (!propuestas.test(ctx)) continue;
      sueltas.push(ctx);
    }
  }
  if (sueltas.length) {
    fallas += sueltas.length;
    console.error('\n✗ ' + p + ': afirma disponibilidad sin que el estado la controle');
    [...new Set(sueltas)].forEach(c => console.error('    …' + c + '…'));
  }
}

if (fallas) {
  console.error('\nEsa frase va a seguir diciendo lo mismo cuando la fecha se llene o se caiga.');
  console.error('Ponela dentro de un bloque <!--o:ruta--> que arme el build, o dentro de un');
  console.error('elemento con clase solo-con-fecha / solo-sin-fecha / solo-agotado.');
  process.exit(1);
}
console.log('disponibilidad: ' + paginas.length + ' páginas, nada que prometa lugares por su cuenta.');
