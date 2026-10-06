(function () {
  var el = document.getElementById('covMap');
  if (!el) return;
  if (!window.maplibregl) { el.classList.add('nogl'); return; }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wide = function () { return window.innerWidth > 860; };

  var PLACES = {
    gor: { key: 'Goranboy',   name: 'Goranboy',   pin: [46.7894, 40.6100] },   // [lng, lat]
    nft: { key: 'Naftalan',   name: 'Naftalan',   pin: [46.8211, 40.5064] },
    min: { key: 'Mingəçevir', name: 'Mingəçevir', pin: [47.0496, 40.7703] }
  };
  var VIOLET = '#a78bfa', TEAL = '#3fe0a0', ARC = '#9fd6ff';

  var map;
  try {
    map = new maplibregl.Map({
      container: el,
      center: [49, 41.5], zoom: 3.4, pitch: 35, bearing: -12,
      maxPitch: 75, minZoom: 2, maxZoom: 13,
      attributionControl: { compact: true },
      scrollZoom: false,
      style: {
        version: 8,
        projection: { type: 'globe' },
        sources: {
          sat: {
            type: 'raster', tileSize: 256, maxzoom: 17,
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            attribution: 'Tiles © Esri · Sərhədlər © OpenStreetMap · Relyef © Mapzen/AWS'
          },
          dem: {
            type: 'raster-dem', tileSize: 256, maxzoom: 12, encoding: 'terrarium',
            tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png']
          }
        },
        layers: [
          { id: 'space', type: 'background', paint: { 'background-color': '#02030f' } },
          { id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-saturation': -0.05, 'raster-brightness-max': 0.92 } },
          { id: 'relief', type: 'hillshade', source: 'dem', paint: { 'hillshade-exaggeration': 0.28, 'hillshade-shadow-color': '#000a22', 'hillshade-highlight-color': '#ffffff', 'hillshade-accent-color': '#000a22' } }
        ],
        sky: {
          'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0],
          'sky-color': '#1a2a6c', 'horizon-color': '#9fd6ff'
        }
      }
    });
  } catch (e) { el.classList.add('nogl'); return; }

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showZoom: true }), 'bottom-right');
  map.on('error', function () { /* tile errors are non-fatal */ });

  var geo = null, ready = false, played = false, visible = false;
  var timers = [], raf = 0, markers = {};
  var AREAS = ['gor', 'nft', 'min'];
  var ARCS = [['gor', 'nft'], ['gor', 'min']];   // Goranboy is the hub
  var NAMES = { 'Goranboy': 'gor', 'Naftalan': 'nft', 'Mingəçevir': 'min' };
  var state = {};
  AREAS.forEach(function (k) { state[k] = { fill: 0, on: false }; });
  var rings = {}, arcPtsList = [], arcDone = [];

  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function empty() { return { type: 'FeatureCollection', features: [] }; }
  function line(coords) { return { type: 'FeatureCollection', features: coords.length > 1 ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } }] : [] }; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function arcPoints(a, b, n) {
    var mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    var dx = b[0] - a[0], dy = b[1] - a[1], k = 0.22;
    var c = [mid[0] - dy * k, mid[1] + dx * k], pts = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n, u = 1 - t;
      pts.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
    }
    return pts;
  }
  function partial(pts, f) {
    if (f >= 1) return pts.slice();
    var x = f * (pts.length - 1), i = Math.floor(x), t = x - i, out = pts.slice(0, i + 1);
    if (pts[i + 1]) out.push([lerp(pts[i][0], pts[i + 1][0], t), lerp(pts[i][1], pts[i + 1][1], t)]);
    return out;
  }

  function pinEl(name, side) {
    var d = document.createElement('div');
    d.className = 'pin-wrap';
    d.innerHTML = '<div class="pin-inner"><span class="pin-ring"></span>' +
      '<svg class="pin-svg" viewBox="0 0 24 32" width="34" height="44" aria-hidden="true">' +
      '<path d="M12 1.5C6.2 1.5 1.5 6 1.5 11.7c0 7.6 10.5 18.8 10.5 18.8s10.5-11.2 10.5-18.8C22.5 6 17.8 1.5 12 1.5z" fill="none" stroke="#fff" stroke-width="1.8"/>' +
      '<circle cx="12" cy="11.7" r="3.6" fill="none" stroke="#fff" stroke-width="1.8"/></svg>' +
      '<span class="pin-label ' + (side || '') + '">' + name + '</span></div>';
    return d;
  }

  // dashed "marching" border frames (MapLibre dash-sequence technique)
  var DASH = [[0,4,3],[.5,4,2.5],[1,4,2],[1.5,4,1.5],[2,4,1],[2.5,4,.5],[3,4,0],[0,.5,3,3.5],[0,1,3,3],[0,1.5,3,2.5],[0,2,3,2],[0,2.5,3,1.5],[0,3,3,1],[0,3.5,3,.5]];
  var dashStep = -1, dashAt = 0, marching = { gor: false, nft: false, min: false };

  function tick(now) {
    AREAS.forEach(function (k) {
      var s = state[k];
      if (!s.on) return;
      map.setPaintProperty('fill-' + k, 'fill-opacity', s.fill * (0.22 + (reduce ? 0 : 0.1 * Math.sin(now / 1100))));
    });
    if (!reduce && now - dashAt > 55) {
      dashAt = now; dashStep = (dashStep + 1) % DASH.length;
      AREAS.forEach(function (k) { if (marching[k]) map.setPaintProperty('line-' + k, 'line-dasharray', DASH[dashStep]); });
    }
    raf = requestAnimationFrame(tick);
  }

  function anim(ms, fn, done) {
    if (reduce) { fn(1); if (done) done(); return; }
    var t0 = performance.now();
    (function step(now) {
      var f = Math.min((now - t0) / ms, 1);
      fn(ease(f));
      if (f < 1) requestAnimationFrame(step); else if (done) done();
    })(t0);
  }

  function showArea(k) {
    var s = state[k], src = map.getSource('line-' + k), gl = map.getSource('glow-' + k);
    s.on = true;
    anim(1800, function (f) {
      var c = partial(rings[k], f); src.setData(line(c)); gl.setData(line(c));
      s.fill = f;
    }, function () { marching[k] = true; });
  }
  function setPin(k, on) { var e = markers[k] && markers[k].getElement(); if (e) e.classList.toggle('show', on); }

  function multi(lines) {
    return { type: 'FeatureCollection', features: lines.filter(function (c) { return c.length > 1; }).map(function (c) { return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: c } }; }) };
  }
  function showArc(i) {
    var a = map.getSource('arc'), g = map.getSource('arc-glow'), d = map.getSource('dot'), pts = arcPtsList[i];
    anim(1500, function (f) {
      var c = partial(pts, f), all = arcDone.concat([c]);
      a.setData(multi(all)); g.setData(multi(all));
      if (f < 1 && c.length) d.setData({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: c[c.length - 1] } }] });
      else d.setData(empty());
      if (f >= 1) arcDone[i] = pts;
    });
  }

  function reset() {
    timers.forEach(clearTimeout); timers = [];
    arcDone = [];
    AREAS.forEach(function (k) {
      state[k] = { fill: 0, on: false }; marching[k] = false;
      map.setPaintProperty('fill-' + k, 'fill-opacity', 0);
      map.setPaintProperty('line-' + k, 'line-dasharray', [1, 0]);
      ['line-', 'glow-'].forEach(function (p) { map.getSource(p + k).setData(empty()); });
      setPin(k, false);
    });
    ['arc', 'arc-glow', 'dot'].forEach(function (s) { map.getSource(s).setData(empty()); });
  }

  function updatePinScale() {
    var ps = Math.max(0.5, Math.min(1, 0.45 + (map.getZoom() - 6.5) * 0.22));
    el.style.setProperty('--ps', ps.toFixed(3));
  }
  map.on('zoom', updatePinScale);

  function targetCamera() {
    var pad = { top: 80, bottom: 150, left: wide() ? Math.min(520, window.innerWidth * 0.36) + 110 : 70, right: wide() ? 240 : 110 };
    var b = new maplibregl.LngLatBounds(PLACES.gor.pin, PLACES.gor.pin);
    b.extend(PLACES.min.pin); b.extend(PLACES.nft.pin);
    var cam = map.cameraForBounds(b, { padding: pad, maxZoom: 10.5 });
    return { center: [cam.center.lng, cam.center.lat + (wide() ? -0.005 : 0)], zoom: cam.zoom, pitch: wide() ? 52 : 42, bearing: -18 };
  }

  function play() {
    if (!ready) return;
    played = true; reset();
    var cam = targetCamera();
    if (reduce) {
      map.jumpTo(cam);
      AREAS.forEach(function (k) { showArea(k); setPin(k, true); });
      showArc(0); showArc(1);
      return;
    }
    map.jumpTo({ center: [49, 41.5], zoom: 3.4, pitch: 35, bearing: -12 });
    later(function () { map.flyTo({ center: cam.center, zoom: cam.zoom, pitch: cam.pitch, bearing: cam.bearing, duration: 5200, curve: 1.5, essential: true }); }, 300);
    later(function () { showArea('gor'); setPin('gor', true); }, 4300);
    later(function () { showArc(0); }, 6200);
    later(function () { showArea('nft'); setPin('nft', true); }, 7500);
    later(function () { showArc(1); }, 8600);
    later(function () { showArea('min'); setPin('min', true); }, 10000);
    later(function () { map.easeTo({ bearing: cam.bearing + 12, duration: 9000, easing: function (t) { return t; }, essential: true }); }, 11800);
  }

  map.once('style.load', function () {
    fetch('assets/areas.geojson').then(function (r) { return r.json(); }).then(function (data) {
      geo = {};
      data.features.forEach(function (f) {
        var k = NAMES[f.properties.name]; if (!k) return;
        geo[k] = f.geometry; rings[k] = f.geometry.coordinates[0];
      });
      arcPtsList = ARCS.map(function (p) { return arcPoints(PLACES[p[0]].pin, PLACES[p[1]].pin, 90); });

      AREAS.forEach(function (k) {
        map.addSource('area-' + k, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: geo[k] } });
        map.addSource('line-' + k, { type: 'geojson', data: empty() });
        map.addSource('glow-' + k, { type: 'geojson', data: empty() });
        map.addLayer({ id: 'fill-' + k, type: 'fill', source: 'area-' + k, paint: { 'fill-color': TEAL, 'fill-opacity': 0 } });
        map.addLayer({ id: 'glow-' + k, type: 'line', source: 'glow-' + k, layout: { 'line-join': 'round' }, paint: { 'line-color': VIOLET, 'line-width': 10, 'line-blur': 8, 'line-opacity': 0.7 } });
        map.addLayer({ id: 'line-' + k, type: 'line', source: 'line-' + k, layout: { 'line-join': 'round' }, paint: { 'line-color': VIOLET, 'line-width': 3, 'line-dasharray': [1, 0] } });
      });
      ['arc', 'arc-glow', 'dot'].forEach(function (s) { map.addSource(s, { type: 'geojson', data: empty() }); });
      map.addLayer({ id: 'arc-glow', type: 'line', source: 'arc-glow', layout: { 'line-cap': 'round' }, paint: { 'line-color': ARC, 'line-width': 9, 'line-blur': 7, 'line-opacity': 0.7 } });
      map.addLayer({ id: 'arc', type: 'line', source: 'arc', layout: { 'line-cap': 'round' }, paint: { 'line-color': ARC, 'line-width': 2.5 } });
      map.addLayer({ id: 'dot', type: 'circle', source: 'dot', paint: { 'circle-radius': 6, 'circle-color': TEAL, 'circle-blur': 0.2, 'circle-stroke-width': 8, 'circle-stroke-color': TEAL, 'circle-stroke-opacity': 0.25 } });

      Object.keys(PLACES).forEach(function (k) {
        markers[k] = new maplibregl.Marker({ element: pinEl(PLACES[k].name, k === 'gor' ? 'left' : 'right'), anchor: 'bottom' }).setLngLat(PLACES[k].pin).addTo(map);
      });

      map.jumpTo(targetCamera());
      updatePinScale();
      ready = true;
      raf = requestAnimationFrame(tick);
      if (visible && !played) play();
    });
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible && ready && !played) play();
    }, { threshold: 0.35 }).observe(el);
  } else { visible = true; }

  var btn = document.getElementById('covReplay');
  if (btn) btn.addEventListener('click', play);
  window.addEventListener('resize', function () { map.resize(); });
})();
