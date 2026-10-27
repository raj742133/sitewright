/* Sitewright home page: the build theatre, module tabs and install tabs. (Theme, menu, copy buttons, palette and live previews are in catalog.js.)
   Every moving part has a still, finished state for reduced-motion and no-script visitors. */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* ---- the build theatre ---- */
  var th = $('#theatre'), typed = $('#th-typed'), thTimers = [];
  if (th && typed) {
    var full = typed.textContent;
    var later = function (fn, ms) { thTimers.push(setTimeout(fn, ms)); };
    var thStop = function () { thTimers.forEach(clearTimeout); thTimers = []; };
    var playTheatre = function () {
      thStop();
      if (reduced) { typed.textContent = full; th.dataset.step = '5'; return; }
      th.dataset.step = '0'; typed.textContent = '';
      var i = 0, t = setInterval(function () {
        i += 1; typed.textContent = full.slice(0, i);
        if (i >= full.length) { clearInterval(t); later(function () { th.dataset.step = '1'; }, 300); later(function () { th.dataset.step = '2'; }, 1100); later(function () { th.dataset.step = '3'; }, 1900); later(function () { th.dataset.step = '4'; }, 2700); later(function () { th.dataset.step = '5'; }, 3600); }
      }, 24);
      thTimers.push({ clear: function () { clearInterval(t); } });
    };
    // timers may be intervals: stop handles both
    thStop = function () { thTimers.forEach(function (x) { if (x && x.clear) x.clear(); else clearTimeout(x); }); thTimers = []; };
    var replay = $('#th-replay'); if (replay) replay.addEventListener('click', playTheatre);
    if (!reduced && hasIO) {
      var tio = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { tio.disconnect(); playTheatre(); } }, { threshold: 0.3 });
      tio.observe(th);
    }
  }

  /* ---- tab lists: one panel visible at a time, arrow keys move between tabs ---- */
  function tabs(list, tabSel, onPick) {
    var btns = $$(tabSel, list);
    function pick(i, focus) { btns.forEach(function (b, k) { b.setAttribute('aria-selected', k === i ? 'true' : 'false'); b.tabIndex = k === i ? 0 : -1; }); onPick(btns[i]); if (focus) btns[i].focus(); }
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { pick(i); });
      b.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (i + 1) % btns.length : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (i - 1 + btns.length) % btns.length : e.key === 'Home' ? 0 : e.key === 'End' ? btns.length - 1 : -1;
        if (n > -1) { e.preventDefault(); pick(n, true); }
      });
    });
  }
  var mods = $('#mods');
  if (mods) tabs($('.mod-tabs', mods), '[role=tab]', function (b) { $$('.mod-panel', mods).forEach(function (p) { p.hidden = p.id !== b.getAttribute('aria-controls'); }); });
  var osList = $('.os-tabs');
  if (osList) {
    var guess = /Win/i.test(navigator.platform || navigator.userAgent) ? 'win' : 'mac';
    var showOs = function (b) { $$('.panel').forEach(function (p) { p.classList.toggle('on', p.dataset.panel === b.dataset.os); }); };
    tabs(osList, 'button', showOs);
    var g = $('[data-os="' + guess + '"]', osList); if (g) g.click();
  }
})();
