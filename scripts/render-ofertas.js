#!/usr/bin/env node
/**
 * Inyecta en el HTML los datos de data/ofertas.json (fechas, precios, cupos, estado).
 *
 * En el HTML se marca así:
 *   <!--o:tapeo.fecha_texto-->lo que sea<!--/o-->        → reemplaza el texto
 *   <!--o:html:tapeo.menu_html-->...<!--/o-->            → reemplaza con HTML generado
 *   <div data-estado-de="tapeo">                          → le pone data-estado="abierto|ultimos|agotado|sin-fecha"
 *   <span data-set="data-inicio-iso=curso.inicio_iso">     → le escribe ese atributo con el valor del JSON
 *
 * Es idempotente: se puede correr mil veces sobre el mismo archivo.
 * Corre en el build de Netlify, así que editar el JSON alcanza para actualizar la web.
 *
 * Uso:  node scripts/render-ofertas.js          (escribe)
 *       node scripts/render-ofertas.js --check  (falla si algo quedaría desactualizado)
 */
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const CHECK = process.argv.includes('--check');
const datos = JSON.parse(fs.readFileSync(path.join(raiz, 'data', 'ofertas.json'), 'utf8'));

const hoy = new Date();
hoy.setHours(0, 0, 0, 0);

function esPasado(iso) {
  if (!iso) return false;
  const d = new Date(iso + 'T00:00:00');
  return !isNaN(d) && d < hoy;
}
function escapar(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ---- Reglas derivadas: nadie tiene que acordarse de bajar una fecha vencida ---- */

// Una fecha que ya pasó deja de venderse sola.
if (esPasado(datos.tapeo.fecha_iso)) {
  datos.tapeo.estado = 'sin-fecha';
  datos.tapeo.fecha_texto = 'Sin fecha confirmada';
  datos.tapeo.fecha_iso = '';
}
for (const [id, t] of Object.entries(datos.talleres)) {
  if (esPasado(t.fecha_iso)) {
    t.estado = 'sin-fecha';
    t.fecha_texto = 'Sin fecha confirmada';
    t.fecha_iso = '';
  }
  t.id = id;
}
for (const g of datos.curso.grupos) {
  if (esPasado(g.inicio_iso) && g.estado !== 'cerrado') g.estado = 'cerrado';
}

/* ---- Campos calculados ---- */

const t = datos.tapeo;
const libres = Number(t.cupos_disponibles);
const total = Number(t.cupos_total);
if (t.cupos_disponibles !== null && t.cupos_disponibles !== '') {
  if (t.estado === 'abierto' && libres <= 0) t.estado = 'agotado';
  if (t.estado === 'abierto' && libres > 0 && libres <= 4) t.estado = 'ultimos';
}

var cuposConocidos = t.cupos_disponibles !== null && t.cupos_disponibles !== '';
t.cupos_texto =
  t.estado === 'agotado' ? 'Sin lugares disponibles' :
  !cuposConocidos ? 'Solo ' + total + ' lugares · consultanos disponibilidad' :
  t.estado === 'ultimos' ? (libres === 1 ? 'Queda 1 lugar' : 'Quedan ' + libres + ' lugares') :
  t.estado === 'abierto' ? 'Quedan ' + libres + ' de ' + total + ' lugares' :
  'Solo ' + total + ' lugares';

t.estado_texto =
  t.estado === 'agotado' ? 'Agotado' :
  t.estado === 'ultimos' ? 'Últimos lugares' :
  t.estado === 'abierto' ? 'Inscripciones abiertas' :
  'Próxima fecha a confirmar';

t.precio_texto = t.precio || '';
t.tiene_precio = t.precio ? 'si' : 'no';
t.horario_texto = t.hora && t.hora_fin ? t.hora + ' a ' + t.hora_fin + ' h' : (t.hora || '');

// El WhatsApp cambia según haya fecha o no: nunca pide reservar algo que no existe.
const waBase = 'https://wa.me/59894064148?text=';
t.wa_link = waBase + encodeURIComponent(
  t.estado === 'sin-fecha' || t.estado === 'agotado'
    ? 'Hola, me interesa la Cena y Taller de Tapeo. Avisame cuando abran la próxima fecha.'
    : 'Hola, quiero reservar para la Cena y Taller de Tapeo del ' + t.fecha_texto + '. Somos [cantidad] personas.'
);
t.wa_texto =
  t.estado === 'sin-fecha' ? 'Avisame la próxima fecha →' :
  t.estado === 'agotado'   ? 'Avisame si se libera un lugar →' :
  'Reservar mi lugar →';

t.resumen_texto =
  t.estado === 'sin-fecha' ? 'sin fecha abierta por ahora; las fechas se publican según la demanda' :
  t.estado === 'agotado'   ? 'fecha ' + t.fecha_texto + ', sin lugares disponibles' :
  'próxima fecha ' + t.fecha_texto + ', ' + t.horario_texto + (t.precio ? ', ' + t.precio : '') + ', ' + t.cupos_texto.toLowerCase();

// Si hay link de venta online, ese es el botón principal: se paga solo,
// sin esperar respuesta por WhatsApp. El WhatsApp queda como segunda opción.
t.cta_link = t.link_compra || t.wa_link;
t.cta_texto =
  !t.link_compra ? t.wa_texto :
  t.estado === 'agotado' ? 'Ver si se libera un lugar →' :
  'Comprar mi entrada →';
t.tiene_segunda = t.segunda_fecha && t.segunda_fecha.texto ? 'si' : 'no';
t.segunda_texto = t.segunda_fecha && t.segunda_fecha.texto
  ? '¿No podés ese día? También hay fecha el ' + t.segunda_fecha.texto + '.'
  : '';
t.segunda_link = (t.segunda_fecha && t.segunda_fecha.link) || '';

t.menu_html = t.menu.map(function (x) { return '<li>' + escapar(x) + '</li>'; }).join('');
t.recorrido_html = t.recorrido.map(function (p, i) {
  return '<li class="paso"><span class="paso-num">' + (i + 1) + '</span>' +
         '<span class="paso-que">' + escapar(p.que) + '</span>' +
         '<span class="paso-detalle">' + escapar(p.detalle) + '</span></li>';
}).join('');

// Link para agregar la fecha al calendario, con los datos reales.
function linkCalendario(titulo, iso, horaIni, horaFin, detalle) {
  if (!iso) return '';
  const stamp = function (h) { return iso.replace(/-/g, '') + 'T' + h.replace(':', '') + '00'; };
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: titulo,
    dates: stamp(horaIni) + '/' + stamp(horaFin),
    details: detalle,
    location: 'Clorofila, Maldonado 1976 esq. Blanes, Parque Rodó, Montevideo',
    ctz: 'America/Montevideo'
  });
  return 'https://calendar.google.com/calendar/render?' + q.toString();
}

