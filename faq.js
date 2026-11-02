/* =============================================================
   Kamado Car Wash: faq.js (enquiry page)

   FAQ accordion built with jQuery (loaded from js/vendor).
   Follows the WAI-ARIA accordion pattern:
     - each question is a <button aria-expanded> inside a heading
     - the answer panel is linked with aria-controls
     - Enter / Space toggle (native button behaviour)
     - Up / Down / Home / End move between questions
   Opening one answer closes the others, and the slide animation is
   switched off for visitors who prefer reduced motion.
   Without JavaScript every answer is simply shown (see style.css).
   ============================================================= */
(function ($) {
  'use strict';

  if (!$) { return; }

  $(function () {
    var $accordion = $('.accordion');
    if (!$accordion.length) { return; }

    var $triggers = $accordion.find('.accordion-trigger');
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var speed = reduceMotion ? 0 : 220;

    function panelFor($button) { return $('#' + $button.attr('aria-controls')); }

    function setOpen($button, open) {
      $button.attr('aria-expanded', open ? 'true' : 'false');
      var $panel = panelFor($button);
      $panel.stop(true, true);
      if (open) { $panel.slideDown(speed); } else { $panel.slideUp(speed); }
    }

    // Start with every answer closed (CSS hides them when JavaScript is on).
    $triggers.attr('aria-expanded', 'false');

    $accordion.on('click', '.accordion-trigger', function () {
      var $button = $(this);
      var willOpen = $button.attr('aria-expanded') !== 'true';
      if (willOpen) {
        $triggers.not($button).filter('[aria-expanded="true"]').each(function () { setOpen($(this), false); });
      }
      setOpen($button, willOpen);
    });

    $accordion.on('keydown', '.accordion-trigger', function (event) {
      var index = $triggers.index(this);
      var last = $triggers.length - 1;
      var target;
      if (event.key === 'ArrowDown') { target = index === last ? 0 : index + 1; }
      else if (event.key === 'ArrowUp') { target = index === 0 ? last : index - 1; }
      else if (event.key === 'Home') { target = 0; }
      else if (event.key === 'End') { target = last; }
      else { return; }
      event.preventDefault();
      $triggers.eq(target).trigger('focus');
    });
  });
})(window.jQuery);
