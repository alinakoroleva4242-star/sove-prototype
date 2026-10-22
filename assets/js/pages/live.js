/* Карточка товара боевого каталога SOVEAPP.
   Данные берём у API: GET /api/marketplace/product/{id} (через прокси локального сервера).
   Локальный каталог прототипа тут ни при чём — это настоящие 332 тыс. позиций. */
(function () {
  var S = window.SOVE, F = S.fmt, ui = S.ui;
  var root = document.getElementById('live-root'); if (!root) return;
  var API = (location.protocol === 'http:' || location.protocol === 'https:') ? '/api' : null;
  var id = ui.qs('id');

  function img(raw) { return /^https?:/.test(raw || '') ? API + '/img?u=' + encodeURIComponent(raw) : ''; }
  function money(n) { return F.rub(Math.round(n || 0)); }

  function fail(text) {
    root.setAttribute('aria-busy', 'false');
    root.innerHTML = '<div class="stack stack--4"><span class="eyebrow">Каталог SOVEAPP</span>' +
      '<h1 class="h1">Товар не открылся</h1><p class="text">' + F.esc(text) + '</p>' +
      '<div class="row"><a class="btn btn--primary" href="ai.html?mode=photo">Искать по фото</a>' +
      '<a class="btn btn--ghost" href="market.html">В каталог</a></div></div>';
  }

  function paint(d) {
    document.title = (d.name || 'Товар') + ' — SOVEAPP';
    var off = parseInt(String(d.discount || '').replace(/\D/g, ''), 10) || 0;
    var metod = d.price_metod || d.price_retail || 0, retail = d.price_retail || metod;
    var pic = img(d.img);
    var facts = [
      ['Категория', d.category], ['Тип', d.subcat], ['Цвет', d.color], ['Материал', d.material],
      ['Стиль', d.style], ['Комната', d.room], ['Доставка', d.delivery], ['Город', d.delivery_city]
    ].filter(function (f) { return f[1]; });

    root.setAttribute('aria-busy', 'false');
    root.innerHTML =
      '<a class="btn btn--link btn--sm live__back" href="ai.html?mode=photo">← К поиску по фото</a>' +
      '<figure class="live__hero">' +
        (pic ? '<img src="' + pic + '" alt="' + F.esc(d.name) + '">' : '<span class="live__nopic">фото только у поставщика</span>') +
        (off ? '<span class="pc__off live__off">−' + off + ' %</span>' : '') +
      '</figure>' +
      '<div class="stack stack--3">' +
        '<span class="eyebrow">' + F.esc(d.brand || 'Каталог SOVEAPP') + '</span>' +
        '<h1 class="h2">' + F.esc(d.name) + '</h1>' +
      '</div>' +
      '<div class="price price--lg">' +
        (metod ? '<span class="price__metod">' + money(metod) + '</span>' : '<span class="price__ask">цена по запросу</span>') +
        (retail > metod ? '<span class="price__retail">' + money(retail) + '</span>' : '') +
      '</div>' +
      (metod && retail > metod ? '<p class="small muted">Экономия по подписке METOD — ' + money(retail - metod) + '</p>' : '') +
      (facts.length ? '<div class="pb-list">' + facts.map(function (f) {
        return '<div class="pb-item"><b>' + F.esc(f[0]) + '</b><span>' + F.esc(String(f[1])) + '</span></div>';
      }).join('') + '</div>' : '') +
      '<div class="stack stack--3">' +
        '<button type="button" class="btn btn--primary btn--block" id="live-metod">Открыть контакты поставщика</button>' +
        '<a class="btn btn--ghost btn--block" href="ai.html?mode=photo">Найти похожее по своему фото</a>' +
      '</div>' +
      '<p class="small muted">Товар из боевого каталога SOVEAPP. Контакты поставщика и промокод открываются по подписке METOD.</p>';

    var b = document.getElementById('live-metod');
    if (b) b.addEventListener('click', function () {
      ui.modal({
        eyebrow: 'METOD · подписка',
        title: 'Контакты открываются по подписке',
        text: 'В подписке видны поставщик, промокод и условия доставки по этому товару. В прототипе контакты не подгружаются.',
        actions: [ { label: 'Тарифы METOD', kind: 'primary', href: 'metod.html' }, { label: 'Не сейчас', kind: 'link' } ]
      });
    });
  }

  if (!id) { fail('Не передан номер товара.'); return; }
  if (!API || !window.fetch) { fail('Карточка открывается только с локального сервера прототипа.'); return; }

  fetch(API + '/marketplace/product/' + encodeURIComponent(id))
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { if (d && d.name) paint(d); else fail('Сервер не отдал этот товар: возможно, поставщик снял его с продажи.'); })
    .catch(function () { fail('Сервер каталога не ответил. Попробуйте ещё раз.'); });
})();
