(function () {
  /* --------------------------------------------------------------
     Medición: qué producto y de dónde viene la persona.

     Sin esto, GA4 dice "hubo 40 clics a WhatsApp" y no sabemos si
     fueron del tapeo, del curso o de un taller. Cada evento sale
     etiquetado con producto + origen (UTM), que es lo que después
     permite responder qué canal y qué propuesta realmente venden.
     -------------------------------------------------------------- */

  var CLAVE_ORIGEN = 'clorofila_origen';
  // Ventana de atribución: 30 días, igual que la de Meta y la de Google Ads.
  var DIAS_ORIGEN = 30;

  /* El origen se guarda la primera vez y no se pisa: si alguien llega por un
     anuncio y vuelve directo tres días después, la venta se le sigue
     atribuyendo al anuncio.

     Va en localStorage, no en sessionStorage: sessionStorage se borra al
     cerrar la pestaña, así que la promesa de arriba no se cumplía y el
     segundo día la persona figuraba como "directo". Con la fecha guardada,
     al mes vence y deja de arrastrar una campaña vieja. */
  function almacen() {
    try {
      var x = window.localStorage;
      x.setItem('__t', '1'); x.removeItem('__t');
      return x;
    } catch (e) {
      try { return window.sessionStorage; } catch (e2) { return null; }
    }
  }

  function guardarOrigen() {
    var store = almacen();
    var vacio = { utm_source: '', utm_medium: '', utm_campaign: '', utm_content: '', referrer: '' };
    try {
      var p = new URLSearchParams(location.search);
      var utm = {
        utm_source: p.get('utm_source') || '',
        utm_medium: p.get('utm_medium') || '',
        utm_campaign: p.get('utm_campaign') || '',
        utm_content: p.get('utm_content') || ''
      };
      var hayUtm = utm.utm_source || utm.utm_medium || utm.utm_campaign;

      function escribir(o) {
        o.ts = Date.now();
        if (store) store.setItem(CLAVE_ORIGEN, JSON.stringify(o));
        return o;
      }

      if (hayUtm) {
        utm.referrer = document.referrer || '';
        return escribir(utm);
      }

      var crudo = store ? store.getItem(CLAVE_ORIGEN) : null;
      if (crudo) {
        var previo = JSON.parse(crudo);
        var vigente = previo.ts && (Date.now() - previo.ts) < DIAS_ORIGEN * 864e5;
        if (vigente) return previo;
      }

      var origen = { utm_source: '', utm_medium: '', utm_campaign: '', utm_content: '', referrer: document.referrer || '' };
      // Sin UTM, al menos distinguimos si vino de Instagram, de Google o directo.
      if (/instagram\.com/.test(origen.referrer)) origen.utm_source = 'instagram_organico';
      else if (/google\./.test(origen.referrer)) origen.utm_source = 'google_organico';
      else if (!origen.referrer) origen.utm_source = 'directo';
      return escribir(origen);
    } catch (e) {
      return vacio;
    }
  }

  var origen = guardarOrigen();

  // El producto sale del botón; si el botón no lo declara, de la página.
  function productoDe(el) {
    var cerca = el && el.closest ? el.closest('[data-producto]') : null;
    if (cerca) return cerca.getAttribute('data-producto');
    return document.body.getAttribute('data-producto') || 'general';
  }

  function parametros(producto, extra) {
    var p = {
      producto: producto,
      pagina: location.pathname,
      utm_source: origen.utm_source,
      utm_medium: origen.utm_medium,
      utm_campaign: origen.utm_campaign,
      // Es el que dice QUÉ anuncio trajo a la persona, no solo qué campaña.
      // Se venía guardando y se tiraba antes de mandarlo.
      utm_content: origen.utm_content
    };
    if (extra) Object.keys(extra).forEach(function (k) { p[k] = extra[k]; });
    return p;
  }

  /* Precio de la propuesta, leído del JSON-LD que ya arma el build a partir de
     data/ofertas.json. No se duplica en un atributo aparte justamente para que
     no se pueda desincronizar: la única fuente sigue siendo el JSON.
     Sin value, GA4 informa "hubo 12 inicios de compra" sin decir cuánta plata
     representaban, y Google Ads no puede optimizar por valor. */
  function precioDeLaPagina() {
    try {
      var bloques = document.querySelectorAll('script[type="application/ld+json"]');
      for (var i = 0; i < bloques.length; i++) {
        var datos = JSON.parse(bloques[i].textContent);
        var pila = [datos];
        while (pila.length) {
          var n = pila.shift();
          if (!n || typeof n !== 'object') continue;
          if (Array.isArray(n)) { pila = pila.concat(n); continue; }
          if (n.price && n.priceCurrency) {
            var v = parseFloat(n.price);
            if (v > 0) return { value: v, currency: n.priceCurrency };
          }
          for (var k in n) if (Object.prototype.hasOwnProperty.call(n, k)) pila.push(n[k]);
        }
      }
    } catch (e) { /* sin precio se mide igual, solo sin valor */ }
    return null;
  }

  /* Hasta que la persona no acepta las cookies, GA4 y el pixel no existen y
     todo lo que se midiera se perdía: la vista de producto ocurre al abrir la
     página, o sea SIEMPRE antes de aceptar. En 28 días eso fue 232 page_view
     contra 120 view_producto. Los eventos se guardan y se mandan cuando
     consent.js avisa que la analítica arrancó. */
  var pendientes = [];
  var TOPE_PENDIENTES = 30;

  function encolar(fn) {
    if (window.__analyticsLoaded) { fn(); return; }
    if (pendientes.length < TOPE_PENDIENTES) pendientes.push(fn);
  }

  window.addEventListener('analytics:listo', function () {
    var cola = pendientes;
    pendientes = [];
    cola.forEach(function (fn) { try { fn(); } catch (e) { /* uno malo no corta el resto */ } });
  });

  function ga(evento, producto, extra) {
    var p = parametros(producto, extra);
    encolar(function () {
      if (typeof gtag === 'function') gtag('event', evento, p);
    });
  }
  function meta(evento, producto, extra) {
    var datos = { content_name: producto, content_category: 'clorofila' };
    if (extra) Object.keys(extra).forEach(function (k) { datos[k] = extra[k]; });
    encolar(function () {
      if (typeof fbq === 'function') fbq('track', evento, datos);
    });
  }

  /* --- Vista de producto: cuántos llegan a mirar cada propuesta --- */
  var productoPagina = document.body.getAttribute('data-producto');
  if (productoPagina) {
    ga('view_producto', productoPagina);
    meta('ViewContent', productoPagina);
  }

  /* --- Clics --- */
  document.addEventListener('click', function (e) {
    // El objetivo del clic no siempre es un elemento con closest() (puede ser
    // el propio documento). Sin este guardia, esos clics tiraban excepción.
    if (!e.target || typeof e.target.closest !== 'function') return;

    var tally = e.target.closest('[data-tally-open]');
    if (tally) {
      var prod = productoDe(tally);
      ga('begin_reservation', prod);
      ga('tally_form_open', prod);
      meta('InitiateCheckout', prod);
      return;
    }

    var wa = e.target.closest('a[href*="wa.me"]');
    if (wa) {
      var prodWa = productoDe(wa);
      ga('click_whatsapp', prodWa);
      ga('generate_lead', prodWa, { method: 'whatsapp' });
      meta('Contact', prodWa);
      return;
    }

    // Clic al botón de compra directa (Tikzet): es el "inicio de compra"
    // real del embudo. Sin esto, el CTA que más vende no dejaba ningún rastro.
    var compra = e.target.closest('a[href*="tikzet.com"]');
    if (compra) {
      var prodCompra = productoDe(compra);
      var precio = precioDeLaPagina();
      ga('begin_checkout', prodCompra, precio || undefined);
      ga('click_comprar', prodCompra);
      meta('InitiateCheckout', prodCompra, precio ? { value: precio.value, currency: precio.currency } : null);
      return;
    }

    /* Tally abierto como enlace, no como ventanita. Acá arriba ya se mide el
       widget (data-tally-open), pero el botón "Quiero el temario" de los doce
       artículos, de /curso y de /programa es un enlace común a tally.so: catorce
       botones que no dejaban ningún rastro. Son la puerta de entrada del
       contenido al embudo, así que sin esto no se sabe si los artículos sirven.
       Se mandan los mismos eventos que el widget para poder compararlos. */
    var tallyLink = e.target.closest('a[href*="tally.so"]');
    if (tallyLink) {
      var prodTally = productoDe(tallyLink);
      ga('begin_reservation', prodTally);
      ga('tally_form_open', prodTally);
      meta('InitiateCheckout', prodTally);
      return;
    }

    var cta = e.target.closest('.nav-cta, .cta-main, .btn-accent');
    if (cta) {
      ga('click_reservar', productoDe(cta));
      meta('Lead', productoDe(cta));
    }
  });

  /* --- Formulario de Tally enviado = inscripción ---
     Se exige que el mensaje venga del iframe de Tally. Sin esa verificación,
     cualquier página que abra la nuestra en una ventana o la embeba puede
     mandar el mismo mensaje y anotar inscripciones que nunca pasaron: los
     eventos de conversión (sign_up, CompleteRegistration) son justo los que
     alimentan la optimización de los anuncios. */
  var ORIGEN_TALLY = 'https://tally.so';
  window.addEventListener('message', function (e) {
    if (e.origin !== ORIGEN_TALLY) return;
    var data = e.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (err) { return; }
    }
    if (data && data.event === 'Tally.FormSubmitted') {
      var prod = document.body.getAttribute('data-producto') || 'curso';
      ga('sign_up', prod, { method: 'tally' });
      meta('CompleteRegistration', prod);
    }
  });
})();
