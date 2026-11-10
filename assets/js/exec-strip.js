/* Полоса «Кто сделает этот интерьер» под интерьерами (чат команды 30.10.2026: «Интерьеры — отдельная страница,
   связана с маркетом исполнителей только нижней полосой»). Вся полоса — одна ссылка на executors.html?sec=masters;
   бегущая строка с исполнителями — оформление (aria-hidden), при «уменьшить движение» стоит на месте.
   Подключать после executors-data.js; ставится в каждый [data-exec-strip] на странице. */
(function () {
  var X = window.SOVE_EXECUTORS; if (!X || !X.items || !X.items.length) return;
  var hosts = document.querySelectorAll('[data-exec-strip]'); if (!hosts.length) return;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var cats = {}; X.cats.forEach(function (c) { cats[c.id] = c.t; });
  var run = X.items.map(function (x) {
    return '<span class="xstrip__it"><b>' + esc(x.name) + '</b> ' + esc((cats[x.cat] || x.what).toLowerCase()) +
      (x.disc ? ' <i>' + esc(x.disc) + '</i>' : '') + '</span>';
  }).join('');
  var html = '<a class="xstrip" href="executors.html?sec=masters">' +   /* мастера — пока единственный непустой раздел */
    '<span class="xstrip__head"><b>Кто сделает этот интерьер</b><i>Строители, дизайнеры и мастера METOD · скидки участникам клуба</i></span>' +
    '<span class="xstrip__go" aria-hidden="true">→</span>' +
    '<span class="xstrip__lane" aria-hidden="true"><span class="xstrip__run">' + run + run + '</span></span>' +
    '</a>';
  hosts.forEach(function (h) { h.innerHTML = html; });
})();
