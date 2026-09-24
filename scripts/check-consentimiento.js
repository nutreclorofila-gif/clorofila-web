#!/usr/bin/env node
// Qué se mide, y cuándo, según lo que la persona haya decidido en el cartel
// de cookies. Es la parte del sitio donde una línea de más manda datos de un
// visitante sin permiso, y donde un orden equivocado borra visitas del panel.
// Del 7/9 al 23/9/2026 Analytics se cargaba en modo anónimo antes de que la
// persona decidiera: esos avisos no aparecían en ningún informe, y quien
// aceptaba perdía su visita de llegada (first_visit bajó de 74 a 28 en dos
// semanas). La regla es: nada hasta aceptar, y el permiso antes que gtag.
//
// Corre consent.js con un navegador simulado, porque en local el propio
// script se apaga a propósito (solo mide en clorofila.uy) y ahí no se puede
// ver ninguna de estas ramas.
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const codigo = fs.readFileSync(path.join(__dirname, '..', 'consent.js'), 'utf8');

function correr(guardado, hostname = 'clorofila.uy') {
  const scripts = [];
  const almacen = { cookieConsent: guardado };
  const doc = {
    head: { appendChild(s) { scripts.push(s.src); } },
    createElement: () => ({ set src(v) { this._s = v; }, get src() { return this._s; } }),
    getElementsByTagName: () => [{ parentNode: { insertBefore(t) { scripts.push(t.src); } } }],
    createEvent: () => ({ initEvent() {} }),
  };
  const eventos = [];
  const win = {
    location: { hostname },
    localStorage: {
      getItem: (k) => (k in almacen ? almacen[k] : null),
      setItem: (k, v) => { almacen[k] = v; },
    },
    document: doc,
    addEventListener() {},
    dispatchEvent: (e) => eventos.push(e.type || 'analytics:listo'),
    Event: function (t) { this.type = t; },
  };
  win.window = win;
  const ctx = vm.createContext(win);
  vm.runInContext(codigo, ctx);
  // Se leen en vivo: loadAnalytics() puede llamarse despues de esta funcion.
  return {
    get consent() { return (win.dataLayer || []).filter((a) => a[0] === 'consent').map((a) => [a[1], a[2]]); },
    get sets() { return (win.dataLayer || []).filter((a) => a[0] === 'set').map((a) => a[1] + '=' + a[2]); },
    get scripts() { return scripts.map((s) => (String(s).includes('googletagmanager') ? 'GA' : String(s).includes('facebook') ? 'META' : s)); },
    eventos,
    aceptar: win.loadAnalytics,
    win,
  };
}

let fallas = 0;
let total = 0;
const check = (nombre, ok, detalle) => {
  total++;
  console.log((ok ? '  ok   ' : '  FALLA') + '  ' + nombre + (ok ? '' : '  → ' + JSON.stringify(detalle)));
  if (!ok) fallas++;
};

console.log('\n1) Nadie tocó el cartel (el 68% de las visitas)');
let r = correr(null);
check('declara los cuatro permisos denegados', JSON.stringify(r.consent[0]) === JSON.stringify(['default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' }]), r.consent);
check('conserva el gclid y recorta datos de anuncios', r.sets.join(',') === 'ads_data_redaction=true,url_passthrough=true', r.sets);
check('no carga nada hasta que decida', r.scripts.length === 0, r.scripts);
check('no avisa a track.js', r.eventos.length === 0, r.eventos);

console.log('\n2) Apretó "Rechazar"');
r = correr('declined');
check('no carga nada', r.scripts.length === 0, r.scripts);
check('los permisos quedan denegados', r.consent.length === 1 && r.consent[0][0] === 'default', r.consent);
check('no avisa a track.js', r.eventos.length === 0, r.eventos);

console.log('\n3) Apretó "Aceptar" (visita anterior)');
r = correr('accepted');
check('levanta los cuatro permisos', JSON.stringify(r.consent[1]) === JSON.stringify(['update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' }]), r.consent);
check('el "denied" va antes que el "granted"', r.consent[0][0] === 'default' && r.consent[1][0] === 'update', r.consent.map((c) => c[0]));
check('carga Analytics y Meta', r.scripts.join(',') === 'GA,META', r.scripts);

console.log('\n4) Acepta durante la visita (hasta ahí no se medía nada)');
r = correr(null);
const antes = r.scripts.slice();
r.aceptar();
check('antes no había nada cargado', antes.length === 0, antes);
check('ahora carga Analytics y Meta', r.scripts.join(',') === 'GA,META', r.scripts);
// Si el "granted" llega después del config, el primer page_view sale sin
// cookies y la visita de llegada se pierde: es lo que pasó del 7/9 al 23/9.
const capa = r.win.dataLayer.map((a) => a[0] + (a[0] === 'consent' ? ':' + a[1] : ''));
check('el permiso llega antes que la primera visita medida', capa.indexOf('consent:update') > -1 && capa.indexOf('consent:update') < capa.indexOf('config'), capa);
check('avisa a track.js una vez', r.eventos.length === 1, r.eventos);
r.aceptar();
check('apretar dos veces no duplica nada', r.scripts.join(',') === 'GA,META', r.scripts);

console.log('\n5) En local y en las previews no se mide');
r = correr(null, 'localhost');
check('no carga nada fuera de produccion', r.scripts.length === 0, r.scripts);

