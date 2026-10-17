/**
 * Mobile Navigation
 * Off-canvas drawer behaviour for viewports below 900px, where the docked
 * sidebar no longer fits. Also guards desktop resizes and restores focus on
 * close so keyboard and screen-reader users are not stranded.
 */
(function () {
  'use strict';

  const DESKTOP_QUERY = window.matchMedia('(min-width: 901px)');

  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('navToggle');
  const closeBtn = document.getElementById('sidebarClose');
  const backdrop = document.getElementById('sidebarBackdrop');

  if (!sidebar || !toggle) return;

  let isOpen = false;
  let lastFocused = null;

  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  // `inert` removes the closed drawer from the tab order and the accessibility
  // tree without the visibility/transition timing trap that hiding it with CSS
  // would introduce. Older engines fall back to the tabindex sentinel below.
  const supportsInert = 'inert' in HTMLElement.prototype;

  function setDrawerInteractive(interactive) {
    if (supportsInert) {
      sidebar.inert = !interactive;
    } else {
      // Fallback: park focus outside the drawer by disabling its links
      sidebar.querySelectorAll(focusableSelector).forEach(el => {
        if (interactive) {
          if (el.dataset.prevTabIndex !== undefined) el.tabIndex = el.dataset.prevTabIndex;
          delete el.dataset.prevTabIndex;
          if (el.dataset.prevAriaHidden !== undefined) el.removeAttribute('aria-hidden');
        } else {
          if (el.tabIndex >= 0 || el.dataset.prevTabIndex === undefined) {
            el.dataset.prevTabIndex = String(el.tabIndex);
          }
          el.tabIndex = -1;
          el.dataset.prevAriaHidden = 'true';
          el.setAttribute('aria-hidden', 'true');
        }
      });
    }
    sidebar.setAttribute('aria-hidden', interactive ? 'false' : 'true');
  }

  // The docked desktop sidebar is always usable, so only park it when the
  // drawer layout is actually in effect.
  function syncDrawerToViewport() {
    if (DESKTOP_QUERY.matches) {
      setDrawerInteractive(true);
    } else if (!isOpen) {
      setDrawerInteractive(false);
    }
  }

  syncDrawerToViewport();

  function getFocusable() {
    // offsetParent is null for position:fixed subtrees, which is exactly how the
    // drawer is positioned, so test rendered geometry instead.
    return Array.prototype.filter.call(
      sidebar.querySelectorAll(focusableSelector),
      el => el.getClientRects().length > 0
    );
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    lastFocused = document.activeElement;

    if (backdrop) backdrop.hidden = false;
    setDrawerInteractive(true);
    document.body.classList.add('nav-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close navigation menu');

    const first = getFocusable()[0];
    if (first) first.focus();
  }

  function close({ restoreFocus = true } = {}) {
    if (!isOpen) return;
    isOpen = false;

    if (backdrop) {
      // Let the opacity transition finish before removing it from the a11y tree
      window.setTimeout(() => {
        if (!isOpen && backdrop) backdrop.hidden = true;
      }, 280);
    }

    document.body.classList.remove('nav-open');
    setDrawerInteractive(false);
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');

    // Focus must leave the drawer before it goes inert, so restore first.
    if (restoreFocus && lastFocused && typeof lastFocused.focus === 'function') {
      lastFocused.focus();
    }
    lastFocused = null;
  }

  toggle.addEventListener('click', () => (isOpen ? close() : open()));

  if (closeBtn) closeBtn.addEventListener('click', () => close());

  if (backdrop) {
    backdrop.addEventListener('click', () => close());
  }

  document.addEventListener('keydown', (e) => {
    if (!isOpen) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }

    if (e.key !== 'Tab') return;

    // Keep Tab cycling inside the drawer while it owns the screen
    const items = getFocusable();
    if (!items.length) return;

    const first = items[0];
    const last = items[items.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // Any activation inside the drawer should close it first. The Profile and
  // Settings buttons open a modal, so they need closing too or the drawer would
  // sit behind it.
  sidebar.addEventListener('click', (e) => {
    const item = e.target.closest('.sidebar__nav-item');
    if (!item) return;
    // The group toggle expands its submenu in place and a bare '#' target only
    // scrolls, so neither closes the drawer — everything else does.
    if (item.classList.contains('sidebar__group-toggle') || item.getAttribute('href') === '#') return;
    close({ restoreFocus: false });
  });

  // Crossing into desktop must clear every mobile-only state
  function syncToViewport() {
    if (DESKTOP_QUERY.matches && isOpen) {
      isOpen = false;
      if (backdrop) backdrop.hidden = true;
      document.body.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation menu');
    }
    syncDrawerToViewport();
  }

  if (typeof DESKTOP_QUERY.addEventListener === 'function') {
    DESKTOP_QUERY.addEventListener('change', syncToViewport);
  } else if (typeof DESKTOP_QUERY.addListener === 'function') {
    DESKTOP_QUERY.addListener(syncToViewport);
  }

  // Swiping from the left edge opens the drawer, matching platform behaviour
  let touchStartX = null;
  let touchStartY = null;

  document.addEventListener('touchstart', (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (isOpen || touchStartX === null || DESKTOP_QUERY.matches) {
      touchStartX = null;
      return;
    }

    const touch = e.changedTouches && e.changedTouches[0];
    if (!touch) return;

    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    // Ignore mostly-vertical swipes so scrolling never opens the drawer
    if (dx > 60 && Math.abs(dy) < 40 && touchStartX < 30) {
      open();
    }

    touchStartX = null;
    touchStartY = null;
  }, { passive: true });
})();