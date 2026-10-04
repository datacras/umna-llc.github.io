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

  // Əhatə dairəsi: Goranboy rayonu, Dəliməmmədli, Naftalan
  var AREAS = ['goranboy', 'dəliməmmədli', 'delimemmedli', 'dalimammadli', 'naftalan'];
  function norm(s) {
    return s.toLocaleLowerCase('az').replace(/ı/g, 'i').replace(/ə/g, 'e').replace(/ö/g, 'o')
      .replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g');
  }
  var areasN = AREAS.map(norm);

  var form = document.getElementById('yoxla');
  var out = document.getElementById('checkResult');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = norm(document.getElementById('addr').value.trim());
    out.className = 'check-result';
    if (!v) { out.textContent = 'Ünvanı yazın.'; return; }
    var hit = areasN.some(function (a) { return v.indexOf(a) !== -1; });
    if (hit) {
      out.classList.add('ok');
      out.innerHTML = '✓ Ünvanınız əhatə dairəmizdədir. <a href="#elaqe" style="color:inherit">Nömrənizi yazın, zəng edək →</a>';
    } else {
      out.classList.add('no');
      out.innerHTML = 'Hazırda yalnız Goranboy rayonu və Naftalan şəhərində xidmət göstəririk. Yenə də <a href="#elaqe" style="color:inherit">bizə yazın</a>.';
    }
  });

  // Tarif düyməsi seçilən planı forma ötürür
  document.querySelectorAll('[data-plan]').forEach(function (a) {
    a.addEventListener('click', function () {
      document.getElementById('planField').value = a.getAttribute('data-plan');
    });
  });
})();
