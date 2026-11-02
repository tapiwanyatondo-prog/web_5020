/* =============================================================
   Kamado Car Wash: gallery.js (about page)

   Gallery with a lightbox. Each thumbnail is a normal link to the
   full-size image, so the gallery still works without JavaScript.
   With JavaScript, clicking opens the image in a modal <dialog>:

     - the browser handles the focus trap, the Escape key and the
       dimmed backdrop (showModal)
     - previous / next buttons, arrow keys and swipe change image
     - clicking outside the picture closes it
     - focus returns to the thumbnail you opened
   ============================================================= */
(function (window, document) {
  'use strict';

  var K = window.Kamado;
  var links = Array.prototype.slice.call(document.querySelectorAll('.gallery-link'));
  if (!links.length || typeof HTMLDialogElement !== 'function') { return; }

  var current = 0;
  var opener = null;

  /* ---------- build the dialog once (DOM manipulation) ---------- */
  var img = K.el('img', { alt: '', width: '800', height: '500', decoding: 'async' });
  var caption = K.el('p');
  var count = K.el('span', { class: 'lightbox-count', 'aria-live': 'polite' });

  var closeBtn = K.el('button', { type: 'button', class: 'lightbox-btn lightbox-close', 'aria-label': 'Close image', text: '\u2715' });
  var prevBtn = K.el('button', { type: 'button', class: 'lightbox-btn lightbox-prev', 'aria-label': 'Previous image', text: '\u2190' });
  var nextBtn = K.el('button', { type: 'button', class: 'lightbox-btn lightbox-next', 'aria-label': 'Next image', text: '\u2192' });

  var dialog = K.el('dialog', { class: 'lightbox', 'aria-label': 'Image viewer' }, [
    K.el('figure', { class: 'lightbox-figure' }, [
      img,
      K.el('figcaption', { class: 'lightbox-caption' }, [caption, count])
    ]),
    closeBtn, prevBtn, nextBtn
  ]);
  document.body.appendChild(dialog);

  /* ---------- showing an image ---------- */
  function show(index, animate) {
    current = (index + links.length) % links.length;
    var link = links[current];
    var thumb = link.querySelector('img');

    function apply() {
      img.src = link.getAttribute('href');
      img.alt = thumb.alt;
      caption.textContent = link.getAttribute('data-caption') || thumb.alt;
      count.textContent = (current + 1) + ' of ' + links.length;
      img.classList.remove('is-swapping');
    }

    if (animate && !K.prefersReducedMotion()) {
      img.classList.add('is-swapping');
      window.setTimeout(apply, 130);
    } else {
      apply();
    }

    // Warm the cache for the neighbours so next/previous feel instant.
    [current - 1, current + 1].forEach(function (i) {
      var n = links[(i + links.length) % links.length];
      new Image().src = n.getAttribute('href');
    });
  }

  function open(index, trigger) {
    opener = trigger;
    show(index, false);
    dialog.showModal();
    window.requestAnimationFrame(function () { dialog.classList.add('is-open'); });
    closeBtn.focus();
  }

  dialog.addEventListener('close', function () {
    dialog.classList.remove('is-open');
    if (opener) { opener.focus(); }
  });

  /* ---------- events ---------- */
  links.forEach(function (link, i) {
    link.addEventListener('click', function (ev) {
      ev.preventDefault();
      open(i, link);
    });
  });

  closeBtn.addEventListener('click', function () { dialog.close(); });
  prevBtn.addEventListener('click', function () { show(current - 1, true); });
  nextBtn.addEventListener('click', function () { show(current + 1, true); });

  // A click on the dimmed area (the dialog element itself) closes the viewer.
  dialog.addEventListener('click', function (ev) { if (ev.target === dialog) { dialog.close(); } });

  dialog.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); show(current - 1, true); }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); show(current + 1, true); }
  });

  // Swipe left/right on touch screens.
  var startX = null;
  dialog.addEventListener('pointerdown', function (ev) { startX = ev.pointerType === 'touch' ? ev.clientX : null; });
  dialog.addEventListener('pointerup', function (ev) {
    if (startX === null) { return; }
    var dx = ev.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 50) { show(current + (dx < 0 ? 1 : -1), true); }
  });
})(window, document);
