/* Analítica con consentimiento (GA4 + Meta Pixel).

   Este bloque vivía copiado a mano en el <head> de las 24 páginas. Un solo
   archivo evita que se desincronicen y saca ~1,3 KB de cada HTML.

   Se carga con defer desde el <head>, antes que track.js: los scripts con
   defer corren en el orden en que están en el HTML, así que gtag() ya existe
   cuando track.js empieza a medir. */
(function () {
  'use strict';

  var GA_ID = 'G-BBLJT4TYCV';
  var META_ID = '2002873889966452';
  // Solo se mide en producción: ni el sitio local ni las previews de Netlify
  // ensucian los datos.
  var DOMINIOS = ['clorofila.uy', 'www.clorofila.uy'];
  var CLAVE = 'cookieConsent';

  /* localStorage lanza excepción cuando el navegador bloquea el almacenamiento
     (Safari en privado, "bloquear todas las cookies"). Sin este guardia la
     excepción cortaba el script y esas visitas quedaban sin banner. */
  function leer() {
    try {
      return localStorage.getItem(CLAVE);
    } catch (e) {
      return null;
    }
  }

  function guardar(valor) {
    try {
      localStorage.setItem(CLAVE, valor);
    } catch (e) {
      /* Sin almacenamiento la decisión vale para esta visita y no se recuerda. */
    }
  }

  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;

  // pagina.js (el banner de cookies) lee y escribe el consentimiento por acá,
  // para no repetir los try/catch.
  window.consentimiento = { leer: leer, guardar: guardar };

  window.loadAnalytics = function () {
    if (window.__analyticsLoaded) return;
    if (DOMINIOS.indexOf(location.hostname) === -1) return;
    window.__analyticsLoaded = true;

    var ga = document.createElement('script');
    ga.async = true;
    ga.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(ga);
    gtag('js', new Date());
    gtag('config', GA_ID);

    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', META_ID);
    fbq('track', 'PageView');
  };

  if (leer() === 'accepted') window.loadAnalytics();
})();
