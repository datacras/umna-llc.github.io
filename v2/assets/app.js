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

  // ƏHATƏ SİYAHISI
  //   keys     – şəhər/rayon adları. Ünvanın içində hər yerdə axtarılır.
  //   villages – kənd/qəsəbə adları. Yalnız TAM söz kimi axtarılır (başqa bölgədəki eyni adlı
  //              küçə və ya kəndlə qarışmasın deyə). "Azad", "Nizami", "Gülüstan", "Şəfəq",
  //              "Yenikənd", "Yeni Yol", "Meşəli", "Düzqışlaq", "Qazaxlar", "Baş Qışlaq", "Tap",
  //              "Goran" kimi ümumi adlar bilərəkdən siyahıda yoxdur: bunlar üçün "Goranboy" yazılmalıdır.
  // Yeni yer əlavə etmək üçün uyğun siyahıya ad əlavə edin. Məlumat OpenStreetMap-dəndir,
  // tam olmaya bilər. Əhatəni özünüz yoxlayıb düzəldin.
  var COVERAGE = [
    { name: 'Goranboy rayonu', keys: ['goranboy', 'dəliməmmədli', 'dalimammadli'], villages: [
      'Abbasqulular', 'Alpout', 'Ağcakənd', 'Aşağı Ağcakənd', 'Aşağı Ballıqaya', 'Balakürd',
      'Bağçakürd', 'Boluslu', 'Borsunlu', 'Buzluq', 'Börü', 'Bəşirli', 'Cinli Zeynallı', 'Dəyirmanlar',
      'Erkeç', 'Eyvazlılar', 'Fəxralı', 'Goranlı', 'Göynüyən', 'Gülməmmədli', 'Gürzallar', 'Hacallı',
      'Hazırəhmədli', 'Həmənli', 'Kəhrizli', 'Kələk', 'Muzdurlar', 'Mənəşli', 'Məşədiqaralar',
      'Nadirkənd', 'Nərimanlı', 'Qaradağlı', 'Qaramusalı', 'Qarapirimli', 'Qarasuçu', 'Qarasüleymanlı',
      'Qaraçinar', 'Qarqucaq', 'Qaxtut', 'Qazanbulaq', 'Qazançı', 'Qurbanzadə', 'Quşçular', 'Qırıqlı',
      'Qızılhacılı', 'Rus Borisi', 'Rəhimli', 'Safkurt', 'Sarov', 'Sarovlu', 'Səfikürd', 'Səmədabad',
      'Tap Qaraqoyunlu', 'Tatarlı', 'Todan', 'Todanalı', 'Təklə', 'Veyisli', 'Xan Qərvənd',
      'Xasadarlı', 'Xoylu', 'Xınalı', 'Yolpaq', 'Yolqulular', 'Yuxarı Ağcakənd', 'Yuxarı Ballıqaya',
      'Yəhərçi Qazaxlar', 'Zeyvə', 'İrəvanli', 'Şadılı', 'Şahməmmədli', 'Şıxlar', 'Şəfibəyli',
      'Əhmədabad'
    ] },
    { name: 'Naftalan', keys: ['naftalan'], villages: [
      'Qaşaltı Qaraqoyunlu', 'Qasımbəyli'
    ] },
    { name: 'Mingəçevir', keys: ['mingəçevir', 'mingecevir'], villages: [] }
  ];
  // Bu böyük şəhərlərdən biri yazılıbsa və yuxarıda şəhər/rayon adı yoxdursa, kənd adı sayılmır
  var OTHER_CITIES = ['bakı', 'baku', 'gəncə', 'sumqayıt', 'şəki', 'lənkəran', 'naxçıvan', 'şirvan', 'xırdalan', 'quba', 'şamaxı', 'yevlax', 'tovuz', 'qazax', 'ağstafa', 'bərdə'];
  function norm(s) {
    return s.toLocaleLowerCase('az').replace(/ı/g, 'i').replace(/ə/g, 'e').replace(/ö/g, 'o')
      .replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g');
  }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  // tam söz: əvvəl/sonra hərf və ya rəqəm olmasın
  function wordRe(s) { return new RegExp('(^|[^a-z0-9])' + esc(norm(s)).replace(/ /g, '\\s+') + '($|[^a-z0-9])'); }
  COVERAGE.forEach(function (c) {
    c.n = c.keys.map(norm);
    c.v = c.villages.map(function (x) { return { name: x, re: wordRe(x) }; });
  });
  var otherRe = OTHER_CITIES.map(wordRe);

  // qaytarır: { area: 'Goranboy rayonu', place: 'Qaradağlı' | null } və ya null
  function findArea(text) {
    var v = norm(text), i, j;
    for (i = 0; i < COVERAGE.length; i++)
      for (j = 0; j < COVERAGE[i].n.length; j++)
        if (v.indexOf(COVERAGE[i].n[j]) !== -1) return { area: COVERAGE[i].name, place: null };
    if (otherRe.some(function (r) { return r.test(v); })) return null;
    for (i = 0; i < COVERAGE.length; i++)
      for (j = 0; j < COVERAGE[i].v.length; j++)
        if (COVERAGE[i].v[j].re.test(v)) return { area: COVERAGE[i].name, place: COVERAGE[i].v[j].name };
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
      say('ok', ['✓ ' + (area.place ? area.place + ' (' + area.area + ')' : area.area) + ' əhatə dairəmizdədir. ', link('Nömrənizi yazın, zəng edək →', '#elaqe')]);
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
