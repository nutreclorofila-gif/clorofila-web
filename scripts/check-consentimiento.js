#!/usr/bin/env node
// Qué se mide, y cuándo, según lo que la persona haya decidido en el cartel
// de cookies. Es la parte del sitio donde una línea de más manda datos de un
// visitante sin permiso, y donde un orden equivocado borra visitas del panel.
// La regla, desde el 7/10/2026: Google (Analytics y la medición de Ads) mide
// a todos salvo a quien aprieta "Rechazar"; Meta, solo con "Aceptar". Y el permiso se
// declara antes que gtag: del 7/9 al 23/9 llegaba después, y quien aceptaba
// perdía su visita de llegada (first_visit bajó de 74 a 28 en dos semanas).
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
  const galletas = [];
  const doc = {
    get cookie() { return '_ga=GA1.1.1; _ga_BBLJT4TYCV=GS1; otra=1'; },
    set cookie(v) { galletas.push(v); },
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
    rechazar: win.rechazarAnalytics,
    galletas,
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

console.log('\n1) Nadie tocó el cartel (dos de cada tres visitas)');
let r = correr(null);
check('los cuatro permisos de Google concedidos', JSON.stringify(r.consent[0]) === JSON.stringify(['default', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' }]), r.consent);
check('conserva el gclid y recorta datos de anuncios si se deniegan', r.sets.join(',') === 'ads_data_redaction=true,url_passthrough=true', r.sets);
check('carga Analytics y no Meta', r.scripts.join(',') === 'GA', r.scripts);
check('avisa a track.js solo por Analytics', r.eventos.join(',') === 'analytics:listo', r.eventos);
// Si el permiso llega después del config, el primer page_view sale sin
// cookies y la visita de llegada se pierde: es lo que pasó del 7/9 al 23/9.
let capa = r.win.dataLayer.map((a) => a[0] + (a[0] === 'consent' ? ':' + a[1] : ''));
check('el permiso está declarado antes de la primera visita medida', capa.indexOf('consent:default') > -1 && capa.indexOf('consent:default') < capa.indexOf('config'), capa);

console.log('\n2) Apretó "Rechazar" (visita anterior)');
r = correr('declined');
check('los cuatro permisos denegados', JSON.stringify(r.consent) === JSON.stringify([['default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' }]]), r.consent);
check('no carga nada', r.scripts.length === 0, r.scripts);
check('no avisa a track.js', r.eventos.length === 0, r.eventos);

console.log('\n3) Apretó "Aceptar" (visita anterior)');
r = correr('accepted');
check('levanta los cuatro permisos', JSON.stringify(r.consent[1]) === JSON.stringify(['update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' }]), r.consent);
capa = r.win.dataLayer.map((a) => a[0] + (a[0] === 'consent' ? ':' + a[1] : ''));
check('los permisos van antes que la primera visita medida', capa.indexOf('consent:update') > -1 && capa.indexOf('consent:update') < capa.indexOf('config'), capa);
check('carga Analytics y Meta', r.scripts.join(',') === 'GA,META', r.scripts);
check('avisa por Analytics y por Meta', r.eventos.join(',') === 'analytics:listo,meta:listo', r.eventos);

console.log('\n4) Acepta durante la visita (Analytics ya medía)');
r = correr(null);
r.aceptar();
check('suma Meta sin cargar Analytics otra vez', r.scripts.join(',') === 'GA,META', r.scripts);
check('confirma los cuatro permisos', JSON.stringify(r.consent[1]) === JSON.stringify(['update', { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' }]), r.consent);
check('un solo config de Analytics', r.win.dataLayer.filter((a) => a[0] === 'config').length === 1, r.win.dataLayer.length);
check('avisa a Meta una vez', r.eventos.join(',') === 'analytics:listo,meta:listo', r.eventos);
r.aceptar();
check('apretar dos veces no duplica nada', r.scripts.join(',') === 'GA,META' && r.eventos.length === 2, [r.scripts, r.eventos]);

console.log('\n4b) Rechaza durante la visita (Analytics ya medía)');
r = correr(null);
r.rechazar();
check('baja los cuatro permisos', JSON.stringify(r.consent[1]) === JSON.stringify(['update', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' }]), r.consent);
check('apaga Analytics en esta página', r.win['ga-disable-G-BBLJT4TYCV'] === true, Object.keys(r.win));
check('borra las cookies de Analytics y ninguna otra', r.galletas.length === 4 && r.galletas.every((g) => /^_ga(_BBLJT4TYCV)?=; expires=Thu, 01 Jan 1970/.test(g)), r.galletas);
check('no carga Meta', r.scripts.join(',') === 'GA', r.scripts);

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

function pagina({ ruta, busqueda = '', producto, sinVista = false, conGracias = false, sesion = {}, referrer = '', decision = null }) {
  const oyentes = {};
  const almacen = decision ? { cookieConsent: decision } : {};
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

console.log('\n6) Llega a /curso sin contestar el aviso, acepta en esa misma página');
let p = pagina({ ruta: '/curso', busqueda: '?gclid=PRUEBA', producto: 'curso' });
check('Analytics recibe la vista de producto al llegar', p.ga.includes('view_producto'), p.ga);
const vista = p.win.dataLayer.find((x) => x[0] === 'event' && x[1] === 'view_producto');
check('la vista lleva actividad=curso', vista && vista[2].actividad === 'curso', vista && vista[2]);
check('el gclid queda anotado como google_ads', /google_ads/.test(p.almacen.clorofila_origen || ''), p.almacen);
check('Meta no recibe nada antes de aceptar', p.meta.length === 0, p.meta);
p.win.loadAnalytics();
check('al aceptar, Meta recibe la vista de producto (ViewContent)', p.meta.includes('track:ViewContent'), p.meta);
check('Analytics no la recibe dos veces', p.ga.filter((e) => e === 'view_producto').length === 1, p.ga);

console.log('\n6b) Acepta recién en la segunda página del sitio');
p = pagina({ ruta: '/tapeo', producto: 'tapeo', referrer: 'https://clorofila.uy/curso' });
p.win.loadAnalytics();
check('no guarda un origen vacío que tape al próximo', !('clorofila_origen' in p.almacen), p.almacen);

console.log('\n6c) Había rechazado en otra visita');
p = pagina({ ruta: '/curso', busqueda: '?gclid=PRUEBA', producto: 'curso', decision: 'declined' });
check('Analytics no recibe nada', p.ga.length === 0, p.ga);
check('Meta no recibe nada', p.meta.length === 0, p.meta);
check('no guarda el origen', !('clorofila_origen' in p.almacen), p.almacen);

console.log('\n6d) Rechazó, llegó por un anuncio y escribe por WhatsApp desde otra página');
const sesionAds = {};
p = pagina({ ruta: '/curso', busqueda: '?gclid=PRUEBA', producto: 'curso', decision: 'declined', sesion: sesionAds });
check('no guarda el origen', !('clorofila_origen' in p.almacen), p.almacen);
check('anota solo que vino de Ads, en la sesión', JSON.stringify(sesionAds) === '{"clorofila_vino_de_ads":"1"}', sesionAds);

console.log('\n7) /gracias?p=tapeo sin contestar el aviso, acepta ahí');
p = pagina({ ruta: '/gracias', busqueda: '?p=tapeo', producto: 'gracias', sinVista: true, conGracias: true });
check('Analytics recibe reserva_recibida al llegar', p.ga.includes('reserva_recibida'), p.ga);
p.win.loadAnalytics();
check('al aceptar, Meta recibe la reserva (Schedule)', p.meta.includes('track:Schedule'), p.meta);
check('Analytics no la cuenta dos veces', p.ga.filter((e) => e === 'reserva_recibida').length === 1, p.ga);
check('/gracias no cuenta como vista de producto', !p.ga.includes('view_producto') && !p.meta.includes('track:ViewContent'), p.ga);
const sesion = p.sesion;
p = pagina({ ruta: '/gracias', busqueda: '?p=tapeo', producto: 'gracias', sinVista: true, conGracias: true, sesion, decision: 'accepted' });
check('al recargar no se cuenta otra vez', !p.ga.includes('reserva_recibida') && !p.meta.includes('track:Schedule'), [p.ga, p.meta]);

console.log('\n7b) /gracias?p=curso, había aceptado en otra visita');
p = pagina({ ruta: '/gracias', busqueda: '?p=curso', producto: 'gracias', sinVista: true, conGracias: true, decision: 'accepted' });
check('Analytics y Meta reciben la reserva', p.ga.includes('reserva_recibida') && p.meta.includes('track:Schedule'), [p.ga, p.meta]);

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
