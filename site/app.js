/* Sitewright website: theme, menu, reveal, build theatre, module configurator, live embeds (backgrounds, figures, components), icon demo,
   colour preview, steps, gallery, install tabs, copy buttons. No dependencies. Every moving part has a still, finished state for
   reduced-motion and no-script visitors. */
(function () {
  'use strict';
  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* ---- theme ---- */
  var themeBtn = $('#theme');
  function isDark() { return root.dataset.theme ? root.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches; }
  function paintTheme() {
    themeBtn.setAttribute('aria-label', isDark() ? 'Switch to light theme' : 'Switch to dark theme');
    themeBtn.innerHTML = isDark()
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z"/></svg>';
  }
  themeBtn.addEventListener('click', function () {
    var next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('sitewright-theme', next); } catch (e) { /* private mode */ }
    paintTheme(); reloadEmbeds();
  });
  paintTheme();

  /* ---- mobile menu ---- */
  var menu = $('#menu'), nav = $('#nav');
  function closeMenu() { nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }
  menu.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  $$('a', nav).forEach(function (a) { a.addEventListener('click', closeMenu); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  /* ---- reveal on scroll ---- */
  var reveals = $$('.reveal');
  if (reduced || !hasIO) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    reveals.forEach(function (el, i) { el.style.transitionDelay = (i % 4) * 40 + 'ms'; io.observe(el); });
    // never leave anything hidden if the observer misbehaves
    setTimeout(function () { reveals.forEach(function (el) { el.classList.add('in'); }); }, 4500);
  }

  /* ---- scroll progress ---- */
  var bar = $('#progress'), ticking = false;
  function paintProgress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')'; ticking = false;
  }
  if (!reduced) window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(paintProgress); } }, { passive: true });

  /* ---- magnetic buttons and tilting cards (fine pointers only) ---- */
  if (fine && !reduced) {
    $$('.mag').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.16).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.22).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
    $$('.tilt').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(900px) rotateX(' + (-y * 5).toFixed(2) + 'deg) rotateY(' + (x * 6).toFixed(2) + 'deg) translateY(-4px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
  }

  /* ---- count-up numbers ---- */
  var counts = $$('.count');
  function fmt(n, plus) { return n.toLocaleString('en-GB') + (plus ? '+' : ''); }
  if (!reduced && hasIO) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return; cio.unobserve(en.target);
        var el = en.target, to = Number(el.dataset.to), plus = !!el.dataset.plus, t0 = null;
        function step(t) { if (t0 === null) t0 = t; var p = Math.min(1, (t - t0) / 1100), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(Math.round(to * e), plus && p === 1); if (p < 1) requestAnimationFrame(step); }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    counts.forEach(function (el) { cio.observe(el); });
  }

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

  /* ---- module configurator ---- */
  var cfg = $('#cfg');
  if (cfg) {
    var data = JSON.parse(cfg.dataset.mods), picks = { landing: true, dashboard: true };
    var NAMES = { landing: 'a landing page', signin: 'sign-in', mfa: 'MFA accounts', publishing: 'a publishing page', dashboard: 'a dashboard', connect: 'a connect-to-phone page' };
    var chips = $$('.cfg-chip', cfg);
    var addedFor = function () {
      var added = {};
      var add = function (m) { (data[m].requires || []).forEach(function (r) { if (!picks[r]) added[r] = true; add(r); }); };
      Object.keys(picks).forEach(function (m) { if (picks[m]) add(m); });
      return added;
    };
    var renderCfg = function () {
      var added = addedFor(), chosen = Object.keys(picks).filter(function (m) { return picks[m]; });
      chips.forEach(function (c) {
        var m = c.dataset.m, auto = !!added[m] && !picks[m];
        c.setAttribute('aria-pressed', picks[m] || auto ? 'true' : 'false');
        c.classList.toggle('auto', auto); c.setAttribute('aria-disabled', auto ? 'true' : 'false');
        c.title = auto ? 'Added automatically: another module needs it' : '';
      });
      var say = $('#cfg-say');
      if (!chosen.length) { say.textContent = 'Pick at least one module.'; }
      else {
        var list = chosen.map(function (m) { return '<b>' + NAMES[m] + '</b>'; });
        say.innerHTML = 'Use Sitewright to make ' + (list.length > 1 ? list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1] : list[0]) + '.';
      }
      var needsApi = chosen.concat(Object.keys(added)).some(function (m) { return (data[m].requires || []).indexOf('api') > -1; });
      var all = chosen.slice(); Object.keys(added).forEach(function (m) { if (all.indexOf(m) < 0) all.push(m); });
      var pages = [], api = [];
      all.forEach(function (m) {
        data[m].pages.forEach(function (p) { pages.push([p, !picks[m]]); });
        data[m].api.forEach(function (p) { api.push([p, !picks[m]]); });
      });
      var fill = function (ul, items, what) {
        ul.innerHTML = items.length ? items.map(function (x) { return '<li' + (x[1] ? ' class="auto"' : '') + '>' + x[0] + '</li>'; }).join('') : '<li class="none">no ' + what + '</li>';
      };
      fill($('#cfg-pages'), pages, 'pages'); fill($('#cfg-api'), api, 'API routes');
      var extra = Object.keys(added);
      $('#cfg-sum').textContent = chosen.length ? pages.length + ' pages and ' + api.length + ' API routes' + (extra.length ? ' (' + extra.join(', ') + ' added automatically, in violet)' : '') + '.' : '';
    };
    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        if (c.getAttribute('aria-disabled') === 'true') return;
        var m = c.dataset.m; picks[m] = !picks[m]; renderCfg();
      });
    });
    renderCfg();
  }

  /* ---- steps + terminal ---- */
  var steps = $$('.step'), panes = $$('.term .pane');
  function showStep(i) {
    steps.forEach(function (s, k) { s.classList.toggle('on', k === i); s.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
    panes.forEach(function (p, k) { p.classList.toggle('on', k === i); });
  }
  steps.forEach(function (s, i) { s.addEventListener('click', function () { stopAuto(); showStep(i); }); });
  var auto = null, cur = 0;
  function stopAuto() { if (auto) { clearInterval(auto); auto = null; } }
  if (!reduced && hasIO && $('.term')) {
    var termIO = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting && !auto) { auto = setInterval(function () { cur = (cur + 1) % steps.length; showStep(cur); }, 4200); }
      else if (!en[0].isIntersecting) { stopAuto(); }
    }, { threshold: 0.5 });
    termIO.observe($('.term'));
    $$('.step, .term').forEach(function (el) { el.addEventListener('pointerenter', stopAuto); });
  }

  /* ---- gallery ---- */
  var A = 'assets/shots/';
  var BRANDS = [
    { id: 'coffee', name: 'Bean & Barrel', tag: 'Small-batch coffee, roasted to order.', colors: ['#7a4a21', '#e8a33d'], url: 'beanandbarrel.example',
      mods: ['landing', 'signin', 'dashboard', 'connect', 'mfa', 'publishing'], main: 'coffee/landing-hero', side: 'coffee/dashboard', phone: 'coffee/dashboard-mobile',
      alt: ['coffee roaster landing page', 'orders dashboard', 'orders dashboard on a phone'] },
    { id: 'legal', name: 'Halden Legal', tag: 'Straight answers on property law. Matters, fees, stages, documents.', colors: ['#1b2a4a', '#c9a227'], url: 'halden.example',
      mods: ['landing', 'signin', 'dashboard', 'connect'], main: 'legal/landing-hero', side: 'legal/dashboard', phone: 'legal/dashboard-mobile',
      alt: ['law firm landing page', 'matters dashboard', 'matters dashboard on a phone'] },
    { id: 'yellow', name: 'Sunny Side Bakery', tag: 'Fresh bread before breakfast. A near-white brand colour, kept readable.', colors: ['#ffe600', '#fff3a0'], url: 'sunnyside.example',
      mods: ['landing', 'signin', 'dashboard'], main: 'yellow/landing-hero', side: 'yellow/dashboard', phone: 'yellow/dashboard-mobile',
      alt: ['bakery landing page', 'bakes dashboard', 'bakes dashboard on a phone'] },
    { id: 'studio', name: 'Pixel Studio', tag: 'Design for small teams. Landing page plus MFA-protected team area.', colors: ['#6d28d9', '#22d3ee'], url: 'pixelstudio.example',
      mods: ['landing', 'mfa'], main: 'studio/landing-hero', side: 'studio/admin-home', phone: 'studio/landing-mobile',
      alt: ['design studio landing page', 'team area with accounts and activity log', 'landing page on a phone'] },
    { id: 'orbit', name: 'Orbit Labs', tag: 'Just the landing page. No database, no sign-in.', colors: ['#5b21b6', '#06b6d4'], url: 'orbit.example',
      mods: ['landing'], main: 'landingonly/landing-hero', side: 'landingonly/landing-story', phone: 'landingonly/landing-mobile',
      alt: ['landing page', 'landing page story section', 'landing page on a phone'] }
  ];
  var tabs = $('#brand-tabs');
  BRANDS.forEach(function (b, i) {
    var t = document.createElement('button');
    t.className = 'tab'; t.type = 'button'; t.setAttribute('role', 'tab'); t.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    t.style.setProperty('--c', b.colors[0] === '#ffe600' ? '#c9b100' : b.colors[0]);
    t.innerHTML = '<i></i>' + b.name.replace('&', '&amp;');
    t.addEventListener('click', function () { show(i); });
    tabs.appendChild(t);
  });
  var imgMain = $('#g-main'), imgSide = $('#g-side'), imgPhone = $('#g-phone');
  function show(i) {
    var b = BRANDS[i];
    $$('.tab', tabs).forEach(function (t, k) { t.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
    imgMain.src = A + b.main + '.jpg'; imgMain.alt = 'Generated ' + b.alt[0];
    imgSide.src = A + b.side + '.jpg'; imgSide.alt = 'Generated ' + b.alt[1];
    imgPhone.src = A + b.phone + '.jpg'; imgPhone.alt = 'Generated ' + b.alt[2];
    $('#g-url').textContent = b.url + ' — generated by Sitewright';
    $('#g-name').textContent = b.name;
    $('#g-tag').textContent = b.tag;
    $('#g-modules').innerHTML = b.mods.map(function (m) { return '<span>' + m + '</span>'; }).join('');
    $('#g-sw').innerHTML = '<b style="background:' + b.colors[0] + '"></b><b style="background:' + b.colors[1] + '"></b>' + b.colors[0] + ' / ' + b.colors[1];
  }
  show(0);

  /* ---- live embeds: real effects from the exported gallery, loaded only when they scroll near ---- */
  var embeds = $$('iframe.emb');
  function embQuery() { var d = isDark(); return '?theme=' + (d ? 'dark' : 'light') + '&primary=' + encodeURIComponent(d ? '#ff7a3d' : '#c2410c') + '&signal=' + encodeURIComponent(d ? '#5ccfc7' : '#0f766e'); }
  function loadEmbed(f) { if (f.dataset.src) { f.src = f.dataset.src + embQuery(); f.dataset.live = '1'; } }
  function reloadEmbeds() { embeds.forEach(function (f) { if (f.dataset.live) loadEmbed(f); }); }
  if (hasIO) {
    var eio = new IntersectionObserver(function (entries) { entries.forEach(function (en) { if (en.isIntersecting) { loadEmbed(en.target); eio.unobserve(en.target); } }); }, { rootMargin: '300px 0px' });
    embeds.forEach(function (f) { eio.observe(f); });
  } else { embeds.forEach(loadEmbed); }

  function stagePicker(groupId, stageId, kind, onPick) {
    var group = $(groupId), stage = $(stageId); if (!group || !stage) return;
    var frame = $('iframe', stage), btns = $$('.chip', group);
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.setAttribute('aria-checked', x === b ? 'true' : 'false'); });
        frame.dataset.src = 'demo/effects/' + kind + '/' + b.dataset.id + '/'; loadEmbed(frame);
        onPick(b);
      });
    });
    var cur0 = btns.filter(function (b) { return b.getAttribute('aria-checked') === 'true'; })[0]; if (cur0) onPick(cur0);
  }
  stagePicker('#bg-chips', '#bg-stage', 'bg', function (b) { $('#bg-name').textContent = b.textContent; });
  stagePicker('#fig-chips', '#fig-stage', 'f', function (b) { $('#fig-cap').textContent = b.textContent + ': ' + b.dataset.desc; });

  /* ---- icon demo: a few words in, an icon out (a small sample of the kit's real word table) ---- */
  var icIn = $('#ic-words');
  if (icIn) {
    var svgs = {};
    $$('.ic-strip li').forEach(function (li) { var s = $('svg', li); if (s) svgs[li.getAttribute('title')] = s.outerHTML; });
    var WORDS = { coffee: 'coffee', roast: 'coffee', ship: 'truck', shipped: 'truck', delivery: 'truck', delivered: 'truck', truck: 'truck', order: 'package', orders: 'package', package: 'package', parcel: 'package',
      pay: 'credit-card', payment: 'credit-card', payments: 'credit-card', card: 'credit-card', stats: 'chart-line', sales: 'chart-line', revenue: 'chart-line', growth: 'chart-line', chart: 'chart-line',
      team: 'users', customers: 'users', customer: 'users', users: 'users', people: 'users', security: 'lock', lock: 'lock', password: 'lock', mobile: 'smartphone', phone: 'smartphone', device: 'smartphone',
      scan: 'qr-code', code: 'qr-code', calendar: 'calendar', date: 'calendar', schedule: 'calendar', email: 'mail', mail: 'mail', message: 'mail', location: 'map-pin', address: 'map-pin', map: 'map-pin',
      verified: 'shield-check', secure: 'shield-check', launch: 'rocket', release: 'rocket', home: 'house', photo: 'camera', photos: 'camera', camera: 'camera', documents: 'file-text', document: 'file-text', invoice: 'file-text', notes: 'file-text',
      alerts: 'bell', alert: 'bell', notifications: 'bell', search: 'search', find: 'search', favourite: 'star', favorites: 'star', rating: 'star', love: 'heart', health: 'heart', wifi: 'wifi', connect: 'wifi' };
    var pick = $('#ic-pick'), echo = $('#ic-echo');
    var renderIc = function () {
      var v = icIn.value; echo.textContent = v;
      var name = null; v.toLowerCase().split(/[^a-z]+/).forEach(function (w) { if (!name && WORDS[w] && svgs[WORDS[w]]) name = WORDS[w]; });
      pick.innerHTML = name ? svgs[name] : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 9a4 4 0 1 1 6 3.4c-1.2.7-2 1.3-2 2.6M12 19h.01"/></svg>';
      pick.title = name ? name : 'no match in this small sample';
      pick.classList.remove('pop'); void pick.offsetWidth; if (!reduced) pick.classList.add('pop');
    };
    icIn.addEventListener('input', renderIc); renderIc();
  }

  /* ---- colour preview ---- */
  var tw = $('#tw-card');
  if (tw) {
    var lum = function (hex) { var c = [1, 3, 5].map(function (i) { var v = parseInt(hex.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
    var paintTw = function () {
      var p = $('#tw-p').value, s = $('#tw-s').value;
      tw.style.setProperty('--tp', p); tw.style.setProperty('--ts', s);
      $('.tw-btn', tw).style.color = lum(p) > 0.45 ? '#0b1020' : '#ffffff';
    };
    $('#tw-p').addEventListener('input', paintTw); $('#tw-s').addEventListener('input', paintTw);
    $('#tw-mode').addEventListener('click', function () { var on = tw.classList.toggle('dark'); this.setAttribute('aria-pressed', on ? 'true' : 'false'); this.textContent = on ? 'Light preview' : 'Dark preview'; });
    paintTw();
  }

  /* ---- install tabs ---- */
  var osBtns = $$('.os-tabs button');
  var guess = /Win/i.test(navigator.platform || navigator.userAgent) ? 'win' : 'mac';
  function showOs(id) {
    osBtns.forEach(function (b) { b.setAttribute('aria-selected', b.dataset.os === id ? 'true' : 'false'); });
    $$('.panel').forEach(function (p) { p.classList.toggle('on', p.dataset.panel === id); });
  }
  osBtns.forEach(function (b) { b.addEventListener('click', function () { showOs(b.dataset.os); }); });
  showOs(guess);

  /* ---- copy buttons ---- */
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var done = function () { var o = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = o; }, 1500); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
      function fallback() {
        var ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { btn.textContent = 'Select & copy'; }
        document.body.removeChild(ta);
      }
    });
  });
})();