t.calendario = linkCalendario('Cena y Taller de Tapeo — Clorofila', t.fecha_iso, t.hora, t.hora_fin,
  'Cocinamos juntos y después cenamos todo lo que preparamos. Clorofila, Parque Rodó.');

/* Cada taller usa exactamente las mismas reglas que el tapeo. */
for (const [id, w] of Object.entries(datos.talleres)) {
  if (id.startsWith('_')) { delete datos.talleres[id]; continue; }
  const libresW = Number(w.cupos_disponibles);
  if (w.estado === 'abierto' && libresW <= 0) w.estado = 'agotado';
  if (w.estado === 'abierto' && libresW > 0 && libresW <= 3) w.estado = 'ultimos';

  w.estado_texto =
    w.estado === 'agotado' ? 'Agotado' :
    w.estado === 'ultimos' ? 'Últimos lugares' :
    w.estado === 'abierto' ? 'Fecha abierta' :
    'Sin fecha por ahora';

  // Una sola línea con lo que decide la compra: cuándo y cuánto.
  w.linea = w.estado === 'sin-fecha'
    ? (w.linea_sin_fecha || 'Se abre según la demanda — dejá tu interés y te avisamos.')
    : [w.fecha_texto, w.hora, w.precio].filter(Boolean).join(' · ');

  w.wa_link = waBase + encodeURIComponent(
    w.estado === 'sin-fecha' || w.estado === 'agotado'
      ? 'Hola, me interesa el taller de ' + w.nombre + '. Avisame cuando abran fecha.'
      : 'Hola, quiero reservar un lugar en el taller de ' + w.nombre + ' del ' + w.fecha_texto + '.'
  );
  w.wa_texto =
    w.estado === 'sin-fecha' ? 'Avisame cuando haya fecha →' :
    w.estado === 'agotado'   ? 'Avisame si se libera un lugar →' :
    'Reservar mi lugar →';

  w.cta_link = (w.estado !== 'sin-fecha' && w.link_compra) ? w.link_compra : w.wa_link;
  w.cta_texto = (w.estado !== 'sin-fecha' && w.link_compra) ? 'Comprar mi entrada →' : w.wa_texto;
  if (w.segunda_fecha && w.segunda_fecha.texto && w.estado !== 'sin-fecha') {
    w.linea += ' · también el ' + w.segunda_fecha.texto;
  }
}

