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
let datos;
try {
  datos = JSON.parse(fs.readFileSync(path.join(raiz, 'data', 'ofertas.json'), 'utf8'));
} catch (e) {
  // Este archivo lo edita quien publica las fechas, no quien programa. Sin este
  // mensaje, un error de tipeo corta el deploy de Netlify con un stack trace.
  console.error('✗ No se pudo leer data/ofertas.json: ' + e.message);
  console.error('  Suele ser una coma de más, una coma que falta o unas comillas sin cerrar.');
  console.error('  Paso a paso: docs/editar-ofertas.md');
  process.exit(1);
}

const hoy = new Date();
hoy.setHours(0, 0, 0, 0);

function esPasado(iso) {
  if (!iso) return false;
  const d = new Date(iso + 'T00:00:00');
  return !isNaN(d) && d < hoy;
}
/* El día de la semana y la fecha viven dos veces: una como ISO (que es lo
   que lee Google) y otra escrita a mano ("jueves 3 de septiembre"). Si se
   cambia una y no la otra, la página anuncia un día y el schema otro, y no
   se nota hasta que alguien llega el día equivocado. Acá se comparan. */
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function revisarFecha(donde, iso, texto) {
  if (!iso || !texto) return;
  // "setiembre" y "septiembre" conviven en Uruguay: las dos valen.
  const t = String(texto).toLowerCase().replace('setiembre', 'septiembre');
  const m = t.match(/(domingo|lunes|martes|miércoles|jueves|viernes|sábado)\s+(\d{1,2})\s+de\s+([a-zé]+)/);
  if (!m) return; // Textos sin fecha escrita ("Sin fecha confirmada") no se controlan.

  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) {
    console.error('✗ Fecha inválida en data/ofertas.json (' + donde + '): "' + iso + '"');
    console.error('  Tiene que ser AAAA-MM-DD, por ejemplo 2026-10-07.');
    process.exit(1);
  }
  const esperado = DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()];
  const escrito = m[1] + ' ' + Number(m[2]) + ' de ' + m[3];
  if (esperado !== escrito) {
    console.error('✗ La fecha escrita no coincide con la fecha real en data/ofertas.json (' + donde + ')');
    console.error('  El texto dice: "' + escrito + '"');
    console.error('  Pero ' + iso + ' cae ' + esperado + '.');
    console.error('  Corregí el texto, o el ISO si el que está mal es él.');
    process.exit(1);
  }
}

