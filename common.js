/* =============================================================
   Kamado Car Wash: common.js (loaded on every page)

   Shared helpers used by the other scripts (window.Kamado) plus
   small site-wide behaviours:
     - "Open now / Closed" badges (Johannesburg time)
     - header shadow on scroll, back-to-top button
     - wash-lane animation trigger (home page)
     - animated counters (about page)
     - "Share this page" links built from the canonical URL
   ============================================================= */
(function (window, document) {
  'use strict';

  var Kamado = window.Kamado = window.Kamado || {};

  /**
   * The recipient of the contact-form email. CHANGE THIS to a mailbox you
   * control (for example your student email) so you can prove the email
   * hand-off works when your lecturer tests it. ".example" is a reserved
   * name that can never belong to a real person.
   */
  Kamado.CONTACT_EMAIL = 'info@kamadocarwash.example';

  /* ---------- Opening hours and time (always Johannesburg time) ---------- */
  Kamado.TZ = 'Africa/Johannesburg';
  Kamado.HOURS = { open: 7 * 60, close: 17 * 60, label: '07:00\u201317:00' }; // minutes since midnight, every day

  /**
   * Returns the date/time parts for "now" in Johannesburg, whatever the
   * visitor's own time zone is. `iso` is YYYY-MM-DD, `minutes` is minutes
   * since midnight, `dow` is 0 (Sunday) to 6 (Saturday).
   */
  Kamado.joburgNow = function (date) {
    var parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: Kamado.TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short'
    }).formatToParts(date || new Date());
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    var dowMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    var hour = parseInt(o.hour, 10) % 24;
    return {
      year: +o.year, month: +o.month, day: +o.day,
      hour: hour, minute: +o.minute, minutes: hour * 60 + (+o.minute),
      dow: dowMap[o.weekday],
      iso: o.year + '-' + o.month + '-' + o.day
    };
  };

  Kamado.openStatus = function (date) {
    var m = Kamado.joburgNow(date).minutes;
    if (m >= Kamado.HOURS.open && m < Kamado.HOURS.close) {
      return { open: true, text: 'Open now, until 17:00' };
    }
    return { open: false, text: m < Kamado.HOURS.open ? 'Closed, opens today at 07:00' : 'Closed, opens tomorrow at 07:00' };
  };

  /* ---------- Formatting ---------- */
  Kamado.formatRand = function (n) {
    var whole = Math.round(n) === n;
    return 'R' + Number(n).toLocaleString('en-ZA', {
      minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2
    }).replace(/[\u00a0\u202f]/g, ' ');
  };

  Kamado.prefersReducedMotion = function () {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  };

  /**
   * Tiny element builder so pages are built with createElement/textContent
   * (never innerHTML), which keeps user-supplied text from becoming markup.
   *   Kamado.el('p', { class: 'x', text: 'Hello' }, [childNode, 'text'])
   */
  Kamado.el = function (tag, attrs, kids) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      var v = attrs[key];
      if (v === null || v === undefined || v === false) { return; }
      if (key === 'class') { node.className = v; }
      else if (key === 'text') { node.textContent = v; }
      else if (key.slice(0, 2) === 'on' && typeof v === 'function') { node.addEventListener(key.slice(2), v); }
      else { node.setAttribute(key, v === true ? '' : v); }
    });
    (kids || []).forEach(function (child) {
      if (child === null || child === undefined) { return; }
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  };

  /* ---------- Service data (single source of truth for prices) ---------- */
  var servicesPromise = null;

  /**
   * Loads data/services.json with fetch(). If that fails (for example when the
   * page is opened straight from disk, where browsers block fetch), it falls
   * back to the same data embedded in js/services-data.js.
   */
  Kamado.loadServices = function () {
    if (servicesPromise) { return servicesPromise; }
    servicesPromise = fetch('data/services.json', { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        return res.json();
      })
      .catch(function () {
        if (window.KAMADO_SERVICES_FALLBACK) { return window.KAMADO_SERVICES_FALLBACK; }
        throw new Error('Service data is unavailable');
      });
    return servicesPromise;
  };

  /* ---------- Site-wide behaviours ---------- */
  function initOpenStatus() {
    var pills = document.querySelectorAll('[data-open-status]');
    if (!pills.length) { return; }
    function update() {
      var s = Kamado.openStatus();
      pills.forEach(function (pill) {
        pill.textContent = s.text;
        pill.classList.toggle('is-closed', !s.open);
      });
    }
    update();
    window.setInterval(update, 60000);
  }

  function initHeaderShadow() {
    var header = document.querySelector('.site-header');
    if (!header) { return; }
    var ticking = false;
    function update() {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  function initBackToTop() {
    var btn = Kamado.el('button', { type: 'button', class: 'to-top', 'aria-label': 'Back to top', text: '\u2191' });
    document.body.appendChild(btn);
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: Kamado.prefersReducedMotion() ? 'auto' : 'smooth' });
    });
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) { return; }
      ticking = true;
      window.requestAnimationFrame(function () {
        btn.classList.toggle('is-visible', window.scrollY > 700);
        ticking = false;
      });
    }, { passive: true });
  }

  // Home page: start the wash-lane animation once, when it scrolls into view.
  function initLane() {
    var track = document.querySelector('.lane-track');
    if (!track) { return; }
    if (!('IntersectionObserver' in window)) { track.classList.add('lane-run'); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) {
        track.classList.add('lane-run');
        io.disconnect();
      }
    }, { threshold: 0.35 });
    io.observe(track);
  }

  // About page: numbers count up once when they scroll into view.
  function initCounters() {
    var counters = document.querySelectorAll('[data-count]');
    if (!counters.length) { return; }

    function render(el, value) {
      el.textContent = (el.getAttribute('data-prefix') || '') + Math.round(value) + (el.getAttribute('data-suffix') || '');
    }

    function run(el) {
      var target = parseFloat(el.getAttribute('data-count'));
      if (Kamado.prefersReducedMotion() || !window.requestAnimationFrame) { render(el, target); return; }
      var duration = 1300, start = null;
      function frame(ts) {
        if (start === null) { start = ts; }
        var t = Math.min((ts - start) / duration, 1);
        render(el, target * (1 - Math.pow(1 - t, 3))); // ease-out
        if (t < 1) { window.requestAnimationFrame(frame); }
      }
      window.requestAnimationFrame(frame);
    }

    if (!('IntersectionObserver' in window)) { return; } // the real numbers are already in the HTML
    counters.forEach(function (el) { render(el, 0); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { run(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { io.observe(el); });
  }

  // Footer: share links built from the page's canonical URL (works on any domain).
  function initShare() {
    var host = document.querySelector('.footer-bottom');
    var canonical = document.querySelector('link[rel="canonical"]');
    if (!host || !canonical) { return; }
    var url = canonical.href;
    var text = document.title;
    var links = [
      ['WhatsApp', 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + url)],
      ['Facebook', 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url)],
      ['X', 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text)]
    ];
    var list = Kamado.el('p', { class: 'share' }, [Kamado.el('span', { text: 'Share this page:' })]);
    links.forEach(function (l) {
      list.appendChild(Kamado.el('a', { href: l[1], target: '_blank', rel: 'noopener noreferrer', text: l[0] }));
    });
    host.appendChild(list);
  }

  function init() {
    initOpenStatus();
    initHeaderShadow();
    initBackToTop();
    initLane();
    initCounters();
    initShare();
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})(window, document);
