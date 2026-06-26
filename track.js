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
})();
