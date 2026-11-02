/* =============================================================
   Kamado Car Wash: contact-form.js (contact page)

   The contact form sends a general message to the organisation.
   Once the input is validated it is:
     1. submitted asynchronously (AJAX) so the page does not reload, and
     2. compiled into an email addressed to the recipient stated in
        Kamado.CONTACT_EMAIL (js/common.js). The visitor can open it
        in their email app, or copy it, and send it themselves.

   Asking for: name, email, phone (optional), branch, type of
   message, subject and the full message.
   ============================================================= */
(function (window, document) {
  'use strict';

  var K = window.Kamado;
  var KF = window.KamadoForm;

  var TYPE_LABELS = {
    general: 'General question',
    compliment: 'Compliment',
    complaint: 'Complaint',
    media: 'Media or partnership',
    lost: 'Lost property'
  };

  var BRANCH_LABELS = {
    sandton: 'Kamado Car Wash Sandton',
    randburg: 'Kamado Car Wash Randburg',
    both: 'Both branches / not sure'
  };

  /**
   * Builds the email. Pure function (no page needed).
   * Returns { to, subject, body, href }.
   */
  function composeEmail(d, to) {
    var subject = '[' + TYPE_LABELS[d.messageType] + '] ' + d.subject;
    var body = [
      'Hello Kamado Car Wash team,',
      '',
      d.message,
      '',
      'Kind regards,',
      d.fullName,
      '',
      '---',
      'Contact details',
      'Email: ' + d.email,
      'Phone: ' + (d.phone || 'not given'),
      'Branch: ' + BRANCH_LABELS[d.branch],
      'Message type: ' + TYPE_LABELS[d.messageType],
      'Reference: ' + d.reference
    ].join('\n');
    var href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body.replace(/\n/g, '\r\n'));
    return { to: to, subject: subject, body: body, href: href };
  }

  window.KamadoContact = { composeEmail: composeEmail };

  var form = document.getElementById('contact-form');
  if (!form) { return; }

  var submitBtn = form.querySelector('button[type="submit"]');
  var sending = false;

  function value(id) { return document.getElementById(id).value; }

  function collect() {
    var phoneRaw = KF.clean(value('c-phone'));
    var phone = phoneRaw ? KF.normalisePhone(phoneRaw) : null;
    return {
      reference: KF.makeReference(K.joburgNow().iso),
      submittedAt: new Date().toISOString(),
      fullName: KF.clean(value('c-name')),
      email: KF.clean(value('c-email')).toLowerCase(),
      phone: phone ? phone.international : '',
      branch: value('c-branch'),
      messageType: value('c-type'),
      subject: KF.clean(value('c-subject')),
      message: KF.cleanMultiline(value('c-message'))
    };
  }

  function showEmail(d, send) {
    var old = document.getElementById('contact-result');
    if (old) { old.remove(); }

    var mail = composeEmail(d, K.CONTACT_EMAIL);
    var panel = K.el('section', { class: 'result', id: 'contact-result', tabindex: '-1', 'aria-labelledby': 'contact-result-title' });
    panel.appendChild(K.el('h2', { id: 'contact-result-title', text: 'Your email is ready, ' + d.fullName.split(' ')[0] }));
    panel.appendChild(K.el('p', { class: 'result-ref', text: 'Reference ' + d.reference }));

    panel.appendChild(K.el('p', {
      class: 'result-banner ' + (send.ok ? 'is-ok' : 'is-warn'), role: 'status',
      text: send.ok
        ? 'We have logged your message. To send it to our team, open the email below and press send.'
        : send.error + ' Your message has not been logged yet. Open the email below and press send to reach us.'
    }));

    panel.appendChild(K.el('table', { class: 'result-table' }, [
      K.el('caption', { class: 'visually-hidden', text: 'Email details' }),
      K.el('tbody', null, [
        K.el('tr', null, [K.el('th', { scope: 'row', text: 'To' }), K.el('td', { text: mail.to })]),
        K.el('tr', null, [K.el('th', { scope: 'row', text: 'Subject' }), K.el('td', { text: mail.subject })])
      ])
    ]));
    panel.appendChild(K.el('pre', { class: 'email-preview', tabindex: '0', 'aria-label': 'Email body', text: mail.body }));

    var copied = K.el('span', { class: 'field-hint', role: 'status' });
    var actions = K.el('div', { class: 'result-actions' }, [
      K.el('a', { class: 'btn btn-primary', href: mail.href, text: 'Open in my email app' }),
      K.el('button', {
        type: 'button', class: 'btn btn-outline dark', text: 'Copy email text',
        onclick: function () {
          KF.copyText('To: ' + mail.to + '\nSubject: ' + mail.subject + '\n\n' + mail.body).then(function (ok) {
            copied.textContent = ok ? 'Copied to your clipboard.' : 'Copying was blocked. Select the text and copy it manually.';
          });
        }
      }),
      K.el('button', {
        type: 'button', class: 'btn btn-outline dark', text: 'Edit my message',
        onclick: function () { panel.remove(); form.hidden = false; document.getElementById('c-message').focus(); }
      }),
      copied
    ]);
    panel.appendChild(actions);

    form.hidden = true;
    form.parentNode.insertBefore(panel, form.nextSibling);
    panel.focus();
    panel.scrollIntoView({ behavior: K.prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (sending) { return; }

    var errors = KF.validateForm(form);
    KF.showSummary(form, errors);
    if (errors.length) { return; }

    var data = collect();
    var isBot = form.querySelector('[data-hp]').value !== '';

    sending = true;
    KF.setBusy(submitBtn, true, 'Preparing your email');

    var send = isBot ? Promise.resolve({ ok: true, data: {} }) : KF.postJSON(form.action, data);
    send.then(function (result) {
      sending = false;
      KF.setBusy(submitBtn, false);
      showEmail(data, result);
    });
  });

  KF.attachLive(form);
})(window, document);
