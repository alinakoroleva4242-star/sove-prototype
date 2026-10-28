/* «Мои доступы» — перенос экрана /marketplace/access.
   Показывает, что уже открыто (контакты поставщиков), сколько это дало выгоды и что с токенами. */
(function () {
  var S = window.SOVE, D = S.data, F = S.fmt, esc = F.esc;
  var root = document.getElementById('ac-root'); if (!root) return;

  function openedIds() {
    var st = S._state ? S._state() : null;
    return (st && st.access ? st.access.slice() : []);
  }

  function paint() {
    var ids = openedIds();
    var items = ids.map(function (id) { return D.product(id); }).filter(Boolean);
    var gain = items.reduce(function (a, p) { return a + (p.retail - p.metod); }, 0);
    var mine = S.metod.active();
    var balance = S.tokens.balance();

    root.innerHTML =
      '<div class="stack stack--3"><span class="eyebrow">Каталог товаров</span><h1 class="h1">Мои доступы</h1>' +
      '<p class="text">Здесь собраны контакты поставщиков, которые вы открыли: по подписке METOD или разово за одну вещь.</p></div>' +

      '<div class="ac-sum">' +
        '<div class="ac-sum__box ac-sum__box--gain"><span>Ваша выгода по METOD</span><b>' + F.rub(gain) + '</b>' +
        '<span class="small muted">разница розница − METOD по открытым доступам</span></div>' +
        '<div class="ac-sum__box"><span>Баланс токенов</span><b>' + F.num(balance) + '</b>' +
        '<span class="small muted">' + (mine ? 'подписка METOD активна, ещё ' + S.metod.daysLeft() + ' дн.' : 'подписка не активна') + '</span></div>' +
      '</div>' +

      (mine
        ? '<p class="small muted">С активной подпиской контакты открыты у всех товаров каталога — отдельно платить не нужно.</p>'
        : '<a class="btn btn--primary btn--block" href="metod.html">Открыть все контакты по подписке</a>') +

      '<div class="stack stack--3"><h2 class="h3">Покупки</h2>' +
        (items.length
          ? '<div class="stack stack--0">' + items.map(function (p) {
              return '<a class="ac-row" href="product.html?id=' + p.id + '"><img src="' + p.img + '" alt="">' +
                '<span class="ac-row__body"><b>' + esc(p.name) + '</b>' +
                '<span>' + F.rub(p.metod) + ' с METOD · выгода ' + F.rub(p.retail - p.metod) + '</span></span>' +
                '<span class="ac-row__state">оплачено</span></a>';
            }).join('') + '</div>'
          : '<p class="text muted">Разовых покупок доступа пока нет. Контакт можно открыть в карточке любого товара.</p>') +
      '</div>' +

      '<div class="stack stack--3"><a class="btn btn--ghost btn--block" href="market.html">Открыть каталог</a>' +
        '<a class="btn btn--link" href="tokens.html">Пополнить токены</a></div>' +
      '<p class="small muted">Прототип: доступы и баланс хранятся только в этом браузере.</p>';
  }
  paint();
  if (S.onChange) S.onChange(paint);
})();
