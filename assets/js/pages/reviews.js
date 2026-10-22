/* Отзывы клуба METOD — перенос экрана /reviews с сайта.
   Отзыв в данных один, настоящий; выдуманных цитат не добавляем. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc;
  var root = document.getElementById('rv-root'); if (!root) return;
  var list = D.reviews || [];

  root.innerHTML =
    '<div class="stack stack--3"><span class="eyebrow">Клуб METOD</span>' +
    '<h1 class="h1">Отзывы участников</h1>' +
    '<p class="text">Реальные истории участников клуба — что получилось сэкономить и как прошёл ремонт.</p></div>' +
    (list.length
      ? '<div class="stack stack--4">' + list.map(function (r) {
          return '<article class="rv"><span class="rv__mark" aria-hidden="true">“</span>' +
            '<p class="rv__quote">' + esc(r.quote) + '</p>' +
            '<span class="rv__author">' + esc(r.author) + ' · ' + esc(r.meta) + '</span></article>';
        }).join('') + '</div>'
      : '<p class="text muted">Отзывов пока нет.</p>') +
    '<p class="small muted">Новые отзывы добавляются по мере появления текстов от участников — без выдуманных цитат.</p>' +
    '<div class="stack stack--3"><a class="btn btn--primary btn--block" href="metod.html">Что даёт подписка</a>' +
    '<a class="btn btn--ghost btn--block" href="market.html?sort=discount">Каталог со скидками</a></div>';
})();
