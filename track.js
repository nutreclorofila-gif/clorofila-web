(function () {
  /* --------------------------------------------------------------
     Medición: qué producto y de dónde viene la persona.

     Sin esto, GA4 dice "hubo 40 clics a WhatsApp" y no sabemos si
     fueron del tapeo, del curso o de un taller. Cada evento sale
     etiquetado con producto + origen (UTM), que es lo que después
     permite responder qué canal y qué propuesta realmente venden.
     -------------------------------------------------------------- */

  var CLAVE_ORIGEN = 'clorofila_origen';

  // El origen se guarda la primera vez y no se pisa: si alguien llega
  // por un anuncio y vuelve directo tres días después, la venta se le
  // sigue atribuyendo al anuncio.
  function guardarOrigen() {
    try {
      var p = new URLSearchParams(location.search);
      var utm = {
        utm_source: p.get('utm_source') || '',
        utm_medium: p.get('utm_medium') || '',
        utm_campaign: p.get('utm_campaign') || '',
        utm_content: p.get('utm_content') || ''
      };
      var hayUtm = utm.utm_source || utm.utm_medium || utm.utm_campaign;
      var guardado = sessionStorage.getItem(CLAVE_ORIGEN);
      if (hayUtm) {
        utm.referrer = document.referrer || '';
        sessionStorage.setItem(CLAVE_ORIGEN, JSON.stringify(utm));
        return utm;
      }
      if (guardado) return JSON.parse(guardado);
      var origen = { utm_source: '', utm_medium: '', utm_campaign: '', utm_content: '', referrer: document.referrer || '' };
      // Sin UTM, al menos distinguimos si vino de Instagram, de Google o directo.
      if (/instagram\.com/.test(origen.referrer)) origen.utm_source = 'instagram_organico';
      else if (/google\./.test(origen.referrer)) origen.utm_source = 'google_organico';
      else if (!origen.referrer) origen.utm_source = 'directo';
      sessionStorage.setItem(CLAVE_ORIGEN, JSON.stringify(origen));
      return origen;
    } catch (e) {
      return { utm_source: '', utm_medium: '', utm_campaign: '', utm_content: '', referrer: '' };
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
      utm_campaign: origen.utm_campaign
    };
    if (extra) Object.keys(extra).forEach(function (k) { p[k] = extra[k]; });
    return p;
  }

  function ga(evento, producto, extra) {
    if (typeof gtag === 'function') gtag('event', evento, parametros(producto, extra));
  }
  function meta(evento, producto) {
    if (typeof fbq === 'function') fbq('track', evento, { content_name: producto, content_category: 'clorofila' });
  }

  /* --- Vista de producto: cuántos llegan a mirar cada propuesta --- */
  var productoPagina = document.body.getAttribute('data-producto');
  if (productoPagina) {
    ga('view_producto', productoPagina);
    if (typeof fbq === 'function') fbq('track', 'ViewContent', { content_name: productoPagina });
  }

  /* --- Clics --- */
  document.addEventListener('click', function (e) {
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

    var cta = e.target.closest('.nav-cta, .cta-main, .btn-accent');
    if (cta) {
      ga('click_reservar', productoDe(cta));
      meta('Lead', productoDe(cta));
    }
  });

  /* --- Formulario de Tally enviado = inscripción --- */
  window.addEventListener('message', function (e) {
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

  /* --------------------------------------------------------------
     Red de seguridad de las animaciones de entrada: garantiza que
     ninguna foto ni bloque quede oculto para siempre si el navegador
     restaura el scroll, si se entra por un ancla (#seccion) o si se
     scrollea rápido antes de que el IntersectionObserver alcance a
     dispararse.
     -------------------------------------------------------------- */
  function revealInView() {
    var pending = document.querySelectorAll('.fade-up:not(.visible), .reveal-img:not(.visible)');
    if (!pending.length) {
      window.removeEventListener('scroll', revealInView);
      return;
    }
    var h = window.innerHeight;
    for (var i = 0; i < pending.length; i++) {
      if (pending[i].getBoundingClientRect().top < h) pending[i].classList.add('visible');
    }
  }
  window.addEventListener('scroll', revealInView, { passive: true });
  window.addEventListener('load', revealInView);
  setTimeout(function () {
    var all = document.querySelectorAll('.fade-up:not(.visible), .reveal-img:not(.visible)');
    for (var i = 0; i < all.length; i++) all[i].classList.add('visible');
  }, 2600);
})();
