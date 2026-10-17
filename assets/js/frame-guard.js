/**
 * GitHub Pages cannot send X-Frame-Options, and CSP's frame-ancestors is ignored in a
 * meta tag, so the page refuses to be displayed inside a frame instead: a page nobody
 * can see cannot be clickjacked. Loaded synchronously in <head>, before anything paints.
 */
if (window.self !== window.top) {
  document.documentElement.style.display = 'none';

  try {
    window.top.location = window.self.location.href;
  } catch (err) {
    // Cross-origin parent: reading its location throws, so hiding ourselves is all we have.
  }
}