const abiertos = datos.curso.grupos.filter(function (g) { return g.estado === 'abierto'; });
datos.curso.grupos_abiertos_texto = abiertos.length
  ? abiertos.map(function (g) { return g.nombre + ' ' + g.horario.replace(' a ', '–').replace(' h', ''); }).join(' · ')
  : 'Próxima edición a confirmar';
datos.curso.inicio_texto = abiertos.length ? abiertos[0].inicio_texto : 'Próxima edición a confirmar';
datos.curso.inicio_iso = abiertos.length ? abiertos[0].inicio_iso : '';
datos.curso.calendario = abiertos.length
  ? linkCalendario('Primera clase — Curso de Clorofila', abiertos[0].inicio_iso,
      abiertos[0].horario.split(' a ')[0], abiertos[0].horario.split(' a ')[1].replace(' h', ''),
      'Primera clase del curso de tres meses de Clorofila, en Parque Rodó.')
  : '';
datos.curso.estado = abiertos.length ? 'abierto' : 'sin-fecha';

// Cuando no hay edición abierta, la web deja de pedir una inscripción que no
// existe y pasa sola a juntar lista de espera. Nadie tiene que acordarse.
datos.curso.cta_texto = abiertos.length ? 'Reservar mi lugar →' : 'Sumate a la lista de espera →';
datos.curso.cta_nota = abiertos.length
  ? 'Grupos reducidos · te escribimos por WhatsApp en menos de 24h para confirmar tu lugar'
  : 'No hay edición abierta ahora. Dejanos tus datos y sos de los primeros en enterarte cuando abramos la próxima.';
datos.curso.titulo_reserva_html = abiertos.length
  ? 'Reservá tu <em style="color:var(--verde-luz)">lugar</em>.'
  : 'Avisame de la <em style="color:var(--verde-luz)">próxima edición</em>.';
for (const g of datos.curso.grupos) {
  datos.curso['grupo_' + g.id + '_estado_texto'] = g.estado === 'abierto' ? 'Abierto' : 'Grupo cerrado';
  datos.curso['grupo_' + g.id + '_inicio'] = g.inicio_texto;
}

/* ---- Agenda: lo que se puede comprar hoy, ordenado por fecha ---- */
const agenda = [];
if (t.estado !== 'sin-fecha' && t.fecha_iso) {
  agenda.push({
    iso: t.fecha_iso, nombre: 'Cena y Taller de Tapeo', fecha: t.fecha_texto,
    hora: t.horario_texto, precio: t.precio, estado: t.estado,
    etiqueta: t.estado_texto, link: 'tapeo.html', cta: 'Ver la experiencia →'
  });
  if (t.segunda_fecha && t.segunda_fecha.texto) {
    agenda.push({
      iso: (t.segunda_fecha.iso || t.fecha_iso) + '-b', nombre: 'Cena y Taller de Tapeo',
      fecha: t.segunda_fecha.texto, hora: t.horario_texto, precio: t.precio,
      estado: 'abierto', etiqueta: 'Segunda fecha', link: 'tapeo.html', cta: 'Ver la experiencia →'
    });
  }
}
for (const [id, w] of Object.entries(datos.talleres)) {
  if (w.estado === 'sin-fecha' || !w.fecha_iso) continue;
  agenda.push({
    iso: w.fecha_iso, nombre: w.nombre, fecha: w.fecha_texto, hora: w.hora,
    precio: w.precio, estado: w.estado, etiqueta: w.estado_texto,
    link: 'talleres.html#' + id, cta: 'Ver el taller →'
  });
  if (w.segunda_fecha && w.segunda_fecha.texto) {
    agenda.push({
      iso: w.fecha_iso + '-b', nombre: w.nombre, fecha: w.segunda_fecha.texto,
      hora: w.hora, precio: w.precio, estado: 'abierto', etiqueta: 'Segunda fecha',
      link: 'talleres.html#' + id, cta: 'Ver el taller →'
    });
  }
}
agenda.sort(function (a, b) { return a.iso < b.iso ? -1 : 1; });

