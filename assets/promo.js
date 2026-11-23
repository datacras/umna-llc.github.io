/* Kampaniya statusu: Aktivdir / Son N gün / Tezliklə / Başa çatıb */
(function () {
  var day = 86400000, now = new Date();
  now.setHours(0, 0, 0, 0);
  document.querySelectorAll('.promo[data-start]').forEach(function (el) {
    var a = new Date(el.dataset.start + 'T00:00:00');
    var b = new Date(el.dataset.end + 'T00:00:00');
    var badge = el.querySelector('.promo-badge');
    if (now < a) { badge.textContent = 'Tezliklə'; badge.classList.add('soon'); }
    else if (now > b) { badge.textContent = 'Başa çatıb'; el.classList.add('ended'); }
    else {
      var left = Math.round((b - now) / day) + 1;
      badge.textContent = left <= 14 ? 'Son ' + left + ' gün' : 'Aktivdir';
      if (left <= 14) badge.classList.add('soon');
    }
  });
})();
