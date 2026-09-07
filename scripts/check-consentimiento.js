#!/usr/bin/env node
// Qué se mide, y cuándo, según lo que la persona haya decidido en el cartel
// de cookies. Es la parte del sitio donde una línea de más manda datos de un
// visitante sin permiso, y donde una de menos borra dos tercios de las
// visitas del panel: hasta el 7/9/2026 Analytics solo arrancaba al aceptar,
// y en una semana Ads cobró 41 clics donde Analytics vio 13.
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
const check = (nombre, ok, detalle) => {
  console.log((ok ? '  ok   ' : '  FALLA') + '  ' + nombre + (ok ? '' : '  → ' + JSON.stringify(detalle)));
  if (!ok) fallas++;
};

console.log('\n1) Nadie tocó el cartel (el 68% de las visitas)');
let r = correr(null);
check('declara los cuatro permisos denegados', JSON.stringify(r.consent[0]) === JSON.stringify(['default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' }]), r.consent);
check('conserva el gclid y recorta datos de anuncios', r.sets.join(',') === 'ads_data_redaction=true,url_passthrough=true', r.sets);
check('carga Analytics (sin cookies) y NO carga Meta', r.scripts.join(',') === 'GA', r.scripts);
check('avisa a track.js que puede medir', r.eventos.length === 1, r.eventos);

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

console.log('\n4) Acepta durante la visita (ya venía midiendo sin cookies)');
r = correr(null);
const antes = r.scripts.slice();
r.aceptar();
check('antes solo estaba GA', antes.join(',') === 'GA', antes);
check('ahora suma Meta sin recargar GA', r.scripts.join(',') === 'GA,META', r.scripts);
check('levanta los permisos', r.consent.some((c) => c[0] === 'update'), r.consent.map((c) => c[0]));
r.aceptar();
check('apretar dos veces no duplica el pixel', r.scripts.filter((s) => s === 'META').length === 1, r.scripts);

console.log('\n5) En local y en las previews no se mide');
r = correr(null, 'localhost');
check('no carga nada fuera de produccion', r.scripts.length === 0, r.scripts);

console.log(
  fallas
    ? '\n✗ consentimiento: ' + fallas + ' comprobación(es) fallan. Revisá consent.js.\n'
    : 'consentimiento: 14 comprobaciones, se mide lo que corresponde en cada caso.'
);
process.exit(fallas ? 1 : 0);
