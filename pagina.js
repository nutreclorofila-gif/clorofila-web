/* Comportamiento compartido por las páginas del sitio nuevo:
   barra de navegación, menú móvil, entradas al hacer scroll, acordeón de
   preguntas, barra fija de reserva y aviso de cookies.
   Cada pieza se activa sola si el marcado que necesita está en la página. */
(function () {
  'use strict';

  var nav = document.getElementById('nav');
  if (nav) {
    addEventListener('scroll', function () {
      nav.classList.toggle('pegada', scrollY > 16);
    }, { passive: true });
  }

  var ham = document.getElementById('hamburguesa');
  var cerrar = document.getElementById('cerrar-menu');
  var links = document.getElementById('nav-links');
  if (ham && links) {
    function cerrarMenu() {
      links.classList.remove('abierto');
      ham.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('menu-abierto');
    }
    ham.addEventListener('click', function () {
      links.classList.add('abierto');
      ham.setAttribute('aria-expanded', 'true');
      document.body.classList.add('menu-abierto');
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
    addEventListener('load', function () {
      setTimeout(function () {
        document.querySelectorAll('.sube:not(.vista)').forEach(function (el) {
          if (el.getBoundingClientRect().top < innerHeight) el.classList.add('vista');
        });
      }, 60);
    });
    setTimeout(function () {
      document.querySelectorAll('.sube:not(.vista)').forEach(function (el) { el.classList.add('vista'); });
    }, 2800);
  }

  document.querySelectorAll('.faq-q').forEach(function (b) {
    b.addEventListener('click', function () { b.parentElement.classList.toggle('open'); });
  });

  // La barra fija de reserva aparece cuando el botón de compra del hero sale
  // de pantalla, no cuando termina todo el hero: en móvil eso llega tarde.
  var barra = document.getElementById('sticky-cta');
  var ancla = document.querySelector('header .comanda-acciones');
  if (barra && ancla) {
    var evaluar = function () {
      barra.classList.toggle('visible', ancla.getBoundingClientRect().bottom < 0);
    };
    addEventListener('scroll', evaluar, { passive: true });
    addEventListener('resize', evaluar, { passive: true });
    evaluar();
  }

  var banner = document.getElementById('cookie-banner');
  if (banner) {
    if (!localStorage.getItem('cookieConsent')) {
      setTimeout(function () { banner.classList.add('visible'); }, 700);
    }
    var ok = document.getElementById('cookie-accept');
    var no = document.getElementById('cookie-decline');
    if (ok) ok.addEventListener('click', function () {
      localStorage.setItem('cookieConsent', 'accepted');
      banner.classList.remove('visible');
      if (window.loadAnalytics) window.loadAnalytics();
    });
    if (no) no.addEventListener('click', function () {
      localStorage.setItem('cookieConsent', 'declined');
      banner.classList.remove('visible');
    });
  }
})();
