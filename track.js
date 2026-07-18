(function () {
  function fireLead() {
    if (typeof gtag === 'function') gtag('event', 'generate_lead', { method: 'inscribirme_click' });
    if (typeof fbq === 'function') fbq('track', 'Lead');
  }
  function fireFormOpen() {
    if (typeof gtag === 'function') gtag('event', 'tally_form_open');
    if (typeof fbq === 'function') fbq('track', 'InitiateCheckout');
  }
  function fireSignUp() {
    if (typeof gtag === 'function') gtag('event', 'sign_up', { method: 'tally_form' });
    if (typeof fbq === 'function') fbq('track', 'CompleteRegistration');
  }
  function fireWhatsApp() {
    if (typeof gtag === 'function') gtag('event', 'whatsapp_click');
    if (typeof fbq === 'function') fbq('track', 'Contact');
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-tally-open]')) {
      fireFormOpen();
      return;
    }
    if (e.target.closest('.nav-cta, .cta-main')) {
      fireLead();
      return;
    }
    if (e.target.closest('a[href*="wa.me"]')) {
      fireWhatsApp();
    }
  });

  window.addEventListener('message', function (e) {
    var data = e.data;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch (err) { return; }
    }
    if (data && data.event === 'Tally.FormSubmitted') {
      fireSignUp();
    }
  });

  // Red de seguridad de las animaciones de entrada: garantiza que ninguna foto
  // ni bloque quede oculto para siempre si el navegador restaura el scroll, si
  // se entra por un ancla (#seccion) o si se scrollea rápido antes de que el
  // IntersectionObserver de cada página alcance a dispararse.
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
  // Última garantía: pasado un tiempo, nada puede seguir invisible.
  setTimeout(function () {
    var all = document.querySelectorAll('.fade-up:not(.visible), .reveal-img:not(.visible)');
    for (var i = 0; i < all.length; i++) all[i].classList.add('visible');
  }, 2600);
})();
