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

  /* Modo de consentimiento (Consent Mode v2).

     Desde el 7/10/2026 Analytics mide a todos salvo a quien aprieta
     "Rechazar". Meta y la publicidad siguen esperando a "Aceptar".
     - Nadie tocó el aviso: Analytics con cookies; Meta y anuncios, no.
     - "Aceptar": se suman Meta y los permisos de publicidad.
     - "Rechazar": no se carga nada, y si Analytics ya había arrancado en esa
       página, se corta ahí mismo (rechazarAnalytics).
     Con "nada hasta aceptar" se perdía casi todo: dos de cada tres visitas no
     contestaban el aviso, y de 25 clics de Ads se veían 2 sesiones.

     El permiso se declara ANTES de cargar gtag, nunca después. Del 7/9 al
     23/9/2026 gtag arrancaba sin permiso de Analytics y lo recibía recién al
     aceptar: el page_view de llegada salía sin cookies y la fuente de esa
     persona se perdía (first_visit bajó de 74 a 28 en dos semanas). Acá el
     primer page_view ya sale con el permiso que corresponde. */
  var decision = leer();
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: decision === 'declined' ? 'denied' : 'granted'
  });
  // Con la publicidad denegada: que el gclid viaje en la dirección (así la
  // visita se atribuye igual al anuncio) y que Google recorte los datos de
  // publicidad.
  gtag('set', 'ads_data_redaction', true);
  gtag('set', 'url_passthrough', true);

  /* Carga Analytics, siempre con el permiso ya declarado arriba. */
  function cargarGA() {
    if (window.__analyticsLoaded) return;
    if (DOMINIOS.indexOf(location.hostname) === -1) return;
    window.__analyticsLoaded = true;

    var ga = document.createElement('script');
    ga.async = true;
    ga.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(ga);
    gtag('js', new Date());
    gtag('config', GA_ID);
  }

  /* Avisos para track.js y /gracias, que guardan lo que pasó antes de que
     la herramienta estuviera lista y lo mandan con este aviso.
     - analytics:listo: gtag ya existe. Sale una sola vez.
     - meta:listo: fbq ya existe (después de fbq('init')). Sale una sola vez.
     Son dos porque Analytics y Meta ya no arrancan juntos: quien no contestó
     el aviso tiene Analytics y no Meta. Con un solo aviso, la vista de
     producto se mandaba a Analytics al abrir la página y Meta nunca recibía
     su ViewContent aunque la persona aceptara después. */
  function avisar(nombre, marca) {
    if (window[marca]) return;
    window[marca] = true;
    try {
      window.dispatchEvent(new Event(nombre));
    } catch (e) {
      var ev = document.createEvent('Event');
      ev.initEvent(nombre, false, false);
      window.dispatchEvent(ev);
    }
  }

  window.loadAnalytics = function () {
    if (DOMINIOS.indexOf(location.hostname) === -1) return;

    // Aceptó: se levantan los cuatro permisos antes de cargar nada.
    gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted'
    });
    cargarGA();

    // El píxel de Meta no entiende de permisos parciales: o mide con cookies
    // o no mide. Por eso carga solo cuando la persona acepta.
    if (!window.__metaCargado) cargarMeta();

    avisar('analytics:listo', '__analyticsAvisado');
    avisar('meta:listo', '__metaAvisado');
  };

  /* Apretó "Rechazar" en esta página. Si Analytics ya había arrancado (no
     había contestado el aviso), deja de mandar y se borran sus cookies. En
     las páginas siguientes consent.js lee "declined" y no carga nada. */
  window.rechazarAnalytics = function () {
    gtag('consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied'
    });
    window['ga-disable-' + GA_ID] = true;
    var dominio = location.hostname.replace(/^www\./, '');
    (document.cookie || '').split(';').forEach(function (c) {
      var nombre = c.split('=')[0].trim();
      if (nombre === '_ga' || nombre.indexOf('_ga_') === 0) {
        var vencida = nombre + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        document.cookie = vencida;
        document.cookie = vencida + '; domain=.' + dominio;
      }
    });
  };

  function cargarMeta() {
    window.__metaCargado = true;

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
  }

  // Aceptó en otra visita: todo. No contestó todavía: solo Analytics.
  // Rechazó: nada.
  if (decision === 'accepted') {
    window.loadAnalytics();
  } else if (decision !== 'declined' && DOMINIOS.indexOf(location.hostname) > -1) {
    cargarGA();
    avisar('analytics:listo', '__analyticsAvisado');
  }
})();
