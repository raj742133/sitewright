/* Sitewright website, shared behaviour (every page): theme toggle, mobile menu, copy buttons, lazy live previews, the command palette.
   Page-specific parts switch on markup: the component catalogue (#tiles) and the component detail page (#stage-wrap). Vanilla, no dependencies. */
(function () {
  'use strict';
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var hasIO = 'IntersectionObserver' in window;
  var SVG_SEARCH = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

  /* ---- theme ---- */
  var themeBtn = $('#theme');
  function isDark() { return root.dataset.theme ? root.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches; }
  function paintTheme() {
    if (!themeBtn) return;
    themeBtn.setAttribute('aria-label', isDark() ? 'Switch to light theme' : 'Switch to dark theme');
    themeBtn.innerHTML = isDark()
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"/></svg>';
  }
  if (themeBtn) themeBtn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('sitewright-theme', next); } catch (e) { /* private mode */ }
    paintTheme(); themeChanged();
  });
  paintTheme();
  var themeListeners = [];
  function themeChanged() { themeListeners.forEach(function (f) { f(isDark() ? 'dark' : 'light'); }); }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener && window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { if (!root.dataset.theme) { paintTheme(); themeChanged(); } });

  /* ---- mobile menu ---- */
  var menu = $('#menu'), nav = $('#nav');
  function closeMenu() { if (!nav) return; nav.classList.remove('open'); if (menu) menu.setAttribute('aria-expanded', 'false'); }
  if (menu && nav) {
    menu.addEventListener('click', function () { var open = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', open ? 'true' : 'false'); });
    $$('a', nav).forEach(function (a) { a.addEventListener('click', closeMenu); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); menu.focus(); } });
  }

  /* ---- copy buttons ---- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-copy]'); if (!btn) return;
    var text = btn.getAttribute('data-copy');
    var done = function () { var o = btn.dataset.label || (btn.dataset.label = btn.textContent); btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = o; }, 1500); };
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (er) { btn.textContent = 'Select & copy'; }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  });

  /* ---- live previews: an iframe is created only when its box is within 400px of the viewport ---- */
  var PRIMARY = { light: '#c2410c', dark: '#ff7a3d' }, SIGNAL = { light: '#0f766e', dark: '#5ccfc7' };
  function previewQuery(t) { return '?theme=' + t + '&primary=' + encodeURIComponent(PRIMARY[t]) + '&signal=' + encodeURIComponent(SIGNAL[t]); }
  function curTheme() { return isDark() ? 'dark' : 'light'; }
  function postTheme(frame, t) { try { frame.contentWindow.postMessage({ type: 'sitewright-theme', theme: t }, '*'); } catch (e) { /* not ready */ } }
  var previews = $$('[data-prev]');
  function loadPreview(box) {
    if (box.querySelector('iframe')) return;
    var f = document.createElement('iframe');
    f.title = box.dataset.title || 'Live preview'; f.tabIndex = -1; f.setAttribute('aria-hidden', 'true'); f.setAttribute('scrolling', 'no');
    f.style.colorScheme = curTheme();
    f.addEventListener('load', function () { f.classList.add('ready'); box.classList.add('has-frame'); postTheme(f, curTheme()); });
    f.src = box.dataset.prev + previewQuery(curTheme());
    box.appendChild(f);
  }
  if (previews.length) {
    var pio = hasIO ? new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { loadPreview(x.target); pio.unobserve(x.target); } }); }, { rootMargin: '400px 0px' }) : null;
    previews.forEach(function (b) { if (b.hasAttribute('data-eager') || !pio) loadPreview(b); else pio.observe(b); });
    var scale = function (b) { b.style.setProperty('--ps', (b.clientWidth / (Number(b.dataset.w) || 400)).toFixed(4)); };
    if ('ResizeObserver' in window) { var ro = new ResizeObserver(function (en) { en.forEach(function (x) { scale(x.target); }); }); previews.forEach(function (b) { ro.observe(b); }); }
    else previews.forEach(scale);
    themeListeners.push(function (t) { previews.forEach(function (b) { var f = b.querySelector('iframe'); if (f) { f.style.colorScheme = t; postTheme(f, t); } }); });
  }

  /* ---- command palette ---- */
  var isMac = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
  var kbd = $('#kbd'); if (kbd) kbd.textContent = isMac ? '⌘K' : 'Ctrl K';
  var searchBtn = $('#search'), palEl = null, palIn = null, palList = null, palData = null, palItems = [], palSel = 0, palOpener = null;
  var POPULAR = ['area-chart', 'tactile-button', 'hold-to-confirm', 'otp-input', 'liquid-gauge'];
  function loadData() {
    if (palData) return Promise.resolve(palData);
    return fetch('/search.json').then(function (r) { return r.json(); }).then(function (d) { palData = d; return d; }, function () { palData = []; return palData; });
  }
  function buildPal() {
    palEl = document.createElement('div'); palEl.className = 'pal-back'; palEl.id = 'pal-back'; palEl.hidden = true;
    palEl.innerHTML = '<div class="pal" role="dialog" aria-modal="true" aria-label="Search Sitewright"><div class="pal-in">' + SVG_SEARCH +
      '<input id="pal-q" type="text" role="combobox" aria-expanded="true" aria-controls="pal-list" aria-autocomplete="list" aria-label="Search components, dashboards and pages" placeholder="Search components, dashboards, pages" autocomplete="off" autocapitalize="off" spellcheck="false">' +
      '<button type="button" class="pal-x" id="pal-x" aria-label="Close search">Esc</button></div>' +
      '<ul class="pal-list" id="pal-list" role="listbox" aria-label="Results"></ul>' +
      '<div class="pal-foot"><span><kbd>↑</kbd> <kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></div></div>';
    document.body.appendChild(palEl);
    palIn = $('#pal-q', palEl); palList = $('#pal-list', palEl);
    palIn.addEventListener('input', renderPal);
    palEl.addEventListener('mousedown', function (e) { if (e.target === palEl) closePal(); });
    $('#pal-x', palEl).addEventListener('click', closePal);
    palList.addEventListener('click', function (e) { var li = e.target.closest('[role=option]'); if (li) go(li.dataset.url); });
    palList.addEventListener('mousemove', function (e) { var li = e.target.closest('[role=option]'); if (li) { var i = palItems.indexOf(li); if (i > -1 && i !== palSel) select(i); } });
    palEl.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closePal(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); select(Math.min(palItems.length - 1, palSel + 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); select(Math.max(0, palSel - 1)); }
      else if (e.key === 'Home' && palItems.length) { e.preventDefault(); select(0); }
      else if (e.key === 'End' && palItems.length) { e.preventDefault(); select(palItems.length - 1); }
      else if (e.key === 'Enter') { if (palItems[palSel]) { e.preventDefault(); go(palItems[palSel].dataset.url); } }
      else if (e.key === 'Tab') { // focus trap between the field and the close button
        var x = $('#pal-x', palEl), t = e.shiftKey ? (document.activeElement === palIn ? x : palIn) : (document.activeElement === palIn ? x : palIn);
        e.preventDefault(); t.focus();
      }
    });
  }
  function go(url) { closePal(); if (/^https?:/.test(url)) window.open(url, '_blank', 'noopener'); else window.location.href = url; }
  function select(i) {
    palSel = i;
    palItems.forEach(function (li, k) { li.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
    if (palItems[i]) { palIn.setAttribute('aria-activedescendant', palItems[i].id); palItems[i].scrollIntoView({ block: 'nearest' }); } else palIn.removeAttribute('aria-activedescendant');
  }
  function score(e, toks) {
    var title = e.title.toLowerCase(), hay = title + ' ' + e.id.toLowerCase() + ' ' + e.group.toLowerCase() + ' ' + e.desc.toLowerCase() + ' ' + (e.k || ''), s = 0;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i]; if (hay.indexOf(t) < 0) return 0;
      s += title.indexOf(t) === 0 ? 8 : title.indexOf(' ' + t) > -1 ? 6 : title.indexOf(t) > -1 ? 4 : e.id.indexOf(t) > -1 ? 3 : e.group.toLowerCase().indexOf(t) > -1 ? 2 : 1;
    }
    return s;
  }
  var TYPE = { component: 'Component', template: 'Template', page: 'Page' };
  function opt(e, n) {
    return '<li role="option" id="pal-o-' + n + '" aria-selected="false" class="pal-o" data-url="' + e.url + '"><span><b>' + esc(e.title) + '</b><small>' + esc(e.desc) + '</small></span><span class="pal-t">' + (e.t === 'component' || e.t === 'template' ? esc(e.group) : TYPE[e.t]) + '</span></li>';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function renderPal() {
    if (!palData) return;
    var q = palIn.value.trim().toLowerCase(), html = '', n = 0;
    if (!q) {
      var pages = palData.filter(function (e) { return e.t === 'page'; }), pop = POPULAR.map(function (id) { return palData.filter(function (e) { return e.id === id; })[0]; }).filter(Boolean);
      html += '<li class="pal-h" role="presentation">Go to</li>' + pages.map(function (e) { return opt(e, n++); }).join('') + '<li class="pal-h" role="presentation">Popular components</li>' + pop.map(function (e) { return opt(e, n++); }).join('');
    } else {
      var toks = q.split(/\s+/), res = palData.map(function (e) { return [score(e, toks), e]; }).filter(function (x) { return x[0] > 0; }).sort(function (a, b) { return b[0] - a[0]; }).slice(0, 12);
      html = res.length ? res.map(function (x) { return opt(x[1], n++); }).join('') : '<li class="pal-none" role="presentation">No match for “' + esc(palIn.value.trim()) + '”. Try a group such as charts or buttons.</li>';
    }
    palList.innerHTML = html; palItems = $$('[role=option]', palList); select(0);
  }
  function openPal(e) {
    if (!palEl) buildPal();
    if (!palEl.hidden) return;
    if (e) e.preventDefault();
    palOpener = document.activeElement; closeMenu();
    palEl.hidden = false; document.body.classList.add('pal-open');
    $$('body > :not(#pal-back):not(script)').forEach(function (el) { el.setAttribute('inert', ''); });
    palIn.value = ''; palList.innerHTML = '<li class="pal-none" role="presentation">Loading…</li>'; palItems = [];
    palIn.focus();
    loadData().then(function () { renderPal(); });
  }
  function closePal() {
    if (!palEl || palEl.hidden) return;
    palEl.hidden = true; document.body.classList.remove('pal-open');
    $$('body > [inert]').forEach(function (el) { el.removeAttribute('inert'); });
    if (palOpener && palOpener.focus) palOpener.focus();
  }
  if (searchBtn) { searchBtn.addEventListener('click', openPal); searchBtn.addEventListener('pointerenter', loadData, { once: true }); searchBtn.addEventListener('focus', loadData, { once: true }); }
  document.addEventListener('keydown', function (e) {
    var t = e.target, typing = t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { openPal(e); }
    else if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) {
      var q = $('#cat-q'); if (q) { e.preventDefault(); q.focus(); q.select(); } else openPal(e);
    }
  });

  /* ---- component catalogue ---- */
  var tilesEl = $('#tiles');
  if (tilesEl) (function () {
    var tiles = $$('.tile', tilesEl), qIn = $('#cat-q'), countEl = $('#cat-count'), more = $('#cat-more'), empty = $('#cat-empty'), clear = $('#cat-clear'), links = $$('#groups a');
    var total = tiles.length, state = { g: '', q: '', shown: 0 };
    var page = function () { return window.matchMedia('(max-width: 640px)').matches ? 12 : 24; };
    var names = {}; links.forEach(function (a) { names[a.dataset.g] = $('span', a).textContent; });
    tiles.forEach(function (t, i) { t.dataset.i = i; t._name = $('h3', t).textContent.toLowerCase(); t._hay = (t._name + ' ' + $('.tag', t).textContent + ' ' + $('.tile-d', t).textContent + ' ' + $('.tile-s', t).textContent + ' ' + t.dataset.k).toLowerCase(); });
    function readUrl() { var p = new URLSearchParams(location.search); state.g = names[p.get('g')] !== undefined ? p.get('g') || '' : ''; state.q = (p.get('q') || '').slice(0, 60); state.shown = page(); if (qIn) qIn.value = state.q; }
    function writeUrl(push) {
      var p = new URLSearchParams(); if (state.g) p.set('g', state.g); if (state.q) p.set('q', state.q);
      var url = location.pathname + (p.toString() ? '?' + p.toString() : '');
      try { history[push ? 'pushState' : 'replaceState']({}, '', url); } catch (e) { /* file: */ }
    }
    function tileScore(t, toks) { var s = 0; for (var i = 0; i < toks.length; i++) { var k = toks[i]; if (t._hay.indexOf(k) < 0) return 0; s += t._name.indexOf(k) === 0 ? 8 : t._name.indexOf(k) > -1 ? 5 : t.dataset.id.indexOf(k) > -1 ? 3 : 1; } return s; }
    function render() {
      var toks = state.q.toLowerCase().split(/\s+/).filter(Boolean), list = [];
      tiles.forEach(function (t) { if (state.g && t.dataset.g !== state.g) return; var s = toks.length ? tileScore(t, toks) : 1; if (s > 0) list.push([s, t]); });
      list.sort(function (a, b) { return toks.length ? b[0] - a[0] || a[1].dataset.i - b[1].dataset.i : a[1].dataset.i - b[1].dataset.i; });
      var order = list.map(function (x) { return x[1]; }), frag = document.createDocumentFragment();
      order.forEach(function (t) { frag.appendChild(t); });
      tiles.forEach(function (t) { if (order.indexOf(t) < 0) frag.appendChild(t); });
      tilesEl.appendChild(frag);
      var shown = Math.min(order.length, state.shown);
      tiles.forEach(function (t) { t.hidden = true; });
      order.slice(0, shown).forEach(function (t) { t.hidden = false; });
      var what = state.g ? names[state.g].toLowerCase() : 'components', n = order.length;
      var msg = n === 0 ? 'No results' : (toks.length ? n + (n === 1 ? ' result' : ' results') + ' for “' + state.q + '”' + (state.g ? ' in ' + what : '') : (shown < n ? 'Showing ' + shown + ' of ' + n + ' ' + what : n + ' ' + what));
      countEl.textContent = msg;
      more.hidden = shown >= n; more.textContent = 'Show ' + Math.min(page(), n - shown) + ' more';
      empty.hidden = n !== 0; tilesEl.hidden = n === 0;
      if (n === 0) $('#cat-eq').textContent = state.q || names[state.g] || '';
      clear.hidden = !(state.g || state.q);
      links.forEach(function (a) { if (a.dataset.g === state.g) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      document.title = (state.g ? names[state.g] + ' · ' : '') + 'Components · ' + total + ' live React components · Sitewright';
    }
    readUrl(); render();
    if (qIn) qIn.addEventListener('input', function () { state.q = qIn.value.trim(); state.shown = page(); writeUrl(false); render(); });
    links.forEach(function (a) { a.addEventListener('click', function (e) { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; e.preventDefault(); state.g = a.dataset.g; state.shown = page(); writeUrl(true); render(); }); });
    more.addEventListener('click', function () { state.shown += page(); render(); });
    function reset() { state.g = ''; state.q = ''; state.shown = page(); if (qIn) qIn.value = ''; writeUrl(true); render(); }
    clear.addEventListener('click', reset); $('#cat-reset').addEventListener('click', reset);
    window.addEventListener('popstate', function () { readUrl(); render(); });
  })();

  /* ---- component detail ---- */
  var wrap = $('#stage-wrap');
  if (wrap && !wrap.hidden) (function () {
    var id = wrap.dataset.id, stage = $('#stage'), frame = $('#pv'), full = $('#full'), label = $('#stage-w');
    var themeBtns = $$('.seg [data-theme]', wrap), wBtns = $$('[data-w]', wrap), base = frame.dataset.src, theme = curTheme(), w = 480, loaded = false;
    function setTheme(t, fromSite) {
      theme = t; stage.dataset.theme = t;
      themeBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.theme === t ? 'true' : 'false'); });
      full.href = base + previewQuery(t); frame.style.colorScheme = t; postTheme(frame, t);
    }
    function setWidth(v) {
      w = v; stage.style.setProperty('--sw', v + 'px'); label.textContent = v + ' px';
      wBtns.forEach(function (b) { b.setAttribute('aria-pressed', Number(b.dataset.w) === v ? 'true' : 'false'); });
    }
    function fit() {
      var avail = stage.clientWidth, vis = 0;
      wBtns.forEach(function (b) { var ok = Number(b.dataset.w) <= avail; b.hidden = !ok; if (ok) vis++; });
      wBtns[0].parentNode.hidden = vis < 2;
      label.textContent = Math.min(w, avail) + ' px';
    }
    function load() { frame.src = base + previewQuery(theme); loaded = true; }
    themeBtns.forEach(function (b) { b.addEventListener('click', function () { setTheme(b.dataset.theme); }); });
    wBtns.forEach(function (b) { b.addEventListener('click', function () { setWidth(Number(b.dataset.w)); fit(); }); });
    $('#replay').addEventListener('click', function () { try { frame.contentWindow.location.reload(); } catch (e) { load(); } });
    frame.addEventListener('load', function () { postTheme(frame, theme); });
    themeListeners.push(function (t) { setTheme(t); });
    window.addEventListener('resize', fit);
    setTheme(theme); setWidth(480); fit(); load();
  })();
})();
