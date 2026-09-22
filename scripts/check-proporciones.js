#!/usr/bin/env node
/*
 * check-proporciones — dos propiedades que por separado estan bien y juntas
 * rompen la pagina en silencio.
 *
 * El 22/9/2026 se encontro esto en /talleres, despues de meses publicado:
 *
 *   .taller-foto              min-height: 19rem     (304 px)
 *   @media (max-width:820px)  aspect-ratio: 16/10
 *
 * Cuando las dos caen sobre el mismo elemento se pelean y gana la
 * proporcion: la caja toma 304 px de alto por el minimo y de ahi DERIVA su
 * ancho, 304 x 1,6 = 486 px. La columna donde vivia media 350. Las cinco
 * fotos se salian 136 px de la pantalla del telefono y corrian la pagina
 * entera 116 px de costado.
 *
 * Por que nadie lo vio: la caja conserva la proporcion que el CSS declara,
 * asi que leyendo el codigo esta todo bien. Lo que no entra en la pantalla
 * es la foto, no la proporcion. Los 19 chequeos daban verde.
 *
 * El arreglo, y lo que este chequeo pide: donde se declara el aspect-ratio,
 * apagar el minimo en la misma regla con min-height:0.
 *
 * Esto NO barre el sitio buscando desbordes. Para eso hace falta un
 * navegador, y el proyecto no tiene ninguna dependencia de esas a proposito.
 * Cubre un caso cerrado donde un fallo es un fallo.
 */

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');

/* Los archivos que tienen CSS: la hoja comun y el <style> de cada pagina. */
const fuentes = [{ nombre: 'base.css', css: fs.readFileSync(path.join(raiz, 'base.css'), 'utf8') }];

for (const pagina of fs.readdirSync(raiz).filter((f) => f.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(raiz, pagina), 'utf8');
  for (const [, bloque] of html.matchAll(/<style>([\s\S]*?)<\/style>/g)) {
    fuentes.push({ nombre: pagina, css: bloque });
  }
}

/* De ".taller:nth-child(even) .taller-foto" queda ".taller-foto": el sujeto
   de la regla es el ultimo pedazo, que es el elemento que se dibuja. */
function sujeto(selector) {
  const ultimo = selector.trim().split(/\s+|>/).filter(Boolean).pop() || '';
  const clases = ultimo.match(/\.[A-Za-z0-9_-]+/g);
  return clases ? clases[clases.length - 1] : null;
}

function leer(css) {
  const conMinimo = new Map(); /* sujeto -> el selector que le puso un minimo */
  const conProporcion = [];    /* cada regla que declara aspect-ratio */
  const limpio = css.replace(/\/\*[\s\S]*?\*\//g, '');

  for (const [, selectores, cuerpo] of limpio.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/aspect-ratio|min-height/.test(cuerpo)) continue;

    const minimo = cuerpo.match(/min-height\s*:\s*([^;}]+)/);
    const proporcion = /aspect-ratio\s*:/.test(cuerpo);
    const apagado = !!minimo && /^(0|0[a-z%]*|auto)$/i.test(minimo[1].trim());

    for (const selector of selectores.split(',')) {
      const quien = sujeto(selector);
      if (!quien) continue;
      if (minimo && !apagado) conMinimo.set(quien, selector.trim());
      if (proporcion) conProporcion.push({ quien, selector: selector.trim(), apagado });
    }
  }
  return { conMinimo, conProporcion };
}

/* Una clase se cruza consigo misma solo dentro del CSS que la pagina
   realmente carga: base.css, que vale para todas, mas su propio <style>.
   El <style> de /talleres no alcanza a /experiencias, que define su propia
   .taller-foto sin minimo y esta sana. */
const comun = leer(fuentes.find((f) => f.nombre === 'base.css').css);

const fallas = [];
let reglasVistas = 0;

for (const { nombre, css } of fuentes) {
  const esBase = nombre === 'base.css';
  const propio = esBase ? { conMinimo: new Map(), conProporcion: [] } : leer(css);

  /* Lo que la pagina ve: el minimo de base.css, y el suyo propio encima. */
  const minimos = new Map([...comun.conMinimo, ...propio.conMinimo]);
  const reglas = esBase ? comun.conProporcion : propio.conProporcion;
  reglasVistas += reglas.length;

  for (const { quien, selector, apagado } of reglas) {
    if (minimos.has(quien) && !apagado) {
      fallas.push(
        `${nombre} · ${selector} pide aspect-ratio, y ${minimos.get(quien)} le puso min-height`
      );
    }
  }
}

if (fallas.length) {
  console.error('proporciones: ' + fallas.length + (fallas.length === 1 ? ' problema' : ' problemas'));
  for (const f of fallas) console.error('  ✗ ' + f);
  console.error('');
  console.error('  Las dos juntas se pelean y gana la proporcion: la caja toma el alto del');
  console.error('  minimo y de ahi deriva su ancho, que puede salirse de la pantalla.');
  console.error('  Arreglo: agregar min-height:0 en la misma regla que pide el aspect-ratio.');
  process.exit(1);
}

console.log(
  `proporciones: ${reglasVistas} reglas con aspect-ratio, ninguna peleada con un minimo de alto.`
);
