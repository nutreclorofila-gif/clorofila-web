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

     Antes, Analytics solo arrancaba si la persona apretaba "Aceptar". Como
     dos de cada tres se van sin tocar el cartel, esas visitas no existían:
     en la semana del 31/8/2026 Ads cobró 41 clics y Analytics vio 13. Sin
     esas visitas, el sitio no sabe qué anuncio ni qué búsqueda trae gente.

     Ahora se declara de entrada que NO hay permiso para nada. Con los
     permisos en "denied", Google no escribe cookies ni guarda nada en el
     dispositivo: manda un aviso anónimo, sin identificador, que sirve para
     contar la visita y de dónde vino. Al aceptar, recién ahí pasa a
     "granted" y se comporta como siempre.

     Esto tiene que quedar declarado ANTES de cargar gtag: lo que se manda
     antes de esta línea viaja con los permisos de fábrica, que son todos
     concedidos. */
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied'
  });
  // Sin cookies, la única forma de saber de qué anuncio vino alguien es que
  // el gclid viaje en la dirección; y con los permisos denegados conviene
  // que Google recorte los datos de publicidad que igual recibe.
  gtag('set', 'ads_data_redaction', true);
  gtag('set', 'url_passthrough', true);

  /* Carga Analytics con los permisos que haya en ese momento. Se llama
     siempre (salvo que la persona haya dicho que no), no solo al aceptar. */
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

    /* track.js guarda los eventos que ocurrieron antes de que Analytics
       estuviera listo (la vista de producto, sobre todo) y los manda recién
       acá. Sin este aviso se perdían: eran casi la mitad. */
    try {
      window.dispatchEvent(new Event('analytics:listo'));
    } catch (e) {
      var ev = document.createEvent('Event');
      ev.initEvent('analytics:listo', false, false);
      window.dispatchEvent(ev);
    }
  }

  window.loadAnalytics = function () {
    if (DOMINIOS.indexOf(location.hostname) === -1) return;

    // Aceptó: se levantan los cuatro permisos. Si Analytics ya venía
    // midiendo en modo anónimo, esto le avisa que ahora sí puede recordar.
    gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted'
    });
    cargarGA();

    // El píxel de Meta no entiende de permisos parciales: o mide con cookies
    // o no mide. Por eso sigue cargando solo cuando la persona acepta.
    if (window.__metaCargado) return;
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
  };

  var decision = leer();
  if (decision === 'accepted') {
    window.loadAnalytics();
  } else if (decision !== 'declined') {
    // Todavía no decidió: se cuenta la visita sin cookies ni identificador.
    // A quien apretó "No, gracias" no se lo mide de ninguna forma.
    cargarGA();
  }
})();
