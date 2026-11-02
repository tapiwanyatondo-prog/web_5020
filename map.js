/* =============================================================
   Kamado Car Wash: map.js (contact page)

   Interactive map built with Leaflet (vendored in js/vendor) and
   OpenStreetMap tiles. Location-based features:
     - a marker for each branch, with a popup and directions link
     - "Show on map" buttons that fly to a branch
     - "Show both branches" to zoom back out
     - "Find my nearest branch": asks the browser for the visitor's
       location (only when they press the button), measures the
       distance to each branch and highlights the closest one

   The branch details are read from the HTML (data-* attributes on
   each .location-card), so the page text stays the single source of
   truth. The map itself is created only when it scrolls near the
   screen, which keeps the first page load light.
   ============================================================= */
(function (window, document) {
  'use strict';

  var K = window.Kamado;
  var mapEl = document.getElementById('map');
  if (!mapEl) { return; }

  var statusEl = document.getElementById('map-status');
  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-branch]'));

  var branches = cards.map(function (card) {
    return {
      id: card.getAttribute('data-branch'),
      name: card.getAttribute('data-name'),
      initial: card.getAttribute('data-initial'),
      lat: parseFloat(card.getAttribute('data-lat')),
      lng: parseFloat(card.getAttribute('data-lng')),
      address: card.querySelector('address').textContent.trim(),
      card: card,
      marker: null
    };
  });

  var map = null;
  var userMarker = null;

  function say(text) { if (statusEl) { statusEl.textContent = text; } }

  /** Great-circle distance in kilometres (haversine formula). */
  function distanceKm(lat1, lng1, lat2, lng2) {
    var rad = Math.PI / 180;
    var dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  window.KamadoMap = { distanceKm: distanceKm };

  function popupNode(b) {
    var directions = 'https://www.google.com/maps/dir/?api=1&destination=' + b.lat + ',' + b.lng;
    return K.el('div', { class: 'map-popup' }, [
      K.el('strong', { text: b.name }),
      K.el('span', { text: b.address }),
      K.el('br'),
      K.el('a', { href: directions, target: '_blank', rel: 'noopener noreferrer', text: 'Get directions' })
    ]);
  }

  function selectCard(b) {
    branches.forEach(function (x) { x.card.classList.toggle('is-selected', x === b); });
  }

  function flyTo(b) {
    ensureMap();
    if (!map) { return; }
    selectCard(b);
    if (K.prefersReducedMotion()) { map.setView([b.lat, b.lng], 15); }
    else { map.flyTo([b.lat, b.lng], 15, { duration: 1.1 }); }
    b.marker.openPopup();
    say(b.name + ' is shown on the map.');
  }

  function showAll() {
    ensureMap();
    if (!map) { return; }
    map.closePopup();
    branches.forEach(function (x) { x.card.classList.remove('is-selected'); });
    var bounds = L.latLngBounds(branches.map(function (b) { return [b.lat, b.lng]; }));
    if (K.prefersReducedMotion()) { map.fitBounds(bounds, { padding: [50, 50] }); }
    else { map.flyToBounds(bounds, { padding: [50, 50], duration: 1 }); }
    say('Both branches are shown on the map.');
  }

  function findNearest() {
    if (!navigator.geolocation) {
      say('Your browser cannot share your location. Pick a branch from the list instead.');
      return;
    }
    say('Finding your location...');
    navigator.geolocation.getCurrentPosition(function (pos) {
      ensureMap();
      var lat = pos.coords.latitude, lng = pos.coords.longitude;
      var ranked = branches.map(function (b) { return { b: b, km: distanceKm(lat, lng, b.lat, b.lng) }; })
        .sort(function (a, b) { return a.km - b.km; });
      var nearest = ranked[0];

      branches.forEach(function (x) { x.card.classList.toggle('is-nearest', x === nearest.b); });
      if (userMarker) { userMarker.remove(); }
      if (map) {
        userMarker = L.circleMarker([lat, lng], { radius: 8, color: '#0B4F6C', weight: 3, fillColor: '#FFC145', fillOpacity: 1 })
          .addTo(map).bindTooltip('You are here');
        map.flyToBounds(L.latLngBounds([[lat, lng], [nearest.b.lat, nearest.b.lng]]), {
          padding: [60, 60], duration: K.prefersReducedMotion() ? 0 : 1.2, maxZoom: 15
        });
        nearest.b.marker.openPopup();
      }
      var status = K.openStatus();
      say('Your nearest branch is ' + nearest.b.name + ', about ' + nearest.km.toFixed(1) + ' km away. ' + status.text + '.');
    }, function (err) {
      var reasons = {
        1: 'Location access was blocked. You can still pick a branch from the list.',
        2: 'We could not work out your location. Pick a branch from the list instead.',
        3: 'Finding your location took too long. Try again, or pick a branch from the list.'
      };
      say(reasons[err.code] || reasons[2]);
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  }

  /* ---------- create the map (once) ---------- */
  function ensureMap() {
    if (map) { return; }
    if (!window.L) { say('The map could not load. Use the directions links in each branch card.'); return; }

    mapEl.textContent = ''; // remove the no-JavaScript fallback text
    map = L.map(mapEl, { scrollWheelZoom: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    branches.forEach(function (b) {
      var icon = L.divIcon({
        className: 'map-pin-wrap',
        html: '<div class="map-pin">' + b.initial + '</div>',
        iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -18]
      });
      b.marker = L.marker([b.lat, b.lng], { icon: icon, title: b.name, alt: b.name, keyboard: true })
        .addTo(map).bindPopup(popupNode(b));
      b.marker.on('click', function () { selectCard(b); });
    });

    map.fitBounds(L.latLngBounds(branches.map(function (b) { return [b.lat, b.lng]; })), { padding: [50, 50] });

    // Page scrolling must not be hijacked: wheel zoom switches on after a click.
    map.on('click', function () { map.scrollWheelZoom.enable(); });
    mapEl.addEventListener('mouseleave', function () { map.scrollWheelZoom.disable(); });
  }

  /* ---------- wiring ---------- */
  branches.forEach(function (b) {
    var btn = b.card.querySelector('[data-show-on-map]');
    if (btn) { btn.addEventListener('click', function () { flyTo(b); }); }
  });

  var nearestBtn = document.getElementById('find-nearest');
  var bothBtn = document.getElementById('show-both');
  if (nearestBtn) { nearestBtn.addEventListener('click', findNearest); }
  if (bothBtn) { bothBtn.addEventListener('click', showAll); }

  // Build the map when it is about to scroll into view.
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries.some(function (e) { return e.isIntersecting; })) { ensureMap(); io.disconnect(); }
    }, { rootMargin: '250px' });
    io.observe(mapEl);
  } else {
    ensureMap();
  }
})(window, document);
