#!/usr/bin/env node
/*
 * check-renglones — dos reglas de redacción que sí se pueden automatizar.
 *
 * El 18/9/2026 pasó esto: cinco textos de /talleres que explicaban su técnica
 * en una oración entera quedaron partidos en fragmentos sin verbo —"La
 * hidratación", "El manejo de la cocción"—, colgados de un filete y en
 * tipografía de título. Leo lo leyó y dijo que parecía escrito por alguien que
 * no sabe escribir.
 *
 * La tentación era escribir un detector general de renglones sin verbo. Se
 * probó y marcó 707 de 887 ítems del sitio, el 80%, porque la mayoría de los
 * renglones DEBEN ser nominales: "Inicio", "Farfalle", "Precio $2.700".
 * Un chequeo que marca 44 cosas de las que 40 están bien se ignora en una
 * semana, y ahí deja de verificar.
 *
 * Así que esto no barre el sitio. Cubre los dos conjuntos cerrados donde la
 * regla es absoluta y un fallo es un fallo:
 *
 *   .promesa li     continúan la frase del h2, así que van en minúscula
 *                   inicial y sin punto: "Después del curso, vas a poder" +
 *                   "armar un menú saludable y variado".
 *
 *   .incluye span   es la columna del detalle, y tiene que sostenerse sola.
 *                   Abajo de 620px deja de estar al lado del nombre, así que
 *                   no puede depender de él: mayúscula inicial y punto final.
 *                   Los que salen de data/ofertas.json son datos, no
 *                   oraciones, y quedan afuera.
 */

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const paginas = fs.readdirSync(raiz).filter((f) => f.endsWith('.html'));

const fallas = [];
let promesasVistas = 0;
let detallesVistos = 0;

/* El texto que queda una vez que se van las etiquetas y los comentarios. */
function visible(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

for (const pagina of paginas) {
  const html = fs.readFileSync(path.join(raiz, pagina), 'utf8');

  /* --- Promesa: los finales de una frase que empieza en el h2 --- */
  const promesa = html.match(/class="promesa[^"]*"[\s\S]*?<\/ul>/);
  if (promesa) {
    for (const [, item] of promesa[0].matchAll(/<li>([\s\S]*?)<\/li>/g)) {
      const texto = visible(item);
      if (!texto) continue;
      promesasVistas++;
      const primera = texto[0];
      if (primera !== primera.toLowerCase()) {
        fallas.push(`${pagina} · .promesa · empieza en mayúscula: «${texto}»`);
      }
      if (texto.endsWith('.')) {
        fallas.push(`${pagina} · .promesa · termina en punto: «${texto}»`);
      }
    }
  }

  /* --- Incluye: el detalle se lee solo, sin la columna de al lado --- */
  const incluye = html.match(/class="incluye[^"]*"[\s\S]*?<\/ul>/);
  if (incluye) {
    for (const [, crudo] of incluye[0].matchAll(/<span>([\s\S]*?)<\/span>/g)) {
      /* Fechas, horarios y cupos salen de ofertas.json: son datos. */
      if (crudo.includes('<!--o:')) continue;
      const texto = visible(crudo);
      if (!texto) continue;
      detallesVistos++;
      const primera = texto[0];
      if (primera === primera.toLowerCase() && primera !== primera.toUpperCase()) {
        fallas.push(`${pagina} · .incluye · el detalle empieza en minúscula: «${texto}»`);
      }
      if (!/[.!?]$/.test(texto)) {
        fallas.push(`${pagina} · .incluye · el detalle no termina en punto: «${texto}»`);
      }
    }
  }
}

if (fallas.length) {
  console.error('renglones: ' + fallas.length + (fallas.length === 1 ? ' problema' : ' problemas'));
  for (const f of fallas) console.error('  ✗ ' + f);
  console.error('');
  console.error('  .promesa continúa la frase del título: minúscula inicial, sin punto.');
  console.error('  .incluye tiene que leerse solo: mayúscula inicial y punto final.');
  process.exit(1);
}

console.log(
  `renglones: ${promesasVistas} de la promesa y ${detallesVistos} detalles de lo incluido, todos bien formados.`
);
