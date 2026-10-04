(function () {
  var el = document.getElementById('covMap');
  if (!el || !window.L) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PLACES = {
    'Goranboy':   { name: 'Goranboy',   pin: [40.6100, 46.7894] },
    'Mingəçevir': { name: 'Mingəçevir', pin: [40.7703, 47.0496] }
  };

  var map = L.map(el, { zoomControl: false, scrollWheelZoom: false, zoomSnap: 0.25, zoomAnimation: true });
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 14,
    attribution: 'Tiles © Esri · Sərhədlər © OpenStreetMap'
  }).addTo(map);

  var timers = [];
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  var layers = {};      // name -> Leaflet polygon
  var pins = {};        // name -> {marker, label}
  var arc, dot, arcPts, raf, bounds, ready = false, played = false;

  function pinIcon() {
    return L.divIcon({
      className: 'pin',
      iconSize: [34, 44], iconAnchor: [17, 40],
      html: '<span class="pin-ring"></span><svg viewBox="0 0 24 32" width="34" height="44" aria-hidden="true">' +
            '<path d="M12 1.5C6.2 1.5 1.5 6 1.5 11.7c0 7.6 10.5 18.8 10.5 18.8s10.5-11.2 10.5-18.8C22.5 6 17.8 1.5 12 1.5z" fill="none" stroke="#fff" stroke-width="1.8"/>' +
            '<circle cx="12" cy="11.7" r="3.6" fill="none" stroke="#fff" stroke-width="1.8"/></svg>'
    });
  }
  function labelIcon(text) {
    return L.divIcon({ className: 'pin-label-wrap', iconSize: null, iconAnchor: [-14, 36], html: '<span class="pin-label">' + text + '</span>' });
  }

  // Quadratic bezier between two points, bulging sideways
  function arcPoints(a, b, n) {
    var mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    var dx = b[1] - a[1], dy = b[0] - a[0];
    var k = 0.28;
    var c = [mid[0] + dx * k, mid[1] - dy * k];
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n, u = 1 - t;
      pts.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
    }
    return pts;
  }

  function pathEl(layer) { return layer && layer.getElement && layer.getElement(); }

  // Draw a border on: dash length = total path length, animate offset to 0
  function drawOn(layer, ms) {
    var p = pathEl(layer); if (!p) return;
    var len = p.getTotalLength ? p.getTotalLength() : 3000;
    p.style.transition = 'none';
    p.style.strokeDasharray = len;
    p.style.strokeDashoffset = len;
    p.getBoundingClientRect();
    p.style.transition = 'stroke-dashoffset ' + ms + 'ms ease-in-out';
    p.style.strokeDashoffset = 0;
  }
  function showArea(name) {
    var layer = layers[name], p = pathEl(layer);
    if (!p) return;
    p.classList.add('on');
    drawOn(layer, reduce ? 0 : 1800);
    later(function () { p.classList.add('flow'); p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; p.style.transition = ''; }, reduce ? 0 : 1900);
  }
  function setPin(name, on) {
    var o = pins[name];
    [o.marker, o.label].forEach(function (m) { var e = m.getElement(); if (e) e.classList.toggle('show', on); });
  }
  function showPin(name) { setPin(name, true); }

  function runArc() {
    arcPts = arcPoints(PLACES['Goranboy'].pin, PLACES['Mingəçevir'].pin, 80);
    arc = L.polyline(arcPts, { className: 'arc-line', weight: 2.5, interactive: false }).addTo(map);
    var p = pathEl(arc);
    if (p) {
      var len = p.getTotalLength();
      p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
      p.getBoundingClientRect();
      p.style.transition = 'stroke-dashoffset ' + (reduce ? 0 : 1600) + 'ms ease-in-out';
      p.style.strokeDashoffset = 0;
    }
    if (reduce) return;
    dot = L.circleMarker(arcPts[0], { radius: 5, className: 'arc-dot', interactive: false }).addTo(map);
    var t0 = performance.now(), dur = 1600;
    (function step(now) {
      var f = Math.min((now - t0) / dur, 1);
      dot.setLatLng(arcPts[Math.round(f * (arcPts.length - 1))]);
      if (f < 1) raf = requestAnimationFrame(step);
      else later(function () { map.removeLayer(dot); }, 400);
    })(t0);
  }

  function reset() {
    timers.forEach(clearTimeout); timers = [];
    cancelAnimationFrame(raf);
    Object.keys(layers).forEach(function (k) {
      var p = pathEl(layers[k]);
      if (p) { p.classList.remove('on', 'flow'); p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; p.style.transition = 'none'; }
    });
    Object.keys(pins).forEach(function (k) { setPin(k, false); });
    if (arc) map.removeLayer(arc);
    if (dot) map.removeLayer(dot);
    arc = dot = null;
  }

  function play() {
    if (!ready) return;
    played = true;
    reset();
    var g = PLACES['Goranboy'], m = PLACES['Mingəçevir'];
    var side = window.innerWidth > 860 ? [-Math.min(260, window.innerWidth * 0.12), 0] : [0, 0];
    function fitFinal(animated) {
      var opts = { padding: [40, 40], duration: 2.6, easeLinearity: 0.2 };
      if (animated) map.flyToBounds(bounds, opts); else map.fitBounds(bounds, { padding: [40, 40], animate: false });
    }
    if (reduce) {
      fitFinal(false); map.panBy(side, { animate: false });
      showArea('Goranboy'); showArea('Mingəçevir'); showPin('Goranboy'); showPin('Mingəçevir'); runArc();
      return;
    }
    // 1) wide view, then fly in
    map.setView([40.2, 47.6], 7, { animate: false });
    later(function () { fitFinal(true); }, 250);
    // 2) Goranboy lights up
    later(function () { showArea('Goranboy'); showPin('Goranboy'); }, 2300);
    // 3) arc to Mingəçevir
    later(runArc, 4400);
    // 4) Mingəçevir lights up
    later(function () { showArea('Mingəçevir'); showPin('Mingəçevir'); }, 5900);
    // keep card clear of the map centre on wide screens
    map.once('moveend', function () { if (side[0]) map.panBy(side, { animate: true }); });
  }

  fetch('assets/areas.geojson').then(function (r) { return r.json(); }).then(function (data) {
    data.features.forEach(function (f) {
      var name = f.properties.name;
      var layer = L.geoJSON(f, { style: { className: 'area-line', weight: 3, interactive: false } }).addTo(map);
      layers[name] = layer.getLayers()[0];
      layers[name].options.interactive = false;
      if (!bounds) bounds = layer.getBounds(); else bounds.extend(layer.getBounds());
      pins[name] = {
        marker: L.marker(PLACES[name].pin, { icon: pinIcon(), interactive: false, keyboard: false }),
        label: L.marker(PLACES[name].pin, { icon: labelIcon(PLACES[name].name), interactive: false, keyboard: false })
      };
    });
    Object.keys(pins).forEach(function (k) { pins[k].marker.addTo(map); pins[k].label.addTo(map); });
    map.fitBounds(bounds, { padding: [40, 40], animate: false });
    ready = true;
    if (visible && !played) play();
  });

  // start when the section scrolls into view; replay button
  var visible = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible && ready && !played) play();
    }, { threshold: 0.35 }).observe(el);
  } else { visible = true; }

  var btn = document.getElementById('covReplay');
  if (btn) btn.addEventListener('click', play);
  window.addEventListener('resize', function () { map.invalidateSize(); });
})();