datos.agenda_html = agenda.map(function (e) {
  return '<li class="agenda-item" data-estado="' + e.estado + '">' +
    '<span class="agenda-etiqueta">' + escapar(e.etiqueta) + '</span>' +
    '<p class="agenda-nombre">' + escapar(e.nombre) + '</p>' +
    '<p class="agenda-cuando">' + escapar(e.fecha) + (e.hora ? ' · ' + escapar(e.hora) : '') + '</p>' +
    (e.precio ? '<p class="agenda-precio">' + escapar(e.precio) + '</p>' : '') +
    '<a href="' + e.link + '" class="agenda-link" data-producto="agenda">' + escapar(e.cta) + '</a>' +
    '</li>';
}).join('');
datos.tiene_agenda = agenda.length ? 'si' : 'no';

/* ---- Reemplazo en los HTML ---- */

function valor(ruta) {
  return ruta.split('.').reduce(function (o, k) {
    return (o === undefined || o === null) ? undefined : o[k];
  }, datos);
}

const archivos = fs.readdirSync(raiz).filter(function (f) { return f.endsWith('.html'); });
let cambiados = [];
let errores = [];

for (const archivo of archivos) {
  const ruta = path.join(raiz, archivo);
  const original = fs.readFileSync(ruta, 'utf8');

  let salida = original.replace(
    /<!--o:(html:)?([a-zA-Z0-9_.\-]+)-->[\s\S]*?<!--\/o-->/g,
    function (_m, esHtml, ruta_) {
      const v = valor(ruta_);
      if (v === undefined) {
        errores.push(archivo + ': no existe "' + ruta_ + '" en ofertas.json');
        return _m;
      }
      const contenido = esHtml ? String(v) : escapar(v);
      return '<!--o:' + (esHtml || '') + ruta_ + '-->' + contenido + '<!--/o-->';
    }
  );

  // El estado se escribe en el mismo tag, sin importar qué otros atributos haya.
  salida = salida.replace(
    /data-estado-de="([a-zA-Z0-9_.\-]+)"([\s\S]*?)(?=>)/g,
    function (_m, ruta_, resto) {
      const obj = valor(ruta_);
      if (!obj) errores.push(archivo + ': no existe "' + ruta_ + '" en ofertas.json');
      const estado = obj && obj.estado ? obj.estado : 'sin-fecha';
      const limpio = resto.replace(/\s+data-estado="[^"]*"/g, '');
      return 'data-estado-de="' + ruta_ + '" data-estado="' + estado + '"' + limpio;
    }
  );

  // data-set="attr=ruta" o varios separados por ";"
  salida = salida.replace(
    /data-set="([^"]+)"([\s\S]*?)(?=>)/g,
    function (_m, pares, resto) {
      let limpio = resto;
      const escritos = [];
      pares.split(';').forEach(function (par) {
        const trozos = par.split('=');
        if (trozos.length !== 2) return;
        const attr = trozos[0].trim();
        const ruta_ = trozos[1].trim();
        const v = valor(ruta_);
        if (v === undefined) {
          errores.push(archivo + ': no existe "' + ruta_ + '" en ofertas.json');
          return;
        }
        limpio = limpio.replace(new RegExp('\\s+' + attr + '="[^"]*"'), '');
        escritos.push(attr + '="' + escapar(v) + '"');
      });
      return 'data-set="' + pares + '" ' + escritos.join(' ') + limpio;
    }
  );

  /* --- JSON-LD: la ficha que ve Google sale del mismo JSON que la página --- */
  salida = salida.replace(
    /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g,
    function (_m, abre, cuerpo, cierra) {
      let ld;
      try { ld = JSON.parse(cuerpo); } catch (e) {
        errores.push(archivo + ': JSON-LD inválido, no se pudo actualizar');
        return _m;
      }
      let tocado = false;
      (function recorrer(nodo) {
        if (Array.isArray(nodo)) return nodo.forEach(recorrer);
        if (!nodo || typeof nodo !== 'object') return;

        // Curso: cada grupo se ofrece solo si sigue abierto.
        if (nodo['@type'] === 'CourseInstance' && nodo.startDate && nodo.offers) {
          const grupo = datos.curso.grupos.find(function (g) { return g.inicio_iso === nodo.startDate; });
          if (grupo) {
            nodo.offers.availability = grupo.estado === 'abierto'
              ? 'https://schema.org/InStock'
              : 'https://schema.org/SoldOut';
            tocado = true;
          }
        }

        // Tapeo: fecha, precio y disponibilidad reales, o ninguna oferta si no hay fecha.
        if (nodo['@id'] === 'https://clorofila.uy/tapeo#evento') {
          const t = datos.tapeo;
          if (t.estado === 'sin-fecha' || !t.fecha_iso) {
            delete nodo.startDate;
            delete nodo.endDate;
            delete nodo.offers;
            nodo.eventStatus = 'https://schema.org/EventPostponed';
          } else {
            nodo.startDate = t.fecha_iso + 'T' + t.hora + ':00-03:00';
            nodo.endDate = t.fecha_iso + 'T' + t.hora_fin + ':00-03:00';
            nodo.eventStatus = 'https://schema.org/EventScheduled';
            nodo.maximumAttendeeCapacity = Number(t.cupos_total);
            // Sin precio cargado no publicamos oferta: una Offer sin price
            // es un error para los validadores de Google.
            if (t.precio_num) {
              nodo.offers = {
                '@type': 'Offer',
                url: 'https://clorofila.uy/tapeo',
                priceCurrency: 'UYU',
                price: String(t.precio_num),
                availability: t.estado === 'agotado'
                  ? 'https://schema.org/SoldOut'
                  : 'https://schema.org/InStock'
              };
            } else {
              delete nodo.offers;
            }
          }
          tocado = true;
        }

        Object.keys(nodo).forEach(function (k) { recorrer(nodo[k]); });
      })(ld);

      if (!tocado) return _m;
      return abre + '\n  ' + JSON.stringify(ld) + '\n  ' + cierra;
    }
  );

  if (salida !== original) {
    cambiados.push(archivo);
    if (!CHECK) fs.writeFileSync(ruta, salida);
  }
}

