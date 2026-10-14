document.addEventListener('DOMContentLoaded', () => {
  const toggles = document.querySelectorAll('.nav-dropdown__toggle');
  toggles.forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const menu = toggle.nextElementSibling;
      if (menu && menu.classList.contains('nav-dropdown__menu')) {
        menu.classList.toggle('show');
        toggle.setAttribute('aria-expanded', menu.classList.contains('show'));
      }
    });
  });
  document.addEventListener('click', () => {
    document.querySelectorAll('.nav-dropdown__menu').forEach(m => m.classList.remove('show'));
    document.querySelectorAll('.nav-dropdown__toggle').forEach(t => t.setAttribute('aria-expanded', 'false'));
  });
});
