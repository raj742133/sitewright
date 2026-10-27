/* Sitewright website: the template detail page (/dashboards/<id>/). Light/dark and device width for the live preview, replay,
   and the full-screen link. Vanilla. The shared header, theme toggle and previews are in catalog.js. */
(function () {
  'use strict';
  var wrap = document.getElementById('tstage-wrap');
  if (!wrap || wrap.hidden) return;
  var root = document.documentElement;
  var PRIMARY = { light: '#c2410c', dark: '#ff7a3d' }, SIGNAL = { light: '#0f766e', dark: '#5ccfc7' };
  var q = function (t) { return '?theme=' + t + '&primary=' + encodeURIComponent(PRIMARY[t]) + '&signal=' + encodeURIComponent(SIGNAL[t]); };
  var siteTheme = function () { return root.dataset.theme ? root.dataset.theme : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); };
  var stage = document.getElementById('tstage'), frame = document.getElementById('tpv'), full = document.getElementById('tfull');
  var base = frame.dataset.src, theme = siteTheme();
  var themeBtns = [].slice.call(wrap.querySelectorAll('[data-theme]')), devBtns = [].slice.call(wrap.querySelectorAll('[data-d]'));
  function post(t) { try { frame.contentWindow.postMessage({ type: 'sitewright-theme', theme: t }, '*'); } catch (e) { /* not ready */ } }
  function setTheme(t) {
    theme = t; stage.dataset.theme = t; frame.style.colorScheme = t;
    themeBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.theme === t ? 'true' : 'false'); });
    full.href = base + q(t); post(t);
  }
  function setDevice(d) {
    stage.dataset.d = d;
    devBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.d === d ? 'true' : 'false'); });
  }
  themeBtns.forEach(function (b) { b.addEventListener('click', function () { setTheme(b.dataset.theme); }); });
  devBtns.forEach(function (b) { b.addEventListener('click', function () { setDevice(b.dataset.d); }); });
  document.getElementById('treplay').addEventListener('click', function () { try { frame.contentWindow.location.reload(); } catch (e) { frame.src = base + q(theme); } });
  frame.addEventListener('load', function () { post(theme); });
  // follow the site's own theme toggle
  new MutationObserver(function () { setTheme(siteTheme()); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  setTheme(theme); setDevice('desktop'); frame.src = base + q(theme);
})();
