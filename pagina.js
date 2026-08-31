/* Comportamiento compartido por las páginas del sitio nuevo:
   barra de navegación, menú móvil, entradas al hacer scroll, acordeón de
   preguntas, barra fija de reserva y aviso de cookies.
   Cada pieza se activa sola si el marcado que necesita está en la página. */
(function () {
  'use strict';

  /* Un solo lector de scroll para todo lo que reacciona al scroll. Medir la
     posición de un elemento (getBoundingClientRect) en cada evento de scroll
     obliga al navegador a recalcular la página decenas de veces por segundo y
     el scroll se traba en móviles. Con requestAnimationFrame se mide una vez
     por cuadro dibujado, que es todo lo que se puede ver. */
  var tareasScroll = [];
  var cuadroPedido = false;

  function correrTareas() {
    cuadroPedido = false;
    for (var i = 0; i < tareasScroll.length; i++) tareasScroll[i]();
  }

  function alScrollear() {
    if (cuadroPedido) return;
    cuadroPedido = true;
    requestAnimationFrame(correrTareas);
  }

  function enScroll(tarea) {
    if (!tareasScroll.length) {
      addEventListener('scroll', alScrollear, { passive: true });
      addEventListener('resize', alScrollear, { passive: true });
    }
    tareasScroll.push(tarea);
    tarea();
  }

  var nav = document.getElementById('nav');
  if (nav) {
    enScroll(function () {
      nav.classList.toggle('pegada', scrollY > 16);
    });
  }

  var ham = document.getElementById('hamburguesa');
  var cerrar = document.getElementById('cerrar-menu');
  var links = document.getElementById('nav-links');
  if (ham && links) {
    /* Con el menú abierto, la página de atrás queda tapada pero sus enlaces
       seguían alcanzándose con el tabulador: se tabulaba a ciegas por 34
       elementos invisibles. "inert" los saca del recorrido y del lector de
       pantalla mientras el menú está arriba, y se los devuelve al cerrar.
       Los navegadores que no lo entienden simplemente lo ignoran: se comportan
       como antes, no peor. */
    var detras = [document.getElementById('principal'), document.querySelector('footer')]
      .filter(Boolean);
    var apagarFondo = function (apagado) {
      for (var i = 0; i < detras.length; i++) detras[i].inert = apagado;
    };

    var cerrarMenu = function () {
      links.classList.remove('abierto');
      ham.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-abierto');
      apagarFondo(false);
      // El foco vuelve al botón que lo abrió, no al principio de la página.
      ham.focus();
    };
    ham.addEventListener('click', function () {
      links.classList.add('abierto');
      ham.setAttribute('aria-expanded', 'true');
      document.body.classList.add('menu-abierto');
      apagarFondo(true);
      // El primer tabulador tiene que caer dentro del menú, no detrás.
      var primero = cerrar || links.querySelector('a');
      if (primero) primero.focus();
    });
    if (cerrar) cerrar.addEventListener('click', cerrarMenu);
    links.addEventListener('click', function (e) { if (e.target.tagName === 'A') cerrarMenu(); });
    addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && links.classList.contains('abierto')) cerrarMenu();
    });
  }

  // Entradas al hacer scroll. Con dos redes de seguridad: lo que ya está en
  // pantalla al cargar, y un plazo máximo, para que nada quede invisible si
  // el observador no llega a dispararse.
  var subes = document.querySelectorAll('.sube');
  if (subes.length) {
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('vista'); obs.unobserve(e.target); }
      });
    }, { threshold: .1, rootMargin: '0px 0px -40px 0px' });
    subes.forEach(function (el) { obs.observe(el); });

    // Última red: se muestra todo y se suelta el observador, que a esta altura
    // ya no tiene nada que vigilar.
    var plazoMaximo = setTimeout(function () {
      document.querySelectorAll('.sube:not(.vista)').forEach(function (el) { el.classList.add('vista'); });
      obs.disconnect();
    }, 2800);

    addEventListener('load', function () {
      setTimeout(function () {
        document.querySelectorAll('.sube:not(.vista)').forEach(function (el) {
          if (el.getBoundingClientRect().top < innerHeight) el.classList.add('vista');
        });
        if (!document.querySelector('.sube:not(.vista)')) {
          clearTimeout(plazoMaximo);
          obs.disconnect();
        }
      }, 60);
    });
  }

  /* La página de gracias trae tres fichas -el temario, el curso y el tapeo- y
     muestra la que tenga la clase "activo". Venía marcada la del temario en el
     HTML, que es la que corresponde al formulario, pero las otras dos no las
     activaba nadie: quien reservaba el tapeo veía el temario del curso. Ahora
     se elige con ?p= en la dirección, y sin parámetro queda la que ya estaba,
     así que el camino de siempre no cambia. */
  var fichas = document.querySelectorAll('[data-para]');
  if (fichas.length) {
    var pedido = new URLSearchParams(location.search).get('p');
    var existe = pedido && document.querySelector('[data-para="' + pedido.replace(/[^a-z-]/gi, '') + '"]');
    if (existe) {
      for (var f = 0; f < fichas.length; f++) fichas[f].classList.remove('activo');
      existe.classList.add('activo');
    }
  }

  document.querySelectorAll('.faq-q').forEach(function (b) {
    b.addEventListener('click', function () {
      var abierto = b.parentElement.classList.toggle('open');
      b.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    });
  });

  // La barra fija de reserva aparece cuando el botón de compra del hero sale
  // de pantalla, no cuando termina todo el hero: en móvil eso llega tarde.
  // En las páginas de venta cuelga del botón del hero; en las demás, que no
  // tienen comanda, aparece después de la primera pantalla.
  var barra = document.getElementById('sticky-cta');
  var ancla = document.querySelector('header .comanda-acciones');
  if (barra) {
    enScroll(ancla
      ? function () { barra.classList.toggle('visible', ancla.getBoundingClientRect().bottom < 0); }
      : function () { barra.classList.toggle('visible', scrollY > innerHeight * 0.6); });
  }

  /* Cuenta regresiva al inicio del curso. Vivía como script suelto dentro de
     curso.html, así que la home no la tenía. Acá sirve para cualquier elemento
     con data-inicio-iso, y la fecha siempre sale de data/ofertas.json.
     Si la fecha ya pasó no inventa urgencia: deja el texto del render. */
  function cuantoFalta(iso) {
    var dias = Math.ceil((new Date(iso + 'T00:00:00') - new Date()) / 86400000);
    if (!(dias > 0)) return null;
    if (dias <= 7) return dias === 1 ? 'Empieza mañana' : 'Empieza en ' + dias + ' días';
    var semanas = Math.ceil(dias / 7);
    return 'Empieza en ' + semanas + ' semana' + (semanas === 1 ? '' : 's');
  }
  /* Una fecha que ya pasó deja de venderse, aunque nadie haya publicado desde
     entonces. El build aplica la misma regla, pero solo corre cuando alguien
     pushea: si el tapeo es el viernes y el lunes nadie tocó nada, el sitio
     seguiría cobrando una entrada para una noche que ya fue. Al marcarlo
     'sin-fecha' el CSS que ya existe esconde el botón de compra y la barra
     de reserva, y deja a la vista el "avisame cuando haya fecha". */
  Array.prototype.forEach.call(document.querySelectorAll('[data-vence-iso]'), function (el) {
    var iso = el.getAttribute('data-vence-iso');
    if (!iso) return;
    var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    if (new Date(iso + 'T00:00:00') < hoy) el.setAttribute('data-estado', 'sin-fecha');
  });

  Array.prototype.forEach.call(document.querySelectorAll('[data-inicio-iso]'), function (el) {
    var texto = cuantoFalta(el.getAttribute('data-inicio-iso'));
    if (!texto) return;
    // El elemento puede ser el propio texto, o contener el destino marcado.
    var destino = el.querySelector('[data-cuenta]');
    (destino || el).textContent = texto;
  });

  /* El consentimiento se lee y se guarda por consent.js, que envuelve
     localStorage en try/catch: con las cookies bloqueadas, acceder al
     almacenamiento lanza excepción y sin el guardia el banner nunca aparecía. */
  var almacen = window.consentimiento || {
    leer: function () { return null; },
    guardar: function () {}
  };

  var banner = document.getElementById('cookie-banner');
  if (banner) {
    if (!almacen.leer()) {
      setTimeout(function () { banner.classList.add('visible'); }, 700);
    }
    var ok = document.getElementById('cookie-accept');
    var no = document.getElementById('cookie-decline');
    if (ok) ok.addEventListener('click', function () {
      almacen.guardar('accepted');
      banner.classList.remove('visible');
      if (window.loadAnalytics) window.loadAnalytics();
    });
    if (no) no.addEventListener('click', function () {
      almacen.guardar('declined');
      banner.classList.remove('visible');
    });
  }
})();
