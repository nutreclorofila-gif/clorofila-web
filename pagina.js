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
  /* La guarda del observador no es cosmética: si tira acá, el error corta el
     resto de este archivo y con él quedan sin enganchar los botones del aviso
     de cookies. Esa visita no se mide nunca. */
  var subes = document.querySelectorAll('.sube');
  if (subes.length && typeof IntersectionObserver === 'function') {
    var obs = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('vista'); obs.unobserve(e.target); }
      });
    }, { threshold: .1, rootMargin: '0px 0px -40px 0px' });
    Array.prototype.forEach.call(subes, function (el) { obs.observe(el); });

    // Última red: se muestra todo y se suelta el observador, que a esta altura
    // ya no tiene nada que vigilar.
    var plazoMaximo = setTimeout(function () {
      Array.prototype.forEach.call(document.querySelectorAll('.sube:not(.vista)'), function (el) { el.classList.add('vista'); });
      obs.disconnect();
    }, 2800);

    addEventListener('load', function () {
      setTimeout(function () {
        Array.prototype.forEach.call(document.querySelectorAll('.sube:not(.vista)'), function (el) {
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
    // -03:00 fijo: la fecha es la del estudio, no la del huso del visitante.
    var dias = Math.ceil((new Date(iso + 'T00:00:00-03:00') - new Date()) / 86400000);
    if (!(dias > 0)) return null;
    if (dias <= 14) return dias === 1 ? 'Empieza mañana' : 'Empieza en ' + dias + ' días';
    // Redondear siempre para arriba estiraba la espera: a 30 días del inicio
    // decía "5 semanas" cuando faltaban 4 y pico. Y hasta la quincena se
    // cuenta en días, que es más exacto y se siente más cerca.
    var semanas = Math.round(dias / 7);
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
    if (new Date(iso + 'T00:00:00-03:00') < hoy) el.setAttribute('data-estado', 'sin-fecha');
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
      /* Aparecía a los 700 ms, de golpe y apoyado sobre el hero: lo primero
         que pasaba al entrar era que algo tapaba la foto. Ahora espera a que
         la persona empiece a leer —el primer scroll— y si no scrollea sale
         igual a los 2,5 s, porque sin respuesta el pixel de Meta no carga. */
      var mostrarAviso = function () {
        if (banner.classList.contains('visible')) return;
        banner.classList.add('visible');
        window.removeEventListener('scroll', mostrarAviso);
      };
      window.addEventListener('scroll', mostrarAviso, { passive: true });
      setTimeout(mostrarAviso, 2500);
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
