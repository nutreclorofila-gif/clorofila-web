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

     Se declara de entrada que NO hay permiso para nada, y Analytics se carga
     recién cuando la persona aprieta "Aceptar" (o si ya había aceptado en
     otra visita). Esto tiene que quedar declarado ANTES de cargar gtag: lo
     que se manda antes de esta línea viaja con los permisos de fábrica, que
     son todos concedidos.

     Del 7/9 al 23/9/2026 Analytics se cargaba también mientras la persona no
     decidía, en modo anónimo. Salió mal por dos lados:
     - Los avisos anónimos no aparecen en ningún informe: la propiedad no
       tiene el volumen que Google pide para modelarlos.
     - Quien aceptaba en la primera página perdía su visita de llegada. Al
       pasar a "granted", gtag no vuelve a mandar el page_view ni marca el
       inicio de sesión ni la primera visita, así que la fuente de esa
       persona nunca llegaba. first_visit bajó de 74 a 28 en dos semanas, y
       de los clics de Ads se veía entre el 4 y el 6%.
     Cargando gtag después del "granted", el primer page_view sale con
     cookies y con la dirección de llegada intacta (utm y gclid). */
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied'
  });
  // Solo cuentan si gtag llega a correr con los permisos denegados: que el
  // gclid viaje en la dirección y que Google recorte los datos de publicidad.
  // Con Analytics cargando recién al aceptar no debería pasar, pero no cuestan nada.
  gtag('set', 'ads_data_redaction', true);
  gtag('set', 'url_passthrough', true);

  /* Carga Analytics. La llama solo loadAnalytics(), después de levantar los
     permisos: así el primer page_view ya sale con cookies. */
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

  /* track.js guarda los eventos que ocurrieron antes de que Analytics
     estuviera listo (la vista de producto, sobre todo) y los manda recién
     con este aviso. Sin él se perdían: eran casi la mitad.
     Sale una sola vez y al final de loadAnalytics(), con gtag y fbq ya
     creados. Antes salía dentro de cargarGA(), antes de fbq('init'): track.js
     vaciaba la cola, no encontraba fbq y tiraba los eventos de Meta. Así se
     perdían el ViewContent de la página de llegada y el Schedule de /gracias. */
  function avisarListo() {
    if (window.__analyticsAvisado) return;
    window.__analyticsAvisado = true;
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

    // Aceptó: se levantan los cuatro permisos, y recién después se carga
    // Analytics.
    gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted'
    });
    cargarGA();

    // El píxel de Meta no entiende de permisos parciales: o mide con cookies
    // o no mide. Por eso sigue cargando solo cuando la persona acepta.
    if (!window.__metaCargado) cargarMeta();

    avisarListo();
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

  // Solo se mide a quien aceptó. Mientras la persona no decide no se carga
  // nada, y a quien apretó "Rechazar" tampoco: el banner de pagina.js llama a
  // loadAnalytics() cuando aprieta "Aceptar".
  if (leer() === 'accepted') window.loadAnalytics();
})();