/* --- llms.txt (el resumen que leen los buscadores de IA) sale de su plantilla --- */
{
  const tmpl = fs.readFileSync(path.join(raiz, 'partials', 'llms.txt.tmpl'), 'utf8');
  const generado = tmpl.replace(/\{\{([a-zA-Z0-9_.\-]+)\}\}/g, function (_m, ruta_) {
    const v = valor(ruta_);
    if (v === undefined) { errores.push('llms.txt.tmpl: no existe "' + ruta_ + '" en ofertas.json'); return _m; }
    return String(v);
  });
  const rutaLlms = path.join(raiz, 'llms.txt');
  const actual = fs.existsSync(rutaLlms) ? fs.readFileSync(rutaLlms, 'utf8') : '';
  if (actual !== generado) {
    cambiados.push('llms.txt');
    if (!CHECK) fs.writeFileSync(rutaLlms, generado);
  }
}

if (errores.length) {
  console.error('✗ render-ofertas: ' + errores.length + ' problema(s):');
  errores.forEach(function (e) { console.error('  - ' + e); });
  process.exit(1);
}

if (CHECK) {
  if (cambiados.length) {
    console.error('✗ El HTML no coincide con data/ofertas.json. Corré: npm run ofertas');
    cambiados.forEach(function (f) { console.error('  - ' + f); });
    process.exit(1);
  }
  console.log('✓ El HTML está al día con data/ofertas.json');
} else {
  console.log(cambiados.length
    ? '✓ Ofertas aplicadas en: ' + cambiados.join(', ')
    : '✓ Ofertas ya estaban al día');
}
