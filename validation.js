/* =============================================================
   Kamado Car Wash: validation.js (enquiry and contact pages)

   A small form-validation library used by both forms.

   How validation is layered:
     1. HTML5 attributes on each field (required, type, minlength,
        maxlength, min, max, pattern) describe the rules, so the form
        is still checked by the browser if this script fails to load.
     2. This script turns the browser's own pop-ups off (novalidate)
        and re-checks every rule itself, adding checks HTML5 cannot do:
        South African phone numbers, names, dates, cross-field rules.
     3. Errors show next to each field, in a summary at the top of the
        form, and are announced to screen readers (aria-invalid,
        aria-describedby, focus moves to the summary).
   ============================================================= */
(function (window, document) {
  'use strict';

  var K = window.Kamado;
  var KF = window.KamadoForm = {};

  /* ---------- Cleaning user input ---------- */
  var CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

  /** Single-line text: strips control characters and collapses whitespace. */
  KF.clean = function (value) {
    return String(value === null || value === undefined ? '' : value)
      .normalize('NFKC').replace(CONTROL_CHARS, '').replace(/\s+/g, ' ').trim();
  };

  /** Multi-line text (messages): keeps line breaks, removes control characters. */
  KF.cleanMultiline = function (value) {
    return String(value === null || value === undefined ? '' : value)
      .normalize('NFKC').replace(/\r\n?/g, '\n').replace(CONTROL_CHARS, '')
      .replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  };

  /* ---------- Format checks ---------- */
  KF.isEmail = function (v) {
    return v.length <= 254 &&
      /^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(v);
  };

  KF.isName = function (v) {
    return /^[\p{L}][\p{L}\p{M}' .-]{1,59}$/u.test(v);
  };

  /**
   * South African phone numbers: 0XX XXX XXXX, +27 XX XXX XXXX or 0027 ...
   * Returns null when invalid, otherwise both display formats.
   */
  KF.normalisePhone = function (raw) {
    var s = String(raw || '').replace(/[\s\-().]/g, '');
    var m = /^(?:\+27|0027|0)([1-9]\d{8})$/.exec(s);
    if (!m) { return null; }
    var n = m[1];
    var tail = n.slice(0, 2) + ' ' + n.slice(2, 5) + ' ' + n.slice(5);
    return { national: '0' + tail, international: '+27 ' + tail };
  };

  /* ---------- Dates (all as YYYY-MM-DD strings, no time-zone surprises) ---------- */
  KF.parseISODate = function (iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) { return null; }
    var y = +m[1], mo = +m[2], d = +m[3];
    var dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) { return null; } // e.g. 30 Feb
    return { y: y, m: mo, d: d, dow: dt.getUTCDay() };
  };

  KF.addDays = function (iso, days) {
    var p = KF.parseISODate(iso);
    var dt = new Date(Date.UTC(p.y, p.m - 1, p.d + days));
    return dt.getUTCFullYear() + '-' + String(dt.getUTCMonth() + 1).padStart(2, '0') + '-' + String(dt.getUTCDate()).padStart(2, '0');
  };

  KF.formatDate = function (iso) {
    var p = KF.parseISODate(iso);
    if (!p) { return iso; }
    return new Intl.DateTimeFormat('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
      .format(new Date(Date.UTC(p.y, p.m - 1, p.d)));
  };

  /* ---------- Field rules ---------- */
  var labelCache = new WeakMap();

  KF.labelText = function (field) {
    if (labelCache.has(field)) { return labelCache.get(field); }
    var label = field.id ? document.querySelector('label[for="' + field.id + '"]') : null;
    var text = label ? label.textContent.replace(/\*/g, '').replace(/\s+/g, ' ').trim() : (field.name || 'This field');
    labelCache.set(field, text);
    return text;
  };

  function lower(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

  /** Returns an error message, or '' when the field is valid. */
  KF.validateField = function (field) {
    if (field.disabled || field.type === 'hidden') { return ''; }
    var label = KF.labelText(field);
    var tag = field.tagName;
    var value = field.type === 'checkbox' ? (field.checked ? 'on' : '') : field.value.trim();

    // 1. required
    if (field.required && !value) {
      if (field.type === 'checkbox') { return 'Tick this box to continue.'; }
      if (tag === 'SELECT') { return 'Choose an option for ' + lower(label) + '.'; }
      if (field.type === 'date') { return 'Choose a date.'; }
      if (field.type === 'number') { return 'Enter a number for ' + lower(label) + '.'; }
      return 'Enter ' + lower(label) + '.';
    }
    if (!value) { return ''; } // optional and empty: nothing more to check

    // 2. length
    var min = parseInt(field.getAttribute('minlength'), 10);
    var max = parseInt(field.getAttribute('maxlength'), 10);
    if (min && value.length < min) { return 'Use at least ' + min + ' characters (you have ' + value.length + ').'; }
    if (max && value.length > max) { return 'Use no more than ' + max + ' characters (you have ' + value.length + ').'; }

    // 3. type and custom format rules
    var rule = field.getAttribute('data-rule');
    if (rule === 'name' && !KF.isName(value)) { return 'Use letters, spaces, hyphens or apostrophes only (2\u201360 characters).'; }
    if ((rule === 'email' || field.type === 'email') && !KF.isEmail(value)) { return 'Enter an email address like name@example.com.'; }
    if (rule === 'phone' && !KF.normalisePhone(value)) { return 'Enter a South African number, for example 071 234 5678 or +27 71 234 5678.'; }

    if (field.type === 'date') {
      if (!KF.parseISODate(value)) { return 'Enter a real date in the format YYYY-MM-DD.'; }
      var dmin = field.getAttribute('min'), dmax = field.getAttribute('max');
      if (dmin && value < dmin) { return 'Choose ' + KF.formatDate(dmin) + ' or later.'; }
      if (dmax && value > dmax) { return 'Choose ' + KF.formatDate(dmax) + ' or earlier.'; }
    }

    if (field.type === 'number') {
      var n = Number(value);
      var nmin = field.getAttribute('min'), nmax = field.getAttribute('max');
      if (!isFinite(n) || !/^-?\d+$/.test(value)) { return 'Enter a whole number.'; }
      if (nmin !== null && n < Number(nmin)) { return 'Enter a number from ' + nmin + (nmax !== null ? ' to ' + nmax : ' upwards') + '.'; }
      if (nmax !== null && n > Number(nmax)) { return 'Enter a number from ' + (nmin !== null ? nmin : '0') + ' to ' + nmax + '.'; }
    }

    return '';
  };

  /* ---------- Showing errors ---------- */
  function describedBy(field, id, add) {
    var ids = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    var i = ids.indexOf(id);
    if (add && i === -1) { ids.push(id); }
    if (!add && i !== -1) { ids.splice(i, 1); }
    if (ids.length) { field.setAttribute('aria-describedby', ids.join(' ')); }
    else { field.removeAttribute('aria-describedby'); }
  }

  KF.setError = function (field, message) {
    var id = field.id + '-error';
    var el = document.getElementById(id);
    if (!el && !message) {
      // Nothing to show and nothing to clear: only update the field's own state.
      field.classList.remove('is-invalid');
      field.classList.toggle('is-valid', !!field.value.trim() && field.type !== 'checkbox' && !field.disabled);
      field.removeAttribute('aria-invalid');
      return;
    }
    if (!el) {
      el = K.el('p', { id: id, class: 'field-error', hidden: true });
      var row = field.closest('.form-row');
      if (row && row.classList.contains('checkbox-row')) { row.insertAdjacentElement('afterend', el); }
      else { (row || field.parentNode).appendChild(el); }
    }
    el.textContent = message || '';
    el.hidden = !message;
    field.classList.toggle('is-invalid', !!message);
    field.classList.toggle('is-valid', !message && !!field.value.trim() && field.type !== 'checkbox');
    if (message) { field.setAttribute('aria-invalid', 'true'); }
    else { field.removeAttribute('aria-invalid'); }
    describedBy(field, id, !!message);
  };

  function isCheckable(el) {
    if (!/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) { return false; }
    if (el.disabled || /^(submit|button|hidden|reset)$/.test(el.type) || el.hasAttribute('data-hp')) { return false; }
    return true;
  }

  /** Validates every active field. Returns [{ field, message }]. */
  KF.validateForm = function (form) {
    var errors = [];
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!isCheckable(el)) { return; }
      var msg = KF.validateField(el);
      KF.setError(el, msg);
      if (msg) { errors.push({ field: el, message: msg }); }
    });
    return errors;
  };

  KF.showSummary = function (form, errors) {
    var box = form.querySelector('.form-summary');
    if (!box) {
      box = K.el('div', { class: 'form-summary', tabindex: '-1', hidden: true });
      form.insertBefore(box, form.firstChild);
    }
    box.textContent = '';
    if (!errors.length) { box.hidden = true; return; }

    box.appendChild(K.el('p', { text: errors.length === 1 ? 'One field needs your attention:' : errors.length + ' fields need your attention:' }));
    var list = K.el('ul');
    errors.forEach(function (err) {
      var link = K.el('a', { href: '#' + err.field.id, text: KF.labelText(err.field) + ': ' + err.message });
      link.addEventListener('click', function (ev) { ev.preventDefault(); err.field.focus(); });
      list.appendChild(K.el('li', null, [link]));
    });
    box.appendChild(list);
    box.hidden = false;
    box.focus();
  };

  /**
   * Live feedback: check a field when the person leaves it, and keep
   * re-checking while they fix an error. Also drives character counters.
   */
  KF.attachLive = function (form) {
    form.noValidate = true; // we show our own messages (the HTML5 attributes stay as the rules)

    form.addEventListener('focusout', function (ev) {
      var f = ev.target;
      if (isCheckable(f) && f.id) { KF.setError(f, KF.validateField(f)); }
    });

    function recheck(ev) {
      var f = ev.target;
      if (isCheckable(f) && f.id && f.hasAttribute('aria-invalid')) { KF.setError(f, KF.validateField(f)); }
    }
    form.addEventListener('input', recheck);
    form.addEventListener('change', recheck);

    form.querySelectorAll('textarea[maxlength]').forEach(function (ta) {
      var counter = document.getElementById(ta.id + '-count');
      if (!counter) { return; }
      var max = parseInt(ta.getAttribute('maxlength'), 10);
      function update() {
        counter.textContent = ta.value.length + ' / ' + max;
        counter.classList.toggle('is-near', ta.value.length > max * 0.9);
      }
      ta.addEventListener('input', update);
      form.addEventListener('reset', function () { window.setTimeout(update, 0); });
      update();
    });
  };

  /* ---------- Sending (AJAX) ---------- */
  /**
   * POSTs JSON to the form's action URL with fetch(), without reloading the
   * page. Resolves to { ok, data } or { ok: false, error }; it never throws,
   * so the caller can always show something useful.
   */
  KF.postJSON = function (url, payload, timeoutMs) {
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? window.setTimeout(function () { controller.abort(); }, timeoutMs || 8000) : null;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      if (!res.ok) { throw new Error('HTTP ' + res.status); }
      return res.json().catch(function () { return {}; });
    }).then(function (data) {
      return { ok: true, data: data };
    }).catch(function (err) {
      return { ok: false, error: err && err.name === 'AbortError' ? 'The server took too long to answer.' : 'We could not reach the server.' };
    }).then(function (result) {
      if (timer) { window.clearTimeout(timer); }
      return result;
    });
  };

  KF.setBusy = function (button, busy, busyText) {
    if (!button) { return; }
    if (busy) {
      button.setAttribute('data-label', button.textContent);
      button.textContent = busyText || 'Sending';
    } else if (button.hasAttribute('data-label')) {
      button.textContent = button.getAttribute('data-label');
      button.removeAttribute('data-label');
    }
    button.disabled = busy;
    button.classList.toggle('is-loading', busy);
    button.setAttribute('aria-busy', busy ? 'true' : 'false');
  };

  /** A reference such as KCW-20261029-7F3K to quote in replies. */
  KF.makeReference = function (isoDate) {
    var bytes = new Uint8Array(3);
    if (window.crypto && window.crypto.getRandomValues) { window.crypto.getRandomValues(bytes); }
    else { for (var i = 0; i < 3; i++) { bytes[i] = Math.floor(Math.random() * 256); } }
    var code = Array.prototype.map.call(bytes, function (b) { return b.toString(36).padStart(2, '0'); }).join('').toUpperCase().slice(0, 4);
    return 'KCW-' + String(isoDate).replace(/-/g, '') + '-' + code;
  };

  KF.copyText = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    }
    return new Promise(function (resolve) {
      var ta = K.el('textarea', { 'aria-hidden': 'true', class: 'hp' });
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      resolve(ok);
    });
  };
})(window, document);
