#!/usr/bin/env node
// "25 años cocinando, 13 enseñando" está escrito a mano en once lugares de
// seis páginas, y el 1 de enero los tres números quedan viejos de golpe sin
// que nadie toque nada. Ya nos pasó con las reseñas de Google: el número
// escrito a mano se queda atrás y no hay forma de darse cuenta mirando.
//
// Este chequeo compara lo que dicen las páginas contra los años de inicio
// que están en data/ofertas.json (bloque "estudio"), y corta el build si
// alguno no cierra. No arregla el texto: dice exactamente qué archivo y qué
// línea hay que tocar, porque la frase cambia según dónde esté.
'use strict';
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..');

const datos = JSON.parse(fs.readFileSync(path.join(raiz, 'data', 'ofertas.json'), 'utf8'));
const e = datos.estudio;
if (!e) {
  console.error('✗ Falta el bloque "estudio" en data/ofertas.json.');
  process.exit(1);
}

const anioActual = new Date().getFullYear();
const esperado = {
  ensena: anioActual - e.ensena_desde,
  cocina: anioActual - e.cocina_desde,
};

const archivos = [
  ...fs.readdirSync(raiz).filter((f) => f.endsWith('.html') && !f.startsWith('google')),
  'llms.txt',
].filter((f) => fs.existsSync(path.join(raiz, f)));

// Cada patrón captura el número y dice con qué año de inicio se compara.
const patrones = [
  [/(\d+)\s+años?\s+enseñando/g, 'ensena'],
  [/(\d+)\s+enseñando/g, 'ensena'],
  [/(\d+)\s+años?\s+cocinando/g, 'cocina'],
  [/(\d+)\s+años?\s+de\s+experiencia/g, 'cocina'],
];

const fallas = [];
for (const archivo of archivos) {
  const texto = fs.readFileSync(path.join(raiz, archivo), 'utf8');
  for (const [re, cual] of patrones) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(texto))) {
      const dice = Number(m[1]);
      if (dice === esperado[cual]) continue;
      const linea = texto.slice(0, m.index).split('\n').length;
      fallas.push(
        `${archivo}:${linea} dice "${m[0].trim()}" y en ${anioActual} son ${esperado[cual]}`
      );
    }
  }
  // El año de fundación no se calcula: si una página lo cambia sola, es un error.
  const re2 = /(?:desde|abrió en|en)\s+(20\d\d)\b/g;
  let m2;
  while ((m2 = re2.exec(texto))) {
    const anio = Number(m2[1]);
    // Solo miramos años que pretenden ser el de fundación, no fechas de cursos.
    if (anio >= 2010 && anio <= 2015 && anio !== e.fundacion) {
      const linea = texto.slice(0, m2.index).split('\n').length;
      fallas.push(`${archivo}:${linea} dice "${m2[0]}" y Clorofila abrió en ${e.fundacion}`);
    }
  }
}

if (fallas.length) {
  console.error(
    'Números de antigüedad que quedaron viejos (cambian solos al pasar el año):\n  ' +
      fallas.join('\n  ') +
      '\n\n  Corregilos en esas líneas. Los años de inicio están en data/ofertas.json → "estudio".'
  );
  process.exit(1);
}
console.log(
  `antigüedad: ${esperado.cocina} años cocinando y ${esperado.ensena} enseñando, ` +
    `igual en las ${archivos.length} páginas.`
);
