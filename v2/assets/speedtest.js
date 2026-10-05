(function () {
  var CF = 'https://speed.cloudflare.com';
  var CIRC = 2 * Math.PI * 90;
  var MAX = 300;                       // gauge scale, Mbps
  var $ = function (id) { return document.getElementById(id); };
  var fill = $('gaugeFill'), btn = $('startBtn');
  fill.style.strokeDasharray = CIRC;
  fill.style.strokeDashoffset = CIRC;

  function setGauge(mbps, label) {
    var pct = Math.min(mbps / MAX, 1);
    fill.style.strokeDashoffset = CIRC * (1 - pct);
    fill.style.stroke = 'hsl(' + Math.round(210 - pct * 90) + ',85%,55%)';   // blue -> green
    $('gaugeSpeed').textContent = mbps > 0 ? mbps.toFixed(1) : '--';
    $('gaugeLabel').textContent = label;
  }
  function setProgress(pct, text) { $('progressFill').style.width = pct + '%'; $('statusText').textContent = text; }
  function setCard(id, active, done) { var e = $(id); e.classList.toggle('active', active); e.classList.toggle('done', done); }

  async function measurePing(n) {
    var t = [];
    for (var i = 0; i < n; i++) {
      var t0 = performance.now();
      await fetch(CF + '/__down?bytes=0&_=' + Date.now(), { cache: 'no-store' });
      t.push(performance.now() - t0);
    }
    t.sort(function (a, b) { return a - b; });
    return t[0];
  }
  async function measureDownload() {
    var bits = 0, sec = 0, sizes = [1e6, 5e6, 25e6];
    for (var i = 0; i < sizes.length; i++) {
      var t0 = performance.now();
      var res = await fetch(CF + '/__down?bytes=' + sizes[i] + '&_=' + Date.now(), { cache: 'no-store' });
      await res.arrayBuffer();
      sec += (performance.now() - t0) / 1000; bits += sizes[i] * 8;
      var live = bits / sec / 1e6; setGauge(live, 'yükləmə'); $('downVal').textContent = live.toFixed(1);
    }
    return bits / sec / 1e6;
  }
  async function measureUpload() {
    var bits = 0, sec = 0, sizes = [1e6, 5e6, 10e6];
    for (var i = 0; i < sizes.length; i++) {
      var body = new Uint8Array(sizes[i]), t0 = performance.now();
      await fetch(CF + '/__up', { method: 'POST', body: body, cache: 'no-store' });
      sec += (performance.now() - t0) / 1000; bits += sizes[i] * 8;
      var live = bits / sec / 1e6; setGauge(live, 'göndərmə'); $('upVal').textContent = live.toFixed(1);
    }
    return bits / sec / 1e6;
  }
  async function fetchMeta() {
    try {
      var res = await fetch(CF + '/__down?bytes=0&_=' + Date.now(), { cache: 'no-store' });
      $('infoIp').textContent = res.headers.get('cf-meta-ip') || '—';
      $('infoCity').textContent = res.headers.get('cf-meta-city') || '—';
      $('serverInfo').hidden = false;
    } catch (_) {}
  }

  async function start() {
    btn.disabled = true; btn.textContent = 'Test gedir…'; btn.classList.add('busy');
    ['pingVal', 'downVal', 'upVal'].forEach(function (id) { $(id).textContent = '--'; });
    ['cardPing', 'cardDown', 'cardUp'].forEach(function (id) { setCard(id, false, false); });
    setGauge(0, 'hazırlanır'); $('serverInfo').hidden = true;
    try {
      setProgress(5, 'Ping ölçülür…'); setCard('cardPing', true, false);
      var ping = await measurePing(5); $('pingVal').textContent = Math.round(ping); setCard('cardPing', false, true);
      await fetchMeta();

      setProgress(30, 'Yükləmə sürəti ölçülür…'); setCard('cardDown', true, false);
      var down = await measureDownload(); $('downVal').textContent = down.toFixed(1); setCard('cardDown', false, true);

      setProgress(70, 'Göndərmə sürəti ölçülür…'); setCard('cardUp', true, false);
      var up = await measureUpload(); $('upVal').textContent = up.toFixed(1); setCard('cardUp', false, true);

      setProgress(100, 'Test tamamlandı.'); setGauge(down, 'yükləmə');
    } catch (e) {
      setProgress(0, 'Xəta baş verdi. Yenidən cəhd edin.'); setGauge(0, 'xəta');
    }
    btn.disabled = false; btn.classList.remove('busy'); btn.textContent = 'Yenidən test et';
  }
  btn.addEventListener('click', start);
})();
