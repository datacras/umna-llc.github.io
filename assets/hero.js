(function () {
  var cv = document.getElementById('heroNet');
  if (!cv) return;
  var ctx = cv.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero = cv.parentElement;

  var W = 0, H = 0, DPR = 1, nodes = [], packets = [], rings = [];
  var mouse = { x: -9999, y: -9999 }, running = false, raf = 0, last = 0;
  var LINK = 150, CYAN = '159,214,255', TEAL = '63,224,160';

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = hero.clientWidth; H = hero.clientHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    LINK = W < 700 ? 110 : 150;
    var n = Math.max(24, Math.min(90, Math.round(W * H / 15000)));
    nodes = [];
    for (var i = 0; i < n; i++) {
      nodes.push({ x: rnd(0, W), y: rnd(0, H), vx: rnd(-.12, .12), vy: rnd(-.12, .12), r: rnd(1.2, 2.4), hub: Math.random() < .08 });
    }
    packets = []; rings = [];
    if (reduce) draw(0);
  }

  function links() {
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      for (var j = i + 1; j < nodes.length; j++) {
        var dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < LINK) out.push({ a: nodes[i], b: nodes[j], d: d });
      }
    }
    return out;
  }

  function draw(dt) {
    ctx.clearRect(0, 0, W, H);
    var i, p, L = links();

    // fibre links
    ctx.lineWidth = 1;
    for (i = 0; i < L.length; i++) {
      var l = L[i], al = (1 - l.d / LINK) * .32;
      ctx.strokeStyle = 'rgba(' + CYAN + ',' + al + ')';
      ctx.beginPath(); ctx.moveTo(l.a.x, l.a.y); ctx.lineTo(l.b.x, l.b.y); ctx.stroke();
    }
    // cursor links
    for (i = 0; i < nodes.length; i++) {
      var n = nodes[i], mdx = n.x - mouse.x, mdy = n.y - mouse.y, md = Math.sqrt(mdx * mdx + mdy * mdy);
      if (md < 190) {
        ctx.strokeStyle = 'rgba(' + TEAL + ',' + (1 - md / 190) * .55 + ')';
        ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
      }
    }
    // nodes
    for (i = 0; i < nodes.length; i++) {
      var q = nodes[i];
      ctx.fillStyle = q.hub ? 'rgba(' + TEAL + ',.95)' : 'rgba(255,255,255,.75)';
      ctx.shadowColor = q.hub ? 'rgba(' + TEAL + ',.9)' : 'rgba(' + CYAN + ',.6)';
      ctx.shadowBlur = q.hub ? 14 : 6;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.hub ? q.r + 1.6 : q.r, 0, 6.2832); ctx.fill();
    }
    ctx.shadowBlur = 0;

    if (reduce) return;

    // data packets travelling along links
    if (L.length && packets.length < 28 && Math.random() < .12) {
      var pick = L[(Math.random() * L.length) | 0], fwd = Math.random() < .5;
      packets.push({ a: fwd ? pick.a : pick.b, b: fwd ? pick.b : pick.a, t: 0, s: rnd(.0009, .0022) * (150 / Math.max(pick.d, 40)) });
    }
    for (i = packets.length - 1; i >= 0; i--) {
      p = packets[i]; p.t += p.s * dt;
      if (p.t >= 1) { // hop onward to a neighbour of the destination
        var next = null, best = 1e9;
        for (var k = 0; k < L.length; k++) {
          var c = L[k], o = c.a === p.b ? c.b : (c.b === p.b ? c.a : null);
          if (o && o !== p.a && c.d < best && Math.random() < .5) { best = c.d; next = o; }
        }
        if (next && Math.random() < .8) { p.a = p.b; p.b = next; p.t = 0; }
        else { rings.push({ x: p.b.x, y: p.b.y, r: 2, a: .7 }); packets.splice(i, 1); continue; }
      }
      var x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t;
      var tx = p.a.x + (p.b.x - p.a.x) * Math.max(p.t - .12, 0), ty = p.a.y + (p.b.y - p.a.y) * Math.max(p.t - .12, 0);
      var g = ctx.createLinearGradient(tx, ty, x, y);
      g.addColorStop(0, 'rgba(' + TEAL + ',0)'); g.addColorStop(1, 'rgba(' + TEAL + ',.95)');
      ctx.strokeStyle = g; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = '#eafff4'; ctx.shadowColor = 'rgba(' + TEAL + ',1)'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 6.2832); ctx.fill(); ctx.shadowBlur = 0;
    }
    // arrival pulses
    for (i = rings.length - 1; i >= 0; i--) {
      var r = rings[i]; r.r += .06 * dt; r.a -= .0016 * dt;
      if (r.a <= 0) { rings.splice(i, 1); continue; }
      ctx.strokeStyle = 'rgba(' + TEAL + ',' + r.a + ')'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.2832); ctx.stroke();
    }
  }

  function step(now) {
    if (!running) return;
    var dt = Math.min(now - last, 50); last = now;
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      n.x += n.vx * dt * .06 * 16; n.y += n.vy * dt * .06 * 16;
      if (n.x < -20) n.x = W + 20; else if (n.x > W + 20) n.x = -20;
      if (n.y < -20) n.y = H + 20; else if (n.y > H + 20) n.y = -20;
    }
    draw(dt);
    raf = requestAnimationFrame(step);
  }
  function start() { if (running || reduce) return; running = true; last = performance.now(); raf = requestAnimationFrame(step); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  hero.addEventListener('pointermove', function (e) {
    var r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  hero.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });

  var vis = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { vis = es[0].isIntersecting; vis && !document.hidden ? start() : stop(); }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : (vis && start()); });
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(resize, 150); });

  resize(); start();
})();
