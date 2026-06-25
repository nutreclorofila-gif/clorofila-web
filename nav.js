(function () {
  const hamburger = document.getElementById('nav-hamburger');
  const navClose = document.getElementById('nav-close');
  const navLinks = document.getElementById('nav-links');

  function openNav() {
    navLinks.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('nav-open');
  }

  function closeNav() {
    navLinks.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
  }

  hamburger.addEventListener('click', openNav);
  navClose.addEventListener('click', closeNav);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('open')) closeNav();
  });
})();
