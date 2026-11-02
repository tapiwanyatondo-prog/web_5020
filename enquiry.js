/* =============================================================
   Kamado Car Wash: enquiry.js (enquiry page)

   enquiry.html asks about our services, so once the input has been
   validated the person gets an answer about cost and availability:

     - Single wash   -> itemised price + how busy that branch/time is
     - Membership    -> monthly price compared with pay-per-wash
     - Fleet         -> reference figures + next steps
     - Franchise / feedback -> confirmation and a reference number

   Prices come from data/services.json (via Kamado.loadServices), so
   the services page and this calculator can never disagree.

   The first half of this file is pure logic (no page needed), the
   second half wires it to the form.
   ============================================================= */
(function (window, document) {
  'use strict';

  var K = window.Kamado;
  var KF = window.KamadoForm;

  /* ===================== PART 1: LOGIC ===================== */

  var SLOT_FIRST = 7 * 60;          // 07:00
  var SLOT_LAST = 16 * 60 + 30;     // 16:30 (we close at 17:00)
  var SLOT_STEP = 30;

  var BRANCHES = {
    sandton: 'Kamado Car Wash Sandton',
    randburg: 'Kamado Car Wash Randburg',
    either: 'either branch'
  };

  function pad(n) { return String(n).padStart(2, '0'); }
  function toTime(min) { return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }
  function toMinutes(t) {
    var m = /^(\d{2}):(\d{2})$/.exec(t || '');
    return m ? (+m[1]) * 60 + (+m[2]) : NaN;
  }
  function money(n) { return K.formatRand(n); }

  function slots() {
    var out = [];
    for (var m = SLOT_FIRST; m <= SLOT_LAST; m += SLOT_STEP) { out.push(m); }
    return out;
  }

  /**
   * Typical queue length by day and time. These are planning estimates
   * (commuter rush, Saturday mornings), not live data, and the page says so.
   */
  function traffic(dow, minutes) {
    var t;
    if (dow >= 1 && dow <= 5) {             // Monday to Friday
      if (minutes < 540)      { t = ['moderate', 4, 8]; }   // before 09:00, commuters
      else if (minutes < 660) { t = ['quiet', 0, 3]; }
      else if (minutes < 840) { t = ['moderate', 3, 7]; }   // lunch hour
      else if (minutes < 960) { t = ['quiet', 0, 3]; }
      else                    { t = ['busy', 7, 12]; }      // after-work rush
    } else if (dow === 6) {                 // Saturday
      if (minutes < 480)      { t = ['quiet', 0, 3]; }
      else if (minutes < 840) { t = ['busy', 10, 20]; }
      else                    { t = ['moderate', 5, 10]; }
    } else {                                // Sunday
      if (minutes < 540)      { t = ['quiet', 0, 3]; }
      else if (minutes < 780) { t = ['moderate', 4, 8]; }
      else                    { t = ['quiet', 0, 4]; }
    }
    return { level: t[0], min: t[1], max: t[2] };
  }

  var LEVEL_TEXT = { quiet: 'Quiet', moderate: 'Moderately busy', busy: 'Busy' };

  /**
   * How busy will a branch be at the chosen date and time?
   * `now` is Kamado.joburgNow(), passed in so this can be tested.
   */
  function availability(branch, iso, time, now) {
    var d = KF.parseISODate(iso);
    var minutes = toMinutes(time);
    if (!d || isNaN(minutes)) { return null; }
    var where = BRANCHES[branch] || BRANCHES.either;
    var when = KF.formatDate(iso) + ' at ' + time;

    if (iso < now.iso) {
      return { status: 'past', level: 'busy', text: 'That date has already passed. Choose today or a later date.', tip: '' };
    }
    if (iso === now.iso && minutes <= now.minutes) {
      return { status: 'passed', level: 'busy', text: time + ' has already passed today. Choose a later slot or another day.', tip: '' };
    }

    var t = traffic(d.dow, minutes);
    var wait = t.max === 0 ? 'no wait' : 'a wait of about ' + t.min + '\u2013' + t.max + ' minutes';
    var text = where.charAt(0).toUpperCase() + where.slice(1) + ', ' + when + ': ' + LEVEL_TEXT[t.level].toLowerCase() + ', expect ' + wait + '.';

    // Suggest the quietest later slot on the same day if it is clearly better.
    var best = null;
    slots().forEach(function (s) {
      if (iso === now.iso && s <= now.minutes) { return; }
      var tr = traffic(d.dow, s);
      if (!best || tr.max < best.t.max) { best = { s: s, t: tr }; }
    });
    var tip = '';
    if (best && best.t.max < t.max) {
      tip = 'A quieter option that day: ' + toTime(best.s) + ' (' + (best.t.max === 0 ? 'no wait' : 'about ' + best.t.min + '\u2013' + best.t.max + ' minutes') + ').';
    }
    return { status: 'ok', level: t.level, text: text, tip: tip };
  }

  /** Number of washes per month at which unlimited becomes the cheaper option. */
  function breakEven(memberPrice, washPrice) { return Math.floor(memberPrice / washPrice) + 1; }

  /**
   * Turns validated enquiry data into the answer shown to the visitor.
   * Returns { title, rows[], total, availability, notes[] }.
   */
  function computeResponse(d, services, now) {
    var byId = {};
    services.items.forEach(function (s) { byId[s.id] = s; });
    var res = { title: '', rows: [], total: null, availability: null, notes: [] };

    if (d.enquiryType === 'quote') {
      var pkg = byId[d.package];
      var total = pkg.price;
      res.rows.push({ label: pkg.name + ' wash', value: money(pkg.price) });
      (d.addons || []).forEach(function (id) {
        var a = byId[id];
        if (!a) { return; }
        if (pkg.includes.indexOf(id) !== -1) { res.rows.push({ label: a.name + ' (already included)', value: 'R0' }); }
        else { res.rows.push({ label: a.name, value: money(a.price) }); total += a.price; }
      });
      res.title = 'Your estimate is ' + money(total);
      res.total = { label: 'Estimated total per wash', value: money(total) };
      res.availability = availability(d.branch, d.visitDate, d.visitTime, now);
      var member = services.items.filter(function (s) { return s.category === 'membership' && s.package === pkg.id; })[0];
      if (member) {
        res.notes.push('Washing ' + breakEven(member.price, pkg.price) + ' or more times a month? ' + member.name + ' (' + money(member.price) + ' a month) works out cheaper.');
      }
      res.notes.push('Every wash includes ten minutes at our self-service vacuum bays at no extra cost.');
      res.notes.push('No booking is needed. Drive in during opening hours; the time slot just helps you pick a quieter moment.');

    } else if (d.enquiryType === 'membership') {
      var plan = byId[d.plan];
      var base = byId[plan.package];
      var n = Number(d.washesPerMonth);
      var payg = base.price * n;
      var diff = payg - plan.price;
      res.rows.push({ label: plan.name + ' membership', value: money(plan.price) + ' a month' });
      res.rows.push({ label: n + ' \u00d7 ' + base.name + ' at ' + money(base.price), value: money(payg) + ' a month' });
      if (diff > 0) {
        res.title = plan.name + ' saves you ' + money(diff) + ' a month';
        res.total = { label: 'Monthly saving', value: money(diff) };
      } else if (diff < 0) {
        res.title = 'Pay-per-wash is cheaper for ' + n + ' wash' + (n === 1 ? '' : 'es') + ' a month';
        res.total = { label: 'Pay-per-wash saves', value: money(-diff) + ' a month' };
        res.notes.push(plan.name + ' starts to pay off from ' + breakEven(plan.price, base.price) + ' washes a month.');
      } else {
        res.title = 'Both options cost the same for you';
      }
      res.notes.push('Valid at both locations. Cancel any time.');
      res.notes.push('Preferred start date: ' + KF.formatDate(d.startDate) + '. We will confirm how to activate it.');

    } else if (d.enquiryType === 'fleet') {
      var v = Number(d.vehicles), w = Number(d.fleetWashes), all = v * w;
      res.title = 'Fleet enquiry received';
      res.rows.push({ label: 'Vehicles', value: String(v) });
      res.rows.push({ label: 'Washes per vehicle each month', value: String(w) });
      res.rows.push({ label: 'Washes in total each month', value: String(all) });
      res.rows.push({ label: 'For comparison: Express pay-per-wash', value: money(all * byId.express.price) });
      res.rows.push({ label: 'For comparison: Deluxe pay-per-wash', value: money(all * byId.deluxe.price) });
      res.notes.push('Fleet plans are custom-priced. Your account contact will send a monthly price within one business day.');
      res.notes.push('The comparison figures show what the same washes cost pay-per-wash. They are not a quote.');

    } else if (d.enquiryType === 'franchise') {
      res.title = 'Franchise enquiry received';
      res.rows.push({ label: 'Area of interest', value: d.area });
      res.notes.push('Our team will reply within one business day with the next steps.');

    } else { // feedback
      res.title = 'Thank you for your feedback';
      res.rows.push({ label: 'Branch', value: BRANCHES[d.branch] || BRANCHES.either });
      res.rows.push({ label: 'Date of visit', value: KF.formatDate(d.feedbackDate) });
      res.notes.push('A manager will read your message and reply within one business day.');
    }

    res.notes.push('We will reply to ' + d.email + ' or call ' + d.phoneDisplay + ' if we need anything else.');
    return res;
  }

  window.KamadoEnquiry = {
    slots: slots, traffic: traffic, availability: availability,
    computeResponse: computeResponse, breakEven: breakEven, toTime: toTime
  };

  /* ===================== PART 2: THE FORM ===================== */

  var form = document.getElementById('enquiry-form');
  if (!form) { return; }

  var submitBtn = form.querySelector('button[type="submit"]');
  var typeSelect = document.getElementById('enquiry-type');
  var message = document.getElementById('message');
  var sending = false;

  function byId(id) { return document.getElementById(id); }
  function value(id) {
    var el = byId(id);
    return el && !el.disabled ? el.value : '';
  }

  /* ----- dates and times ----- */
  function setRange(id, min, max) {
    var el = byId(id);
    if (!el) { return; }
    el.setAttribute('min', min);
    el.setAttribute('max', max);
  }

  function buildTimes() {
    var sel = byId('visit-time');
    if (!sel) { return; }
    sel.appendChild(K.el('option', { value: '', text: 'Choose a time' }));
    slots().forEach(function (m) { sel.appendChild(K.el('option', { value: toTime(m), text: toTime(m) })); });
  }

  // Slots that have already passed today cannot be picked.
  function refreshTimes() {
    var sel = byId('visit-time'), dateEl = byId('visit-date');
    if (!sel || !dateEl) { return; }
    var now = K.joburgNow();
    var today = dateEl.value === now.iso;
    Array.prototype.forEach.call(sel.options, function (opt) {
      if (!opt.value) { return; }
      opt.disabled = today && toMinutes(opt.value) <= now.minutes;
    });
    if (sel.selectedOptions[0] && sel.selectedOptions[0].disabled) { sel.value = ''; }
  }

  /** Rules that involve more than one field (date + time). */
  function crossFieldErrors() {
    var errors = [];
    var group = form.querySelector('[data-for~="quote"]');
    if (!group || !group.classList.contains('is-active')) { return errors; }
    var dateEl = byId('visit-date'), timeEl = byId('visit-time');
    var now = K.joburgNow();
    if (dateEl.value === now.iso && now.minutes > SLOT_LAST && !KF.validateField(dateEl)) {
      var msg = 'We have closed for today. Choose tomorrow or a later date.';
      KF.setError(dateEl, msg);
      errors.push({ field: dateEl, message: msg });
    }
    if (dateEl.value === now.iso && timeEl.value && toMinutes(timeEl.value) <= now.minutes) {
      var msg2 = timeEl.value + ' has already passed today. Choose a later slot.';
      KF.setError(timeEl, msg2);
      errors.push({ field: timeEl, message: msg2 });
    }
    return errors;
  }

  /* ----- show only the fields that match the enquiry type ----- */
  function applyType() {
    var type = typeSelect.value;
    form.querySelectorAll('[data-for]').forEach(function (group) {
      var on = group.getAttribute('data-for').split(/\s+/).indexOf(type) !== -1;
      group.classList.toggle('is-active', on);
      group.querySelectorAll('input, select, textarea').forEach(function (el) {
        el.disabled = !on;
        if (!on) { KF.setError(el, ''); el.classList.remove('is-valid'); }
      });
    });
    message.required = type === 'franchise' || type === 'feedback';
    refreshTimes();
  }

  /* ----- links from the services page pre-select the form ----- */
  function prefill() {
    var q = new URLSearchParams(window.location.search);
    function setSelect(id, val) {
      var el = byId(id);
      if (el && val && Array.prototype.some.call(el.options, function (o) { return o.value === val; })) { el.value = val; }
    }
    setSelect('enquiry-type', q.get('type'));
    setSelect('package', q.get('package'));
    setSelect('plan', q.get('plan'));
    var addon = q.get('addon');
    if (addon) {
      var box = form.querySelector('input[name="addons"][value="' + addon.replace(/[^a-z-]/g, '') + '"]');
      if (box) { box.checked = true; }
    }
  }

  /* ----- collect the validated values ----- */
  function collect(now) {
    var phone = KF.normalisePhone(value('phone'));
    var d = {
      reference: KF.makeReference(now.iso),
      submittedAt: new Date().toISOString(),
      fullName: KF.clean(value('full-name')),
      email: KF.clean(value('email')).toLowerCase(),
      phone: phone.international,
      phoneDisplay: phone.national,
      branch: value('branch'),
      enquiryType: value('enquiry-type'),
      message: KF.cleanMultiline(value('message')),
      consent: byId('consent').checked
    };
    if (d.enquiryType === 'quote') {
      d.package = value('package');
      d.addons = Array.prototype.map.call(form.querySelectorAll('input[name="addons"]:checked:not(:disabled)'), function (c) { return c.value; });
      d.visitDate = value('visit-date');
      d.visitTime = value('visit-time');
    } else if (d.enquiryType === 'membership') {
      d.plan = value('plan');
      d.washesPerMonth = Number(value('washes-per-month'));
      d.startDate = value('start-date');
    } else if (d.enquiryType === 'fleet') {
      d.vehicles = Number(value('vehicles'));
      d.fleetWashes = Number(value('fleet-washes'));
    } else if (d.enquiryType === 'franchise') {
      d.area = KF.clean(value('area'));
    } else if (d.enquiryType === 'feedback') {
      d.feedbackDate = value('feedback-date');
    }
    return d;
  }

  /* ----- show the answer ----- */
  function mailtoFallback(d) {
    var lines = ['Reference: ' + d.reference, 'Name: ' + d.fullName, 'Email: ' + d.email, 'Phone: ' + d.phone,
      'Enquiry type: ' + d.enquiryType, 'Branch: ' + (BRANCHES[d.branch] || d.branch), '', d.message || '(no message)'];
    return 'mailto:' + K.CONTACT_EMAIL + '?subject=' + encodeURIComponent('Enquiry ' + d.reference) +
      '&body=' + encodeURIComponent(lines.join('\r\n'));
  }

  function renderResult(res, send, d) {
    var old = byId('enquiry-result');
    if (old) { old.remove(); }

    var panel = K.el('section', { class: 'result', id: 'enquiry-result', tabindex: '-1', 'aria-labelledby': 'result-title' });
    panel.appendChild(K.el('h2', { id: 'result-title', text: res.title }));
    panel.appendChild(K.el('p', { class: 'result-ref', text: 'Reference ' + d.reference }));

    if (send.ok) {
      panel.appendChild(K.el('p', { class: 'result-banner is-ok', role: 'status', text: 'Sent. Our team has your enquiry and will reply to ' + d.email + '.' }));
    } else {
      panel.appendChild(K.el('p', { class: 'result-banner is-warn', role: 'status', text: send.error + ' Your answer is below, but your enquiry has not been sent yet. You can email it to us instead.' }));
    }

    if (res.rows.length) {
      var tbody = K.el('tbody');
      res.rows.forEach(function (r) {
        tbody.appendChild(K.el('tr', null, [K.el('th', { scope: 'row', text: r.label }), K.el('td', { text: r.value })]));
      });
      if (res.total) {
        tbody.appendChild(K.el('tr', { class: 'is-total' }, [K.el('th', { scope: 'row', text: res.total.label }), K.el('td', { text: res.total.value })]));
      }
      panel.appendChild(K.el('table', { class: 'result-table' }, [K.el('caption', { class: 'visually-hidden', text: 'Summary of your enquiry' }), tbody]));
    }

    if (res.availability) {
      var a = res.availability;
      var box = K.el('div', { class: 'availability', 'data-level': a.level }, [
        K.el('p', null, [K.el('strong', { text: 'Availability' })]),
        K.el('p', { text: a.text })
      ]);
      if (a.tip) { box.appendChild(K.el('p', { text: a.tip })); }
      box.appendChild(K.el('p', { class: 'field-hint', text: 'Based on typical traffic, not live queue data.' }));
      panel.appendChild(box);
    }

    if (res.notes.length) {
      var list = K.el('ul', { class: 'result-notes' });
      res.notes.forEach(function (n) { list.appendChild(K.el('li', { text: n })); });
      panel.appendChild(list);
    }

    var actions = K.el('div', { class: 'result-actions' });
    if (!send.ok) { actions.appendChild(K.el('a', { class: 'btn btn-primary', href: mailtoFallback(d), text: 'Email this enquiry' })); }
    actions.appendChild(K.el('button', {
      type: 'button', class: 'btn btn-outline dark', text: 'Edit my enquiry',
      onclick: function () { panel.remove(); form.hidden = false; form.scrollIntoView(); (byId('full-name') || form).focus(); }
    }));
    actions.appendChild(K.el('button', {
      type: 'button', class: 'btn btn-outline dark', text: 'Start a new enquiry',
      onclick: function () { panel.remove(); resetForm(); form.hidden = false; form.scrollIntoView(); (byId('full-name') || form).focus(); }
    }));
    panel.appendChild(actions);

    form.hidden = true;
    form.parentNode.insertBefore(panel, form.nextSibling);
    panel.focus();
    panel.scrollIntoView({ behavior: K.prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  function resetForm() {
    form.reset();
    Array.prototype.forEach.call(form.elements, function (el) { if (el.id && /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) { KF.setError(el, ''); el.classList.remove('is-valid'); } });
    KF.showSummary(form, []);
    applyType();
  }

  /* ----- submit ----- */
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (sending) { return; }

    var errors = KF.validateForm(form).concat(crossFieldErrors());
    KF.showSummary(form, errors);
    if (errors.length) { return; }

    var now = K.joburgNow();
    var data = collect(now);
    var isBot = form.querySelector('[data-hp]').value !== '';

    sending = true;
    KF.setBusy(submitBtn, true, 'Sending');

    var send = isBot ? Promise.resolve({ ok: true, data: {} }) : KF.postJSON(form.action, data);
    var services = K.loadServices().catch(function () { return null; });

    Promise.all([send, services]).then(function (out) {
      sending = false;
      KF.setBusy(submitBtn, false);
      var res;
      if (out[1]) { res = computeResponse(data, out[1], K.joburgNow()); }
      else { res = { title: 'We have your enquiry', rows: [], total: null, availability: null,
        notes: ['We could not load our price list for an instant answer, so the team will reply by email within one business day.'] }; }
      renderResult(res, out[0], data);
    });
  });

  /* ----- start-up ----- */
  var today = K.joburgNow().iso;
  setRange('visit-date', today, KF.addDays(today, 60));
  setRange('start-date', today, KF.addDays(today, 60));
  setRange('feedback-date', KF.addDays(today, -90), today);
  buildTimes();
  prefill();
  applyType();
  KF.attachLive(form);

  typeSelect.addEventListener('change', applyType);
  byId('visit-date').addEventListener('change', function () { refreshTimes(); });
  form.addEventListener('change', function (ev) {
    if (ev.target.id === 'visit-date' || ev.target.id === 'visit-time') {
      if (!byId('visit-time').value || !byId('visit-date').value) { return; }
      var errs = crossFieldErrors();
      if (!errs.length) { KF.setError(byId('visit-time'), KF.validateField(byId('visit-time'))); }
    }
  });
})(window, document);
