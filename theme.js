/* Theme toggle.
 *
 * The page follows the system setting until the visitor explicitly chooses,
 * at which point the choice is stored and wins. The tiny inline script in each
 * page's <head> applies a stored choice before first paint — without it the
 * page would flash the wrong theme on every load. This file only wires the
 * button, so it can load deferred.
 *
 * The button ships with the `hidden` attribute and is revealed here, so a
 * visitor without JavaScript never sees a control that cannot work.
 */
(function () {
  'use strict';

  var root = document.documentElement;
  var btn = document.getElementById('theme-toggle');
  if (!btn) return;

  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function active() {
    if (root.getAttribute('data-theme')) return root.getAttribute('data-theme');
    return mq && mq.matches ? 'dark' : 'light';
  }

  /* role="switch" carries the state in aria-checked, so the accessible name
     stays constant ("Dark mode") instead of flipping with every click. */
  function sync() {
    btn.setAttribute('aria-checked', active() === 'dark' ? 'true' : 'false');
  }

  btn.addEventListener('click', function () {
    var next = active() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) { /* private mode */ }
    sync();
  });

  /* Keep the label honest if the OS flips while the page is open and the
     visitor has not made an explicit choice. */
  if (mq && mq.addEventListener) {
    mq.addEventListener('change', function () {
      if (!root.getAttribute('data-theme')) sync();
    });
  }

  btn.hidden = false;
  sync();
})();