// ---------------------------------------------------------------------------
// consent.js, track.js y el script de /gracias juntos, en el orden en que los
// corre el navegador: el script de /gracias va en línea (corre al leer la
// página) y los otros dos son defer. Del 23/9 hacia atrás el aviso de
// "analytics listo" salía antes de crear fbq: track.js vaciaba su cola sin
// píxel y se perdían el ViewContent de la llegada y el Schedule de /gracias.
const raiz = path.join(__dirname, '..');
const codigoTrack = fs.readFileSync(path.join(raiz, 'track.js'), 'utf8');
const htmlGracias = fs.readFileSync(path.join(raiz, 'gracias.html'), 'utf8');
const enLinea = [...htmlGracias.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const codigoGracias = enLinea.find((c) => c.includes('reserva_recibida'));

function pagina({ ruta, busqueda = '', producto, sinVista = false, conGracias = false, sesion = {}, referrer = '' }) {
  const oyentes = {};
  const almacen = {};
  const atributos = { 'data-producto': producto };
  if (sinVista) atributos['data-sin-vista'] = '';
  const nodo = () => ({ textContent: '', classList: { add() {} }, querySelector: () => null, getAttribute: () => null, remove() {} });
  const doc = {
    referrer,
    body: {
      getAttribute: (k) => (k in atributos ? atributos[k] : null),
      setAttribute: (k, v) => { atributos[k] = v; },
      hasAttribute: (k) => k in atributos,
    },
    head: { appendChild() {} },
    createElement: () => ({}),
    getElementsByTagName: () => [{ parentNode: { insertBefore() {} } }],
    createEvent: () => ({ initEvent() {} }),
    querySelector: nodo,
    querySelectorAll: () => [],
    addEventListener() {},
  };
  const guardado = (obj) => ({
    getItem: (k) => (k in obj ? obj[k] : null),
    setItem: (k, v) => { obj[k] = String(v); },
    removeItem: (k) => { delete obj[k]; },
  });
  const win = {
    location: { hostname: 'clorofila.uy', search: busqueda, pathname: ruta },
    localStorage: guardado(almacen),
    sessionStorage: guardado(sesion),
    document: doc,
    URLSearchParams,
    URL,
    console,
    addEventListener: (t, f) => { (oyentes[t] = oyentes[t] || []).push(f); },
    dispatchEvent: (e) => { (oyentes[e.type] || []).forEach((f) => f(e)); },
    Event: function (t) { this.type = t; },
  };
  win.window = win;
  const ctx = vm.createContext(win);
  if (conGracias) vm.runInContext(codigoGracias, ctx);
  vm.runInContext(codigo, ctx);
  vm.runInContext(codigoTrack, ctx);
  return {
    win,
    almacen,
    sesion,
    get meta() { return win.fbq ? win.fbq.queue.map((a) => a[0] + ':' + a[1]) : []; },
    get ga() { return (win.dataLayer || []).filter((a) => a[0] === 'event').map((a) => a[1] + (a[2] && a[2].method ? '/' + a[2].method : '')); },
  };
}

console.log('\n6) Llega a /curso, acepta en esa misma página');
let p = pagina({ ruta: '/curso', busqueda: '?gclid=PRUEBA', producto: 'curso' });
check('antes de aceptar no guarda el origen', !('clorofila_origen' in p.almacen), p.almacen);
p.win.loadAnalytics();
check('Meta recibe la vista de producto (ViewContent)', p.meta.includes('track:ViewContent'), p.meta);
check('Analytics recibe la vista de producto', p.ga.includes('view_producto'), p.ga);
check('el gclid queda anotado como google_ads', /google_ads/.test(p.almacen.clorofila_origen || ''), p.almacen);

console.log('\n6b) Acepta recién en la segunda página del sitio');
p = pagina({ ruta: '/tapeo', producto: 'tapeo', referrer: 'https://clorofila.uy/curso' });
p.win.loadAnalytics();
check('no guarda un origen vacío que tape al próximo', !('clorofila_origen' in p.almacen), p.almacen);

console.log('\n7) /gracias?p=tapeo, acepta ahí');
p = pagina({ ruta: '/gracias', busqueda: '?p=tapeo', producto: 'gracias', sinVista: true, conGracias: true });
p.win.loadAnalytics();
check('Meta recibe la reserva (Schedule)', p.meta.includes('track:Schedule'), p.meta);
check('Analytics recibe reserva_recibida', p.ga.includes('reserva_recibida'), p.ga);
check('/gracias no cuenta como vista de producto', !p.ga.includes('view_producto') && !p.meta.includes('track:ViewContent'), p.ga);
const sesion = p.sesion;
p = pagina({ ruta: '/gracias', busqueda: '?p=tapeo', producto: 'gracias', sinVista: true, conGracias: true, sesion });
p.win.loadAnalytics();
check('al recargar no se cuenta otra vez', !p.ga.includes('reserva_recibida') && !p.meta.includes('track:Schedule'), p.ga);

console.log('\n8) /gracias sin ?p= (pidió el temario)');
p = pagina({ ruta: '/gracias', producto: 'gracias', sinVista: true, conGracias: true });
p.win.loadAnalytics();
check('no cuenta como reserva', !p.ga.includes('reserva_recibida') && !p.meta.includes('track:Schedule'), p.ga);
check('cuenta como pedido de temario', p.ga.includes('generate_lead/temario'), p.ga);

console.log(
  fallas
    ? '\n✗ consentimiento: ' + fallas + ' comprobación(es) fallan. Revisá consent.js.\n'
    : 'consentimiento: ' + total + ' comprobaciones, se mide lo que corresponde en cada caso.'
);
process.exit(fallas ? 1 : 0);
