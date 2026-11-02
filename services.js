/* =============================================================
   Kamado Car Wash: services.js (services page)

   Dynamic content: the service cards are loaded with fetch() from
   data/services.json and built with DOM methods (no innerHTML).
   Visitors can:
     - search (name, description, features and keywords)
     - filter by category (single washes, add-ons, memberships)
     - sort (featured, price low-high, price high-low, name A-Z)

   Progressive enhancement: services.html already contains the full
   price list as plain HTML. This script replaces it with the
   interactive version only after the data has loaded, so crawlers and
   visitors without JavaScript still see every price.
   ============================================================= */
(function (window, document) {
  'use strict';

  var K = window.Kamado;
  var root = document.getElementById('catalogue');
  if (!root) { return; }

  var results = document.getElementById('catalogue-results');
  var countEl = document.getElementById('catalogue-count');
  var template = document.getElementById('plan-template');
  var searchInput = document.getElementById('catalogue-search');
  var sortSelect = document.getElementById('catalogue-sort');
  var resetBtn = document.getElementById('catalogue-reset');
  var chips = root.querySelectorAll('input[name="category"]');

  var CATEGORY_LABEL = { wash: 'Single wash', addon: 'Add-on', membership: 'Membership' };
  var CTA_TEXT = { wash: 'Get a quote', addon: 'Add to a quote', membership: 'Compare with my washes' };
  var VALID_CATEGORIES = ['all', 'wash', 'addon', 'membership'];
  var STORE_KEY = 'kamado.catalogue';

  var items = [];
  var state = { q: '', category: 'all', sort: 'featured' };

  /* ---------- sorting ---------- */
  var sorters = {
    featured: function (a, b) { return a._order - b._order; },
    'price-asc': function (a, b) { return priceKey(a, 1) - priceKey(b, 1) || a._order - b._order; },
    'price-desc': function (a, b) { return priceKey(b, -1) - priceKey(a, -1) || a._order - b._order; },
    name: function (a, b) { return a.name.localeCompare(b.name, 'en'); }
  };

  // "Custom" prices (no number) always go to the end, whichever way we sort.
  function priceKey(item, dir) {
    return item.price === null ? dir * Number.MAX_SAFE_INTEGER : item.price;
  }

  /* ---------- text helpers ---------- */
  function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // Writes text into `node`, wrapping search matches in <mark> elements.
  function highlight(node, text, terms) {
    node.textContent = '';
    if (!terms.length) { node.textContent = text; return; }
    var re = new RegExp('(' + terms.map(escapeRegExp).join('|') + ')', 'gi');
    text.split(re).forEach(function (part, i) {
      if (i % 2 === 1) { node.appendChild(K.el('mark', { text: part })); }
      else if (part) { node.appendChild(document.createTextNode(part)); }
    });
  }

  function unitLabel(item) {
    if (item.unit === 'wash') { return '/ wash'; }
    if (item.unit === 'month') { return '/ month'; }
    if (item.unit === 'custom') { return 'custom pricing'; }
    return 'add-on';
  }

  // Each card links to the enquiry form with the right options pre-selected.
  function enquiryLink(item) {
    var p = new URLSearchParams();
    if (item.category === 'wash') { p.set('type', 'quote'); p.set('package', item.id); }
    else if (item.category === 'addon') { p.set('type', 'quote'); p.set('addon', item.id); }
    else if (item.id === 'fleet') { p.set('type', 'fleet'); }
    else { p.set('type', 'membership'); p.set('plan', item.id); }
    return 'enquiry.html?' + p.toString() + '#enquiry-form';
  }

  /* ---------- building a card ---------- */
  function buildCard(item, terms) {
    var card = template.content.firstElementChild.cloneNode(true);
    card.classList.toggle('featured', !!item.featured);
    card.querySelector('.plan-tag').textContent = CATEGORY_LABEL[item.category] + (item.featured ? ' \u00b7 most popular' : '');
    highlight(card.querySelector('.plan-name'), item.name, terms);
    card.querySelector('.price-amount').textContent = item.price === null ? 'Custom' : K.formatRand(item.price);
    card.querySelector('.price-unit').textContent = unitLabel(item);
    highlight(card.querySelector('.plan-summary'), item.summary, terms);

    var list = card.querySelector('.plan-features');
    if (item.features.length) {
      item.features.forEach(function (f) { list.appendChild(K.el('li', { text: f })); });
    } else {
      list.remove();
    }

    var cta = card.querySelector('.plan-cta');
    cta.href = enquiryLink(item);
    cta.textContent = CTA_TEXT[item.category] || 'Ask about this';
    if (item.id === 'fleet') { cta.textContent = 'Ask about fleet pricing'; }
    cta.setAttribute('aria-label', cta.textContent + ': ' + item.name);
    return card;
  }

  /* ---------- rendering ---------- */
  function render() {
    var terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);

    var list = items.filter(function (item) {
      var inCategory = state.category === 'all' || item.category === state.category;
      return inCategory && terms.every(function (t) { return item._haystack.indexOf(t) !== -1; });
    }).sort(sorters[state.sort]);

    var frag = document.createDocumentFragment();
    list.forEach(function (item) { frag.appendChild(buildCard(item, terms)); });

    if (!list.length) {
      frag.appendChild(K.el('div', { class: 'catalogue-empty' }, [
        K.el('h3', { text: 'No services match your search' }),
        K.el('p', { text: 'Try a shorter search word, or show all services again.' }),
        K.el('button', { type: 'button', class: 'btn btn-primary', text: 'Show all services', onclick: reset })
      ]));
    }

    results.replaceChildren(frag);
    results.setAttribute('aria-busy', 'false');
    countEl.textContent = list.length === items.length
      ? 'Showing all ' + items.length + ' services'
      : 'Showing ' + list.length + ' of ' + items.length + ' services';
    resetBtn.hidden = state.q === '' && state.category === 'all' && state.sort === 'featured';
    save();
  }

  /* ---------- state: controls, URL and session ---------- */
  function syncControls() {
    searchInput.value = state.q;
    sortSelect.value = state.sort;
    chips.forEach(function (c) { c.checked = c.value === state.category; });
  }

  function reset() {
    state = { q: '', category: 'all', sort: 'featured' };
    syncControls();
    render();
    searchInput.focus();
  }

  function save() {
    try { window.sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage may be blocked */ }
  }

  function restore() {
    var params = new URLSearchParams(window.location.search);
    var fromUrl = params.has('category') || params.has('q');
    if (fromUrl) {
      var cat = params.get('category');
      if (VALID_CATEGORIES.indexOf(cat) !== -1) { state.category = cat; }
      state.q = (params.get('q') || '').slice(0, 60);
      return;
    }
    try {
      var saved = JSON.parse(window.sessionStorage.getItem(STORE_KEY) || 'null');
      if (saved && VALID_CATEGORIES.indexOf(saved.category) !== -1 && sorters[saved.sort]) {
        state = { q: String(saved.q || '').slice(0, 60), category: saved.category, sort: saved.sort };
      }
    } catch (e) { /* ignore corrupt or blocked storage */ }
  }

  function debounce(fn, ms) {
    var timer;
    return function () { window.clearTimeout(timer); timer = window.setTimeout(fn, ms); };
  }

  /* ---------- start ---------- */
  results.setAttribute('aria-busy', 'true');

  K.loadServices().then(function (data) {
    items = data.items.map(function (item, i) {
      item._order = i;
      item._haystack = [item.name, item.summary, CATEGORY_LABEL[item.category]].concat(item.features, item.keywords || []).join(' ').toLowerCase();
      return item;
    });

    restore();
    syncControls();
    root.classList.add('is-dynamic');
    results.classList.add('pricing-grid');

    searchInput.addEventListener('input', debounce(function () {
      state.q = searchInput.value.trim().slice(0, 60);
      render();
    }, 150));
    chips.forEach(function (c) {
      c.addEventListener('change', function () { if (c.checked) { state.category = c.value; render(); } });
    });
    sortSelect.addEventListener('change', function () { state.sort = sortSelect.value; render(); });
    resetBtn.addEventListener('click', reset);
    document.getElementById('catalogue-tools').addEventListener('submit', function (ev) { ev.preventDefault(); });

    render();
  }).catch(function () {
    // Data could not load: the static price list in the HTML stays on screen.
    results.removeAttribute('aria-busy');
  });
})(window, document);