function escapar(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* Los links también salen del JSON, y hasta ahora entraban crudos al href.
   Una comilla de más (pasa al copiar un link con parámetros) rompía el
   atributo y desarmaba el HTML de la página; un esquema como javascript:
   convertiría el botón de compra en código ejecutable. Ante un link que no
   se entiende se corta el build: mejor no publicar que publicar roto. */
function enlace(u) {
  const url = String(u == null ? '' : u).trim();
  if (!url) return '';
  const valido = /^(https?:\/\/|mailto:|tel:|\/|#)/.test(url) || /^[a-zA-Z0-9._-]+\.html(#.*)?$/.test(url);
  if (!valido) {
    console.error('✗ Link inválido en data/ofertas.json: "' + url + '"');
    console.error('  Tiene que empezar con https://, mailto:, tel:, / o # , o ser una página del sitio (curso.html).');
    process.exit(1);
  }
  return escapar(url);
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
const total = Number(t.cupos_total);

// No se publica cuantos lugares quedan: es un dato que depende de que
// alguien lo actualice a mano. Se muestra el cupo total, que es fijo.
t.cupos_texto = t.estado === 'agotado' ? 'Sin lugares disponibles' : 'Solo ' + total + ' lugares';

t.estado_texto =
  t.estado === 'agotado' ? 'Agotado' :
  t.estado === 'ultimos' ? 'Últimos lugares' :
  t.estado === 'abierto' ? 'Inscripciones abiertas' :
  'Próxima fecha a confirmar';

t.precio_texto = t.precio || '';
// Sin fecha confirmada no se muestra precio: no está garantizado para la
// próxima edición aunque haya quedado cargado el de la anterior.
t.tiene_precio = (t.estado !== 'sin-fecha' && t.precio) ? 'si' : 'no';
// Hay fecha publicada o no: lo usa /talleres para marcar en el índice
// cuáles se pueden comprar hoy.
t.tiene_fecha = (t.estado !== 'sin-fecha' && t.fecha_texto) ? 'si' : 'no';
t.horario_texto = t.hora && t.hora_fin ? t.hora + ' a ' + t.hora_fin + ' h' : (t.hora || '');

// Una sola línea con lo que decide la reserva, igual que los talleres. En
// /experiencias esta línea se armaba a mano concatenando fecha, hora y precio,
// así que sin fecha publicaba "Sin fecha confirmada · 19:00 a 22:30 h · $2.600
// por persona": justo el precio que la regla de arriba dice no publicar.
t.linea = t.estado === 'sin-fecha'
  ? 'Las fechas se publican según la demanda — escribinos y te avisamos.'
  : [t.fecha_texto, t.horario_texto, t.precio_texto].filter(Boolean).join(' · ');

// El WhatsApp cambia según haya fecha o no: nunca pide reservar algo que no existe.
/* Se controla todo lo que tenga fecha antes de dibujar nada. */
revisarFecha('tapeo', datos.tapeo.fecha_iso, datos.tapeo.fecha_texto);
if (datos.tapeo.segunda_fecha) revisarFecha('tapeo.segunda_fecha', datos.tapeo.segunda_fecha.iso, datos.tapeo.segunda_fecha.texto);
Object.keys(datos.talleres).forEach(function (k) {
  const t = datos.talleres[k];
  if (!t || typeof t !== 'object') return;
  revisarFecha('talleres.' + k, t.fecha_iso, t.fecha_texto);
  if (t.segunda_fecha) revisarFecha('talleres.' + k + '.segunda_fecha', t.segunda_fecha.iso, t.segunda_fecha.texto);
});
datos.curso.grupos.forEach(function (g) {
  revisarFecha('curso.grupos.' + g.id, g.inicio_iso, g.inicio_texto);
  // El nombre del grupo es el día en que se cursa: tiene que ser ese día.
  const d = new Date(g.inicio_iso + 'T00:00:00');
  if (!isNaN(d) && g.nombre && DIAS[d.getDay()] !== String(g.nombre).toLowerCase()) {
    console.error('✗ El grupo "' + g.nombre + '" arranca un ' + DIAS[d.getDay()] + ' (' + g.inicio_iso + ')');
    console.error('  El nombre del grupo tiene que ser el día en que se cursa.');
    process.exit(1);
  }
});

const waBase = 'https://wa.me/59894064148?text=';
t.wa_link = waBase + encodeURIComponent(
  t.estado === 'sin-fecha' || t.estado === 'agotado'
    ? 'Hola Leonardo, me interesa la Cena y Taller de Tapeo. Avisame cuando abran la próxima fecha.'
    : 'Hola Leonardo, quiero reservar para la Cena y Taller de Tapeo del ' + t.fecha_texto + '. Somos [cantidad] personas.'
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
// Sin fecha, el link de venta de la edición anterior queda mudo: se ignora
// aunque siga en el JSON, para no vender una entrada que ya no existe.
// "jueves 3 de septiembre" -> "jueves 3", para que entre en un botón.
function fechaCorta(texto) {
  if (!texto) return '';
  const partes = String(texto).trim().split(/\s+/);
  return partes.slice(0, 2).join(' ');
}

t.cta_link = (t.estado !== 'sin-fecha' && t.link_compra) ? t.link_compra : t.wa_link;
t.tiene_segunda = t.segunda_fecha && t.segunda_fecha.texto ? 'si' : 'no';
// Con dos fechas a la venta, el botón tiene que decir cuál está comprando:
// el link va siempre a la primera, y sin la aclaración se compra la otra sin querer.
t.cta_texto =
  (t.estado === 'sin-fecha' || !t.link_compra) ? t.wa_texto :
  t.estado === 'agotado' ? 'Ver si se libera un lugar →' :
  t.tiene_segunda === 'si' ? 'Comprar · ' + fechaCorta(t.fecha_texto) + ' →' :
  'Comprar mi entrada →';
t.segunda_texto = t.segunda_fecha && t.segunda_fecha.texto
  ? '¿No podés ese día? También hay fecha el ' + t.segunda_fecha.texto + '.'
  : '';
t.segunda_link = (t.segunda_fecha && t.segunda_fecha.link) || '';

// Cuando hay dos fechas, se muestran como opciones para elegir, no como
// una nota al pie: son dos productos a la venta, no un detalle.
function listaFechas(o, sufijo) {
  if (o.estado === 'sin-fecha' || !o.fecha_texto) return '';
  var items = [
    '<li><a href="' + enlace(o.link_compra || o.wa_link) + '" target="_blank" rel="noopener noreferrer" data-producto="' + sufijo + '">' +
      '<strong>' + escapar(o.fecha_texto) + '</strong>' +
      '<span>' + escapar([o.horario_texto, o.cupos_texto].filter(Boolean).join(' · ')) + '</span></a></li>'
  ];
  if (o.segunda_fecha && o.segunda_fecha.texto) {
    items.push('<li><a href="' + enlace(o.segunda_fecha.link || o.wa_link) + '" target="_blank" rel="noopener noreferrer" data-producto="' + sufijo + '">' +
      '<strong>' + escapar(o.segunda_fecha.texto) + '</strong>' +
      '<span>' + escapar(o.horario_texto) + '</span></a></li>');
  }
  return items.join('');
}
t.fechas_html = listaFechas(t, 'tapeo');

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
      ? 'Hola Leonardo, me interesa el taller de ' + w.nombre + '. Avisame cuando abran fecha.'
      : 'Hola Leonardo, quiero reservar un lugar en el taller de ' + w.nombre + ' del ' + w.fecha_texto + '.'
  );
  w.wa_texto =
    w.estado === 'sin-fecha' ? 'Avisame cuando haya fecha →' :
    w.estado === 'agotado'   ? 'Avisame si se libera un lugar →' :
    'Reservar mi lugar →';

  w.cupos_texto = w.estado === 'agotado' ? 'Sin lugares disponibles'
                : (w.cupos_total ? 'Solo ' + w.cupos_total + ' lugares' : 'Cupos limitados');
  w.horario_texto = w.hora || '';
  w.precio_texto = w.precio || '';
  w.tiene_precio = (w.estado !== 'sin-fecha' && w.precio) ? 'si' : 'no';
  w.tiene_fecha = (w.estado !== 'sin-fecha' && w.fecha_texto) ? 'si' : 'no';
  w.tiene_segunda = (w.segunda_fecha && w.segunda_fecha.texto) ? 'si' : 'no';
  w.segunda_texto = (w.segunda_fecha && w.segunda_fecha.texto)
    ? '¿No podés ese día? También hay fecha el ' + w.segunda_fecha.texto + '.' : '';
  w.segunda_link = (w.segunda_fecha && w.segunda_fecha.link) || '';

  w.fechas_html = listaFechas(w, 'taller-' + id);
  w.cta_link = (w.estado !== 'sin-fecha' && w.link_compra) ? w.link_compra : w.wa_link;
  w.cta_texto = (w.estado !== 'sin-fecha' && w.link_compra)
    ? (w.tiene_segunda === 'si' ? 'Comprar · ' + fechaCorta(w.fecha_texto) + ' →' : 'Comprar mi entrada →')
    : w.wa_texto;
  if (w.segunda_fecha && w.segunda_fecha.texto && w.estado !== 'sin-fecha') {
    w.linea += ' · también el ' + w.segunda_fecha.texto;
  }
}

const abiertos = datos.curso.grupos.filter(function (g) { return g.estado === 'abierto'; });
datos.curso.grupos_abiertos_texto = abiertos.length
  ? abiertos.map(function (g) { return g.nombre + ' ' + g.horario.replace(' a ', '–').replace(' h', ''); }).join(' · ')
  : 'Próxima edición a confirmar';
datos.curso.inicio_texto = abiertos.length ? abiertos[0].inicio_texto : 'Próxima edición a confirmar';
// La etiqueta de esa fila estaba escrita a mano como "Grupo abierto": con dos
// grupos quedaba en singular, y sin ninguno anunciaba un grupo abierto que no
// existe ("Grupo abierto: Próxima edición a confirmar").
datos.curso.grupos_label = abiertos.length === 0 ? 'Grupos'
  : abiertos.length === 1 ? 'Grupo abierto' : 'Grupos abiertos';
// La tabla de horarios de /contacto se generaba a mano y quedó publicando los
// días de una edición ya terminada. Ahora sale de los grupos abiertos.
// "3 cuotas de $4.800" -> "3 de $4.800": la etiqueta de la comanda ya dice "En cuotas".
datos.curso.cuotas_corto = String(datos.curso.precio_cuotas || '').replace(' cuotas ', ' ');
datos.curso.horarios_html = abiertos.length
  ? abiertos.map(function (g) {
      return '<tr><th scope="row">' + escapar(g.nombre) + '</th><td>' +
        escapar(g.horario.replace(' a ', ' – ')) + '</td></tr>';
    }).join('')
  : '<tr><td colspan="2">La próxima edición todavía no tiene fecha.</td></tr>';
datos.curso.inicio_iso = abiertos.length ? abiertos[0].inicio_iso : '';
datos.curso.calendario = abiertos.length
  ? linkCalendario('Primera clase — Curso de Clorofila', abiertos[0].inicio_iso,
      abiertos[0].horario.split(' a ')[0], abiertos[0].horario.split(' a ')[1].replace(' h', ''),
      'Primera clase del curso de tres meses de Clorofila, en Parque Rodó.')
  : '';
datos.curso.estado = abiertos.length ? 'abierto' : 'sin-fecha';

// Cuando no hay edición abierta, la web deja de pedir una inscripción que no
// existe y pasa sola a juntar lista de espera. Nadie tiene que acordarse.
datos.curso.cta_texto = abiertos.length ? 'Reservar mi lugar →' : 'Avisarme de la próxima edición →';
// Con edición abierta se reserva por WhatsApp, que es como se reserva de verdad.
// Sin edición abierta, el formulario pasa a ser la lista de espera.
datos.curso.cta_link = abiertos.length
  ? waBase + encodeURIComponent(abiertos.length === 1
      ? 'Hola Leonardo, quiero reservar mi lugar en el curso, en el grupo de los ' +
        String(abiertos[0].nombre).toLowerCase() + ' de ' + abiertos[0].horario.replace(' h', '') + '.'
      : 'Hola Leonardo, quiero reservar mi lugar en el curso. Me interesa el grupo de los ' +
        abiertos.map(function (g) {
          return String(g.nombre).toLowerCase() + ' de ' + g.horario.replace(' h', '');
        }).join(' o el de los ') + '.')
  : 'https://tally.so/r/EkMbWL';
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

// Los bloques de grupo se dibujan solos. Antes estaban escritos a mano, uno por
// día, así que cambiar de edición obligaba a editar curso.html y a acordarse de
// los placeholders de cada id: si un grupo desaparecía del JSON, el build se
// caía por un `curso.grupo_martes_inicio` que ya no existía.
datos.curso.grupos_html = datos.curso.grupos.map(function (g) {
  return '<article class="grupo" data-estado="' + escapar(g.estado) + '">' +
    '<p class="grupo-estado">' + escapar(g.estado === 'abierto' ? 'Abierto' : 'Grupo cerrado') + '</p>' +
    '<p class="grupo-dia">' + escapar(g.nombre) + '</p>' +
    '<p class="grupo-hora">' + escapar(g.horario) + '</p>' +
    '<p class="grupo-inicio">' + escapar(g.inicio_texto) + '</p>' +
    (g.detalle ? '<p class="grupo-detalle">' + escapar(g.detalle) + '</p>' : '') +
    /* Cada grupo abierto reserva por su cuenta. Con un botón único para los
       dos, el mensaje llegaba diciendo "me interesa el grupo de Miércoles ·
       Jueves" y había que preguntar cuál era antes de poder confirmar nada. */
    (g.estado === 'abierto'
      ? '<a class="grupo-cta" href="' + enlace(waBase + encodeURIComponent(
          'Hola Leonardo, quiero reservar mi lugar en el curso, en el grupo de los ' +
          String(g.nombre).toLowerCase() + ' de ' + g.horario.replace(' h', '') + '.')) +
        '" target="_blank" rel="noopener noreferrer" data-producto="curso">' +
        'Reservar este grupo →</a>'
      : '') +
    '</article>';
}).join('');

// Textos que nombraban los días a mano ("martes y miércoles o sábados").
function enumerar(lista) {
  if (lista.length <= 1) return lista.join('');
  return lista.slice(0, -1).join(', ') + ' y ' + lista[lista.length - 1];
}
const nombres = datos.curso.grupos.map(function (g) { return g.nombre; });
datos.curso.horarios_texto = nombres.join(' · ');
datos.curso.dias_texto = enumerar(nombres.map(function (n) { return n.toLowerCase(); }));
datos.curso.edicion_titulo = 'Edición ' + String(datos.curso.edicion).toLowerCase();
datos.curso.inscripcion_titulo = 'Inscripción · ' + datos.curso.edicion;
datos.curso.porclase_texto = '3 meses · ' + datos.curso.dias_texto + ' · 12 encuentros semanales';

// La cantidad de horarios se dice en palabras, y cambia si son dos o tres.
const cuantos = { 1: 'un horario', 2: 'dos horarios', 3: 'tres horarios' }[nombres.length]
  || nombres.length + ' horarios';
datos.curso.intro_grupos = abiertos.length
  ? 'El mismo programa en ' + cuantos + '. Los grupos son chicos a propósito, para que puedas cocinar, preguntar y que Leonardo te corrija a vos.'
  : 'El mismo programa en ' + cuantos + '. Los grupos de esta edición ya arrancaron. Son chicos a propósito, para que puedas cocinar, preguntar y que Leonardo te corrija a vos.';

// El cierre cambia entero según haya edición abierta o no.
datos.curso.cierre_titulo_html = abiertos.length
  ? 'Empezá en<br>' + escapar(String(datos.curso.edicion).toLowerCase()) + '.'
  : 'La edición de ' + escapar(String(datos.curso.edicion).split(' ')[0].toLowerCase()) + '<br>ya arrancó.';
datos.curso.cierre_bajada = abiertos.length
  ? 'Escribinos por WhatsApp y coordinamos tu lugar: contesta Leonardo, no un formulario.'
  : 'Los grupos de esta edición ya empezaron. Dejanos tus datos y sos de los primeros en enterarte cuando abramos la próxima: contesta Leonardo, no un formulario.';

// El resumen que leen los modelos de lenguaje en llms.txt. Antes decía a mano
// "los grupos de martes y miércoles ya empezaron", que quedó falso apenas
// cambió la edición.
datos.curso.resumen_grupos = abiertos.length
  ? (abiertos.length === 1 ? 'Grupo abierto: ' : 'Grupos abiertos: ') +
    datos.curso.grupos_abiertos_texto + '. ' + datos.curso.inicio_texto + '.'
  : 'Los grupos de esta edición ya empezaron: se puede dejar el mail para avisar de la próxima.';

// La FAQ de la cursada se arma con los grupos reales, para que no quede
// prometiendo horarios de una edición que ya pasó.
datos.curso.faq_cursada = 'Son 3 meses de cursada, 12 clases semanales por grupo. Elegís entre ' +
  datos.curso.grupos.map(function (g) {
    return g.nombre.toLowerCase() + ' de ' + g.horario.replace(' h', '') + ', que arranca el ' +
      g.inicio_texto.toLowerCase().replace(/^arranca el /, '');
  }).join(', o ') + '.';

/* El chip decía "3 modalidades" a mano: quedó de la edición de agosto, que
   tenía tres grupos. Pero además la palabra estaba mal: lo que hay son
   horarios del mismo curso -miércoles a la mañana y jueves a la noche, los dos
   semanales de 12 encuentros- y "modalidades" hacía esperar programas
   distintos. La intensiva de 6 clases existe, pero es otra edición y ya
   empezó; la de los sábados es del año que viene. Ninguna de las dos se vende
   hoy, así que la página no las nombra. */
datos.curso.horarios_chip = '3 meses · ' + nombres.length +
  (nombres.length === 1 ? ' horario' : ' horarios');

// El FAQ prometía "tenés tres horarios y te movés entre ellos". Con una sola
// modalidad no hay a dónde moverse, así que la respuesta cambia entera.
datos.curso.faq_cambio_grupo = nombres.length > 1
  ? 'Sí, y pasa seguido. Tenés ' + cuantos + ' y te movés entre ellos mientras haya lugar. ' +
    'Si te cambia el trabajo o te surge un viaje, avisanos y te reubicamos: nadie pierde el ' +
    'curso por un cambio de agenda.'
  : 'Esta edición tiene un solo horario, así que no hay otro grupo al que pasarte. Si se te ' +
    'complica una clase puntual avisanos y la recuperás: nadie pierde contenido por un cambio de agenda.';

/* ---- Agenda: lo que se puede comprar hoy, ordenado por fecha ---- */
const agenda = [];
if (t.estado !== 'sin-fecha' && t.fecha_iso) {
  agenda.push({
    iso: t.fecha_iso, nombre: 'Cena y Taller de Tapeo', fecha: t.fecha_texto,
    hora: t.horario_texto, precio: t.precio, estado: t.estado,
    etiqueta: t.estado_texto, link: '/tapeo', cta: 'Ver la experiencia →'
  });
  if (t.segunda_fecha && t.segunda_fecha.texto) {
    agenda.push({
      iso: (t.segunda_fecha.iso || t.fecha_iso) + '-b', nombre: 'Cena y Taller de Tapeo',
      fecha: t.segunda_fecha.texto, hora: t.horario_texto, precio: t.precio,
      estado: 'abierto', etiqueta: 'Segunda fecha', link: '/tapeo', cta: 'Ver la experiencia →'
    });
  }
}
for (const [id, w] of Object.entries(datos.talleres)) {
  // "publicar": false lo deja fuera del sitio aunque tenga fecha cargada. El
  // Domingo de Buncheo se coordina por Instagram y WhatsApp y no tiene bloque
  // propio en /talleres: sin esto, cargarle una fecha lo haría aparecer en la
  // agenda con un link a un ancla que no existe.
  if (w.publicar === false) continue;
  if (w.estado === 'sin-fecha' || !w.fecha_iso) continue;
  agenda.push({
    iso: w.fecha_iso, nombre: w.nombre, fecha: w.fecha_texto, hora: w.hora,
    precio: w.precio, estado: w.estado, etiqueta: w.estado_texto,
    link: (id === 'pastas-sin-gluten') ? '/pastas' : '/talleres#' + id, cta: 'Ver el taller →'
  });
  if (w.segunda_fecha && w.segunda_fecha.texto) {
    agenda.push({
      iso: (w.segunda_fecha.iso || w.fecha_iso) + '-b', nombre: w.nombre, fecha: w.segunda_fecha.texto,
      hora: w.hora, precio: w.precio, estado: 'abierto', etiqueta: 'Segunda fecha',
      link: (id === 'pastas-sin-gluten') ? '/pastas' : '/talleres#' + id, cta: 'Ver el taller →'
    });
  }
}
// El curso es lo primero que se vende y no estaba en la agenda: la home
// mostraba "lo que se puede reservar hoy" sin el producto principal, que tiene
// la edición de octubre abierta.
if (abiertos.length) {
  agenda.push({
    iso: abiertos[0].inicio_iso, nombre: 'Curso de cocina saludable',
    cuenta: abiertos[0].inicio_iso,
    fecha: datos.curso.inicio_texto, hora: datos.curso.dias_texto,
    precio: datos.curso.precio_total, estado: 'abierto',
    etiqueta: datos.curso.grupos_label, link: '/curso', cta: 'Ver el curso →'
  });
}

// El tapeo aparece aunque no tenga fecha, para que la experiencia exista en la
// home todo el año. Sin fecha va al final y dice que no la tiene: la agenda no
// promete un día que no está.
if (t.estado === 'sin-fecha' || !t.fecha_iso) {
  agenda.push({
    iso: '9999-12-31', nombre: 'Cena y Taller de Tapeo',
    fecha: 'Se abre según la demanda', hora: '', precio: '',
    estado: 'sin-fecha', etiqueta: t.estado_texto,
    link: '/tapeo', cta: 'Avisame la próxima fecha →'
  });
}

agenda.sort(function (a, b) { return a.iso < b.iso ? -1 : 1; });

datos.agenda_html = agenda.map(function (e) {
  /* Si el ítem tiene fecha de inicio, la etiqueta pasa a ser la cuenta
     regresiva cuando corre el JS ("Empieza en 6 semanas"). El renglón de abajo
     sigue diciendo el día exacto, así que no se pierde información. */
  return '<li class="agenda-item" data-estado="' + e.estado + '"' +
    (e.cuenta ? ' data-inicio-iso="' + escapar(e.cuenta) + '"' : '') + '>' +
    '<span class="agenda-etiqueta"' + (e.cuenta ? ' data-cuenta' : '') + '>' +
      escapar(e.etiqueta) + '</span>' +
    '<p class="agenda-nombre">' + escapar(e.nombre) + '</p>' +
    '<p class="agenda-cuando">' + escapar(e.fecha) + (e.hora ? ' · ' + escapar(e.hora) : '') + '</p>' +
    /* El precio ya se juntaba acá arriba y no se imprimía: la agenda decía qué
       y cuándo, pero no cuánto, y ese es de los tres el que más se busca. Ya
       está publicado en cada página; acá solo se muestra un clic antes. Lo que
       no tiene fecha tampoco tiene precio, y ahí no se escribe nada. */
    (e.precio ? '<p class="agenda-precio">' + escapar(e.precio) + '</p>' : '') +
    '<a href="' + enlace(e.link) + '" class="agenda-link" data-producto="agenda">' + escapar(e.cta) + '</a>' +
    '</li>';
}).join('');
datos.tiene_agenda = agenda.length ? 'si' : 'no';

/* ---- El menú del tapeo, en versión corta para el inicio ----
   En /tapeo los platos van completos ("Gyozas de hongos y verduras con salsa
   teriyaki"). En el inicio no entra esa lista, pero decir "masas, rellenos,
   salsas y encurtidos" -que es lo que decía- no le abre el apetito a nadie.
   Se recortan por "con" y "sobre", que es donde empieza el acompañamiento, y
   salen del mismo array: si cambia el menú, cambian los dos lados. */
if (Array.isArray(datos.tapeo.menu) && datos.tapeo.menu.length) {
  const cortos = datos.tapeo.menu.map(function (plato, i) {
    const corto = String(plato).split(/ con | sobre /)[0].trim();
    return i === 0 ? corto : corto.charAt(0).toLowerCase() + corto.slice(1);
  });
  datos.tapeo.menu_corto = cortos.length > 1
    ? cortos.slice(0, -1).join(', ') + ' y ' + cortos[cortos.length - 1]
    : cortos[0];
}

/* ---- La tira de talleres del inicio ----
   Estaban escritos a mano: los cinco se veían igual aunque solo uno tuviera
   fecha, y si se abría una nueva el inicio no se enteraba. Ahora salen del
   mismo JSON, con el que se puede comprar primero y con su fecha a la vista.
   Los que no tienen fecha siguen apareciendo, porque la página los ofrece
   igual: lo que cambia es que ya no se confunden con el que sí se vende. */
{
  const conFecha = [];
  const sinFecha = [];
  for (const [id, w] of Object.entries(datos.talleres)) {
    if (w.publicar === false || !w.nombre) continue;
    const destino = (id === 'pastas-sin-gluten') ? '/pastas' : '/talleres#' + id;
    const abierto = w.estado !== 'sin-fecha' && w.fecha_iso;
    (abierto ? conFecha : sinFecha).push(
      '<a href="' + enlace(destino) + '"' + (abierto ? ' data-estado="abierto"' : '') + '>' +
      '<span>' + escapar(w.nombre_corto || w.nombre) + '</span>' +
      (abierto ? '<small>' + escapar(w.fecha_texto) + '</small>' : '') +
      '</a>'
    );
  }
  datos.talleres_tira_html = conFecha.concat(sinFecha).join('') +
    '<a href="/talleres" class="btn-linea" style="padding:1rem 1.1rem">Ver todos los talleres →</a>';
}

/* ---- A dónde lleva "Experiencias" en el menú ----
   Una categoría con un solo ítem no es una categoría: es un escalón de más.
   Se midió: /experiencias tuvo 1 visita de 9 segundos en un mes, mientras 7
   personas entraron al tapeo por links directos. Así que mientras haya una
   sola experiencia publicada, el menú lleva derecho a ella; cuando haya dos o
   más, vuelve solo a llevar a la lista. Hoy la única experiencia es el tapeo;
   si mañana se agregan otras, se suman acá y la cuenta se ajusta sola. */
{
  var experiencias = [];
  if (datos.tapeo && datos.tapeo.publicar !== false) experiencias.push('/tapeo');
  datos.menu_experiencias = experiencias.length === 1 ? experiencias[0] : '/experiencias';
}

/* ---- Reseñas de Google ---- */
// El puntaje y la cantidad estaban escritos a mano en seis lugares de tres
// páginas más la ficha de Google. Al entrar una reseña nueva había que
// acordarse de los seis: ahora salen de acá.
{
  const g = datos.google;
  // Este archivo lo edita quien publica, no quien programa. El error probable
  // acá es escribir el puntaje con coma ("4,9"), porque así se ve en la web:
  // la página quedaría bien pero la ficha de Google publicaría un ratingValue
  // inválido, y nadie se enteraría. Mejor cortar el build que publicar roto.
  if (!g || typeof g !== 'object') {
    console.error('✗ Falta el bloque "google" en data/ofertas.json (puntaje y reseñas).');
    process.exit(1);
  }
  if (typeof g.puntaje !== 'number' || !(g.puntaje >= 0 && g.puntaje <= 5)) {
    console.error('✗ google.puntaje tiene que ser un número entre 0 y 5, con punto: 4.9');
    console.error('  Está escrito así: ' + JSON.stringify(g.puntaje));
    process.exit(1);
  }
  if (!Number.isInteger(g.resenas) || g.resenas < 0) {
    console.error('✗ google.resenas tiene que ser un número entero: 21');
    console.error('  Está escrito así: ' + JSON.stringify(g.resenas));
    process.exit(1);
  }
  // Siempre un decimal: si se carga 5, se publica "5,0" y no "5".
  const puntaje = g.puntaje.toFixed(1);
  g.puntaje_schema = puntaje;
  // En el sitio el puntaje se escribe con coma, como se lee en español.
  g.puntaje_texto = puntaje.replace('.', ',');
  g.resenas_texto = g.resenas + (Number(g.resenas) === 1 ? ' reseña' : ' reseñas') + ' en Google';
  g.linea_texto = '\u2605 ' + g.puntaje_texto + ' \u00b7 ' + g.resenas_texto + ' \u2192';
  g.chip_texto = '\u2605 ' + g.puntaje_texto + ' \u00b7 ' + g.resenas +
    (Number(g.resenas) === 1 ? ' reseña' : ' reseñas');
  g.chip_corto = '\u2605 ' + g.puntaje_texto + ' en Google';
}

/* ---- Testimonios ---- */
/* Estaban escritos a mano en el HTML de tres páginas y no existían en el schema,
   aunque el spec de junio los daba por hechos. Se generan las dos cosas desde
   acá: es el último dato del sitio que estaba duplicado, y hoy ya aparecieron
   cuatro casos de un dato a mano contradiciendo a su versión estructurada. */
{
  const T = datos.testimonios;
  if (!T || !Array.isArray(T.lista)) {
    console.error('✗ Falta el bloque "testimonios" en data/ofertas.json.');
    process.exit(1);
  }
  const porId = {};
  T.lista.forEach(function (t) { porId[t.id] = t; });

  Object.keys(T.paginas).forEach(function (pagina) {
    const ids = T.paginas[pagina];
    const elegidos = ids.map(function (id) {
      if (!porId[id]) {
        console.error('✗ testimonios.paginas.' + pagina + ' nombra "' + id + '", que no está en la lista.');
        process.exit(1);
      }
      return porId[id];
    });

    // /tapeo maqueta cada testimonio con otra clase y en varias líneas.
    const esTapeo = pagina === 'tapeo';
    T[pagina + '_html'] = elegidos.map(function (t) {
      const cuerpo = '<p class="estrellas">★★★★★</p>' +
        '<blockquote>«' + escapar(t.cita) + '»</blockquote>' +
        '<cite>' + escapar(t.nombre) + ' · ' + escapar(t.contexto) + '</cite>';
      return esTapeo
        ? '<div class="testi">' + cuerpo + '</div>'
        : '<div class="voz">' + cuerpo + '</div>';
    }).join(esTapeo ? '' : '');

    /* Solo se publican como reseña propia las de quienes pasaron por Clorofila.
       Las que dicen "reseña en Google" ya las cuenta Google en el puntaje del
       perfil: republicarlas como nuestras va contra sus reglas. */
    T[pagina + '_reviews'] = elegidos.filter(function (t) { return t.propio; })
      .map(function (t) {
        return {
          '@type': 'Review',
          author: { '@type': 'Person', name: t.nombre },
          reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
          reviewBody: t.cita
        };
      });
  });
}

/* ---- Reemplazo en los HTML ---- */

function valor(ruta) {
  return ruta.split('.').reduce(function (o, k) {
    return (o === undefined || o === null) ? undefined : o[k];
  }, datos);
}

// Los artículos entran también: comparten el nav y el pie con el resto del
// sitio, así que un dato que cambia en el menú tiene que cambiar en los 27.
const archivos = fs.readdirSync(raiz).filter(function (f) { return f.endsWith('.html'); })
  .concat(fs.existsSync(path.join(raiz, 'articulos'))
    ? fs.readdirSync(path.join(raiz, 'articulos'))
        .filter(function (f) { return f.endsWith('.html'); })
        .map(function (f) { return path.join('articulos', f); })
    : []);
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
        // href y src son links: pasan por la misma validación de esquema que el
        // resto, así el botón de compra no puede terminar siendo javascript:.
        const esLink = attr === 'href' || attr === 'src';
        escritos.push(attr + '="' + (esLink ? enlace(v) : escapar(v)) + '"');
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

        /* Las reseñas viajan junto al puntaje: van en el mismo nodo que ya
           lleva aggregateRating (la Organization en el home, el Course en
           /curso), que es lo que Google espera para mostrar las estrellas. */
        if (nodo.aggregateRating && nodo.aggregateRating['@type'] === 'AggregateRating') {
          const pag = archivo === 'index.html' ? 'index'
            : archivo === 'curso.html' ? 'curso' : null;
          const revs = pag && datos.testimonios[pag + '_reviews'];
          if (revs && revs.length) { nodo.review = revs; tocado = true; }
        }

        // El puntaje de Google que se publica en la ficha es el mismo que se
        // muestra en la página: sale de data/ofertas.json, no de acá.
        if (nodo.aggregateRating && nodo.aggregateRating['@type'] === 'AggregateRating') {
          nodo.aggregateRating.ratingValue = datos.google.puntaje_schema;
          nodo.aggregateRating.reviewCount = String(datos.google.resenas);
          tocado = true;
        }

        // Curso: la lista de grupos que ve Google se rehace desde ofertas.json.
        // Antes cada CourseInstance estaba escrito a mano y solo se actualizaba
        // si su startDate coincidía con un grupo: al cambiar de edición, los
        // grupos viejos quedaban publicados con la fecha y el precio de antes.
        if (nodo['@type'] === 'Course' && Array.isArray(nodo.hasCourseInstance)) {
          const molde = nodo.hasCourseInstance[0] || {};
          nodo.hasCourseInstance = datos.curso.grupos.map(function (g) {
            const inst = JSON.parse(JSON.stringify(molde));
            inst.name = 'Grupo ' + g.nombre.toLowerCase() + ' ' + g.horario.replace(' a ', '-').replace(' h', '');
            inst.startDate = g.inicio_iso;
            if (inst.offers) {
              inst.offers.availability = g.estado === 'abierto'
                ? 'https://schema.org/InStock'
                : 'https://schema.org/SoldOut';
              inst.offers.price = String(datos.curso.precio_total).replace(/[^\d]/g, '');
            }
            return inst;
          });
          tocado = true;
        }

        // Lo mismo con "¿puedo cambiarme de grupo?": prometía tres horarios.
        if (nodo['@type'] === 'Question' && /cambiarme de grupo/i.test(nodo.name || '') &&
            nodo.acceptedAnswer && datos.curso.faq_cambio_grupo) {
          nodo.acceptedAnswer.text = datos.curso.faq_cambio_grupo;
          tocado = true;
        }

        // La respuesta de "cómo se organiza la cursada" que ve Google sale de
        // los mismos grupos que la página, para que no queden desfasadas.
        if (nodo['@type'] === 'Question' && /organiza la cursada/i.test(nodo.name || '') &&
            nodo.acceptedAnswer && datos.curso.faq_cursada) {
          nodo.acceptedAnswer.text = datos.curso.faq_cursada;
          tocado = true;
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

        // Pastas sin gluten: mismo tratamiento que el evento de tapeo.
        if (nodo['@id'] === 'https://clorofila.uy/pastas#evento') {
          const w = datos.talleres['pastas-sin-gluten'];
          if (w.estado === 'sin-fecha' || !w.fecha_iso) {
            delete nodo.startDate;
            delete nodo.endDate;
            delete nodo.offers;
            nodo.eventStatus = 'https://schema.org/EventPostponed';
          } else {
            nodo.startDate = w.fecha_iso + 'T' + w.hora_inicio + ':00-03:00';
            nodo.endDate = w.fecha_iso + 'T' + w.hora_fin + ':00-03:00';
            nodo.eventStatus = 'https://schema.org/EventScheduled';
            nodo.maximumAttendeeCapacity = Number(w.cupos_total);
            if (w.precio_num) {
              nodo.offers = {
                '@type': 'Offer',
                url: 'https://clorofila.uy/pastas',
                priceCurrency: 'UYU',
                price: String(w.precio_num),
                availability: w.estado === 'agotado'
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

      /* Un taller con dos fechas se vendía como un solo evento: la segunda
         tiene su propia entrada en Tikzet, pero Google solo veía la primera.
         Se declara como un evento aparte, con su fecha y su link de compra. */
      if (Array.isArray(ld['@graph'])) {
        const w = datos.talleres['pastas-sin-gluten'];
        const base = ld['@graph'].find(function (n) {
          return n && n['@id'] === 'https://clorofila.uy/pastas#evento';
        });
        const yaEsta = ld['@graph'].some(function (n) {
          return n && n['@id'] === 'https://clorofila.uy/pastas#evento-2';
        });
        const hay = w && w.estado !== 'sin-fecha' && w.segunda_fecha &&
          w.segunda_fecha.iso && w.segunda_fecha.link;
        if (base && hay && !yaEsta) {
          const seg = JSON.parse(JSON.stringify(base));
          seg['@id'] = 'https://clorofila.uy/pastas#evento-2';
          seg.startDate = w.segunda_fecha.iso + 'T' + w.hora_inicio + ':00-03:00';
          seg.endDate = w.segunda_fecha.iso + 'T' + w.hora_fin + ':00-03:00';
          if (seg.offers) seg.offers.url = w.segunda_fecha.link;
          ld['@graph'].push(seg);
          tocado = true;
        } else if (base && !hay && yaEsta) {
          // Se cerró la segunda fecha: el evento deja de publicarse.
          ld['@graph'] = ld['@graph'].filter(function (n) {
            return !n || n['@id'] !== 'https://clorofila.uy/pastas#evento-2';
          });
          tocado = true;
        }
      }

      if (!tocado) return _m;
      return abre + '\n  ' + JSON.stringify(ld) + '\n  ' + cierra;
    }
  );

  if (salida !== original) {
    cambiados.push(archivo);
    if (!CHECK) fs.writeFileSync(ruta, salida);
  }
}

/* --- La lista de artículos para llms.txt sale de los archivos, no de una lista
   a mano: la plantilla nombraba cuatro de los once y el artículo nuevo de B12
   no figuraba. Son las respuestas que un modelo puede citar. --- */
{
  const dir = path.join(raiz, 'articulos');
  const arts = fs.readdirSync(dir).filter(function (f) { return f.endsWith('.html'); }).sort();
  datos.articulos_lista = arts.map(function (f) {
    const html = fs.readFileSync(path.join(dir, f), 'utf8');
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    const titulo = h1 ? h1[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : f;
    return '- [' + titulo + '](https://clorofila.uy/articulos/' + f.replace(/\.html$/, '') + ')';
  }).join('\n');
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
