document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.sidebar__group-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      const submenu = toggle.parentElement.querySelector('.sidebar__submenu');
      if (submenu) {
        const open = submenu.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open);
      }
    });
  });
});
