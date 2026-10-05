(function () {
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');
  burger.addEventListener('click', function () {
    var open = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  menu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); }
  });

  document.getElementById('yr').textContent = new Date().getFullYear();

  // ƏHATƏ SİYAHISI. Yeni kənd/qəsəbə/şəhər əlavə etmək üçün bura bir sətir əlavə edin:
  //   { name: 'Göstəriləcək ad', keys: ['axtarış sözü', 'alternativ yazılış'] }
  // keys: kiçik hərflə, azərbaycan hərfləri ilə və ya latın əvəzləri ilə yazıla bilər.
  var COVERAGE = [
    { name: 'Goranboy rayonu', keys: ['goranboy', 'dəliməmmədli', 'dalimammadli'] },
    { name: 'Naftalan', keys: ['naftalan'] },
    { name: 'Mingəçevir', keys: ['mingəçevir', 'mingecevir'] }
  ];
  function norm(s) {
    return s.toLocaleLowerCase('az').replace(/ı/g, 'i').replace(/ə/g, 'e').replace(/ö/g, 'o')
      .replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g');
  }
  COVERAGE.forEach(function (c) { c.n = c.keys.map(norm); });
  function findArea(text) {
    var v = norm(text);
    for (var i = 0; i < COVERAGE.length; i++) {
      for (var j = 0; j < COVERAGE[i].n.length; j++) if (v.indexOf(COVERAGE[i].n[j]) !== -1) return COVERAGE[i];
    }
    return null;
  }

  var form = document.getElementById('yoxla');
  var out = document.getElementById('checkResult');
  var addrField = document.getElementById('addrField');

  function say(cls, nodes) {
    out.className = 'check-result ' + cls;
    out.textContent = '';
    nodes.forEach(function (n) { out.appendChild(typeof n === 'string' ? document.createTextNode(n) : n); });
  }
  function link(text, href) { var a = document.createElement('a'); a.href = href; a.textContent = text; a.style.color = 'inherit'; return a; }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var raw = document.getElementById('addr').value.trim();
    if (raw.length < 3) { say('no', ['Ünvanı ətraflı yazın (şəhər və ya kənd, küçə).']); return; }
    var area = findArea(raw);
    if (addrField) addrField.value = raw;
    if (area) {
      say('ok', ['✓ ' + area.name + ' əhatə dairəmizdədir. ', link('Nömrənizi yazın, zəng edək →', '#elaqe')]);
    } else {
      showNotify(raw);
    }
  });

  // Əhatədə deyil: nömrəni saxla, genişlənəndə xəbər verək
  function showNotify(addr) {
    var wrap = document.createElement('div');
    var p = document.createElement('p');
    p.textContent = 'Bu ünvan hələ əhatə dairəmizdə görünmür. Nömrənizi yazın, əhatə genişlənəndə sizə zəng edək.';
    var f = document.createElement('form');
    f.className = 'notify';
    f.innerHTML = '<input type="tel" name="phone" placeholder="+994 __ ___ __ __" required pattern="[0-9+ ]{7,15}" aria-label="Telefon nömrəsi"><button class="btn btn-light" type="submit">Xəbər verin</button>';
    wrap.appendChild(p); wrap.appendChild(f);
    say('no', [wrap]);
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var btn = f.querySelector('button'), fd = new FormData(f);
      fd.append('address', addr);
      fd.append('_subject', 'Əhatə sorğusu: ünvan əhatədə deyil');
      fd.append('_captcha', 'false');
      btn.disabled = true; btn.textContent = 'Göndərilir…';
      fetch('https://formsubmit.co/ajax/info@umna.az', { method: 'POST', headers: { 'Accept': 'application/json' }, body: fd })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d && (d.success === 'true' || d.success === true)) say('ok', ['✓ Qeyd etdik. Əhatə genişlənəndə sizinlə əlaqə saxlayacağıq.']);
          else throw new Error('fail');
        })
        .catch(function () {
          btn.disabled = false; btn.textContent = 'Xəbər verin';
          say('no', ['Göndərmək alınmadı. Zəhmət olmasa ', link('+994 70 651 00 22', 'tel:+994706510022'), ' nömrəsinə zəng edin.']);
        });
    });
  }

  // Tarif düyməsi seçilən planı forma ötürür
  document.querySelectorAll('[data-plan]').forEach(function (a) {
    a.addEventListener('click', function () {
      document.getElementById('planField').value = a.getAttribute('data-plan');
    });
  });

  // Zəng sifarişi: səhifədə qalaraq göndər (formsubmit AJAX), alınmasa adi göndərişə qayıt
  var cf = document.getElementById('callForm'), cr = document.getElementById('callResult');
  if (cf && window.fetch) {
    cf.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = cf.querySelector('button[type=submit]'), label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Göndərilir…'; cr.textContent = '';
      fetch('https://formsubmit.co/ajax/info@umna.az', { method: 'POST', headers: { 'Accept': 'application/json' }, body: new FormData(cf) })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d && (d.success === 'true' || d.success === true)) {
            cf.reset(); cr.textContent = '✓ Təşəkkür edirik! Nömrənizi aldıq, tezliklə sizə zəng edəcəyik.';
            btn.disabled = false; btn.textContent = label;
          } else { throw new Error('fail'); }
        })
        .catch(function () { cf.submit(); });
    });
  }
})();
