/* «Мебель и решения на заказ» — перенос экрана /marketplace/custom-order.
   Эти партнёры изготавливают под объект, в общем каталоге их нет: заявка уходит в чат с партнёром. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc;
  var root = document.getElementById('co-root'); if (!root) return;
  var CO = D.customOrder || { categories: [], partners: [] };
  var cur = S.ui.qs('cat') || 'all';

  function cards() {
    var list = cur === 'all' ? CO.partners : CO.partners.filter(function (p) { return p.category === cur; });
    if (!list.length) return '<p class="text muted">В этой категории партнёров пока нет.</p>';
    return '<div class="co-grid">' + list.map(function (p) {
      return '<a class="co" href="chats.html?kind=partner&partner=' + encodeURIComponent(p.id) + '&name=' + encodeURIComponent(p.name) + '">' +
        '<span class="co__flag">на заказ</span>' +
        '<b class="co__name">' + esc(p.name) + '</b>' +
        '<span class="co__cat">' + esc(p.category) + '</span>' +
        '<span class="co__note">' + esc(p.note) + '</span>' +
        '<span class="co__cta">Оставить заявку</span></a>';
    }).join('') + '</div>';
  }

  function chips() {
    var all = ['all'].concat(CO.categories);
    return '<div class="lane co-chips">' + all.map(function (c) {
      var on = c === cur;
      return '<button type="button" class="chip' + (on ? ' is-on' : '') + '" data-cat="' + esc(c) + '" aria-pressed="' + on + '">' +
        (c === 'all' ? 'Все' : esc(c)) + '</button>';
    }).join('') + '</div>';
  }

  function paint() {
    root.innerHTML =
      '<div class="stack stack--3"><span class="eyebrow">Маркетплейс</span>' +
      '<h1 class="h1">Мебель и решения на заказ</h1>' +
      '<p class="text">Эти партнёры изготавливают под ваш объект, а не продают готовое: цену и срок обсуждаете напрямую. В общем каталоге их нет.</p></div>' +
      chips() + cards() +
      '<a class="btn btn--ghost btn--block" href="market.html">Готовые товары в каталоге</a>';
    root.querySelectorAll('[data-cat]').forEach(function (b) {
      b.addEventListener('click', function () { cur = b.getAttribute('data-cat'); paint(); });
    });
  }
  paint();
})();
